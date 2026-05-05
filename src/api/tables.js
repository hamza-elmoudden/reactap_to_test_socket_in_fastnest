import { get, patch } from "./client.js";
export const getTables   = (p={}) => get(`/tables?${new URLSearchParams(p)}`);
export const getTable    = (id)   => get(`/tables/${id}`);
export const updateTable = (id,d) => patch(`/tables/${id}`, d);
