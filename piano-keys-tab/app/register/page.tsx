"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterInput } from "@/lib/validation";
import { postJson, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/field";
import { AlertTriangle } from "lucide-react";

function RegisterForm() {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/dashboard";
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: "", email: "", password: "", confirmPassword: "" },
  });

  async function onSubmit(values: RegisterInput) {
    setServerError(null);
    try {
      // The API creates the account *and* signs the user in (HTTP-only cookie).
      await postJson("/api/auth/register", values);
      window.location.assign(callbackUrl.startsWith("/") ? callbackUrl : "/dashboard");
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Could not create the account.");
    }
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-16">
      <div className="rounded-2xl border border-border bg-card p-8 shadow-md">
        <h1 className="text-2xl font-bold">Create your account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Save songbooks, rate arrangements and submit your own tabs.
        </p>

        {serverError ? (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {serverError}
          </div>
        ) : null}

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
          <Field label="Username" error={errors.username?.message} htmlFor="reg-username" required>
            <Input
              id="reg-username"
              autoComplete="username"
              placeholder="ada_lovelace"
              invalid={!!errors.username}
              {...register("username")}
            />
          </Field>
          <Field label="Email" error={errors.email?.message} htmlFor="reg-email" required>
            <Input
              id="reg-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              invalid={!!errors.email}
              {...register("email")}
            />
          </Field>
          <Field
            label="Password"
            error={errors.password?.message}
            htmlFor="reg-password"
            hint="At least 8 characters, with a letter and a number."
            required
          >
            <Input
              id="reg-password"
              type="password"
              autoComplete="new-password"
              invalid={!!errors.password}
              {...register("password")}
            />
          </Field>
          <Field label="Confirm password" error={errors.confirmPassword?.message} htmlFor="reg-confirm" required>
            <Input
              id="reg-confirm"
              type="password"
              autoComplete="new-password"
              invalid={!!errors.confirmPassword}
              {...register("confirmPassword")}
            />
          </Field>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Creating account…" : "Create account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already registered?{" "}
          <Link
            href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="font-medium text-primary hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
