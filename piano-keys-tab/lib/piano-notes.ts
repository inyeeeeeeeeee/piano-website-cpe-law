/**
 * Pitch helpers shared by the arrangement view, the interactive keyboard and
 * the Web Audio engine.
 *
 * Notes are stored in scientific pitch notation ("C4", "F#3", "Bb5") and
 * converted to MIDI numbers so transposition is a single integer addition.
 */

const SEMITONES: Record<string, number> = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
};

const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/** "C4" -> 60. Returns null for anything that is not a note name. */
export function noteToMidi(note: string): number | null {
  const match = /^([A-G][#b]?)(-?\d)$/.exec(note.trim());
  if (!match) return null;
  const pitch = SEMITONES[match[1]];
  if (pitch === undefined) return null;
  const octave = Number.parseInt(match[2], 10);
  if (!Number.isFinite(octave)) return null;
  return (octave + 1) * 12 + pitch;
}

/** 60 -> "C4". */
export function midiToNote(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  const pitch = SHARP_NAMES[((midi % 12) + 12) % 12];
  return `${pitch}${octave}`;
}

/** Transpose a stored note by `semitones`, keeping enharmonic spelling simple. */
export function transposeNote(note: string, semitones: number): string {
  const midi = noteToMidi(note);
  if (midi === null) return note;
  return midiToNote(midi + semitones);
}

/** Equal-temperament frequency for a MIDI number (A4 = 440 Hz). */
export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function isBlackKey(midi: number): boolean {
  return [1, 3, 6, 8, 10].includes(((midi % 12) + 12) % 12);
}

/** Human label for a MIDI number, e.g. 61 -> "C#4". */
export function keyLabel(midi: number): string {
  return midiToNote(midi);
}
