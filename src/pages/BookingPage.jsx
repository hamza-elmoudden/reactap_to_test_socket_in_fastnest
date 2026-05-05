import { useState, useEffect, useCallback } from "react";
import { getTables }   from "../api/tables.js";
import { getPlates }   from "../api/plates.js";
import { getBookings, createBooking, cancelBooking } from "../api/bookings.js";
import { useAuth }     from "../context/AuthContext.jsx";
import { useBookingSocket } from "../hooks/useBookingSocket.js";

const STATUS_COLOR = {
  pending:   "bg-yellow-100 text-yellow-800",
  active:    "bg-green-100  text-green-800",
  completed: "bg-gray-100   text-gray-600",
  cancelled: "bg-red-100    text-red-700",
};

// ── Single booking card — connects WS only for pending/active ────
function BookingCard({ booking, onCancel, onStatusChange }) {
  const [notification, setNotification] = useState(null);

  // Only connect WS for bookings that can still change status
  const wsEnabled = booking.status === "pending" || booking.status === "active";

  const { status: wsStatus } = useBookingSocket({
    enabled:   wsEnabled,
    bookingId: booking.id,
    onEvent:   useCallback((event, data) => {
      if (event === "booking:activated") {
        setNotification("🎉 Your table is now active! Welcome!");
        onStatusChange?.(booking.id, "active");
      }
      if (event === "booking:cancelled") {
        setNotification("❌ This booking has been cancelled.");
        onStatusChange?.(booking.id, "cancelled");
      }
      if (event === "booking:completed") {
        setNotification("🏁 Your visit is complete. Thank you!");
        onStatusChange?.(booking.id, "completed");
      }
    }, [booking.id, onStatusChange]),
  });

  return (
    <div className="bg-white rounded-2xl shadow p-5 space-y-3 border border-gray-100">
      {/* Live notification */}
      {notification && (
        <div className="bg-green-50 border border-green-300 text-green-800
                        rounded-xl px-4 py-2 text-sm font-medium">
          {notification}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800">
            Table {booking.table_number}
            {booking.table_location ? ` — ${booking.table_location}` : ""}
          </p>
          <p className="text-sm text-gray-500">
            {new Date(booking.booked_at).toLocaleString()} · {booking.guests} guest(s)
          </p>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLOR[booking.status]}`}>
            {booking.status}
          </span>
          {/* WS indicator — only shown for active connections */}
          {wsEnabled && wsStatus !== "unavailable" && (
            <span className={`text-xs ${wsStatus === "connected" ? "text-green-500" : "text-gray-300"}`}>
              {wsStatus === "connected" ? "● live" : "○"}
            </span>
          )}
        </div>
      </div>

      {/* Pre-ordered plates */}
      {booking.plates?.length > 0 && (
        <div className="text-sm text-gray-600">
          <p className="font-medium mb-1">Pre-ordered:</p>
          <ul className="list-disc list-inside space-y-0.5">
            {booking.plates.map(p => (
              <li key={p.id}>{p.plate_name} × {p.quantity}</li>
            ))}
          </ul>
        </div>
      )}

      {booking.notes && (
        <p className="text-xs text-gray-400 italic">Note: {booking.notes}</p>
      )}

      {(booking.status === "pending" || booking.status === "active") && (
        <button
          onClick={() => onCancel(booking.id)}
          className="text-xs text-red-500 hover:underline"
        >
          Cancel booking
        </button>
      )}
    </div>
  );
}

// ── New booking modal ────────────────────────────────────────────
function NewBookingModal({ onClose, onCreated }) {
  const [tables,  setTables]  = useState([]);
  const [plates,  setPlates]  = useState([]);
  const [form,    setForm]    = useState({
    table_id: "", booked_at: "", guests: 1, notes: "", plates: [],
  });
  const [busy,  setBusy]  = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getTables({ status: "available" }).then(setTables).catch(console.error);
    getPlates({ available: true }).then(setPlates).catch(console.error);
  }, []);

  const togglePlate = (plate) => {
    setForm(f => {
      const exists = f.plates.find(p => p.plate_id === plate.id);
      if (exists) return { ...f, plates: f.plates.filter(p => p.plate_id !== plate.id) };
      return { ...f, plates: [...f.plates, { plate_id: plate.id, quantity: 1 }] };
    });
  };

  const updateQty = (plate_id, qty) => {
    setForm(f => ({
      ...f,
      plates: f.plates.map(p => p.plate_id === plate_id ? { ...p, quantity: +qty } : p),
    }));
  };

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const booking = await createBooking(form);
      onCreated(booking);
      onClose();
    } catch (err) {
      setError(err?.detail?.message || JSON.stringify(err));
    } finally { setBusy(false); }
  };

  const categories = [...new Set(plates.map(p => p.category))];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-800">New Reservation</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-5">
          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div>
            <label className="label">Table</label>
            <select className="input" required
              value={form.table_id}
              onChange={e => setForm(f => ({ ...f, table_id: e.target.value }))}>
              <option value="">Select a table…</option>
              {tables.map(t => (
                <option key={t.id} value={t.id}>
                  Table {t.number} — {t.location} (seats {t.capacity})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Date & Time</label>
              <input className="input" type="datetime-local" required
                value={form.booked_at}
                onChange={e => setForm(f => ({ ...f, booked_at: e.target.value }))} />
            </div>
            <div>
              <label className="label">Guests</label>
              <input className="input" type="number" min="1" max="20"
                value={form.guests}
                onChange={e => setForm(f => ({ ...f, guests: +e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="label">Notes (optional)</label>
            <textarea className="input" rows="2"
              placeholder="Allergies, preferences…"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>

          <div>
            <label className="label">Pre-order from menu (optional)</label>
            {categories.map(cat => (
              <div key={cat} className="mb-3">
                <p className="text-xs font-semibold text-gray-400 uppercase mb-2">{cat}</p>
                <div className="grid grid-cols-2 gap-2">
                  {plates.filter(p => p.category === cat).map(plate => {
                    const selected = form.plates.find(p => p.plate_id === plate.id);
                    return (
                      <div key={plate.id}
                        className={`border rounded-xl p-2 cursor-pointer text-sm transition-all
                          ${selected
                            ? "border-amber-400 bg-amber-50"
                            : "border-gray-200 hover:border-amber-300"}`}
                        onClick={() => togglePlate(plate)}>
                        <p className="font-medium">{plate.name}</p>
                        <p className="text-gray-500">${plate.price}</p>
                        {selected && (
                          <input type="number" min="1" max="10"
                            className="mt-1 w-16 border rounded px-1 text-xs"
                            value={selected.quantity}
                            onClick={e => e.stopPropagation()}
                            onChange={e => updateQty(plate.id, e.target.value)} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <button className="btn-primary w-full" disabled={busy}>
            {busy ? "Booking…" : "Confirm Reservation"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────
export default function BookingPage() {
  const { user, logout }   = useAuth();
  const [bookings, setBookings] = useState([]);
  const [showNew,  setShowNew]  = useState(false);
  const [loading,  setLoading]  = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    getBookings().then(setBookings).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCancel = async (id) => {
    if (!confirm("Cancel this booking?")) return;
    try { await cancelBooking(id); load(); } catch (e) { alert(e?.detail?.message || "Error"); }
  };

  // Called by BookingCard when WS notifies status change
  const handleStatusChange = useCallback((id, newStatus) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: newStatus } : b));
  }, []);

  const handleCreated = (booking) => {
    setBookings(prev => [booking, ...prev]);
  };

  return (
    <div className="min-h-screen bg-amber-50">
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-amber-700">🍽️ My Reservations</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{user?.name}</span>
            <button onClick={logout} className="text-sm text-gray-400 hover:text-red-500">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <button onClick={() => setShowNew(true)} className="btn-primary w-full py-3 text-base">
          + New Reservation
        </button>

        {loading ? (
          <p className="text-center text-gray-400 py-10">Loading…</p>
        ) : bookings.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-5xl mb-4">🪑</p>
            <p>No reservations yet. Book a table above!</p>
          </div>
        ) : (
          bookings.map(b => (
            <BookingCard
              key={b.id}
              booking={b}
              onCancel={handleCancel}
              onStatusChange={handleStatusChange}
            />
          ))
        )}
      </main>

      {showNew && (
        <NewBookingModal
          onClose={() => setShowNew(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}