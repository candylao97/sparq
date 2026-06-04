"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { toast } from "sonner";

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.05 12.04c-.03-2.74 2.24-4.05 2.34-4.12-1.27-1.86-3.25-2.12-3.96-2.15-1.69-.17-3.29.99-4.14.99-.85 0-2.17-.97-3.57-.94-1.84.03-3.53 1.07-4.48 2.71-1.91 3.32-.49 8.23 1.37 10.93.91 1.32 2 2.8 3.43 2.75 1.37-.05 1.89-.89 3.55-.89 1.66 0 2.13.89 3.58.86 1.48-.03 2.42-1.34 3.32-2.67 1.05-1.53 1.48-3.01 1.5-3.09-.03-.01-2.88-1.1-2.91-4.37l-.01.03zM14.34 4.07c.75-.92 1.26-2.19 1.12-3.46-1.08.04-2.4.72-3.18 1.63-.7.81-1.31 2.1-1.15 3.34 1.21.09 2.45-.61 3.21-1.51z" />
    </svg>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.52 12.27c0-.82-.07-1.6-.21-2.36H12v4.47h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.74z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.08 7.95-2.91l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.28a7.2 7.2 0 0 1 0-4.56V6.63H1.29a12 12 0 0 0 0 10.74l3.98-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44A11.96 11.96 0 0 0 12 0 12 12 0 0 0 1.29 6.63l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
    </svg>
  );
}

export function SocialAuthButtons({
  mode = "continue",
  callbackUrl = "/",
}: {
  mode?: "signup" | "continue";
  callbackUrl?: string;
}) {
  const [enabled, setEnabled] = useState<Set<string>>(new Set());

  // Discover which OAuth providers are actually configured on the server, so a
  // button doesn't dead-end when its credentials haven't been set yet.
  useEffect(() => {
    let active = true;
    fetch("/api/auth/providers")
      .then((r) => r.json())
      .then((data) => {
        if (active && data && typeof data === "object") {
          setEnabled(new Set(Object.keys(data)));
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const handle = (provider: "apple" | "google", label: string) => {
    if (!enabled.has(provider)) {
      toast.info(`${label} sign-in is coming soon.`);
      return;
    }
    signIn(provider, { callbackUrl });
  };

  const appleLabel = mode === "signup" ? "Sign up with Apple" : "Continue with Apple";
  const googleLabel =
    mode === "signup" ? "Get started with Google" : "Continue with Google";

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => handle("apple", "Apple")}
        className="inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-full bg-neutral-900 text-base font-semibold text-white transition-colors hover:bg-neutral-700"
      >
        <AppleIcon className="size-5" />
        {appleLabel}
      </button>
      <button
        type="button"
        onClick={() => handle("google", "Google")}
        className="inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-full border border-neutral-300 bg-white text-base font-semibold text-neutral-900 transition-colors hover:bg-neutral-50"
      >
        <GoogleIcon className="size-5" />
        {googleLabel}
      </button>
    </div>
  );
}

export function AuthDivider({ label = "or" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 bg-neutral-200" />
      <span className="text-xs font-medium uppercase tracking-wider text-neutral-400">
        {label}
      </span>
      <span className="h-px flex-1 bg-neutral-200" />
    </div>
  );
}
