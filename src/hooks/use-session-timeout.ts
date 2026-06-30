"use client";
import { useEffect, useRef, useCallback, useState } from "react";
import { useRouter } from "next/navigation";

const INACTIVITY_MS = 15 * 60 * 1000; // 15 min before warning
const WARNING_MS    =  2 * 60 * 1000; // 2 min countdown after warning

const ACTIVITY_EVENTS = [
  "mousemove", "mousedown", "keydown", "scroll", "touchstart", "click",
] as const;

export function useSessionTimeout() {
  const router = useRouter();
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  // Use a ref so event handlers always see the latest value without re-registering
  const warningActiveRef = useRef(false);
  const mainTimerRef     = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const warnTimerRef     = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const countdownRef     = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = useCallback(() => {
    if (mainTimerRef.current)    clearTimeout(mainTimerRef.current);
    if (warnTimerRef.current)    clearTimeout(warnTimerRef.current);
    if (countdownRef.current)    clearInterval(countdownRef.current);
  }, []);

  const doLogout = useCallback(async () => {
    clearTimers();
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("employee_cart");
    localStorage.removeItem("employee_order_queue");
    router.replace("/login");
  }, [clearTimers, router]);

  const startTimers = useCallback(() => {
    clearTimers();
    warningActiveRef.current = false;

    // After INACTIVITY_MS → show warning
    warnTimerRef.current = setTimeout(() => {
      warningActiveRef.current = true;
      setSecondsLeft(Math.round(WARNING_MS / 1000));
      setShowWarning(true);

      countdownRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            clearInterval(countdownRef.current!);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }, INACTIVITY_MS);

    // After INACTIVITY_MS + WARNING_MS → auto logout
    mainTimerRef.current = setTimeout(() => {
      doLogout();
    }, INACTIVITY_MS + WARNING_MS);
  }, [clearTimers, doLogout]);

  // Reset timer on any user activity (only while warning is not shown)
  const onActivity = useCallback(() => {
    if (!warningActiveRef.current) startTimers();
  }, [startTimers]);

  // "Stay logged in" button handler
  const extendSession = useCallback(() => {
    setShowWarning(false);
    startTimers();
  }, [startTimers]);

  useEffect(() => {
    ACTIVITY_EVENTS.forEach((e) =>
      window.addEventListener(e, onActivity, { passive: true })
    );
    startTimers();
    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
      clearTimers();
    };
  }, [onActivity, startTimers, clearTimers]);

  return { showWarning, secondsLeft, extendSession, doLogout };
}
