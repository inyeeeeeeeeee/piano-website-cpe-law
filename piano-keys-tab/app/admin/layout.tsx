import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { db } from "@/lib/db";
import { AdminNav } from "@/components/admin/admin-nav";
import { buttonClasses } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Admin",
  description: "Piano Keys Tab administration area.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Admin area shell.
 * `requireAdmin()` re-reads the user from SQLite on every request, so a
 * demoted or disabled account loses access immediately — the role is never
 * taken from the client. (proxy.ts gives an earlier redirect as well.)
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();

  const [pendingSubmissions, openReports] = await Promise.all([
    db.song.count({ where: { status: "PENDING" } }),
    db.report.count({ where: { status: "PENDING" } }),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <ShieldCheck className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Admin console</h1>
            <p className="text-xs text-muted-foreground">
              Signed in as {admin.username} · role enforced server-side
            </p>
          </div>
        </div>
        <Link href="/dashboard" className={buttonClasses("outline", "sm")}>
          Back to dashboard
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside>
          <AdminNav
            pendingSubmissions={pendingSubmissions}
            openReports={openReports}
          />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
