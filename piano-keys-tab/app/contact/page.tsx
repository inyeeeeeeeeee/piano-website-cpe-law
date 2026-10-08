import type { Metadata } from "next";
import { ContactForm } from "@/components/features/contact-form";
import { Flag, LifeBuoy, ShieldAlert } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch about moderation, copyright, bugs or your account.",
};

const SUPPORT_EMAIL = "support@pianokeystab.example";

const CHANNELS = [
  {
    icon: Flag,
    title: "Report content",
    text: "Use the report button under any comment, or email us with the song URL and a short reason.",
  },
  {
    icon: ShieldAlert,
    title: "Copyright concerns",
    text: "If an arrangement infringes your rights, tell us the URL — we take it offline while we review.",
  },
  {
    icon: LifeBuoy,
    title: "Account help",
    text: "Include the email address on the account (never send us your password).",
  },
];

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
      <h1 className="text-4xl font-extrabold tracking-tight">Contact</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        We read everything. The fastest route for reports is the report button in the app; for
        everything else, use the form below.
      </p>

      <div className="mt-10 grid gap-6 sm:grid-cols-3">
        {CHANNELS.map((channel) => (
          <div key={channel.title} className="rounded-2xl border border-border bg-card p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <channel.icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <h2 className="mt-3 font-semibold">{channel.title}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">{channel.text}</p>
          </div>
        ))}
      </div>

      <section className="mt-12 rounded-2xl border border-border bg-card p-6" aria-labelledby="contact-form-heading">
        <h2 id="contact-form-heading" className="text-xl font-bold">
          Send a message
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Submitting opens your email client with the message pre-filled — nothing is stored on this
          site.
        </p>
        <div className="mt-5">
          <ContactForm email={SUPPORT_EMAIL} />
        </div>
      </section>
    </div>
  );
}
