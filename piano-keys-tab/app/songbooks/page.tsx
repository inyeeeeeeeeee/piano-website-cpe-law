import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/lib/db";
import { SongbookManager } from "@/components/features/songbook-manager";

export const metadata = {
  title: "Songbooks",
  description: "Create and organise your personal piano songbooks.",
};

export const dynamic = "force-dynamic";

export default async function SongbooksPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=%2Fsongbooks");

  const songbooks = await db.songbook.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { songs: true } } },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Your songbooks</h1>
        <p className="mt-2 text-muted-foreground">
          Collections of arrangements you are learning. Add songs from any song page with the
          “Songbook” button.
        </p>
      </div>

      <SongbookManager
        initial={songbooks.map((book) => ({
          id: book.id,
          name: book.name,
          description: book.description,
          updatedAt: book.updatedAt.toISOString(),
          _count: { songs: book._count.songs },
        }))}
      />

      <p className="mt-8 text-sm text-muted-foreground">
        Looking for inspiration?{" "}
        <Link href="/songs" className="text-primary hover:underline">
          Browse the catalogue
        </Link>
        .
      </p>
    </div>
  );
}
