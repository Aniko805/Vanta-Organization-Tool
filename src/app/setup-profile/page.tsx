"use client";

import { supabase } from "@/lib/supabase";
import { updateUserProfile } from "@/lib/auth";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BTN_PRIMARY, CARD, INPUT, PAGE_BG } from "@/app/components/ui";

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
    <div className={`relative min-h-screen ${PAGE_BG} font-sans overflow-hidden flex items-center justify-center px-4 select-none`}>
      {/* Background Architectural Grid Lines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f2e_1px,transparent_1px),linear-gradient(to_bottom,#1f1f2e_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />

      {/* Floating Abstract Glow */}
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
              className={INPUT}
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
              className={INPUT}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`${BTN_PRIMARY} w-full py-2.5 text-sm`}
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Continue to Dashboard</span>
            )}
          </button>
        </form>

        {/* Error Display */}
        {error && (
          <p className="text-center text-xs text-rose-400 font-mono mt-4">
            {error}
          </p>
        )}

        {/* Minimal Footer */}
        <p className="text-center text-[10px] text-zinc-500 font-mono mt-8">
          Your information is secure and private
        </p>
      </div>
    </div>
  );
}
