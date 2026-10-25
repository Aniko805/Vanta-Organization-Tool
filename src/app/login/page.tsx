"use client";

import { hasCompletedProfile } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { BTN_PRIMARY, BTN_SECONDARY, CARD, INPUT, PAGE_BG } from "@/app/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Same destination rule for every sign-in method: finished profile goes to
  // the dashboard, otherwise to profile setup.
  const routeSignedInUser = useCallback(
    async (userId: string) => {
      const profileCompleted = await hasCompletedProfile(userId);
      router.push(profileCompleted ? "/dashboard" : "/setup-profile");
    },
    [router]
  );

  // Google returns to this page. The existing client picks the session up from
  // the URL (detectSessionInUrl), so we only wait for it, then route as usual.
  useEffect(() => {
    const url = new URL(window.location.href);
    const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
    const returnedError =
      url.searchParams.get("error_description") ?? hash.get("error_description");
    const returnedFromGoogle = hash.has("access_token");
    if (!returnedError && !returnedFromGoogle) return;

    let active = true;
    const finishGoogleSignIn = async () => {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      window.history.replaceState(null, "", window.location.pathname);
      if (!active) return;

      if (returnedError || sessionError || !session) {
        setError(returnedError ?? sessionError?.message ?? "Google sign-in was cancelled.");
        return;
      }

      setGoogleLoading(true);
      try {
        await routeSignedInUser(session.user.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
        setGoogleLoading(false);
      }
    };

    void finishGoogleSignIn();
    return () => {
      active = false;
    };
  }, [routeSignedInUser]);

  const handleGoogleSignIn = async () => {
    if (googleLoading || loading) return;

    setGoogleLoading(true);
    setError(null);

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/login` },
    });

    // On success the browser is already leaving for Google, so keep the
    // loading state. Only an immediate failure re-enables the button.
    if (oauthError) {
      setError(oauthError.message);
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const normalizedUsername = username.trim();

    if (activeTab === "signup" && !normalizedUsername) {
      setError("Please choose a username.");
      return;
    }

    if (activeTab === "signup" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result =
        activeTab === "signin"
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({
              email,
              password,
              options: {
                data: {
                  username: normalizedUsername,
                },
              },
            });
      if (result.error) {
        const message = result.error.message.toLowerCase().includes("rate limit")
          ? "Too many signup attempts. Please wait a minute and try again."
          : result.error.message;

        setError(message);
        return;
      }

      // For signups, route to next-steps-after-signup so users see verification/next steps
      if (activeTab === "signup") {
        router.push("/next-steps-after-signup");
        return;
      }

      if (result.data.user) {
        // Check if user has completed their profile
        await routeSignedInUser(result.data.user.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`relative min-h-screen ${PAGE_BG} font-sans overflow-hidden flex items-center justify-center px-4 select-none`}>
      {/* Background Architectural Grid Lines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f2e_1px,transparent_1px),linear-gradient(to_bottom,#1f1f2e_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />

      {/* Floating Abstract Glow (Aesthetic alignment with home) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Glass Card Wrapper */}
      <div className={`relative z-10 w-full max-w-md ${CARD} p-6 md:p-8`}>
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="flex min-h-11 items-center space-x-2 group">
            <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-400 rotate-45 transform origin-center transition-transform group-hover:rotate-90 duration-500" />
            <span className="text-sm font-semibold tracking-widest uppercase text-zinc-400 group-hover:text-zinc-100 transition-colors">Vulcan</span>
          </Link>
          <h2 className="text-2xl font-bold tracking-tight mt-4 bg-gradient-to-b from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
            {activeTab === "signin" ? "Welcome back" : "Start your journey"}
          </h2>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-1 bg-zinc-900/50 p-1 rounded-2xl border border-white/10 mb-6 text-xs font-medium">
          <button
            onClick={() => setActiveTab("signin")}
            className={`min-h-11 py-2 rounded-xl transition-all duration-300 ease-out ${activeTab === "signin" ? "bg-zinc-800/60 border border-white/10 text-zinc-100" : "border border-transparent text-zinc-500 hover:text-zinc-300"}`}
          >
            Sign In
          </button>
          <button
            onClick={() => setActiveTab("signup")}
            className={`min-h-11 py-2 rounded-xl transition-all duration-300 ease-out ${activeTab === "signup" ? "bg-zinc-800/60 border border-white/10 text-zinc-100" : "border border-transparent text-zinc-500 hover:text-zinc-300"}`}
          >
            Sign Up
          </button>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {activeTab === "signup" && (
            <div>
              <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1.5">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="stevenzhang"
                className={INPUT}
              />
            </div>
          )}

          <div>
            <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1.5">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className={INPUT}
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1.5">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={INPUT}
            />
          </div>

          {activeTab === "signup" && (
            <div>
              <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1.5">Confirm Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className={INPUT}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`${BTN_PRIMARY} w-full py-2.5 text-sm`}
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <span>Continue</span>
            )}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-white/10" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">or</span>
          <span className="h-px flex-1 bg-white/10" />
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading || loading}
          className={`${BTN_SECONDARY} w-full py-2.5 text-sm`}
        >
          {googleLoading ? (
            <>
              <span className="w-4 h-4 border-2 border-zinc-200 border-t-transparent rounded-full animate-spin" />
              <span>Connecting to Google...</span>
            </>
          ) : (
            <>
              <svg aria-hidden="true" viewBox="0 0 48 48" className="h-4 w-4">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <span>Continue with Google</span>
            </>
          )}
        </button>

        {/* Minimal Footer */}
        <p className="text-center text-[10px] text-zinc-500 font-mono mt-8">
          Secured by Supabase Cryptography Systems
          {error ? (
            <>
              <span className="block text-rose-400 mt-2">{error}</span>
            </>
          ) : null}
        </p>
      </div>
    </div>
  );
}