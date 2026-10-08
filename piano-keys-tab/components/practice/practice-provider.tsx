"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import {
  AUTOSCROLL_SPEEDS,
  FONT_FAMILIES,
  FONT_SIZES,
  LINE_SPACINGS,
  NOTE_SPACINGS,
  SECTION_SPACINGS,
  TRANSPOSE_MAX,
  TRANSPOSE_MIN,
} from "@/lib/constants";
import type { SettingsInput } from "@/lib/validation";
import { putJson } from "@/lib/api-client";
import { unlockAudio } from "@/lib/audio";

/**
 * Practice-mode preferences.
 *
 * Source of truth while practising: this context (fast, offline-friendly).
 * Persistence: `localStorage` immediately, then a debounced PUT to
 * `/api/user/settings` for signed-in users so preferences follow the account.
 */

const STORAGE_KEY = "piano-keys-tab:practice";

export interface PracticeSettings extends SettingsInput {
  /** Extra display-only toggles that are not part of the API payload. */
  autoScroll: boolean;
  fullscreen: boolean;
}

interface PracticeContextValue extends PracticeSettings {
  containerRef: RefObject<HTMLDivElement | null>;
  setTranspose: (value: number) => void;
  stepTranspose: (delta: number) => void;
  setBpm: (value: number) => void;
  setFontSize: (value: PracticeSettings["fontSize"]) => void;
  setFontFamily: (value: PracticeSettings["fontFamily"]) => void;
  setLineSpacing: (value: PracticeSettings["lineSpacing"]) => void;
  setNoteSpacing: (value: PracticeSettings["noteSpacing"]) => void;
  setSectionSpacing: (value: PracticeSettings["sectionSpacing"]) => void;
  setAutoScrollSpeed: (value: PracticeSettings["autoScrollSpeed"]) => void;
  toggleAutoScroll: () => void;
  toggleKeyboard: () => void;
  toggleFullscreen: () => void;
  metronomeOn: boolean;
  setMetronomeOn: (on: boolean) => void;
  /** Transposed key label for the current song key, e.g. "D" when +2. */
  displayClasses: string;
  reset: () => void;
}

const PracticeContext = createContext<PracticeContextValue | null>(null);

