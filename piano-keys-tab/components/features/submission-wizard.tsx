"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  arrangementEventSchema,
  createSongSchema,
  difficultySchema,
  musicalKeySchema,
} from "@/lib/validation";
import { z } from "zod";
import { postJson, putJson, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";

import { DIFFICULTIES, MUSICAL_KEYS, DEFAULT_SECTIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Check, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";

export interface WizardInitial {
  songId: string;
  slug: string;
  title: string;
  artistId: string;
  newArtistName: undefined;
  album: string;
  releaseYear: string;
  difficulty: string;
  musicalKey: string;
  bpm: string;
  duration: string;
  description: string;
  tags: string;
  coverImage: string;
  attribution: string;
  source: string;
  license: string;
  copyright: string;
  versionId: string | null;
  versionName: string;
  sections: Array<{ name: string; content: string; eventsJson: string }>;
}

interface SectionDraft {
  name: string;
  content: string;
  eventsJson: string;
}

const STEPS = ["Song details", "Arrangement", "Review & submit"];

const inputClass =
  "h-10 rounded-lg border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-2 focus-visible:outline-ring";

export function SubmissionWizard({
  artists,
  initial,
  isAdmin,
}: {
  artists: Array<{ id: string; name: string }>;
  initial?: WizardInitial;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step 1 — metadata
  const [title, setTitle] = useState(initial?.title ?? "");
  const [artistMode, setArtistMode] = useState<"existing" | "new">(
    initial?.newArtistName ? "new" : initial?.artistId ? "existing" : artists.length > 0 ? "existing" : "new"
  );
  const [artistId, setArtistId] = useState(initial?.artistId ?? artists[0]?.id ?? "");
  const [newArtistName, setNewArtistName] = useState(initial?.newArtistName ?? "");
  const [album, setAlbum] = useState(initial?.album ?? "");
  const [releaseYear, setReleaseYear] = useState(initial?.releaseYear ?? "");
  const [difficulty, setDifficulty] = useState(initial?.difficulty ?? "INTERMEDIATE");
  const [musicalKey, setMusicalKey] = useState(initial?.musicalKey ?? "C");
  const [bpm, setBpm] = useState(initial?.bpm ?? "100");
  const [duration, setDuration] = useState(initial?.duration ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [tags, setTags] = useState(initial?.tags ?? "");
  const [coverImage, setCoverImage] = useState(initial?.coverImage ?? "");

  // Rights / attribution
  const [attribution, setAttribution] = useState(initial?.attribution ?? "");
  const [source, setSource] = useState(initial?.source ?? "");
  const [license, setLicense] = useState(initial?.license ?? "");
  const [copyright, setCopyright] = useState(initial?.copyright ?? "");

  // Step 2 — arrangement
  const [versionName, setVersionName] = useState(initial?.versionName ?? "Original");
  const [sections, setSections] = useState<SectionDraft[]>(
    initial?.sections ?? [{ name: "Intro", content: "", eventsJson: "[]" }]
  );

  // Step 3
  const [acknowledge, setAcknowledge] = useState(false);

  function updateSection(index: number, patch: Partial<SectionDraft>) {
    setSections((current) => current.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function validateStep(current: number): boolean {
    const found: Record<string, string> = {};

    if (current === 0) {
      if (title.trim().length < 1) found.title = "Title is required";
      if (artistMode === "existing" && !artistId) found.artistId = "Choose an artist";
      if (artistMode === "new" && newArtistName.trim().length < 2) {
        found.newArtistName = "Enter the artist name (min 2 characters)";
      }
      if (!difficultySchema.safeParse(difficulty).success) found.difficulty = "Choose a difficulty";
      if (!musicalKeySchema.safeParse(musicalKey).success) found.musicalKey = "Choose a key";
      const bpmValue = Number(bpm);
      if (!Number.isFinite(bpmValue) || bpmValue < 20 || bpmValue > 300) {
        found.bpm = "BPM must be between 20 and 300";
      }
      if (coverImage && !/^https?:\/\//i.test(coverImage)) {
        found.coverImage = "Cover must be a full URL (https://…)";
      }
    }

    if (current === 1) {
      if (versionName.trim().length < 1) found.versionName = "Version name is required";
      if (sections.length === 0) found.sections = "Add at least one section";
      sections.forEach((section, index) => {
        if (!section.name.trim()) found[`section-${index}`] = "Section name is required";
        if (section.eventsJson.trim()) {
          let parsed: unknown;
          try {
            parsed = JSON.parse(section.eventsJson);
          } catch {
            found[`section-${index}`] = "Events must be valid JSON";
            return;
          }
          const result = z.array(arrangementEventSchema).safeParse(parsed);
          if (!result.success) {
            found[`section-${index}`] = result.error.issues[0]?.message ?? "Invalid events";
          }
        }
      });
    }

    setErrors(found);
    if (Object.keys(found).length > 0) {
      toast.error(Object.values(found)[0]);
      return false;
    }
    return true;
  }

  function buildPayload() {
    const parsedSections = sections.map((section) => ({
      name: section.name.trim(),
      content: section.content,
      events: section.eventsJson.trim()
        ? (JSON.parse(section.eventsJson) as unknown[])
        : [],
    }));

    const numberOrUndefined = (value: string) =>
      value.trim() === "" ? undefined : Number(value);

    return {
      title: title.trim(),
      ...(artistMode === "existing" ? { artistId } : { newArtistName: newArtistName.trim() }),
      album: album.trim() || undefined,
      releaseYear: numberOrUndefined(releaseYear),
      difficulty,
      musicalKey,
      bpm: Number(bpm),
      duration: numberOrUndefined(duration),
      description: description.trim() || undefined,
      tags,
      coverImage: coverImage.trim() || undefined,
      attribution: attribution.trim() || undefined,
      source: source.trim() || undefined,
      license: license.trim() || undefined,
      copyright: copyright.trim() || undefined,
      version: {
        name: versionName.trim(),
        difficulty,
        musicalKey,
        bpm: Number(bpm),
        sections: parsedSections,
      },
    };
  }

  async function submit() {
    setBusy(true);
    try {
      const payload = buildPayload();
      const parsed = createSongSchema.safeParse(
        initial
          ? payload
          : { ...payload, acknowledge: true }
      );
      if (!parsed.success) {
        const first = parsed.error.issues[0];
        toast.error(first ? `${first.path.join(".")}: ${first.message}` : "Check the form values");
          return;
      }

      if (initial) {
        const { version, ...songFields } = payload;
        await putJson(`/api/songs/${initial.songId}`, songFields);
        if (initial.versionId) {
          await putJson(`/api/versions/${initial.versionId}`, version);
        }
        toast.success("Arrangement updated");
          router.push(`/songs/${initial.slug}`);
        return;
      }

      const res = await postJson<{ song: { id: string; slug: string; status: string } }>(
        "/api/songs",
        parsed.data
      );
      toast.success(
        isAdmin
          ? "Arrangement published"
          : "Submitted! A moderator will review it before it goes live."
      );
      router.push(res.song.status === "PUBLISHED" ? `/songs/${res.song.slug}` : "/dashboard");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not save the arrangement");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {/* Stepper */}
      <ol className="mb-8 flex flex-wrap items-center gap-2" aria-label="Submission steps">
        {STEPS.map((label, index) => (
          <li key={label} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => index < step && setStep(index)}
              disabled={index > step}
              aria-current={index === step ? "step" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition",
                index === step
                  ? "border-primary bg-primary text-primary-foreground"
                  : index < step
                    ? "border-border bg-card text-foreground hover:bg-muted"
                    : "border-border bg-card text-muted-foreground"
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full text-[11px]",
                  index < step ? "bg-primary-soft text-primary" : "bg-muted text-muted-foreground"
                )}
              >
                {index < step ? <Check className="h-3 w-3" aria-hidden="true" /> : index + 1}
              </span>
              {label}
            </button>
            {index < STEPS.length - 1 ? (
              <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            ) : null}
          </li>
        ))}
      </ol>

      {/* Step 1 */}
      {step === 0 ? (
        <section className="space-y-5 rounded-2xl border border-border bg-card p-6" aria-labelledby="step1">
          <h2 id="step1" className="text-lg font-bold">
            Song details
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title" htmlFor="f-title" error={errors.title} required className="sm:col-span-2">
              <Input id="f-title" value={title} onChange={(e) => setTitle(e.target.value)} invalid={!!errors.title} />
            </Field>

            <Field
              label="Artist"
              htmlFor="f-artist"
              error={errors.artistId ?? errors.newArtistName}
              required
            >
              {artistMode === "existing" ? (
                <Select
                  id="f-artist"
                  value={artistId}
                  onChange={(e) => setArtistId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select an artist…</option>
                  {artists.map((artist) => (
                    <option key={artist.id} value={artist.id}>
                      {artist.name}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  id="f-artist"
                  value={newArtistName}
                  onChange={(e) => setNewArtistName(e.target.value)}
                  placeholder="New artist name"
                />
              )}
            </Field>

            <Field label=" " htmlFor="f-artist-mode" hint="Pick an existing artist or add a new one.">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setArtistMode("existing")}
                  disabled={artists.length === 0}
                  className={cn(
                    "h-10 flex-1 rounded-lg border px-3 text-sm transition disabled:opacity-50",
                    artistMode === "existing"
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border hover:bg-muted"
                  )}
                >
                  Existing
                </button>
                <button
                  type="button"
                  onClick={() => setArtistMode("new")}
                  className={cn(
                    "h-10 flex-1 rounded-lg border px-3 text-sm transition",
                    artistMode === "new"
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border hover:bg-muted"
                  )}
                >
                  New artist
                </button>
              </div>
            </Field>

            <Field label="Album" htmlFor="f-album">
              <Input id="f-album" value={album} onChange={(e) => setAlbum(e.target.value)} />
            </Field>
            <Field label="Release year" htmlFor="f-year">
              <Input
                id="f-year"
                inputMode="numeric"
                value={releaseYear}
                onChange={(e) => setReleaseYear(e.target.value)}
                placeholder="2024"
              />
            </Field>

            <Field label="Difficulty" htmlFor="f-difficulty" error={errors.difficulty} required>
              <Select
                id="f-difficulty"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className={inputClass}
              >
                {DIFFICULTIES.map((level) => (
                  <option key={level} value={level}>
                    {level.charAt(0) + level.slice(1).toLowerCase()}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Key" htmlFor="f-key" error={errors.musicalKey} required>
              <Select
                id="f-key"
                value={musicalKey}
                onChange={(e) => setMusicalKey(e.target.value)}
                className={inputClass}
              >
                {MUSICAL_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {key}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Tempo (BPM)" htmlFor="f-bpm" error={errors.bpm} required>
              <Input
                id="f-bpm"
                type="number"
                min={20}
                max={300}
                value={bpm}
                onChange={(e) => setBpm(e.target.value)}
                invalid={!!errors.bpm}
              />
            </Field>

            <Field label="Duration (seconds)" htmlFor="f-duration">
              <Input
                id="f-duration"
                type="number"
                min={1}
                max={36000}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="210"
              />
            </Field>

            <Field
              label="Cover image URL"
              htmlFor="f-cover"
              error={errors.coverImage}
              hint="Optional — a generated cover is used otherwise."
              className="sm:col-span-2"
            >
              <Input
                id="f-cover"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="https://…"
                invalid={!!errors.coverImage}
              />
            </Field>

            <Field
              label="Description"
              htmlFor="f-desc"
              className="sm:col-span-2"
              hint="What makes this arrangement special? Which hand parts are tricky?"
            >
              <Textarea
                id="f-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-24"
                maxLength={4000}
              />
            </Field>

            <Field
              label="Tags"
              htmlFor="f-tags"
              hint="Comma separated, e.g. jazz, ballad, beginner-friendly"
              className="sm:col-span-2"
            >
              <Input id="f-tags" value={tags} onChange={(e) => setTags(e.target.value)} />
            </Field>
          </div>

          <details className="rounded-xl border border-border bg-muted/50 p-4">
            <summary className="cursor-pointer text-sm font-medium">Attribution & licensing (optional)</summary>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Attribution" htmlFor="f-attr">
                <Input id="f-attr" value={attribution} onChange={(e) => setAttribution(e.target.value)} />
              </Field>
              <Field label="Source" htmlFor="f-source">
                <Input id="f-source" value={source} onChange={(e) => setSource(e.target.value)} />
              </Field>
              <Field label="License" htmlFor="f-license">
                <Input id="f-license" value={license} onChange={(e) => setLicense(e.target.value)} placeholder="CC BY-NC 4.0" />
              </Field>
              <Field label="Copyright notice" htmlFor="f-copyright">
                <Input id="f-copyright" value={copyright} onChange={(e) => setCopyright(e.target.value)} />
              </Field>
            </div>
          </details>

          <div className="flex justify-end">
            <Button
              onClick={() => {
                if (validateStep(0)) setStep(1);
              }}
            >
              Continue to arrangement <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </section>
      ) : null}

      {/* Step 2 */}
      {step === 1 ? (
        <section className="space-y-5 rounded-2xl border border-border bg-card p-6" aria-labelledby="step2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="step2" className="text-lg font-bold">
              Arrangement
            </h2>
            <Badge className="bg-muted text-muted-foreground ring-border">
              {sections.length} section{sections.length === 1 ? "" : "s"}
            </Badge>
          </div>

          <Field label="Version name" htmlFor="f-version" error={errors.versionName} hint="e.g. Original, Beginner, Left-hand only">
            <Input
              id="f-version"
              value={versionName}
              onChange={(e) => setVersionName(e.target.value)}
              invalid={!!errors.versionName}
            />
          </Field>

          {errors.sections ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              {errors.sections}
            </p>
          ) : null}

          <div className="space-y-5">
            {sections.map((section, index) => (
              <div key={index} className="rounded-xl border border-border p-4">
                <div className="flex items-center gap-2">
                  <label htmlFor={`section-name-${index}`} className="sr-only">
                    Section name {index + 1}
                  </label>
                  <Select
                    id={`section-name-${index}`}
                    value={
                      DEFAULT_SECTIONS.includes(section.name as (typeof DEFAULT_SECTIONS)[number])
                        ? section.name
                        : "__custom"
                    }
                    onChange={(e) =>
                      updateSection(index, {
                        name: e.target.value === "__custom" ? "" : e.target.value,
                      })
                    }
                    className="h-9 w-44"
                  >
                    {DEFAULT_SECTIONS.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                    <option value="__custom">Custom…</option>
                  </Select>
                  <label htmlFor={`section-name-custom-${index}`} className="sr-only">
                    Custom section name
                  </label>
                  <Input
                    id={`section-name-custom-${index}`}
                    value={section.name}
                    onChange={(e) => updateSection(index, { name: e.target.value })}
                    placeholder="Custom section name"
                    className="h-9 flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="iconSm"
                    onClick={() => setSections((current) => current.filter((_, i) => i !== index))}
                    disabled={sections.length === 1}
                    aria-label={`Remove section ${section.name || index + 1}`}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>

                {errors[`section-${index}`] ? (
                  <p role="alert" className="mt-2 text-xs font-medium text-destructive">
                    {errors[`section-${index}`]}
                  </p>
                ) : null}

                <label
                  htmlFor={`section-content-${index}`}
                  className="mt-3 block text-xs font-medium text-muted-foreground"
                >
                  Tab text (RH:/LH: lines)
                </label>
                <Textarea
                  id={`section-content-${index}`}
                  value={section.content}
                  onChange={(e) => updateSection(index, { content: e.target.value })}
                  className="mt-1 min-h-24 font-mono text-sm"
                  placeholder={"RH: C4 E4 G4 · LH: C3 G3"}
                />

                <label
                  htmlFor={`section-events-${index}`}
                  className="mt-3 block text-xs font-medium text-muted-foreground"
                >
                  Structured events (JSON, optional) — powers the interactive keyboard
                </label>
                <Textarea
                  id={`section-events-${index}`}
                  value={section.eventsJson}
                  onChange={(e) => updateSection(index, { eventsJson: e.target.value })}
                  className="mt-1 min-h-20 font-mono text-xs"
                  placeholder='[{"hand":"right","notes":["C4","E4","G4"],"duration":"quarter","bar":1,"beat":1}]'
                />
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() =>
                setSections((current) => [...current, { name: "Chorus", content: "", eventsJson: "[]" }])
              }
            >
              <Plus className="h-4 w-4" aria-hidden="true" /> Add section
            </Button>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(0)}>
              <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Back
            </Button>
            <Button
              onClick={() => {
                if (validateStep(1)) setStep(2);
              }}
            >
              Review <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </section>
      ) : null}

      {/* Step 3 */}
      {step === 2 ? (
        <section className="space-y-5 rounded-2xl border border-border bg-card p-6" aria-labelledby="step3">
          <h2 id="step3" className="text-lg font-bold">
            Review & submit
          </h2>

          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-lg bg-muted p-3">
              <dt className="text-muted-foreground">Title</dt>
              <dd className="font-medium">{title}</dd>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <dt className="text-muted-foreground">Artist</dt>
              <dd className="font-medium">
                {artistMode === "new"
                  ? newArtistName
                  : artists.find((a) => a.id === artistId)?.name ?? "—"}
              </dd>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <dt className="text-muted-foreground">Key · difficulty · tempo</dt>
              <dd className="font-medium">
                {musicalKey} · {difficulty} · {bpm} BPM
              </dd>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <dt className="text-muted-foreground">Arrangement</dt>
              <dd className="font-medium">
                {versionName} · {sections.length} section{sections.length === 1 ? "" : "s"}
              </dd>
            </div>
          </dl>

          {initial ? (
            <p className="text-sm text-muted-foreground">
              Saving updates your arrangement in place.
            </p>
          ) : (
            <label className="flex items-start gap-3 rounded-xl border border-border p-4 text-sm">
              <input
                type="checkbox"
                checked={acknowledge}
                onChange={(e) => setAcknowledge(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[var(--primary)]"
                required
              />
              <span>
                I confirm this arrangement is my own work (or I have the right to share it), and it
                contains no copyrighted lyrics or scanned sheet music.
              </span>
            </label>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Back
            </Button>
            <Button
              onClick={() => {
                if (!validateStep(0) || !validateStep(1)) return;
                if (initial || acknowledge) void submit();
                else toast.error("Please confirm the content rights acknowledgement");
              }}
              disabled={busy}
            >
              {busy ? "Submitting…" : initial ? "Save changes" : "Submit for review"}
            </Button>
          </div>
        </section>
      ) : null}

    </div>
  );
}
