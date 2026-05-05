import { useState, useEffect, useCallback, useRef } from "react";
import { getTables, updateTable }   from "../api/tables.js";
import { getBookings, activateBooking, completeBooking, cancelBooking } from "../api/bookings.js";
import { getPlates, createPlate, togglePlate } from "../api/plates.js";
import { useAuth }   from "../context/AuthContext.jsx";
import { useBookingSocket } from "../hooks/useBookingSocket.js";

const STATUS_COLOR = {
  pending:   "bg-yellow-100 text-yellow-700 border-yellow-300",
  active:    "bg-green-100  text-green-700  border-green-300",
  completed: "bg-gray-100   text-gray-500   border-gray-200",
  cancelled: "bg-red-100    text-red-600    border-red-300",
};
const TABLE_DOT = {
  available:   "bg-green-400",
  occupied:    "bg-red-400",
  reserved:    "bg-yellow-400",
  maintenance: "bg-gray-400",
};

// ── Toast notifications ──────────────────────────────────────────
function Toasts({ messages }) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 w-80 pointer-events-none">
      {messages.map((m, i) => (
        <div key={i}
          className="bg-green-700 text-white px-4 py-3 rounded-xl shadow-lg text-sm">
          {m}
        </div>
      ))}
    </div>
  );
}

// ── Bookings tab — WS only enabled when tab is active ────────────
function BookingsTab({ isActive }) {
  const { user, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [filter,   setFilter]   = useState("pending");
  const [loading,  setLoading]  = useState(true);
  const [toasts,   setToasts]   = useState([]);

  const addToast = useCallback((msg) => {
    setToasts(p => [msg, ...p].slice(0, 4));
    setTimeout(() => setToasts(p => p.filter(m => m !== msg)), 5000);
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    getBookings(filter ? { status: filter } : {})
      .then(setBookings)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filter]);

  // Wait for auth to finish before fetching — avoids 401 on first load after refresh
  useEffect(() => { if (isActive && !authLoading && user) load(); }, [isActive, authLoading, user, load]);

  // Admin WS room — only connect when this tab is visible AND user is loaded
  const { status: wsStatus } = useBookingSocket({
    enabled:   isActive && !!user,   // ← only connect when tab is active
    adminMode: true,
    onEvent:   useCallback((event, data) => {
      if (event === "booking:created") {
        addToast(`🆕 New booking — Table ${data.table_number} (${data.user_name})`);
        load();
      }
      if (event === "booking:activated") {
        addToast(`✅ Table ${data.table_number} — activated`);
        load();
      }
      if (event === "booking:cancelled") {
        addToast(`❌ Table ${data.table_number} — cancelled`);
        load();
      }
      if (event === "booking:completed") {
        addToast(`🏁 Table ${data.table_number} — completed`);
        load();
      }
      if (event === "joined:admin") {
        addToast("🔴 Live updates connected");
      }
    }, [addToast, load]),
  });

  const activate = async (id) => {
    try { await activateBooking(id); load(); }
    catch (e) { alert(e?.detail?.message || e?.message || "Failed to activate booking"); }
  };
  const complete = async (id) => {
    try { await completeBooking(id); load(); }
    catch (e) { alert(e?.detail?.message || e?.message || "Failed to complete booking"); }
  };
  const cancel = async (id) => {
    if (!confirm("Cancel this booking?")) return;
    try { await cancelBooking(id); load(); }
    catch (e) { alert(e?.detail?.message || e?.message || "Failed to cancel booking"); }
  };

  if (!isActive) return null;

  return (
    <>
      <Toasts messages={toasts} />
      <div className="space-y-4">
        {/* WS status badge */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex gap-2 flex-wrap">
            {["", "pending", "active", "completed", "cancelled"].map(s => (
              <button key={s}
                onClick={() => setFilter(s)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all
                  ${filter === s
                    ? "bg-amber-600 text-white border-amber-600"
                    : "bg-white text-gray-600 border-gray-300 hover:border-amber-400"}`}>
                {s || "All"}
              </button>
            ))}
          </div>
          <span className={`text-xs px-2 py-1 rounded-full border ${
            wsStatus === "connected"
              ? "text-green-700 border-green-300 bg-green-50"
              : wsStatus === "unavailable"
              ? "text-red-400 border-red-200 bg-red-50"
              : "text-gray-400 border-gray-200 bg-gray-50"
          }`}>
            {wsStatus === "connected"   ? "● live"
             : wsStatus === "unavailable" ? "○ server offline"
             : "○ connecting…"}
          </span>
        </div>

        {loading ? (
          <p className="text-gray-400 py-8 text-center">Loading…</p>
        ) : bookings.length === 0 ? (
          <p className="text-gray-400 py-8 text-center">No bookings found.</p>
        ) : (
          <div className="space-y-3">
            {bookings.map(b => (
              <div key={b.id}
                className={`bg-white rounded-2xl border p-4 shadow-sm ${STATUS_COLOR[b.status]}`}>
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800">
                      Table {b.table_number} · {b.table_location}
                    </p>
                    <p className="text-sm text-gray-500">
                      {b.user_name} · {new Date(b.booked_at).toLocaleString()} · {b.guests} guest(s)
                    </p>
                    {b.plates?.length > 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        {b.plates.map(p => `${p.plate_name}×${p.quantity}`).join(", ")}
                      </p>
                    )}
                    {b.notes && (
                      <p className="text-xs italic text-gray-400">"{b.notes}"</p>
                    )}
                  </div>
                  <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full
                    border ${STATUS_COLOR[b.status]}`}>
                    {b.status}
                  </span>
                </div>
                <div className="flex gap-2 mt-3 flex-wrap">
                  {b.status === "pending" && (
                    <button onClick={() => activate(b.id)}
                      className="btn-sm btn-green">Activate</button>
                  )}
                  {b.status === "active" && (
                    <button onClick={() => complete(b.id)}
                      className="btn-sm btn-blue">Complete</button>
                  )}
                  {(b.status === "pending" || b.status === "active") && (
                    <button onClick={() => cancel(b.id)}
                      className="btn-sm btn-red">Cancel</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ── Tables tab ────────────────────────────────────────────────────
function TablesTab({ isActive }) {
  const [tables,  setTables]  = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    getTables().then(setTables).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (isActive) load(); }, [isActive, load]);

  const changeStatus = async (id, status) => {
    await updateTable(id, { status }); load();
  };

  if (!isActive) return null;

  if (loading) return <p className="text-gray-400 py-8 text-center">Loading…</p>;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {tables.map(t => (
        <div key={t.id}
          className="bg-white rounded-2xl shadow border border-gray-100 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-lg text-gray-800">#{t.number}</span>
            <span className={`w-3 h-3 rounded-full ${TABLE_DOT[t.status]}`} />
          </div>
          <p className="text-xs text-gray-500">{t.location} · {t.capacity} seats</p>
          <p className="text-xs font-medium capitalize text-gray-600">{t.status}</p>
          <select
            className="w-full text-xs border rounded-lg p-1 mt-1"
            value={t.status}
            onChange={e => changeStatus(t.id, e.target.value)}>
            <option value="available">Available</option>
            <option value="occupied">Occupied</option>
            <option value="reserved">Reserved</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>
      ))}
    </div>
  );
}

// ── Plates tab ────────────────────────────────────────────────────
function PlatesTab({ isActive }) {
  const [plates,  setPlates]  = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form,    setForm]    = useState({ name:"", description:"", price:"", category:"main" });
  const [busy,    setBusy]    = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    getPlates().then(setPlates).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (isActive) load(); }, [isActive, load]);

  const toggle = async (id) => { await togglePlate(id); load(); };

  const add = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      await createPlate({ ...form, price: parseFloat(form.price) });
      setShowAdd(false);
      setForm({ name:"", description:"", price:"", category:"main" });
      load();
    } catch (err) {
      alert(err?.detail?.message || "Error creating plate");
    } finally { setBusy(false); }
  };

  if (!isActive) return null;

  const categories = ["starter","main","dessert","drink"];
  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div className="space-y-4">
      <button onClick={() => setShowAdd(v => !v)} className="btn-primary">
        {showAdd ? "Cancel" : "+ Add Plate"}
      </button>

      {showAdd && (
        <form onSubmit={add}
          className="bg-white rounded-2xl border p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input className="input" placeholder="Name"
              value={form.name} onChange={f("name")} required />
            <input className="input" type="number" placeholder="Price"
              value={form.price} onChange={f("price")} required />
          </div>
          <textarea className="input" placeholder="Description" rows="2"
            value={form.description} onChange={f("description")} />
          <select className="input" value={form.category} onChange={f("category")}>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? "Adding…" : "Add Plate"}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-gray-400 text-center py-8">Loading…</p>
      ) : (
        <div className="space-y-4">
          {categories.map(cat => {
            const items = plates.filter(p => p.category === cat);
            if (!items.length) return null;
            return (
              <div key={cat}>
                <p className="text-xs font-semibold text-gray-400 uppercase mb-2">{cat}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {items.map(p => (
                    <div key={p.id}
                      className={`bg-white rounded-xl border p-3 flex justify-between
                        items-start gap-2 ${p.is_available ? "border-gray-200" : "border-gray-100 opacity-50"}`}>
                      <div>
                        <p className="font-medium text-sm text-gray-800">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.description}</p>
                        <p className="text-amber-600 font-semibold text-sm mt-1">${p.price}</p>
                      </div>
                      <button onClick={() => toggle(p.id)}
                        className={`text-xs px-2 py-1 rounded-full border font-medium shrink-0
                          ${p.is_available
                            ? "text-green-700 border-green-300 hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                            : "text-gray-400 border-gray-300 hover:bg-green-50 hover:text-green-700 hover:border-green-300"}`}>
                        {p.is_available ? "Available" : "Unavailable"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Admin root ────────────────────────────────────────────────────
export default function AdminPage() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState("bookings");

  const tabs = [
    { id: "bookings", label: "📋 Bookings" },
    { id: "tables",   label: "🪑 Tables"   },
    { id: "plates",   label: "🍽️ Menu"     },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-40 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-amber-700">🍽️ Admin Dashboard</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 hidden sm:block">{user?.name}</span>
            <button onClick={logout}
              className="text-sm text-gray-400 hover:text-red-500">Sign out</button>
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-4 pb-0 flex gap-1">
          {tabs.map(t => (
            <button key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all
                ${tab === t.id
                  ? "border-amber-500 text-amber-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <BookingsTab isActive={tab === "bookings"} />
        <TablesTab   isActive={tab === "tables"} />
        <PlatesTab   isActive={tab === "plates"} />
      </main>
    </div>
  );
}