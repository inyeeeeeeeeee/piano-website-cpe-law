"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { patchJson, ApiError } from "@/lib/api-client";
import { Check, RotateCcw, X } from "lucide-react";

type ReportStatus = "RESOLVED" | "DISMISSED" | "PENDING";

/**
 * Resolve / dismiss / reopen a report. Resolving a COMMENT report also hides
 * the reported comment — that side effect happens server-side.
 */
export function ReportRowActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function apply(next: ReportStatus, message: string) {
    setBusy(true);
    try {
      await patchJson(`/api/admin/reports/${id}`, { status: next });
      toast.success(message);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Could not update the report"
      );
    } finally {
      setBusy(false);
    }
  }

  if (status === "PENDING") {
    return (
      <div className="flex items-center justify-end gap-1.5">
        <Button
          size="sm"
          onClick={() => void apply("RESOLVED", "Report resolved — content hidden")}
          disabled={busy}
        >
          <Check className="h-3.5 w-3.5" aria-hidden /> Resolve
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void apply("DISMISSED", "Report dismissed")}
          disabled={busy}
        >
          <X className="h-3.5 w-3.5" aria-hidden /> Dismiss
        </Button>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => void apply("PENDING", "Report reopened")}
      disabled={busy}
    >
      <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Reopen
    </Button>
  );
}