const DEFAULTS: PracticeSettings = {
  fontSize: "MEDIUM",
  fontFamily: "MONO",
  lineSpacing: "NORMAL",
  noteSpacing: "NORMAL",
  sectionSpacing: "NORMAL",
  autoScrollSpeed: "MEDIUM",
  theme: "SYSTEM",
  metronomeBpm: 100,
  transpose: 0,
  showKeyboard: true,
  autoScroll: false,
  fullscreen: false,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function PracticeProvider({
  initial,
  signedIn,
  children,
}: {
  initial?: Partial<SettingsInput>;
  signedIn: boolean;
  children: ReactNode;
}) {
  const [settings, setSettings] = useState<PracticeSettings>({
    ...DEFAULTS,
    ...initial,
    // Fullscreen/auto-scroll are always session-local.
    autoScroll: false,
    fullscreen: false,
  });
  const [metronomeOn, setMetronomeOn] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1. Rehydrate from localStorage once on the client (never during SSR, so
  //    server and first client render match).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const stored = JSON.parse(raw) as Partial<PracticeSettings>;
        setSettings((current) => ({ ...current, ...stored, fullscreen: false }));
      }
    } catch {
      /* corrupted storage — keep defaults */
    }
  }, []);

  // 2. Persist changes: localStorage immediately, API after a short delay.
  const persist = useCallback(
    (next: PracticeSettings) => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* private mode */
      }

      if (!signedIn) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        const payload: SettingsInput = {
          fontSize: next.fontSize,
          fontFamily: next.fontFamily,
          lineSpacing: next.lineSpacing,
          noteSpacing: next.noteSpacing,
          sectionSpacing: next.sectionSpacing,
          autoScrollSpeed: next.autoScrollSpeed,
          theme: next.theme,
          metronomeBpm: next.metronomeBpm,
          transpose: next.transpose,
          showKeyboard: next.showKeyboard,
        };
        void putJson("/api/user/settings", payload).catch(() => undefined);
      }, 800);
    },
    [signedIn]
  );

  const update = useCallback(
    (patch: Partial<PracticeSettings>) => {
      setSettings((current) => {
        const next = { ...current, ...patch };
        persist(next);
        return next;
      });
    },
    [persist]
  );

  // 3. Metronome — self-correcting timeout loop (audio-accurate enough for practice).
  useEffect(() => {
    if (!metronomeOn) return;
    let cancelled = false;
    let beat = 0;
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      if (cancelled) return;
      // Dynamic import keeps the audio engine out of the initial bundle.
      import("@/lib/audio").then(({ playClick }) => playClick(beat % 4 === 0));
      beat += 1;
      const interval = 60_000 / clamp(settings.metronomeBpm, 30, 240);
      timer = setTimeout(tick, interval);
    };

    tick();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [metronomeOn, settings.metronomeBpm]);

  // 4. Autoscroll — requestAnimationFrame over the practice container.
  useEffect(() => {
    if (!settings.autoScroll) return;
    const speed =
      AUTOSCROLL_SPEEDS.find((s) => s.value === settings.autoScrollSpeed)?.pxPerSecond ?? 46;
    const el = containerRef.current;
    if (!el) return;

    let frame = 0;
    let last = performance.now();
    const step = (now: number) => {
      const delta = (now - last) / 1000;
      last = now;
      el.scrollTop += speed * delta;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 1) {
        update({ autoScroll: false });
        return;
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [settings.autoScroll, settings.autoScrollSpeed, update]);

  // 5. Fullscreen — hide the toolbar chrome while focused.
  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current ?? document.documentElement;
    if (!document.fullscreenElement) {
      void el.requestFullscreen?.().catch(() => undefined);
      update({ fullscreen: true });
    } else {
      void document.exitFullscreen?.().catch(() => undefined);
      update({ fullscreen: false });
    }
  }, [update]);

  useEffect(() => {
    const onChange = () => update({ fullscreen: !!document.fullscreenElement });
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [update]);

  const value = useMemo<PracticeContextValue>(() => {
    const displayClasses = [
      FONT_SIZES[settings.fontSize],
      FONT_FAMILIES[settings.fontFamily],
      LINE_SPACINGS[settings.lineSpacing],
      NOTE_SPACINGS[settings.noteSpacing],
      SECTION_SPACINGS[settings.sectionSpacing],
    ].join(" ");

    return {
      ...settings,
      containerRef,
      metronomeOn,
      displayClasses,
      setTranspose: (v) => update({ transpose: clamp(v, TRANSPOSE_MIN, TRANSPOSE_MAX) }),
      stepTranspose: (d) =>
        update({ transpose: clamp(settings.transpose + d, TRANSPOSE_MIN, TRANSPOSE_MAX) }),
      setBpm: (v) => update({ metronomeBpm: clamp(Math.round(v), 30, 240) }),
      setFontSize: (v) => update({ fontSize: v }),
      setFontFamily: (v) => update({ fontFamily: v }),
      setLineSpacing: (v) => update({ lineSpacing: v }),
      setNoteSpacing: (v) => update({ noteSpacing: v }),
      setSectionSpacing: (v) => update({ sectionSpacing: v }),
      setAutoScrollSpeed: (v) => update({ autoScrollSpeed: v }),
      toggleAutoScroll: () => {
        unlockAudio();
        update({ autoScroll: !settings.autoScroll });
      },
      toggleKeyboard: () => update({ showKeyboard: !settings.showKeyboard }),
      toggleFullscreen,
      setMetronomeOn: (on) => {
        unlockAudio();
        setMetronomeOn(on);
      },
      reset: () => {
        const next = { ...DEFAULTS, autoScroll: false, fullscreen: false };
        setSettings(next);
        persist(next);
      },
    };
  }, [settings, metronomeOn, update, toggleFullscreen, persist]);

  return <PracticeContext.Provider value={value}>{children}</PracticeContext.Provider>;
}

export function usePractice(): PracticeContextValue {
  const ctx = useContext(PracticeContext);
  if (!ctx) throw new Error("usePractice must be used inside <PracticeProvider>");
  return ctx;
}
