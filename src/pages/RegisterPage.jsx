import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useNavigate, Link } from "react-router-dom";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name:"", email:"", password:"", phone:"" });
  const [error, setError] = useState("");
  const [busy,  setBusy]  = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError("");
    try {
      await register(form);
      navigate("/login", { state: { msg: "Registered! Please sign in." } });
    } catch (err) {
      setError(err?.detail?.message || "Registration failed");
    } finally { setBusy(false); }
  };

  const f = (k) => (e) => setForm(p => ({...p, [k]: e.target.value}));

  return (
    <div className="min-h-screen flex items-center justify-center bg-amber-50">
      <form onSubmit={submit} className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-center text-amber-700">🍽️ Restaurant</h1>
        <h2 className="text-lg font-semibold text-center text-gray-700">Create Account</h2>
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        <input className="input" placeholder="Full name"    value={form.name}     onChange={f("name")}     required />
        <input className="input" type="email" placeholder="Email" value={form.email}    onChange={f("email")}    required />
        <input className="input" type="password" placeholder="Password (min 6)" value={form.password} onChange={f("password")} required />
        <input className="input" placeholder="Phone (optional)" value={form.phone}    onChange={f("phone")} />
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? "Creating…" : "Create Account"}
        </button>
        <p className="text-center text-sm text-gray-500">
          Already have an account? <Link to="/login" className="text-amber-600 font-medium">Sign In</Link>
        </p>
      </form>
    </div>
  );
}
