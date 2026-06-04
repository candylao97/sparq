"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Sparkles, ArrowRight, ArrowLeft, Mail } from "lucide-react";
import { signupSchema, type SignupInput } from "@/server/validation/auth.schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.05 12.04c-.03-2.74 2.24-4.05 2.34-4.12-1.27-1.86-3.25-2.12-3.96-2.15-1.69-.17-3.29.99-4.14.99-.85 0-2.17-.97-3.57-.94-1.84.03-3.53 1.07-4.48 2.71-1.91 3.32-.49 8.23 1.37 10.93.91 1.32 2 2.8 3.43 2.75 1.37-.05 1.89-.89 3.55-.89 1.66 0 2.13.89 3.58.86 1.48-.03 2.42-1.34 3.32-2.67 1.05-1.53 1.48-3.01 1.5-3.09-.03-.01-2.88-1.1-2.91-4.37l-.01.03zM14.34 4.07c.75-.92 1.26-2.19 1.12-3.46-1.08.04-2.4.72-3.18 1.63-.7.81-1.31 2.1-1.15 3.34 1.21.09 2.45-.61 3.21-1.51z"/>
    </svg>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.52 12.27c0-.82-.07-1.6-.21-2.36H12v4.47h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.74z"/>
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.08 7.95-2.91l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A12 12 0 0 0 12 24z"/>
      <path fill="#FBBC05" d="M5.27 14.28a7.2 7.2 0 0 1 0-4.56V6.63H1.29a12 12 0 0 0 0 10.74l3.98-3.09z"/>
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44A11.96 11.96 0 0 0 12 0 12 12 0 0 0 1.29 6.63l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"/>
    </svg>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { role: "CUSTOMER" },
  });

  const email = watch("email");
  const selectedRole = watch("role");

  const handleContinue = async () => {
    const ok = await trigger("email");
    if (ok) {
      setError(null);
      setStep(2);
    }
  };

  const socialLogin = (provider: "google" | "apple") => {
    signIn(provider, { callbackUrl: "/" });
  };

  const onSubmit = async (data: SignupInput) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/signup", {
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
      router.push("/login?verified=pending");
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Brand */}
        <Link href="/" className="mb-8 flex items-center justify-center gap-1.5">
          <Sparkles className="size-6 text-indigo-600" />
          <span className="text-2xl font-bold tracking-tight text-neutral-900">
            Sparq
          </span>
        </Link>

        <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12)]">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
              Create your account
            </h1>
            <p className="mt-1.5 text-sm text-neutral-500">
              Book or offer nail &amp; lash services in Melbourne.
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Step 1 — email first */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Social sign-up */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => socialLogin("apple")}
                  className="inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-full bg-neutral-900 text-base font-semibold text-white transition-colors hover:bg-neutral-700"
                >
                  <AppleIcon className="size-5" />
                  Sign up with Apple
                </button>
                <button
                  type="button"
                  onClick={() => socialLogin("google")}
                  className="inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-full border border-neutral-300 bg-white text-base font-semibold text-neutral-900 transition-colors hover:bg-neutral-50"
                >
                  <GoogleIcon className="size-5" />
                  Get started with Google
                </button>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-neutral-200" />
                <span className="text-xs font-medium uppercase tracking-wider text-neutral-400">
                  or
                </span>
                <span className="h-px flex-1 bg-neutral-200" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
                  <Input
                    id="email"
                    type="email"
                    autoFocus
                    placeholder="you@example.com"
                    className="h-12 rounded-xl pl-10 text-base"
                    {...register("email")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleContinue();
                      }
                    }}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>

              <button
                type="button"
                onClick={handleContinue}
                className="inline-flex h-12 w-full items-center justify-center gap-1.5 rounded-full bg-neutral-900 text-base font-semibold text-white transition-colors hover:bg-neutral-700"
              >
                Continue
                <ArrowRight className="size-4" />
              </button>

              <p className="text-center text-sm text-neutral-500">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-semibold text-neutral-900 hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </div>
          )}

          {/* Step 2 — details */}
          {step === 2 && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Email summary */}
              <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2.5">
                <span className="truncate text-sm text-neutral-700">{email}</span>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="shrink-0 text-sm font-medium text-neutral-500 hover:text-neutral-900"
                >
                  Change
                </button>
              </div>

              <div className="space-y-2">
                <Label>I want to</Label>
                <div className="grid grid-cols-2 gap-3">
                  {(
                    [
                      { value: "CUSTOMER", label: "Book services" },
                      { value: "PROVIDER", label: "Offer services" },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setValue("role", opt.value)}
                      className={cn(
                        "rounded-xl border p-3 text-sm font-medium transition-colors",
                        selectedRole === opt.value
                          ? "border-neutral-900 bg-neutral-50 text-neutral-900"
                          : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  autoFocus
                  className="h-12 rounded-xl text-base"
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  className="h-12 rounded-xl text-base"
                  {...register("password")}
                />
                {errors.password && (
                  <p className="text-sm text-red-500">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
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
                {loading ? "Creating account…" : "Create account"}
              </button>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex w-full items-center justify-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-neutral-900"
              >
                <ArrowLeft className="size-4" />
                Back
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-neutral-400">
          By creating an account, you agree to our{" "}
          <Link href="/terms" className="underline hover:text-neutral-600">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline hover:text-neutral-600">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
