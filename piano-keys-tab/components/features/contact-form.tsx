"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea, Select } from "@/components/ui/field";
import { Mail, Send } from "lucide-react";

const TOPICS = [
  "General question",
  "Content / copyright report",
  "Bug report",
  "Account help",
  "Feature request",
];

/**
 * Contact form that composes a real email (mailto) — there is no server-side
 * inbox in this deployment, so we do not pretend to send anything.
 */
export function ContactForm({ email }: { email: string }) {
  const [name, setName] = useState("");
  const [from, setFrom] = useState("");
  const [topic, setTopic] = useState(TOPICS[0]);
  const [message, setMessage] = useState("");

  const valid =
    name.trim().length > 1 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(from) &&
    message.trim().length >= 10;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid) return;
    const subject = encodeURIComponent(`[${topic}] ${name}`);
    const body = encodeURIComponent(`${message.trim()}\n\n— ${name} (${from})`);
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" htmlFor="contact-name" required>
          <Input
            id="contact-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            autoComplete="name"
          />
        </Field>
        <Field label="Your email" htmlFor="contact-email" required>
          <Input
            id="contact-email"
            type="email"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            required
            autoComplete="email"
            placeholder="you@example.com"
          />
        </Field>
      </div>

      <Field label="Topic" htmlFor="contact-topic">
        <Select
          id="contact-topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="w-full"
        >
          {TOPICS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Message"
        htmlFor="contact-message"
        required
        hint="Include the song/page URL when reporting a problem (min 10 characters)."
      >
        <Textarea
          id="contact-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          minLength={10}
          maxLength={4000}
          className="min-h-36"
        />
      </Field>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={!valid}>
          <Send className="h-4 w-4" aria-hidden="true" /> Compose email
        </Button>
        <a
          href={`mailto:${email}`}
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <Mail className="h-4 w-4" aria-hidden="true" /> {email}
        </a>
      </div>
    </form>
  );
}
