"use client";

import { useEffect, useMemo, useState } from "react";
import { isBlackKey, keyLabel, noteToMidi, midiToNote } from "@/lib/piano-notes";
import { pressKey, unlockAudio } from "@/lib/audio";
import { cn } from "@/lib/utils";

const MIN_MIDI = 36; // C2
const MAX_MIDI = 96; // C7

/**
 * Interactive piano keyboard.
 *
 * • Range adapts to the notes currently shown (always at least 2 octaves).
 * • Active notes are highlighted with both colour and a marker so the state is
 *   visible without relying on colour alone.
 * • Clicking a key plays it through Web Audio and flashes the highlight.
 */
export function PianoKeyboard({
  notes,
  referenceNotes = [],
  className,
}: {
  /** Transposed notes to highlight right now. */
  notes: string[];
  /** Notes used to auto-size the keyboard range. */
  referenceNotes?: string[];
  className?: string;
}) {
  const [flashed, setFlashed] = useState<string[]>([]);

  const activeMidis = useMemo(
    () => new Set(notes.map(noteToMidi).filter((m): m is number => m !== null)),
    [notes]
  );

  const range = useMemo(() => {
    const pool = [...referenceNotes, ...notes]
      .map(noteToMidi)
      .filter((m): m is number => m !== null && m >= MIN_MIDI && m <= MAX_MIDI);

    let min = pool.length ? Math.min(...pool) : 48;
    let max = pool.length ? Math.max(...pool) : 72;

    // Expand to full octaves, then guarantee at least two octaves of span.
    min = Math.floor(min / 12) * 12;
    max = Math.ceil((max + 1) / 12) * 12 - 1;
    while (max - min < 24) {
      if (min > MIN_MIDI) min -= 12;
      if (max < MAX_MIDI) max += 12;
      if (min <= MIN_MIDI && max >= MAX_MIDI) break;
    }
    return { min: Math.max(MIN_MIDI, min), max: Math.min(MAX_MIDI, max) };
  }, [referenceNotes, notes]);

  const midis = useMemo(() => {
    const all: number[] = [];
    for (let m = range.min; m <= range.max; m++) all.push(m);
    return all;
  }, [range]);

  const whites = midis.filter((m) => !isBlackKey(m));
  const blacks = midis.filter((m) => isBlackKey(m));
  const whiteIndex = new Map(whites.map((m, i) => [m, i]));

  // Auto-scroll into view when the range shifts (transpose changes).
  useEffect(() => {
    setFlashed([]);
  }, [range.min, range.max]);

  function flash(note: string) {
    unlockAudio();
    pressKey(note);
    setFlashed((current) => Array.from(new Set([...current, note])));
    setTimeout(() => setFlashed((current) => current.filter((n) => n !== note)), 450);
  }

  const whiteWidth = 100 / Math.max(1, whites.length);

  return (
    <div
      role="group"
      aria-label="Interactive piano keyboard"
      className={cn("relative h-40 select-none sm:h-44", className)}
    >
      {/* White keys */}
      <div className="flex h-full w-full overflow-hidden rounded-xl border border-border bg-slate-200 shadow-inner dark:bg-slate-800">
        {whites.map((midi) => {
          const note = midiToNote(midi);
          const active = activeMidis.has(midi) || flashed.includes(note);
          return (
            <button
              key={midi}
              type="button"
              onClick={() => flash(note)}
              aria-label={`Play ${keyLabel(midi)}`}
              aria-pressed={active}
              style={active ? { background: "var(--key-white-active)" } : undefined}
              className={cn(
                "relative flex-1 border-r border-slate-300 last:border-r-0 dark:border-slate-600",
                "flex items-end justify-center pb-2 text-[10px] font-medium transition-colors",
                "piano-key-white",
                active ? "text-primary" : "text-slate-400 hover:brightness-95"
              )}
            >
              {midi % 12 === 0 ? <span aria-hidden="true">{midiToNote(midi)}</span> : null}
              {active ? (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-2 top-2 h-1.5 rounded-full bg-primary"
                />
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Black keys */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-full">
        {blacks.map((midi) => {
          const note = midiToNote(midi);
          const previousWhite = whites.filter((w) => w < midi).pop();
          if (previousWhite === undefined) return null;
          const active = activeMidis.has(midi) || flashed.includes(note);
          const left = (whiteIndex.get(previousWhite)! + 1) * whiteWidth;
          return (
            <button
              key={midi}
              type="button"
              onClick={() => flash(note)}
              aria-label={`Play ${keyLabel(midi)}`}
              aria-pressed={active}
              style={{
                left: `${left}%`,
                width: `${whiteWidth * 0.62}%`,
                transform: "translateX(-50%)",
                ...(active ? { background: "var(--key-black-active)" } : null),
              }}
              className={cn(
                "pointer-events-auto absolute top-0 h-[62%] rounded-b-md transition-colors piano-key-black",
                active ? "ring-2 ring-primary/70" : "hover:brightness-125"
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
