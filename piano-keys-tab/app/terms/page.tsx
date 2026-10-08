import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of service",
  description: "The rules that keep the Piano Keys Tab community useful and lawful.",
};

const SECTIONS = [
  {
    heading: "1. The service",
    body: [
      "Piano Keys Tab is a community library of piano arrangements plus practice tools (transposition, metronome, autoscroll and an interactive keyboard).",
      "The service is provided as-is for personal, non-commercial practice and education.",
    ],
  },
  {
    heading: "2. Your account",
    body: [
      "You are responsible for keeping your credentials secret and for everything posted under your account.",
      "Choose a strong password. Tell us immediately if you believe your account has been compromised.",
      "Administrators may suspend accounts that break these terms, and will explain why where they can.",
    ],
  },
  {
    heading: "3. Content you submit",
    body: [
      "Arrangements must be your own work or shared with the rights to distribute them. Do not upload copyrighted lyrics, scanned sheet music or unattributed transcriptions.",
      "By submitting, you grant the service the right to store, display and moderate that arrangement as part of the catalogue.",
      "Submissions are reviewed before publication; editors may reject or request changes to any submission.",
    ],
  },
  {
    heading: "4. Community conduct",
    body: [
      "Be constructive in comments. Spam, harassment, hate speech and advertising are removed.",
      "Report content instead of replying to it — moderators review every report.",
      "Ratings and comments must reflect a genuine experience with the arrangement.",
    ],
  },
  {
    heading: "5. Copyright complaints",
    body: [
      "If you believe content infringes your rights, contact us with the URL and a description of the work. We remove content while we review the claim.",
    ],
  },
  {
    heading: "6. Changes",
    body: [
      "We may update these terms; material changes will be announced on this page with a new date.",
      "Continued use after a change means you accept the updated terms.",
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="text-4xl font-extrabold tracking-tight">Terms of service</h1>
      <p className="mt-3 text-sm text-muted-foreground">Last updated: October 2026</p>

      <div className="mt-10 space-y-8">
        {SECTIONS.map((section) => (
          <section key={section.heading}>
            <h2 className="text-xl font-bold">{section.heading}</h2>
            <div className="mt-2 space-y-3 text-sm leading-relaxed text-muted-foreground">
              {section.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-10 text-sm text-muted-foreground">
        Questions? <Link href="/contact" className="text-primary hover:underline">Contact us</Link> or
        read the <Link href="/privacy" className="text-primary hover:underline">privacy policy</Link>.
      </p>
    </div>
  );
}
