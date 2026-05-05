import { get, post, patch, del } from "./client.js";
export const getBookings    = (p={}) => get(`/bookings?${new URLSearchParams(p)}`);
export const getBooking     = (id)   => get(`/bookings/${id}`);
export const createBooking  = (d)    => post("/bookings", d);
export const activateBooking= (id)   => patch(`/bookings/${id}/activate`);
export const completeBooking= (id)   => patch(`/bookings/${id}/complete`);
export const cancelBooking  = (id)   => del(`/bookings/${id}`);
