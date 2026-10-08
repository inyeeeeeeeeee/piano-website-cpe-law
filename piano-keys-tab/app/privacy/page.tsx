import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What Piano Keys Tab stores about you and how to control it.",
};

const DATA = [
  {
    heading: "Account data",
    body: "Your username, email address and a bcrypt password hash. The password itself is never stored in a readable form.",
  },
  {
    heading: "Content you create",
    body: "Arrangements you submit, comments you write, ratings you give, songbooks you build and the practice preferences you choose.",
  },
  {
    heading: "Activity",
    body: "Anonymous view counters plus a per-song view record so “recently viewed” works. Rate limiting uses a coarse IP-derived bucket in memory and is not written to disk.",
  },
  {
    heading: "Cookies",
    body: "A single HTTP-only session cookie keeps you signed in. It cannot be read by scripts. Theme preference is stored in your browser only.",
  },
];

const RIGHTS = [
  "See the data attached to your account (your profile and settings pages show it).",
  "Correct your profile at any time from /profile.",
  "Delete your account by contacting an administrator — removal cascades to your comments, ratings, saved songs and songbooks.",
  "Opt out of personalised behaviour: the site works the same signed out, minus saving features.",
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="text-4xl font-extrabold tracking-tight">Privacy policy</h1>
      <p className="mt-3 text-sm text-muted-foreground">Last updated: October 2026</p>

      <p className="mt-8 text-sm leading-relaxed text-muted-foreground">
        This deployment runs entirely on its own database. Nothing about your account is sold,
        shared with advertisers or sent to third-party analytics.
      </p>

      <section className="mt-10">
        <h2 className="text-xl font-bold">What we store</h2>
        <dl className="mt-3 space-y-4">
          {DATA.map((item) => (
            <div key={item.heading} className="rounded-xl border border-border bg-card p-4">
              <dt className="font-semibold">{item.heading}</dt>
              <dd className="mt-1 text-sm text-muted-foreground">{item.body}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold">Your rights</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          {RIGHTS.map((right) => (
            <li key={right}>{right}</li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold">Retention</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Content stays until you or an administrator delete it. Deleting a comment removes its
          reports with it; deleting an account removes everything that referenced it, except
          de-identified view counts.
        </p>
      </section>

      <p className="mt-10 text-sm text-muted-foreground">
        See the <Link href="/terms" className="text-primary hover:underline">terms of service</Link>{" "}
        or <Link href="/contact" className="text-primary hover:underline">contact us</Link> with
        questions.
      </p>
    </div>
  );
}
