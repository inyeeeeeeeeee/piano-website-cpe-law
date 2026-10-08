import Link from "next/link";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { formatDate, initials } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ProfileForm } from "@/components/features/profile-form";
import { Heart, MessageSquare, Music4, Settings } from "lucide-react";

export const metadata = {
  title: "Profile",
  description: "Manage your public profile on Piano Keys Tab.",
};

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireUser();

  const [profile, stats] = await Promise.all([
    db.user.findUnique({
      where: { id: user.id },
      select: {
        username: true,
        email: true,
        bio: true,
        avatar: true,
        createdAt: true,
        role: true,
      },
    }),
    Promise.all([
      db.savedSong.count({ where: { userId: user.id } }),
      db.comment.count({ where: { userId: user.id } }),
      db.song.count({ where: { createdById: user.id, status: "PUBLISHED" } }),
      db.rating.count({ where: { userId: user.id } }),
    ]),
  ]);

  if (!profile) return null;

  const [saved, comments, published, ratings] = stats;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={profile.username} src={profile.avatar} size={72} />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{profile.username}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Joined {formatDate(profile.createdAt)} · {profile.email}
            </p>
            <div className="mt-2 flex gap-2">
              <Badge className="bg-primary-soft text-primary ring-primary/20">{profile.role}</Badge>
            </div>
          </div>
        </div>
        <Link href="/settings" className={buttonClasses("outline", "md")}>
          <Settings className="h-4 w-4" aria-hidden="true" /> Account settings
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { icon: <Heart className="h-4 w-4" />, label: "Saved", value: saved },
          { icon: <Music4 className="h-4 w-4" />, label: "Published", value: published },
          { icon: <MessageSquare className="h-4 w-4" />, label: "Comments", value: comments },
          { icon: <Star />, label: "Ratings given", value: ratings },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-border bg-card p-4 text-center">
            <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-primary">
              {item.icon}
            </span>
            <p className="mt-2 text-2xl font-bold">{item.value}</p>
            <p className="text-xs text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Edit profile</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileForm
              initial={{
                username: profile.username,
                bio: profile.bio ?? "",
                avatar: profile.avatar,
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>About you</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {profile.bio || "You have not written a bio yet — tell the community what you like to play."}
            </p>
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between border-b border-border pb-2">
                <dt className="text-muted-foreground">Display name</dt>
                <dd className="font-medium">{profile.username}</dd>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <dt className="text-muted-foreground">Initials</dt>
                <dd className="font-medium">{initials(profile.username)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Member since</dt>
                <dd className="font-medium">{formatDate(profile.createdAt)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Star() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
