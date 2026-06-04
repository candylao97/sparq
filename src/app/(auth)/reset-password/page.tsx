"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from "@/server/validation/auth.schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center">
          <span className="text-2xl font-bold tracking-tight text-neutral-900">
            Sparq
          </span>
        </Link>
        <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12)]">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token: token || "" },
  });

  if (!token) {
    return (
      <AuthShell>
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            Invalid reset link
          </h1>
          <p className="mt-1.5 text-sm text-neutral-500">
            This password reset link is invalid or has expired.
          </p>
          <Link
            href="/forgot-password"
            className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-full bg-neutral-900 text-base font-semibold text-white transition-colors hover:bg-neutral-700"
          >
            Request a new link
          </Link>
        </div>
      </AuthShell>
    );
  }

  const onSubmit = async (data: ResetPasswordInput) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error);
        setLoading(false);
        return;
      }

      router.push("/login?reset=success");
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
          Set new password
        </h1>
        <p className="mt-1.5 text-sm text-neutral-500">
          Enter your new password below.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}
        <input type="hidden" {...register("token")} />

        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            autoFocus
            className="h-12 rounded-xl text-base"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-sm text-red-500">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <Input
            id="confirmPassword"
            type="password"
            className="h-12 rounded-xl text-base"
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p className="text-sm text-red-500">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-12 w-full items-center justify-center rounded-full bg-neutral-900 text-base font-semibold text-white transition-colors hover:bg-neutral-700 disabled:opacity-60"
        >
          {loading ? "Resetting…" : "Reset password"}
        </button>
      </form>
    </AuthShell>
  );
}
