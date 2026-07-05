// Keep the screen awake while the timer is running, via the Screen Wake Lock API.
//
// The lock is automatically released by the browser when the tab is hidden, so we
// re-acquire it on `visibilitychange` whenever we should still be holding one.

import { useEffect, useRef } from "react";

export function useWakeLock(active: boolean): void {
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    const wakeLock = navigator.wakeLock;
    if (!wakeLock) return;

    let cancelled = false;

    const acquire = async () => {
      if (cancelled || sentinelRef.current) return;
      try {
        const sentinel = await wakeLock.request("screen");
        if (cancelled) {
          void sentinel.release();
          return;
        }
        sentinelRef.current = sentinel;
        sentinel.addEventListener("release", () => {
          sentinelRef.current = null;
        });
      } catch {
        // request can reject if the document is not visible or the user denies it;
        // nothing actionable, just skip.
      }
    };

    const release = () => {
      const sentinel = sentinelRef.current;
      sentinelRef.current = null;
      if (sentinel) void sentinel.release();
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible" && active) {
        void acquire();
      }
    };

    if (active) {
      void acquire();
      document.addEventListener("visibilitychange", onVisibility);
    }

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      release();
    };
  }, [active]);
}
