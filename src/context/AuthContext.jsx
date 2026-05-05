import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { me, login as apiLogin, logout as apiLogout, register as apiRegister, refresh as apiRefresh } from "../api/auth.js";
import { setTokens, clearTokens, getAccessToken } from "../api/client.js";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount — explicitly refresh first so _access is populated
  useEffect(() => {
    const rt = localStorage.getItem("refresh_token");
    if (rt) {
      apiRefresh({ refresh_token: rt })
        .then((d) => {
          setTokens(d.access_token, d.refresh_token);
          return me();
        })
        .then(setUser)
        .catch(() => clearTokens())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await apiLogin({ email, password });
    setTokens(data.access_token, data.refresh_token);
    const profile = await me();
    setUser(profile);
    return profile;
  }, []);

  const register = useCallback(async (form) => {
    const data = await apiRegister(form);
    return data;
  }, []);

  const logout = useCallback(async () => {
    const rt = localStorage.getItem("refresh_token");
    if (rt) await apiLogout({ refresh_token: rt }).catch(() => {});
    clearTokens();
    setUser(null);
  }, []);

  return (
    <AuthCtx.Provider value={{ user, loading, login, logout, register }}>
      {children}
    </AuthCtx.Provider>
  );
}
