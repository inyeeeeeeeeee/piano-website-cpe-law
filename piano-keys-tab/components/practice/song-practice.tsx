"use client";

import { useEffect, useMemo, useState } from "react";
import { PracticeProvider, usePractice } from "@/components/practice/practice-provider";
import { PracticeToolbar } from "@/components/practice/practice-toolbar";
import { ArrangementView, type SectionView } from "@/components/piano/arrangement-view";
import { PianoKeyboard } from "@/components/piano/piano-keyboard";
import { Badge, DifficultyBadge, KeyBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { transposeKey } from "@/lib/constants";
import { transposeNote } from "@/lib/piano-notes";
import { playChord } from "@/lib/audio";
import { cn } from "@/lib/utils";
import type { ArrangementEvent } from "@/types/arrangement";
import { Pause, Play, SkipBack } from "lucide-react";

export interface PracticeVersion {
  id: string;
  name: string;
  description: string | null;
  difficulty: string;
  musicalKey: string;
  bpm: number;
  sections: SectionView[];
}

/** Beats (in 4/4) represented by each stored note duration. */
const DURATION_BEATS: Record<string, number> = {
  whole: 4,
  "dotted-half": 3,
  half: 2,
  "dotted-quarter": 1.5,
  quarter: 1,
  eighth: 0.5,
  sixteenth: 0.25,
};

interface Step {
  section: number;
  event: number;
  data: ArrangementEvent;
}

function SongPracticeInner({
  versions,
  songKey,
}: {
  versions: PracticeVersion[];
  songKey: string;
}) {
  const p = usePractice();
  const [versionIndex, setVersionIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [cursor, setCursor] = useState<{ section: number; event: number } | null>(null);

  const version = versions[versionIndex] ?? versions[0];

  // Flatten every event so play-along can walk the whole song linearly.
  const steps = useMemo<Step[]>(() => {
    const out: Step[] = [];
    version?.sections.forEach((section, sectionIndex) => {
      section.events.forEach((event, eventIndex) => {
        out.push({ section: sectionIndex, event: eventIndex, data: event });
      });
    });
    return out;
  }, [version]);

  const currentStepIndex = cursor
    ? steps.findIndex((s) => s.section === cursor.section && s.event === cursor.event)
    : -1;

  // Play-along: advance the cursor in real time using the chosen tempo.
  useEffect(() => {
    if (!playing) return;
    if (currentStepIndex >= steps.length - 1) {
      setPlaying(false);
      return;
    }
    const next = steps[currentStepIndex + 1];
    const beats = DURATION_BEATS[next.data.duration ?? "quarter"] ?? 1;
    const ms = (60_000 / Math.max(30, p.metronomeBpm)) * beats;

    const timer = setTimeout(() => {
      setCursor({ section: next.section, event: next.event });
      const notes = next.data.rest
        ? []
        : next.data.notes.map((n) => transposeNote(n, p.transpose));
      if (notes.length > 0) playChord(notes, Math.min(900, ms * 0.9), next.data.velocity ?? 100);
    }, ms);

    return () => clearTimeout(timer);
  }, [playing, currentStepIndex, steps, p.metronomeBpm, p.transpose]);

  if (!version) return null;

  const activeNotes = cursor
    ? (version.sections[cursor.section]?.events[cursor.event]?.notes ?? []).map((n) =>
        transposeNote(n, p.transpose)
      )
    : [];

  const referenceNotes = version.sections
    .flatMap((s) => s.events)
    .flatMap((e) => e.notes)
    .map((n) => transposeNote(n, p.transpose));

  const transposedKey = transposeKey(songKey || version.musicalKey, p.transpose);
  const firstNoteStep = currentStepIndex < 0 ? 0 : currentStepIndex;

  return (
    <div className="space-y-5">
      {/* Version picker + at-a-glance info */}
      <div className="flex flex-wrap items-center gap-2">
        {versions.map((v, index) => (
          <button
            key={v.id}
            type="button"
            onClick={() => {
              setVersionIndex(index);
              setCursor(null);
              setPlaying(false);
            }}
            aria-pressed={index === versionIndex}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm font-medium transition",
              index === versionIndex
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:bg-muted"
            )}
          >
            {v.name}
          </button>
        ))}
        <span className="ml-auto flex flex-wrap items-center gap-2">
          <DifficultyBadge value={version.difficulty} />
          <KeyBadge value={transposedKey} />
          <Badge className="bg-muted text-muted-foreground ring-border">
            {p.metronomeBpm} BPM
          </Badge>
        </span>
      </div>

      <PracticeToolbar />

      {/* Transport */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-muted/60 px-4 py-3">
        <Button
          size="sm"
          onClick={() => {
            setPlaying((value) => !value);
            if (!playing && currentStepIndex < 0 && steps.length > 0) {
              const first = steps[0];
              setCursor({ section: first.section, event: first.event });
            }
          }}
          disabled={steps.length === 0}
        >
          {playing ? (
            <>
              <Pause className="h-4 w-4" aria-hidden="true" /> Pause
            </>
          ) : (
            <>
              <Play className="h-4 w-4" aria-hidden="true" /> Play along
            </>
          )}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setPlaying(false);
            setCursor(null);
          }}
          disabled={!cursor}
        >
          <SkipBack className="h-4 w-4" aria-hidden="true" /> Stop
        </Button>
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {cursor
            ? `Section ${cursor.section + 1} · event ${cursor.event + 1} of ${steps.length}`
            : "Press play to walk through the arrangement at the current tempo."}
        </p>
        <span className="ml-auto text-xs text-muted-foreground">
          Event {steps.length === 0 ? 0 : firstNoteStep + 1} / {steps.length}
        </span>
      </div>

      {/* Arrangement */}
      <div ref={p.containerRef} className="max-h-[70vh] overflow-y-auto rounded-2xl border border-border bg-card p-5">
        <ArrangementView
          sections={version.sections}
          transpose={p.transpose}
          cursor={cursor}
          onJump={(section, event) => {
            setCursor({ section, event });
            const notes = version.sections[section]?.events[event]?.notes ?? [];
            if (notes.length > 0) {
              playChord(
                notes.map((n) => transposeNote(n, p.transpose)),
                600
              );
            }
          }}
          className={p.displayClasses}
        />
      </div>

      {p.showKeyboard ? (
        <PianoKeyboard notes={activeNotes} referenceNotes={referenceNotes} />
      ) : null}
    </div>
  );
}

export function SongPractice({
  versions,
  songKey,
  initialSettings,
  signedIn,
}: {
  versions: PracticeVersion[];
  songKey: string;
  initialSettings?: Partial<import("@/lib/validation").SettingsInput>;
  signedIn: boolean;
}) {
  return (
    <PracticeProvider initial={initialSettings} signedIn={signedIn}>
      <SongPracticeInner versions={versions} songKey={songKey} />
    </PracticeProvider>
  );
}
