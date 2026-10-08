import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { canManageSong } from "@/lib/permissions";
import { parseJson } from "@/lib/utils";
import type { ArrangementEvent } from "@/types/arrangement";
import { SubmissionWizard, type WizardInitial } from "@/components/features/submission-wizard";
import { Info } from "lucide-react";

export const metadata = {
  title: "Submit an arrangement",
  description: "Share your own piano arrangement with the community for review.",
};

export const dynamic = "force-dynamic";

type Search = { [key: string]: string | string[] | undefined };

function str(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function SubmitSongPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const user = await requireUser();
  const query = await searchParams;
  const editId = str(query.edit);

  const artists = await db.artist.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  let initial: WizardInitial | undefined;

  if (editId) {
    const song = await db.song.findFirst({
      where: { OR: [{ id: editId }, { slug: editId }] },
      include: {
        versions: {
          orderBy: { order: "asc" },
          include: { sections: { orderBy: { order: "asc" }, include: { arrangement: true } } },
        },
      },
    });
    if (!song) notFound();
    if (!canManageSong(user, song)) redirect("/403");

    const version = song.versions[0];
    initial = {
      songId: song.id,
      slug: song.slug,
      title: song.title,
      artistId: song.artistId,
      newArtistName: undefined,
      album: song.album ?? "",
      releaseYear: song.releaseYear ? String(song.releaseYear) : "",
      difficulty: song.difficulty,
      musicalKey: song.musicalKey,
      bpm: String(song.bpm),
      duration: song.duration ? String(song.duration) : "",
      description: song.description ?? "",
      tags: song.tags,
      coverImage: song.coverImage ?? "",
      attribution: song.attribution ?? "",
      source: song.source ?? "",
      license: song.license ?? "",
      copyright: song.copyright ?? "",
      versionId: version?.id ?? null,
      versionName: version?.name ?? "Original",
      sections: (version?.sections ?? []).map((section) => ({
        name: section.name,
        content: section.arrangement?.content ?? "",
        eventsJson: JSON.stringify(
          parseJson<ArrangementEvent[]>(section.arrangement?.structuredData, []),
          null,
          0
        ),
      })),
    };
    if (initial.sections.length === 0) {
      initial.sections = [{ name: "Intro", content: "", eventsJson: "[]" }];
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          {initial ? "Edit arrangement" : "Submit an arrangement"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {initial
            ? "Update the metadata or the tab data. Changes go back into review for moderators."
            : "Your submission is reviewed by a moderator before it appears in the public catalogue."}
        </p>
      </div>

      <div className="mb-6 flex items-start gap-3 rounded-xl border border-primary/25 bg-primary-soft p-4 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <p className="text-foreground/80">
          Only submit arrangements you have the right to share. Copying lyrics, scanned sheet music or
          published transcriptions is not allowed — see the{" "}
          <Link href="/terms" className="text-primary hover:underline">
            terms
          </Link>
          .
        </p>
      </div>

      <SubmissionWizard artists={artists} initial={initial} isAdmin={user.role === "ADMIN"} />
    </div>
  );
}
