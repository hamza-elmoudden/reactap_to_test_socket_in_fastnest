import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useNavigate, Link } from "react-router-dom";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy,  setBusy]  = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const user = await login(form.email, form.password);
      navigate(user.role === "customer" ? "/bookings" : "/admin");
    } catch (err) {
      setError(err?.detail?.message || "Invalid credentials");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-amber-50">
      <form onSubmit={submit} className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm space-y-5">
        <h1 className="text-2xl font-bold text-center text-amber-700">🍽️ Restaurant</h1>
        <h2 className="text-lg font-semibold text-center text-gray-700">Sign In</h2>
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        <input className="input" type="email" placeholder="Email"
          value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} required />
        <input className="input" type="password" placeholder="Password"
          value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} required />
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? "Signing in…" : "Sign In"}
        </button>
        <p className="text-center text-sm text-gray-500">
          No account? <Link to="/register" className="text-amber-600 font-medium">Register</Link>
        </p>
      </form>
    </div>
  );
}
