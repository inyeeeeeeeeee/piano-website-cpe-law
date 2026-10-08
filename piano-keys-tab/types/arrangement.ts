/**
 * Structured arrangement data.
 *
 * Arrangements are stored twice in the database:
 *   • `content`      — pre-rendered text (RH:/LH: lines) used for display
 *   • `structuredData` — this typed event list, enabling the interactive piano
 *     keyboard today and MIDI playback / import / export later.
 */

export type Hand = "right" | "left";

export type NoteDuration =
  | "whole"
  | "dotted-half"
  | "half"
  | "dotted-quarter"
  | "quarter"
  | "eighth"
  | "sixteenth";

export interface ArrangementEvent {
  /** Which hand plays the event. */
  hand: Hand;
  /**
   * Note names with octave, e.g. ["C4", "E4", "G4"]. Empty when `rest` is true.
   * Octaves use scientific pitch notation (C4 = middle C).
   */
  notes: string[];
  duration?: NoteDuration;
  /** 1-based beat within the bar where the event starts. */
  beat?: number;
  /** 1-based bar number. */
  bar?: number;
  /** Optional chord symbol, e.g. "Cmaj7". */
  chord?: string;
  /** MIDI-style velocity 1..127 (dynamics). */
  velocity?: number;
  /** Explicit rest. */
  rest?: boolean;
}

export interface ArrangementSection {
  name: string;
  content: string;
  events: ArrangementEvent[];
}

export interface ArrangementPayload {
  sections: ArrangementSection[];
}

/** A note as stored, e.g. "C#4" / "Bb3" — parsed by the piano helpers. */
export interface ParsedNote {
  pitch: string; // "C", "C#"
  octave: number; // 4
  isBlack: boolean;
}
