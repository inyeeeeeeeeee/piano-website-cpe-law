"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { changePasswordSchema, type ChangePasswordInput } from "@/lib/validation";
import type { SettingsInput } from "@/lib/validation";
import { request, putJson, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import {
  AUTOSCROLL_SPEEDS,
  FONT_FAMILIES,
  FONT_SIZES,
  LINE_SPACINGS,
  NOTE_SPACINGS,
  SECTION_SPACINGS,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import { KeyRound, Palette, SlidersHorizontal } from "lucide-react";

const THEME_OPTIONS = [
  { value: "SYSTEM", label: "System" },
  { value: "LIGHT", label: "Light" },
  { value: "DARK", label: "Dark" },
] as const;

/** Practice preferences — mirrors the settings API payload. */
export function SettingsForm({ initial }: { initial: SettingsInput }) {
  const [values, setValues] = useState<SettingsInput>(initial);
  const [busy, setBusy] = useState(false);
  const { theme, setTheme } = useTheme();

  function patch(next: Partial<SettingsInput>) {
    setValues((current) => ({ ...current, ...next }));
  }

  async function save(next: SettingsInput = values) {
    setBusy(true);
    try {
      await putJson("/api/user/settings", next);
      toast.success("Preferences saved");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not save your preferences");
    } finally {
      setBusy(false);
    }
  }

  const row = "flex flex-col gap-1.5";
  const control =
    "h-9 rounded-lg border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-2 focus-visible:outline-ring cursor-pointer";

  const selects: Array<[string, string, keyof SettingsInput, ReadonlyArray<{ value: string; label: string }>]> = [
    ["Font size", "fontSize", "fontSize", Object.keys(FONT_SIZES).map((v) => ({ value: v, label: v }))],
    ["Font family", "fontFamily", "fontFamily", Object.keys(FONT_FAMILIES).map((v) => ({ value: v, label: v }))],
    ["Line spacing", "lineSpacing", "lineSpacing", Object.keys(LINE_SPACINGS).map((v) => ({ value: v, label: v }))],
    ["Note spacing", "noteSpacing", "noteSpacing", Object.keys(NOTE_SPACINGS).map((v) => ({ value: v, label: v }))],
    ["Section spacing", "sectionSpacing", "sectionSpacing", Object.keys(SECTION_SPACINGS).map((v) => ({ value: v, label: v }))],
    ["Autoscroll speed", "autoScrollSpeed", "autoScrollSpeed", AUTOSCROLL_SPEEDS.map((v) => ({ value: v.value, label: v.label }))],
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-5" aria-labelledby="prefs-heading">
        <h2 id="prefs-heading" className="flex items-center gap-2 text-lg font-bold">
          <SlidersHorizontal className="h-4 w-4 text-primary" aria-hidden="true" /> Practice defaults
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Used whenever you open the practice studio.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {selects.map(([label, , field, options]) => (
            <div key={field} className={row}>
              <label htmlFor={`setting-${field}`} className="text-xs font-medium text-muted-foreground">
                {label}
              </label>
              <Select
                id={`setting-${field}`}
                className={control}
                value={String(values[field])}
                onChange={(e) => {
                  patch({ [field]: e.target.value } as Partial<SettingsInput>);
                  void save({ ...values, [field]: e.target.value } as SettingsInput);
                }}
              >
                {options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
          ))}

          <div className={row}>
            <label htmlFor="setting-metronomeBpm" className="text-xs font-medium text-muted-foreground">
              Default tempo (BPM)
            </label>
            <Input
              id="setting-metronomeBpm"
              type="number"
              min={30}
              max={240}
              value={values.metronomeBpm}
              onChange={(e) => patch({ metronomeBpm: Number(e.target.value) })}
              onBlur={() => void save({ ...values, metronomeBpm: values.metronomeBpm })}
              className={control}
            />
          </div>

          <div className={row}>
            <span className="text-xs font-medium text-muted-foreground">Keyboard overlay</span>
            <button
              type="button"
              aria-pressed={values.showKeyboard}
              onClick={() => {
                const next = !values.showKeyboard;
                patch({ showKeyboard: next });
                void save({ ...values, showKeyboard: next });
              }}
              className={cn(
                control,
                "text-left transition",
                values.showKeyboard
                  ? "border-primary bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
            >
              {values.showKeyboard ? "Visible" : "Hidden"}
            </button>
          </div>

          <div className={row}>
            <label htmlFor="setting-transpose" className="text-xs font-medium text-muted-foreground">
              Default transposition (semitones)
            </label>
            <Input
              id="setting-transpose"
              type="number"
              min={-12}
              max={12}
              value={values.transpose}
              onChange={(e) => patch({ transpose: Number(e.target.value) })}
              onBlur={() => void save({ ...values, transpose: values.transpose })}
              className={control}
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <Button onClick={() => void save()} disabled={busy}>
            {busy ? "Saving…" : "Save preferences"}
          </Button>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5" aria-labelledby="theme-heading">
        <h2 id="theme-heading" className="flex items-center gap-2 text-lg font-bold">
          <Palette className="h-4 w-4 text-primary" aria-hidden="true" /> Appearance
        </h2>
        <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Theme">
          {THEME_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={theme === option.value.toLowerCase()}
              onClick={() => setTheme(option.value.toLowerCase())}
              className={cn(
                "rounded-lg border px-4 py-2 text-sm font-medium transition",
                theme === option.value.toLowerCase()
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:bg-muted"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <PasswordForm />
    </div>
  );
}

function PasswordForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  async function onSubmit(values: ChangePasswordInput) {
    try {
      await request("/api/user/password", { method: "PATCH", body: JSON.stringify(values) });
      toast.success("Password changed");
      reset();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not change your password");
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5" aria-labelledby="password-heading">
      <h2 id="password-heading" className="flex items-center gap-2 text-lg font-bold">
        <KeyRound className="h-4 w-4 text-primary" aria-hidden="true" /> Change password
      </h2>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-4 grid gap-4 sm:grid-cols-3">
        <Field label="Current password" htmlFor="pw-current" error={errors.currentPassword?.message} required>
          <Input
            id="pw-current"
            type="password"
            autoComplete="current-password"
            invalid={!!errors.currentPassword}
            {...register("currentPassword")}
          />
        </Field>
        <Field label="New password" htmlFor="pw-new" error={errors.newPassword?.message} required>
          <Input
            id="pw-new"
            type="password"
            autoComplete="new-password"
            invalid={!!errors.newPassword}
            {...register("newPassword")}
          />
        </Field>
        <Field label="Confirm new password" htmlFor="pw-confirm" error={errors.confirmPassword?.message} required>
          <Input
            id="pw-confirm"
            type="password"
            autoComplete="new-password"
            invalid={!!errors.confirmPassword}
            {...register("confirmPassword")}
          />
        </Field>
        <div className="sm:col-span-3 flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Updating…" : "Update password"}
          </Button>
        </div>
      </form>
    </section>
  );
}
