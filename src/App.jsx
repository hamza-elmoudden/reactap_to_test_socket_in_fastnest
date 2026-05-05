import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import LoginPage    from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import BookingPage  from "./pages/BookingPage.jsx";
import AdminPage    from "./pages/AdminPage.jsx";

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-amber-50">
      <div className="text-amber-600 text-lg animate-pulse">Loading…</div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/bookings" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login"    element={user ? <Navigate to={user.role === "customer" ? "/bookings" : "/admin"} /> : <LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/bookings" element={
        <ProtectedRoute roles={["customer"]}>
          <BookingPage />
        </ProtectedRoute>
      } />
      <Route path="/admin" element={
        <ProtectedRoute roles={["admin","staff"]}>
          <AdminPage />
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
