import { get, post, patch } from "./client.js";
export const getPlates   = (p={}) => get(`/plates?${new URLSearchParams(p)}`);
export const createPlate = (d)    => post("/plates", d);
export const togglePlate = (id)   => patch(`/plates/${id}/toggle`);
