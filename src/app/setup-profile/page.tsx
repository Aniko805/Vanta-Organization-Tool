"use client";

import { supabase } from "@/lib/supabase";
import { updateUserProfile } from "@/lib/auth";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SetupProfilePage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Get the current user
    const getUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        router.replace("/login");
        return;
      }

      setUserId(user.id);
    };

    getUser();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedFirstName = firstName.trim();
    const normalizedLastName = lastName.trim();

    if (!normalizedFirstName) {
      setError("Please enter your first name");
      return;
    }

    if (!normalizedLastName) {
      setError("Please enter your last name");
      return;
    }

    if (!userId) {
      setError("User not found");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await updateUserProfile(userId, {
        first_name: normalizedFirstName,
        last_name: normalizedLastName,
      });

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-black text-white font-sans overflow-hidden flex items-center justify-center px-4 select-none">
      {/* Background Architectural Grid Lines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f2e_1px,transparent_1px),linear-gradient(to_bottom,#1f1f2e_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />

      {/* Floating Abstract Glow */}
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
            Complete your profile
          </h2>
          <p className="text-xs text-zinc-400 mt-2">Add your first and last name to finish setup</p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1.5">
              First Name
            </label>
            <input
              type="text"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Steven"
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-md px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1.5">
              Last Name
            </label>
            <input
              type="text"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Zhang"
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
                <span>Saving...</span>
              </>
            ) : (
              <span>Continue to Dashboard</span>
            )}
          </button>
        </form>

        {/* Error Display */}
        {error && (
          <p className="text-center text-xs text-rose-500 font-mono mt-4">
            {error}
          </p>
        )}

        {/* Minimal Footer */}
        <p className="text-center text-[10px] text-zinc-600 font-mono mt-8">
          Your information is secure and private
        </p>
      </div>
    </div>
  );
}
