"use client";

import { isBlackKey, midiToFrequency, noteToMidi } from "@/lib/piano-notes";

/**
 * Minimal Web Audio engine for the practice view.
 *
 * • One lazily created AudioContext (browsers require a user gesture first).
 * • A single gain envelope per note so chords sound together without clicks.
 * • Everything is created on demand — no audio files, no network requests.
 */

let context: AudioContext | null = null;
let master: GainNode | null = null;

function ensureContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor: typeof AudioContext | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;

  if (!context) {
    context = new Ctor();
    master = context.createGain();
    master.gain.value = 0.35;
    master.connect(context.destination);
  }
  if (context.state === "suspended") {
    void context.resume();
  }
  return context;
}

/** Triggered by any user interaction so iOS/Safari allows later sounds. */
export function unlockAudio(): void {
  ensureContext();
}

/** Play a chord (array of note names) for `durationMs` starting now. */
export function playChord(notes: string[], durationMs = 500, velocity = 100): void {
  const ctx = ensureContext();
  if (!ctx || !master) return;

  const now = ctx.currentTime;
  const gain = ctx.createGain();
  gain.gain.value = Math.min(1, Math.max(0.05, velocity / 127));
  gain.connect(master);

  for (const note of notes) {
    const midi = noteToMidi(note);
    if (midi === null) continue;
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = midiToFrequency(midi);

    const noteGain = ctx.createGain();
    noteGain.gain.setValueAtTime(0.0001, now);
    noteGain.gain.exponentialRampToValueAtTime(0.6, now + 0.01);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);

    osc.connect(noteGain);
    noteGain.connect(gain);
    osc.start(now);
    osc.stop(now + durationMs / 1000 + 0.05);
  }
}

/** Short click used by the metronome (accent = downbeat). */
export function playClick(accent = false): void {
  const ctx = ensureContext();
  if (!ctx || !master) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "square";
  osc.frequency.value = accent ? 1600 : 1000;
  gain.gain.setValueAtTime(accent ? 0.25 : 0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

  osc.connect(gain);
  gain.connect(master);
  osc.start(now);
  osc.stop(now + 0.07);
}

/** A key press on the on-screen keyboard: highlight + sound. */
export function pressKey(note: string, durationMs = 450): void {
  playChord([note], durationMs, 110);
}

export { isBlackKey };
