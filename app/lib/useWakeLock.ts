import { useEffect, useRef, useCallback } from "react";

/**
 * Requests a Screen Wake Lock while `active` is true.
 *
 * - Re-acquires the lock automatically when the page becomes visible again
 *   (browsers release it when the tab is backgrounded).
 * - No-ops silently on browsers that don't support the API.
 * - On iOS, the Wake Lock API only works in standalone PWA mode (Add to Home Screen).
 *   In Safari it will silently do nothing (feature-detect returns false).
 */
export function useWakeLock(active: boolean) {
  const lockRef = useRef<WakeLockSentinel | null>(null);
  const activeRef = useRef(active);
  activeRef.current = active;

  const acquire = useCallback(async () => {
    if (!("wakeLock" in navigator)) return;
    if (lockRef.current && !lockRef.current.released) return;

    try {
      lockRef.current = await navigator.wakeLock.request("screen");
    } catch {
      // Silently ignore — can fail when tab is backgrounded or API unavailable
    }
  }, []);

  const release = useCallback(async () => {
    if (!lockRef.current || lockRef.current.released) return;
    try {
      await lockRef.current.release();
    } catch {
      // Ignore
    }
    lockRef.current = null;
  }, []);

  // Acquire / release when `active` changes
  useEffect(() => {
    if (active) {
      acquire();
    } else {
      release();
    }
  }, [active, acquire, release]);

  // Re-acquire when the page becomes visible again (browser releases lock on hide)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && activeRef.current) {
        acquire();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [acquire]);

  // Release on unmount
  useEffect(() => {
    return () => {
      release();
    };
  }, [release]);
}
