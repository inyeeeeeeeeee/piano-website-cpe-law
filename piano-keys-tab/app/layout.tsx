import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import "./globals.css";

import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { getCurrentUser } from "@/lib/session";
import { unreadNotificationCount } from "@/lib/services";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: `${APP_NAME} — ${APP_TAGLINE}`,
    template: `%s | ${APP_NAME}`,
  },
  description:
    "Search, learn, save and practise piano key arrangements. Interactive keyboard, transposition, metronome, autoscroll, songbooks and community ratings.",
  keywords: [
    "piano",
    "piano tabs",
    "piano arrangements",
    "learn piano",
    "songbook",
    "piano practice",
    "metronome",
    "autoscroll",
  ],
  applicationName: APP_NAME,
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: `${APP_NAME} — ${APP_TAGLINE}`,
    description:
      "Discover, learn, save and organise piano arrangements for your favourite songs.",
    url: baseUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: APP_NAME,
    description: APP_TAGLINE,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Session is resolved once per request and shared with the header. Pages
  // that need the user call requireUser()/requireAdmin() themselves.
  const user = await getCurrentUser();
  const unread = user ? await unreadNotificationCount(user.id) : 0;

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          <SiteHeader
            user={
              user
                ? {
                    id: user.id,
                    username: user.username,
                    role: user.role,
                    avatar: user.avatar,
                  }
                : null
            }
            unread={unread}
          />
          <main id="main-content" className="min-h-[60vh]">
            {children}
          </main>
          <SiteFooter />
          <Toaster
            position="top-right"
            richColors
            closeButton
            toastOptions={{ duration: 4000 }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
