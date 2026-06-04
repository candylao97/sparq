"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { signupSchema, type SignupInput } from "@/server/validation/auth.schema";
import { SocialAuthButtons, AuthDivider } from "@/components/auth/social-auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

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
        <Link href="/" className="mb-8 flex items-center justify-center">
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
              <SocialAuthButtons mode="signup" />

              <AuthDivider />

              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  autoFocus
                  className="h-12 rounded-xl text-base"
                  {...register("email")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleContinue();
                    }
                  }}
                />
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
