"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function NextStepsAfterSignup() {
  const [email, setEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (data?.user?.email) setEmail(data.user.email);
      } catch {
        // ignore
      }
    };
    fetchUser();
  }, []);

  const handleReturnToLogin = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    window.location.href = "/login";
  };

  const handleResendVerification = async () => {
    if (!email) {
      setResendMessage("Please enter your email to resend verification.");
      return;
    }

    setResendLoading(true);
    setResendMessage(null);

    try {
      // Send a magic link (OTP) to the user's email. This is a safe client-side way
      // to let users get access while they verify their email. Supabase doesn't expose
      // a client method to re-send the confirmation email, so a magic link is a practical
      // alternative here.
      const { error } = await supabase.auth.signInWithOtp({ email });

      if (error) {
        setResendMessage(error.message);
      } else {
        setResendMessage("Sent a sign-in link to your email.");
      }
    } catch (err) {
      setResendMessage(err instanceof Error ? err.message : "Failed to resend verification");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-black text-white font-sans overflow-hidden flex items-center justify-center px-4 select-none">
      {/* Background Architectural Grid Lines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f2e_1px,transparent_1px),linear-gradient(to_bottom,#1f1f2e_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />

      {/* Floating Abstract Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Glass Card Wrapper */}
      <div className="relative z-10 w-full max-w-lg bg-zinc-950/40 border border-zinc-800/80 rounded-2xl p-8 backdrop-blur-xl shadow-2xl">
        <h2 className="text-2xl font-bold tracking-tight mb-4">Next steps</h2>
        <p className="text-sm text-zinc-300 mb-6">
          Thanks for signing up — check your email for a verification link to activate your account.
          After verifying your email, return here and sign in to continue.
        </p>

        {/* Email (prefilled when available) */}
        <div className="mb-4">
          <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-md px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
          />
        </div>

        {/* Resend verification + Return to login buttons */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleResendVerification}
            disabled={resendLoading}
            className="w-full bg-zinc-700 hover:bg-zinc-600 text-white py-2.5 rounded-md font-medium text-sm transition-all duration-200 active:scale-95 disabled:opacity-50 flex items-center justify-center"
          >
            {resendLoading ? "Sending…" : "Resend verification email / Send sign-in link"}
          </button>

          <button
            type="button"
            className="w-full bg-white hover:bg-zinc-200 text-black py-2.5 rounded-md font-medium text-sm transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center justify-center space-x-2"
            onClick={handleReturnToLogin}
          >
            Return to Login
          </button>
        </div>

        {resendMessage && (
          <p className="text-center text-sm text-zinc-300 mt-4">{resendMessage}</p>
        )}

        <p className="text-xs text-zinc-500 mt-6">Didn't receive an email? Check spam folders or try signing up again.</p>
      </div>
    </div>
  );
}
