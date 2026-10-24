"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  BTN_PRIMARY,
  BTN_SECONDARY,
  CARD,
  INPUT,
  PAGE_BG,
} from "@/app/components/ui";

export default function NextStepsAfterSignup() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  // Replace your useEffect in NextStepsAfterSignup with this:
useEffect(() => {
  let isMounted = true;

  const fetchUser = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (user?.email) {
        setEmail(user.email);
      }
    } catch {
      // ignore
    }
  };

  fetchUser();

  return () => {
    isMounted = false;
  };
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
    <div className={`relative min-h-screen ${PAGE_BG} font-sans overflow-hidden flex items-center justify-center px-4 select-none`}>
      {/* Background Architectural Grid Lines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f2e_1px,transparent_1px),linear-gradient(to_bottom,#1f1f2e_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />

      {/* Floating Abstract Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Glass Card Wrapper */}
      <div className={`relative z-10 w-full max-w-lg ${CARD} p-6 md:p-8`}>
        <h2 className="text-2xl font-bold tracking-tight mb-4 text-zinc-100">Next steps</h2>
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
            className={INPUT}
          />
        </div>

        {/* Resend verification + Return to login buttons */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleResendVerification}
            disabled={resendLoading}
            className={`${BTN_SECONDARY} w-full py-2.5 text-sm`}
          >
            {resendLoading ? "Sending…" : "Resend verification email / Send sign-in link"}
          </button>

          <button
            type="button"
            className={`${BTN_PRIMARY} w-full py-2.5 text-sm`}
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
