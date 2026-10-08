import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

export const metadata = {
  title: "Forbidden",
  robots: { index: false },
};

export default function ForbiddenPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <ShieldAlert className="h-7 w-7" aria-hidden="true" />
      </span>
      <h1 className="mt-6 text-4xl font-extrabold tracking-tight">403 — Not allowed</h1>
      <p className="mt-3 text-muted-foreground">
        Your account does not have access to that area. If you think this is a mistake, sign in with
        an account that has the right role, or contact an administrator.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className={buttonClasses("primary", "md")}>
          Back home
        </Link>
        <Link href="/dashboard" className={buttonClasses("outline", "md")}>
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
