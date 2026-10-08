"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Textarea, Field } from "@/components/ui/field";
import { patchJson, ApiError } from "@/lib/api-client";
import { CheckCircle2, MessageSquare, RefreshCw, XCircle } from "lucide-react";

type Decision = "PUBLISHED" | "REJECTED" | "PENDING";

const LABELS: Record<Decision, string> = {
  PUBLISHED: "Approve",
  REJECTED: "Reject",
  PENDING: "Request changes",
};

/**
 * Moderation actions for one submission. The decision (and an optional note
 * for the contributor) is PATCHed to /api/admin/submissions/:id, which updates
 * every version, notifies the author and writes the audit entry server-side.
 */
export function SubmissionActions({
  songId,
  title,
}: {
  songId: string;
  title: string;
}) {
  const router = useRouter();
  const [decision, setDecision] = useState<Decision | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!decision) return;
    setBusy(true);
    try {
      await patchJson(`/api/admin/submissions/${songId}`, {
        status: decision,
        note: note.trim() || undefined,
      });
      toast.success(
        decision === "PUBLISHED"
          ? `"${title}" approved`
          : decision === "REJECTED"
            ? `"${title}" rejected`
            : `Changes requested for "${title}"`
      );
      setDecision(null);
      setNote("");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Could not apply the decision"
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <Button size="sm" onClick={() => setDecision("PUBLISHED")} disabled={busy}>
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setDecision("PENDING")}
          disabled={busy}
        >
          <MessageSquare className="h-3.5 w-3.5" aria-hidden /> Changes
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-destructive hover:bg-destructive/10"
          onClick={() => setDecision("REJECTED")}
          disabled={busy}
        >
          <XCircle className="h-3.5 w-3.5" aria-hidden /> Reject
        </Button>
      </div>

      <Modal
        open={decision !== null}
        onClose={() => (busy ? undefined : setDecision(null))}
        title={`${decision ? LABELS[decision] : ""} “${title}”?`}
        description="The contributor is notified of the decision. A note is included in the notification."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDecision(null)} disabled={busy}>
              Cancel
            </Button>
            <Button
              onClick={submit}
              disabled={busy}
              variant={decision === "REJECTED" ? "destructive" : "primary"}
            >
              {busy ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" aria-hidden /> Saving…
                </>
              ) : decision === "PUBLISHED" ? (
                "Approve submission"
              ) : decision === "REJECTED" ? (
                "Reject submission"
              ) : (
                "Request changes"
              )}
            </Button>
          </>
        }
      >
        <Field
          label="Note to the contributor"
          htmlFor={`note-${songId}`}
          hint="Optional — explain what needs to change, or leave a compliment."
        >
          <Textarea
            id={`note-${songId}`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            placeholder={
              decision === "PUBLISHED"
                ? "Great voicing in the bridge — thanks for sharing!"
                : "Please check the left-hand rhythm in section 2…"
            }
          />
        </Field>
      </Modal>
    </>
  );
}
