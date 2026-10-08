"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

/**
 * Route-level error boundary. Details are never shown to the user — the
 * message is generic and the developer gets the stack in the console.
 */
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const router = useRouter();
  useEffect(() => {
    console.error("[route-error]", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive" aria-hidden="true">
        !
      </span>
      <h1 className="mt-6 text-3xl font-extrabold tracking-tight">Something went wrong</h1>
      <p className="mt-3 text-muted-foreground">
        An unexpected error occurred while loading this page.
        {error.digest ? ` (reference ${error.digest})` : ""}
      </p>
      <div className="mt-8 flex gap-3">
        <Button onClick={retry}>Try again</Button>
        <Button variant="outline" onClick={() => router.push("/")}>
          Back home
        </Button>
      </div>
    </div>
  );
}
