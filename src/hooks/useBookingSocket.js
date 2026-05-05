import { useEffect, useRef, useCallback, useState } from "react";
import { getAccessToken } from "../api/client.js";

const WS_URL = "ws://localhost:8000/ws/bookings";
const MAX_RETRIES = 5;   // stop after 5 failed attempts (~1+2+4+8+16 = 31s)

/**
 * useBookingSocket — connects ONLY when explicitly enabled.
 *
 * status: "idle" | "connecting" | "connected" | "disconnected" | "unavailable"
 *   - "unavailable" = server unreachable after MAX_RETRIES, no more attempts
 */
export function useBookingSocket({
  enabled   = false,
  bookingId = null,
  adminMode = false,
  onEvent,
}) {
  const wsRef        = useRef(null);
  const timerRef     = useRef(null);
  const retries      = useRef(0);
  const mounted      = useRef(true);
  const closedByUs   = useRef(false);   // tracks intentional close to suppress onerror→onclose retry
  const [status, setStatus] = useState("idle");

  const send = useCallback((event, data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event, data }));
    }
  }, []);

  const connect = useCallback(() => {
    if (!mounted.current)         return;
    if (!enabled)                 return;
    if (!bookingId && !adminMode) return;
    if (retries.current >= MAX_RETRIES) {
      setStatus("unavailable");
      return;
    }

    const token = getAccessToken();
    if (!token) {
      timerRef.current = setTimeout(connect, 1000);
      return;
    }

    const state = wsRef.current?.readyState;
    if (state === WebSocket.OPEN || state === WebSocket.CONNECTING) return;

    setStatus("connecting");
    closedByUs.current = false;

    let socket;
    try {
      socket = new WebSocket(WS_URL);
    } catch {
      setStatus("disconnected");
      return;
    }
    wsRef.current = socket;

    socket.onopen = () => {
      if (!mounted.current) { closedByUs.current = true; socket.close(1000); return; }
      retries.current = 0;
      setStatus("connected");
      if (adminMode)      send("join:admin", { token });
      else if (bookingId) send("join", { booking_id: bookingId, token });
    };

    socket.onmessage = (e) => {
      if (!mounted.current) return;
      try {
        const { event, data } = JSON.parse(e.data);
        onEvent?.(event, data);
      } catch { /* ignore malformed frames */ }
    };

    socket.onerror = () => {
      // Mark as intentional so onclose doesn't schedule another retry on top
      closedByUs.current = true;
      socket.close();
    };

    socket.onclose = (ev) => {
      if (!mounted.current) return;
      // Our code closed it (onerror path, unmount, or disable) — no retry
      if (closedByUs.current || ev.code === 1000 || ev.code === 1001) return;

      setStatus("disconnected");
      if (!enabled) return;

      retries.current++;
      if (retries.current >= MAX_RETRIES) {
        setStatus("unavailable");
        return;
      }

      // Exponential back-off: 1s, 2s, 4s, 8s, 16s
      const delay = Math.min(1000 * 2 ** (retries.current - 1), 30_000);
      timerRef.current = setTimeout(connect, delay);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, bookingId, adminMode]);

  useEffect(() => {
    mounted.current = true;

    if (enabled) {
      retries.current = 0;   // reset counter whenever enabled flips on
      connect();
    } else {
      closedByUs.current = true;
      wsRef.current?.close(1000);
      setStatus("idle");
    }

    return () => {
      mounted.current    = false;
      closedByUs.current = true;
      clearTimeout(timerRef.current);
      wsRef.current?.close(1000);
    };
  }, [enabled, connect]);

  return { send, status };
}
