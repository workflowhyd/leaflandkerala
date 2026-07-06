"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { fetchHome, fetchOffers, fetchCashout } from "@/lib/api/employee";

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || "Login failed. Please try again.");
        setLoading(false);
        return;
      }

      if (data.user?.role === "EMPLOYEE") {
        // Prime the session-check cache so the employee layout doesn't re-verify
        // it with a redundant round-trip, and kick off the home page's data
        // fetches now so they're ready (or already in-flight) by the time it mounts.
        queryClient.setQueryData(["auth", "me"], { user: data.user });
        queryClient.prefetchQuery({ queryKey: ["employee", "home"], queryFn: fetchHome });
        queryClient.prefetchQuery({ queryKey: ["employee", "offers"], queryFn: fetchOffers });
        queryClient.prefetchQuery({ queryKey: ["employee", "cashout"], queryFn: fetchCashout });
        router.push("/employee/home");
      } else {
        router.push("/dashboard");
      }
      // Deliberately not resetting `loading` here — router.push() doesn't wait for
      // the destination page's data to be ready, so keeping the spinner visible
      // until this page unmounts avoids a blank "did it freeze?" gap during the
      // redirect (the actual bug being fixed here).
    } catch {
      setError("Network error. Please check your connection.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel - Brand/Hero */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{ backgroundColor: "#1E4D3D" }}
      >
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="leaf-pattern" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
                <circle cx="40" cy="40" r="1.5" fill="#F8F5EE" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#leaf-pattern)" />
          </svg>
        </div>

        {/* Logo */}
        <div className="relative z-10">
          <Logo size="lg" />
        </div>

        {/* Hero illustration */}
        <div className="relative z-10 flex flex-col items-center justify-center flex-1 py-16">
          <HeroIllustration />
          <h1 className="mt-8 text-4xl font-bold leading-tight text-center" style={{ color: "#F8F5EE" }}>
            Cultivating Growth,<br />
            <span style={{ color: "#7DB894" }}>One Field at a Time</span>
          </h1>
          <p className="mt-4 text-base text-center max-w-xs" style={{ color: "rgba(248,245,238,0.7)" }}>
            Kerala&apos;s premier agriculture ERP platform — managing farms, sales, and operations with precision.
          </p>
        </div>

        {/* Footer stats */}
        <div className="relative z-10 grid grid-cols-3 gap-4">
          {[
            { label: "Farmers Served", value: "2,400+" },
            { label: "Products Listed", value: "850+" },
            { label: "Districts Covered", value: "14" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl font-bold" style={{ color: "#F8F5EE" }}>{stat.value}</p>
              <p className="text-xs mt-0.5" style={{ color: "rgba(248,245,238,0.6)" }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel - Login form */}
      <div
        className="flex-1 flex flex-col items-center justify-center px-6 py-12"
        style={{ backgroundColor: "#F8F5EE" }}
      >
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex justify-center mb-10 lg:hidden">
            <Logo size="xl" />
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold" style={{ color: "#1a1a1a" }}>Welcome back</h2>
            <p className="mt-1 text-sm" style={{ color: "#64748b" }}>
              Sign in to your account to continue
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email field */}
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
                className="w-full px-4 py-2.5 rounded-lg border text-sm transition-colors outline-none focus:ring-2"
                style={{
                  borderColor: "#e2e8f0",
                  backgroundColor: "#ffffff",
                  color: "#1a1a1a",
                  // @ts-expect-error CSS custom property
                  "--tw-ring-color": "#3B7A57",
                }}
              />
            </div>

            {/* Password field */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium mb-1.5"
                style={{ color: "#374151" }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 pr-11 rounded-lg border text-sm transition-colors outline-none focus:ring-2"
                  style={{
                    borderColor: "#e2e8f0",
                    backgroundColor: "#ffffff",
                    color: "#1a1a1a",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded"
                  style={{ color: "#64748b" }}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {/* Remember me + Forgot password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border"
                  style={{ accentColor: "#1E4D3D" }}
                />
                <span className="text-sm" style={{ color: "#374151" }}>Remember me</span>
              </label>
              <Link
                href="/forgot-password"
                className="text-sm font-medium transition-colors"
                style={{ color: "#3B7A57" }}
              >
                Forgot password?
              </Link>
            </div>

            {/* Error message */}
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

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-150 flex items-center justify-center gap-2 mt-1"
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
                  Signing in…
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-sm" style={{ color: "#64748b" }}>
              New employee?{" "}
              <a
                href="/register"
                className="font-medium transition-colors"
                style={{ color: "#1E4D3D" }}
              >
                Create an account
              </a>
            </p>
          </div>

          <p className="mt-8 text-xs text-center" style={{ color: "#94a3b8" }}>
            LeafLand Kerala &copy; {new Date().getFullYear()}. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Inline SVG icons ─────────────────────────────────────────────────────── */

function LeafIcon({ light }: { light?: boolean }) {
  const color = light ? "#1E4D3D" : "#F8F5EE";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
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

function HeroIllustration() {
  return (
    <svg width="260" height="220" viewBox="0 0 260 220" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Ground */}
      <ellipse cx="130" cy="200" rx="110" ry="14" fill="rgba(59,122,87,0.3)" />

      {/* Large center tree */}
      <rect x="124" y="120" width="12" height="80" rx="4" fill="#5A8A40" />
      <ellipse cx="130" cy="100" rx="38" ry="45" fill="#2E6B45" />
      <ellipse cx="130" cy="85" rx="28" ry="35" fill="#3B7A57" />
      <ellipse cx="130" cy="72" rx="20" ry="26" fill="#4A9068" />

      {/* Left small plant */}
      <rect x="56" y="158" width="7" height="42" rx="3" fill="#5A8A40" />
      <ellipse cx="59" cy="145" rx="20" ry="24" fill="#2E6B45" />
      <ellipse cx="59" cy="134" rx="15" ry="18" fill="#3B7A57" />

      {/* Right small plant */}
      <rect x="197" y="158" width="7" height="42" rx="3" fill="#5A8A40" />
      <ellipse cx="201" cy="145" rx="20" ry="24" fill="#2E6B45" />
      <ellipse cx="201" cy="134" rx="15" ry="18" fill="#3B7A57" />

      {/* Leaf accents */}
      <path d="M80 110 Q90 90 105 100 Q95 118 80 110Z" fill="rgba(74,144,104,0.6)" />
      <path d="M170 115 Q185 95 195 108 Q180 124 170 115Z" fill="rgba(74,144,104,0.6)" />

      {/* Small dots - seeds */}
      <circle cx="100" cy="185" r="3" fill="rgba(248,245,238,0.4)" />
      <circle cx="160" cy="190" r="2.5" fill="rgba(248,245,238,0.4)" />
      <circle cx="140" cy="183" r="2" fill="rgba(248,245,238,0.4)" />

      {/* Sun rays */}
      <circle cx="210" cy="38" r="16" fill="rgba(255,210,80,0.25)" />
      <circle cx="210" cy="38" r="10" fill="rgba(255,210,80,0.4)" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const x1 = 210 + 13 * Math.cos(rad);
        const y1 = 38 + 13 * Math.sin(rad);
        const x2 = 210 + 22 * Math.cos(rad);
        const y2 = 38 + 22 * Math.sin(rad);
        return (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,210,80,0.5)" strokeWidth="2" strokeLinecap="round" />
        );
      })}

      {/* Floating leaf */}
      <path
        d="M48 52 Q55 38 68 44 Q62 58 48 52Z"
        fill="rgba(74,144,104,0.5)"
        transform="rotate(-20, 58, 48)"
      />
      <path
        d="M34 75 Q40 63 52 68 Q47 80 34 75Z"
        fill="rgba(74,144,104,0.4)"
        transform="rotate(10, 43, 72)"
      />
    </svg>
  );
}
