"use client";

import { cn } from "@/lib/utils";
import { transposeNote } from "@/lib/piano-notes";
import { playChord } from "@/lib/audio";
import type { ArrangementEvent } from "@/types/arrangement";

export interface SectionView {
  name: string;
  content: string;
  events: ArrangementEvent[];
}

const DURATION_LABEL: Record<string, string> = {
  whole: "1",
  "dotted-half": "3/4",
  half: "1/2",
  "dotted-quarter": "3/8",
  quarter: "1/4",
  eighth: "1/8",
  sixteenth: "1/16",
};

/**
 * Renders one arrangement.
 *
 * Structured events take priority (they drive the interactive keyboard and the
 * play-along cursor); the pre-rendered `content` text is the fallback for
 * sections that were entered as plain tab text.
 */
export function ArrangementView({
  sections,
  transpose,
  cursor,
  onJump,
  className,
}: {
  sections: SectionView[];
  transpose: number;
  cursor?: { section: number; event: number } | null;
  onJump?: (sectionIndex: number, eventIndex: number) => void;
  className?: string;
}) {
  if (sections.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-muted/50 p-6 text-center text-sm text-muted-foreground">
        This version has no sections yet.
      </p>
    );
  }

  return (
    <div className={cn("space-y-8", className)}>
      {sections.map((section, sectionIndex) => {
        const hasEvents = section.events.length > 0;
        return (
          <section
            key={`${section.name}-${sectionIndex}`}
            id={`section-${sectionIndex}`}
            aria-label={section.name}
          >
            <div className="mb-3 flex items-center gap-3">
              <h3 className="text-base font-bold uppercase tracking-wide text-primary">
                {section.name}
              </h3>
              <span className="h-px flex-1 bg-border" aria-hidden="true" />
            </div>

            {hasEvents ? (
              <ol className="flex flex-wrap gap-2">
                {section.events.map((event, eventIndex) => {
                  const active = cursor?.section === sectionIndex && cursor?.event === eventIndex;
                  const notes = event.rest
                    ? []
                    : event.notes.map((n) => transposeNote(n, transpose));

                  return (
                    <li key={eventIndex}>
                      <button
                        type="button"
                        onClick={() => {
                          if (notes.length > 0) playChord(notes, 600, event.velocity ?? 100);
                          onJump?.(sectionIndex, eventIndex);
                        }}
                        aria-current={active ? "step" : undefined}
                        className={cn(
                          "flex min-w-[3.5rem] flex-col items-center gap-0.5 rounded-lg border px-2.5 py-1.5 text-xs transition",
                          "focus-visible:outline-2 focus-visible:outline-ring",
                          active
                            ? "border-primary bg-primary text-primary-foreground shadow-sm"
                            : "border-border bg-card text-foreground hover:border-primary/50 hover:bg-primary-soft"
                        )}
                        title={
                          notes.length > 0
                            ? `Play ${notes.join(" ")}`
                            : "Rest — click to move the play-along cursor"
                        }
                      >
                        {event.rest || notes.length === 0 ? (
                          <span className="font-semibold opacity-70">rest</span>
                        ) : (
                          <>
                            <span className="font-mono font-semibold tracking-tight">
                              {notes.join(" ")}
                            </span>
                            {event.chord ? (
                              <span className="text-[10px] opacity-80">{event.chord}</span>
                            ) : null}
                          </>
                        )}
                        <span className="flex items-center gap-1 text-[10px] opacity-70">
                          {event.bar ? <span>b{event.bar}</span> : null}
                          {event.beat ? <span>· beat {event.beat}</span> : null}
                          {event.duration ? (
                            <span>· {DURATION_LABEL[event.duration]}</span>
                          ) : null}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <pre className="whitespace-pre-wrap rounded-xl border border-border bg-muted/50 p-4 font-mono text-sm leading-relaxed text-foreground">
                {section.content || "(empty section)"}
              </pre>
            )}
          </section>
        );
      })}
    </div>
  );
}
