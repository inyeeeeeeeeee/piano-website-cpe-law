import Link from "next/link";
import { Logo, PianoMark } from "@/components/layout/logo";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";

const columns = [
  {
    title: "Explore",
    links: [
      { href: "/songs", label: "Songs" },
      { href: "/artists", label: "Artists" },
      { href: "/songbooks", label: "Songbooks" },
      { href: "/submit-song", label: "Submit a song" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/terms", label: "Terms" },
      { href: "/privacy", label: "Privacy" },
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              {APP_TAGLINE}. Discover, learn and practise piano arrangements
              with an interactive keyboard, metronome, autoscroll and
              transposition.
            </p>
          </div>

          {columns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                {column.title}
              </h3>
              <ul className="space-y-2">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 sm:flex-row">
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <PianoMark className="h-4 w-4" />
            © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
          </p>
          <p className="max-w-xl text-center text-[11px] leading-relaxed text-muted-foreground sm:text-right">
            Arrangements are original, community-contributed content. This
            platform does not host copyrighted sheet music or lyrics.
          </p>
        </div>
      </div>
    </footer>
  );
}
