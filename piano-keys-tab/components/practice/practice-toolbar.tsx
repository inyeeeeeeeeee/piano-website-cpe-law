"use client";

import { useState } from "react";
import {
  AlignLeft,
  ArrowDownUp,
  ArrowLeft,
  ArrowRight,
  Eye,
  Keyboard,
  Maximize2,
  Minus,
  Music4,
  Plus,
  RotateCcw,
  Type,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AUTOSCROLL_SPEEDS,
  FONT_FAMILIES,
  FONT_SIZES,
  LINE_SPACINGS,
  NOTE_SPACINGS,
  SECTION_SPACINGS,
  TRANSPOSE_MAX,
  TRANSPOSE_MIN,
  type AutoScrollSpeed,
  type FontFamilyKey,
  type FontSizeKey,
  type LineSpacingKey,
  type NoteSpacingKey,
  type SectionSpacingKey,
} from "@/lib/constants";
import { usePractice } from "./practice-provider";

/**
 * Practice controls shown above the arrangement: transposition, metronome,
 * auto-scroll, display settings and fullscreen. Transport (play/stop) lives
 * in `song-practice.tsx`; this toolbar only changes *how* the tab is shown.
 */
export function PracticeToolbar({ className = "" }: { className?: string }) {
  const p = usePractice();
  const [open, setOpen] = useState(false);

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2">
        {/* Transpose */}
        <div
          className="flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1"
          role="group"
          aria-label="Transpose"
        >
          <button
            type="button"
            aria-label="Transpose down a semitone"
            onClick={() => p.stepTranspose(-1)}
            disabled={p.transpose <= TRANSPOSE_MIN}
            className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-40"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
          </button>
          <span className="min-w-14 text-center text-xs font-medium text-foreground">
            {p.transpose > 0 ? `+${p.transpose}` : p.transpose} st
          </span>
          <button
            type="button"
            aria-label="Transpose up a semitone"
            onClick={() => p.stepTranspose(1)}
            disabled={p.transpose >= TRANSPOSE_MAX}
            className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-40"
          >
            <ArrowRight className="size-3.5" aria-hidden />
          </button>
        </div>

        {/* Metronome */}
        <div className="flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1">
          <button
            type="button"
            aria-pressed={p.metronomeOn}
            onClick={() => p.setMetronomeOn(!p.metronomeOn)}
            className={`rounded p-1 ${p.metronomeOn ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
            aria-label="Toggle metronome"
          >
            <Music4 className="size-3.5" aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Decrease tempo"
            onClick={() => p.setBpm(p.metronomeBpm - 5)}
            className="rounded p-1 text-muted-foreground hover:text-foreground"
          >
            <Minus className="size-3" aria-hidden />
          </button>
          <span className="min-w-14 text-center text-xs font-medium text-foreground">
            {p.metronomeBpm} BPM
          </span>
          <button
            type="button"
            aria-label="Increase tempo"
            onClick={() => p.setBpm(p.metronomeBpm + 5)}
            className="rounded p-1 text-muted-foreground hover:text-foreground"
          >
            <Plus className="size-3" aria-hidden />
          </button>
        </div>

        {/* Auto-scroll */}
        <Button
          size="sm"
          variant={p.autoScroll ? "primary" : "outline"}
          onClick={p.toggleAutoScroll}
          aria-pressed={p.autoScroll}
        >
          <ArrowDownUp className="size-4" aria-hidden /> Auto-scroll
        </Button>

        <Button
          size="sm"
          variant={p.showKeyboard ? "primary" : "outline"}
          onClick={p.toggleKeyboard}
          aria-pressed={p.showKeyboard}
        >
          <Keyboard className="size-4" aria-hidden /> Keys
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <Type className="size-4" aria-hidden /> Display
        </Button>

        <Button size="sm" variant="outline" onClick={p.toggleFullscreen} aria-label="Toggle fullscreen">
          {p.fullscreen ? <X className="size-4" aria-hidden /> : <Maximize2 className="size-4" aria-hidden />}
          {p.fullscreen ? "Exit" : "Fullscreen"}
        </Button>
      </div>

      {open ? <DisplayPanel /> : null}
    </div>
  );
}

function Choice<T extends string>({
  label,
  icon,
  options,
  value,
  onChange,
}: {
  label: string;
  icon?: React.ReactNode;
  options: readonly { value: T; label: string }[] | readonly T[];
  value: T;
  onChange: (value: T) => void;
}) {
  const normalized = options.map((o) =>
    typeof o === "string" ? { value: o, label: o.toLowerCase() } : o
  );
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 flex flex-wrap gap-1">
        {normalized.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={o.value === value}
            className={`rounded-md border px-2 py-1 text-xs capitalize transition ${
              o.value === value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function DisplayPanel() {
  const p = usePractice();
  return (
    <div className="mt-3 grid gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-3">
      <Choice<FontSizeKey>
        label="Font size"
        icon={<Type className="size-3.5" aria-hidden />}
        options={(Object.keys(FONT_SIZES) as FontSizeKey[]).map((k) => ({
          value: k,
          label: k === "XLARGE" ? "XL" : k.toLowerCase(),
        }))}
        value={p.fontSize}
        onChange={p.setFontSize}
      />
      <Choice<FontFamilyKey>
        label="Font"
        options={(Object.keys(FONT_FAMILIES) as FontFamilyKey[]).map((k) => ({
          value: k,
          label: k.toLowerCase(),
        }))}
        value={p.fontFamily}
        onChange={p.setFontFamily}
      />
      <Choice<LineSpacingKey>
        label="Line spacing"
        icon={<AlignLeft className="size-3.5" aria-hidden />}
        options={(Object.keys(LINE_SPACINGS) as LineSpacingKey[]).map((k) => ({
          value: k,
          label: k.toLowerCase(),
        }))}
        value={p.lineSpacing}
        onChange={p.setLineSpacing}
      />
      <Choice<NoteSpacingKey>
        label="Note spacing"
        options={(Object.keys(NOTE_SPACINGS) as NoteSpacingKey[]).map((k) => ({
          value: k,
          label: k.toLowerCase(),
        }))}
        value={p.noteSpacing}
        onChange={p.setNoteSpacing}
      />
      <Choice<SectionSpacingKey>
        label="Section spacing"
        options={(Object.keys(SECTION_SPACINGS) as SectionSpacingKey[]).map((k) => ({
          value: k,
          label: k.toLowerCase(),
        }))}
        value={p.sectionSpacing}
        onChange={p.setSectionSpacing}
      />
      <Choice<AutoScrollSpeed>
        label="Scroll speed"
        icon={<Eye className="size-3.5" aria-hidden />}
        options={AUTOSCROLL_SPEEDS.map((s) => ({ value: s.value, label: s.label }))}
        value={p.autoScrollSpeed}
        onChange={p.setAutoScrollSpeed}
      />
      <div className="sm:col-span-2 lg:col-span-3">
        <Button size="sm" variant="ghost" onClick={p.reset}>
          <RotateCcw className="size-4" aria-hidden /> Reset display settings
        </Button>
      </div>
    </div>
  );
}
