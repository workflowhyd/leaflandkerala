"use client";

import { useState } from "react";
import Link from "next/link";

type Step = "form" | "success";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
      } else {
        setStep("success");
      }
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12" style={{ backgroundColor: "#F8F5EE" }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: "#1E4D3D" }}
          >
            <LeafIcon />
          </div>
          <span className="text-lg font-semibold" style={{ color: "#1E4D3D" }}>
            LeafLand Kerala
          </span>
        </div>

        {step === "form" ? (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-bold" style={{ color: "#1a1a1a" }}>
                Forgot your password?
              </h1>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "#64748b" }}>
                No worries — enter your email address and we&apos;ll send you a link to reset your password.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: "#374151" }}
                >
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 transition-colors"
                  style={{
                    borderColor: "#e2e8f0",
                    backgroundColor: "#ffffff",
                    color: "#1a1a1a",
                  }}
                />
              </div>

              {error && (
                <div
                  className="flex items-start gap-2.5 px-4 py-3 rounded-lg text-sm"
                  style={{ backgroundColor: "#fee2e2", color: "#991b1b" }}
                  role="alert"
                >
                  <AlertIcon />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-150 flex items-center justify-center gap-2"
                style={{
                  backgroundColor: loading ? "#3B7A57" : "#1E4D3D",
                  color: "#F8F5EE",
                  opacity: loading ? 0.8 : 1,
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? (
                  <>
                    <SpinnerIcon />
                    Sending…
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
                style={{ color: "#3B7A57" }}
              >
                <ArrowLeftIcon />
                Back to Sign In
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col items-center text-center py-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-6"
                style={{ backgroundColor: "rgba(59,122,87,0.12)" }}
              >
                <MailCheckIcon />
              </div>
              <h1 className="text-2xl font-bold" style={{ color: "#1a1a1a" }}>
                Check your email
              </h1>
              <p className="mt-3 text-sm leading-relaxed max-w-xs" style={{ color: "#64748b" }}>
                We&apos;ve sent a password reset link to{" "}
                <span className="font-semibold" style={{ color: "#1E4D3D" }}>{email}</span>.
                The link expires in 1 hour.
              </p>
              <p className="mt-4 text-xs" style={{ color: "#94a3b8" }}>
                Didn&apos;t receive an email? Check your spam folder or{" "}
                <button
                  type="button"
                  onClick={() => setStep("form")}
                  className="font-medium underline underline-offset-2 transition-colors"
                  style={{ color: "#3B7A57" }}
                >
                  try again
                </button>
                .
              </p>
            </div>

            <div className="mt-8 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
                style={{ color: "#3B7A57" }}
              >
                <ArrowLeftIcon />
                Back to Sign In
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Inline SVG icons ─────────────────────────────────────────────────────── */

function LeafIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F8F5EE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "1px" }}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}

function MailCheckIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3B7A57" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h8" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      <path d="m16 19 2 2 4-4" />
    </svg>
  );
}
