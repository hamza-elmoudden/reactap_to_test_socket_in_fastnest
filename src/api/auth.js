import { post, get } from "./client.js";
export const register = (d) => post("/auth/register", d);
export const login    = (d) => post("/auth/login", d);
export const refresh  = (d) => post("/auth/refresh", d);
export const logout   = (d) => post("/auth/logout", d);
export const me       = ()  => get("/auth/me");
