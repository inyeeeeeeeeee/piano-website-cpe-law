"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/modal";
import { Select } from "@/components/ui/field";
import { deleteJson, patchJson, ApiError } from "@/lib/api-client";
import { USER_ROLES } from "@/lib/constants";
import { Ban, Check, Trash2 } from "lucide-react";

/**
 * Row controls for the admin user table: role, account state and deletion.
 * The API refuses self role-changes/self-disabling/self-deletion, so those
 * rows simply disable the controls as well (defence in depth on both sides).
 */
export function UserRowActions({
  id,
  username,
  role,
  isActive,
  isSelf,
}: {
  id: string;
  username: string;
  role: string;
  isActive: boolean;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function updateRole(next: string) {
    if (next === role) return;
    setBusy(true);
    try {
      await patchJson(`/api/admin/users/${id}`, { role: next });
      toast.success(`${username} is now ${next === "ADMIN" ? "an admin" : "a member"}`);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Could not change the role"
      );
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive() {
    setBusy(true);
    try {
      await patchJson(`/api/admin/users/${id}`, { isActive: !isActive });
      toast.success(
        isActive
          ? `${username} disabled — they can no longer sign in`
          : `${username} re-enabled`
      );
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Could not update the account"
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    try {
      await deleteJson(`/api/admin/users/${id}`);
      toast.success(`${username} deleted`);
      setConfirming(false);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Could not delete the account"
      );
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <Select
          aria-label={`Role for ${username}`}
          value={role}
          disabled={busy || isSelf}
          onChange={(e) => void updateRole(e.target.value)}
          className="h-8 w-auto min-w-24 rounded-md px-2 py-1 text-xs"
          title={isSelf ? "You cannot change your own role" : undefined}
        >
          {USER_ROLES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </Select>

        <Button
          size="sm"
          variant={isActive ? "outline" : "primary"}
          onClick={() => void toggleActive()}
          disabled={busy || isSelf}
          title={isSelf ? "You cannot disable your own account" : undefined}
        >
          {isActive ? (
            <>
              <Ban className="h-3.5 w-3.5" aria-hidden /> Disable
            </>
          ) : (
            <>
              <Check className="h-3.5 w-3.5" aria-hidden /> Enable
            </>
          )}
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="text-destructive hover:bg-destructive/10"
          onClick={() => setConfirming(true)}
          disabled={busy || isSelf}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
          <span className="sr-only">Delete {username}</span>
        </Button>
      </div>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={remove}
        title={`Delete ${username}?`}
        description="Their songbooks, ratings, comments and saved songs are removed. Songs they authored stay in the catalogue without an author. This cannot be undone."
        confirmLabel="Delete account"
        destructive
      />
    </>
  );
}
