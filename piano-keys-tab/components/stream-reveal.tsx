"use client";

import { useEffect } from "react";

/**
 * Safety net for React's streamed-server-rendering reveal.
 *
 * When a route streams in behind `loading.tsx`/`Suspense`, React delivers the
 * resolved content inside a `hidden` element and un-hides it from an inline
 * script that schedules `$RV` (the reveal step) with `requestAnimationFrame`
 * when no previous reveal time exists. Browsers do not run animation frames
 * for hidden documents, so a page that streams while its tab/window is not
 * visible would otherwise sit on the loading fallback until it is focused.
 *
 * This component only bridges that gap with ordinary timers — which browsers
 * still run (throttled) for hidden documents — and only while the document is
 * actually hidden; once visible, React's own rAF path is authoritative.
 * Everything is feature-detected and wrapped defensively: if React ever stops
 * exposing these internals, this hook silently no-ops and the stock behaviour
 * applies.
 */
declare global {
  interface Window {
    /** React's queue of pending boundary reveals: [marker, content, …]. */
    $RB?: unknown[];
    /** React's reveal function; empties the queue it is given. */
    $RV?: (queue: unknown[]) => void;
  }
}

export function StreamReveal() {
  useEffect(() => {
    const kick = () => {
      try {
        const queue = window.$RB;
        if (Array.isArray(queue) && queue.length > 0 && typeof window.$RV === "function") {
          window.$RV(queue);
        }
      } catch {
        /* Internals changed — React's own reveal still runs on focus. */
      }
    };

    let timer: ReturnType<typeof setInterval> | null = null;

    const stop = () => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };

    const start = () => {
      if (timer !== null) return;
      kick();
      timer = setInterval(kick, 700);
    };

    const sync = () => {
      if (document.visibilityState === "visible") {
        kick(); // Flush anything that queued up while we were hidden.
        stop(); // rAF works again; React can take it from here.
      } else {
        start();
      }
    };

    sync();
    document.addEventListener("visibilitychange", sync);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  return null;
}
