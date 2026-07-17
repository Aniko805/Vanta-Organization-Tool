"use client";

import { supabase } from "@/lib/supabase";
import { hasCompletedProfile } from "@/lib/auth";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);

  console.log(process.env.NEXT_PUBLIC_SUPABASE_URL);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const result =
        activeTab === "signin"
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({ email, password });
      // if (activeTab === "signup") {
      //   if (!result.data.user) {
      //     throw new Error("Failed to create user.");
      //   }
      //   const { error: profileError } = await supabase
      //     .from("profiles")
      //     .insert({id: result.data.user.id,});

      //   if (profileError) {
      //     setError(profileError.message);
      //     return;
      //   }
      // }
      console.log("RESULT:", result);
      if (result.error) {
        const message = result.error.message.toLowerCase().includes("rate limit")
          ? "Too many signup attempts. Please wait a minute and try again."
          : result.error.message;

        setError(message);
        return;
      }

      if (result.data.user) {
        // Check if user has completed their profile
        const profileCompleted = await hasCompletedProfile(result.data.user.id);

        if (profileCompleted) {
          if (activeTab === "signup") {
            setError("Account created! Please check your email to verify your account.");
            return;
          }

          router.push("/dashboard");
        } else {
          router.push("/setup-profile");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-black text-white font-sans overflow-hidden flex items-center justify-center px-4 select-none">
      {/* Background Architectural Grid Lines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f2e_1px,transparent_1px),linear-gradient(to_bottom,#1f1f2e_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />

      {/* Floating Abstract Glow (Aesthetic alignment with home) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Glass Card Wrapper */}
      <div className="relative z-10 w-full max-w-md bg-zinc-950/40 border border-zinc-800/80 rounded-2xl p-8 backdrop-blur-xl shadow-2xl">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="w-5 h-5 bg-white rotate-45 transform origin-center transition-transform group-hover:rotate-90 duration-500" />
            <span className="text-sm font-semibold tracking-widest uppercase text-zinc-400 group-hover:text-white transition-colors">Vanta</span>
          </Link>
          <h2 className="text-2xl font-bold tracking-tight mt-4 bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">
            {activeTab === "signin" ? "Welcome back" : "Start your journey"}
          </h2>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-1 bg-zinc-900/60 p-1 rounded-lg border border-zinc-800 mb-6 text-xs font-medium">
          <button
            onClick={() => setActiveTab("signin")}
            className={`py-2 rounded-md transition-all duration-200 ${activeTab === "signin" ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            Sign In
          </button>
          <button
            onClick={() => setActiveTab("signup")}
            className={`py-2 rounded-md transition-all duration-200 ${activeTab === "signup" ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            Sign Up
          </button>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1.5">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-md px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
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
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-md px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white hover:bg-zinc-200 text-black py-2.5 rounded-md font-medium text-sm transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <span>Continue</span>
            )}
          </button>
        </form>

        {/* Minimal Footer */}
        <p className="text-center text-[10px] text-zinc-600 font-mono mt-8">
          Secured by Supabase Cryptography Systems
          {error ? (
            <>
              <span className="block text-rose-500 mt-2">{error}</span>
            </>
          ) : null}
        </p>
      </div>
    </div>
  );
}