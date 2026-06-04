"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Sparkles, ArrowLeft, MailCheck } from "lucide-react";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/server/validation/auth.schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-1.5">
          <Sparkles className="size-6 text-indigo-600" />
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

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setLoading(true);
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSubmitted(true);
    setLoading(false);
  };

  if (submitted) {
    return (
      <AuthShell>
        <div className="text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-neutral-100">
            <MailCheck className="size-6 text-neutral-900" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            Check your email
          </h1>
          <p className="mt-1.5 text-sm text-neutral-500">
            If an account with that email exists, we&apos;ve sent a password
            reset link.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex h-12 w-full items-center justify-center gap-1.5 rounded-full border border-neutral-300 bg-white text-base font-semibold text-neutral-900 transition-colors hover:bg-neutral-50"
          >
            <ArrowLeft className="size-4" />
            Back to login
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
          Forgot password?
        </h1>
        <p className="mt-1.5 text-sm text-neutral-500">
          Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            autoFocus
            className="h-12 rounded-xl text-base"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-sm text-red-500">{errors.email.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-12 w-full items-center justify-center rounded-full bg-neutral-900 text-base font-semibold text-white transition-colors hover:bg-neutral-700 disabled:opacity-60"
        >
          {loading ? "Sending…" : "Send reset link"}
        </button>

        <Link
          href="/login"
          className="inline-flex w-full items-center justify-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-neutral-900"
        >
          <ArrowLeft className="size-4" />
          Back to login
        </Link>
      </form>
    </AuthShell>
  );
}
