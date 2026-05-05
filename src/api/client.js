const BASE = "http://localhost:8000";
let _access = null;
let _refresh = localStorage.getItem("refresh_token") || null;

export const setTokens = (a, r) => {
  _access = a;
  if (r) { _refresh = r; localStorage.setItem("refresh_token", r); }
};
export const clearTokens = () => {
  _access = _refresh = null; localStorage.removeItem("refresh_token");
};
export const getAccessToken = () => _access;

async function refreshAccess() {
  if (!_refresh) throw new Error("No refresh token");
  const res = await fetch(`${BASE}/auth/refresh`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: _refresh }),
  });
  if (!res.ok) { clearTokens(); throw new Error("Session expired"); }
  const d = await res.json();
  setTokens(d.access_token, d.refresh_token);
  return d.access_token;
}

export async function api(path, opts = {}, retry = true) {
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  if (_access) headers["Authorization"] = `Bearer ${_access}`;
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  if (res.status === 401 && retry) {
    try { await refreshAccess(); return api(path, opts, false); }
    catch { clearTokens(); window.location.href = "/login"; return; }
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw { status: res.status, ...data };
  return data;
}
export const get   = (p, o)    => api(p, { method: "GET",    ...o });
export const post  = (p, body) => api(p, { method: "POST",   body: JSON.stringify(body) });
export const patch = (p, body) => api(p, { method: "PATCH",  ...(body !== undefined && { body: JSON.stringify(body) }) });
export const del   = (p)       => api(p, { method: "DELETE" });
