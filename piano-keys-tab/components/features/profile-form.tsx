"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { profileSchema, type ProfileInput, type ProfileInputRaw } from "@/lib/validation";
import { request, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";

export function ProfileForm({
  initial,
}: {
  initial: { username: string; bio: string; avatar: string | null };
}) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileInputRaw, unknown, ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: initial.username,
      bio: initial.bio ?? "",
      avatar: initial.avatar ?? "",
    },
  });

  async function onSubmit(values: ProfileInput) {
    try {
      await request("/api/user", {
        method: "PATCH",
        body: JSON.stringify({ ...values, avatar: values.avatar || null }),
      });
      toast.success("Profile updated");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not save your profile");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Field label="Username" htmlFor="profile-username" error={errors.username?.message} required>
        <Input
          id="profile-username"
          {...register("username")}
          invalid={!!errors.username}
          autoComplete="username"
        />
      </Field>

      <Field
        label="Avatar URL"
        htmlFor="profile-avatar"
        error={errors.avatar?.message}
        hint="Any image URL. Leave empty to use generated initials."
      >
        <Input
          id="profile-avatar"
          {...register("avatar")}
          invalid={!!errors.avatar}
          placeholder="https://example.com/avatar.jpg"
        />
      </Field>

      <Field label="Bio" htmlFor="profile-bio" error={errors.bio?.message} hint="Shown on your public profile.">
        <Textarea
          id="profile-bio"
          {...register("bio")}
          invalid={!!errors.bio}
          className="min-h-24"
          maxLength={500}
        />
      </Field>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting || !isDirty}>
          {isSubmitting ? "Saving…" : "Save profile"}
        </Button>
      </div>
    </form>
  );
}
