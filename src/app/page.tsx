"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import {
  BTN_PRIMARY,
  BTN_SECONDARY,
  CARD_INTERACTIVE,
  PAGE_BG,
  SCROLLBAR,
} from "@/app/components/ui";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className={`relative min-h-screen ${PAGE_BG} font-sans overflow-hidden select-none flex items-center justify-center`}>
        <div className="text-zinc-500">Loading...</div>
      </div>
    );
  }

  return (
      <div className={`relative min-h-screen ${PAGE_BG} font-sans overflow-hidden select-none`}>
        {/* 1. Subtle Background Grid Effect */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f2e_1px,transparent_1px),linear-gradient(to_bottom,#1f1f2e_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />

        {/* 2. Top Minimal Navigation Bar */}
        <nav className="relative z-10 flex items-center justify-between gap-4 px-4 py-4 md:px-8 md:py-6 border-b border-white/10 backdrop-blur-xl bg-zinc-900/40">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-400 rotate-45 transform origin-center transition-transform hover:rotate-90 duration-500" />
            <span className="text-lg font-semibold tracking-tight uppercase text-zinc-100">Vulcan</span>
          </div>
          <div className={`flex min-w-0 items-center gap-4 md:gap-6 text-sm text-zinc-400 overflow-x-auto [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)] ${SCROLLBAR}`}>
            <a 
              href="https://github.com/Aniko805/Vulcan-Organization-Tool/blob/main/specs/mission.md" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex min-h-11 shrink-0 items-center hover:text-zinc-100 transition-colors"
            >
              Documentation
            </a>
            <a 
              href="https://github.com/Aniko805/Vulcan-Organization-Tool" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex min-h-11 shrink-0 items-center hover:text-zinc-100 transition-colors"
            >
              Repository
            </a>
            <a href="https://github.com/Aniko805/Vulcan-Organization-Tool" className="inline-flex min-h-11 shrink-0 items-center hover:text-zinc-100 transition-colors">Origin</a>
            <span className="h-4 w-px shrink-0 bg-white/10" />
            <div className="flex shrink-0 items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-mono">Open Source</span> 
            </div>
          </div>
        </nav>

        {/* 3. Hero / Main Interactive Section */}
        <main className="relative z-10 flex flex-col items-center justify-center text-center px-4 pt-24 pb-16">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none" />

          <div className="inline-flex items-center space-x-2 bg-zinc-900/40 backdrop-blur-xl border border-white/10 px-3 py-1 rounded-full text-xs text-zinc-400 mb-6 hover:bg-zinc-800/50 hover:border-white/20 transition-all duration-300 ease-out">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="font-mono uppercase tracking-widest">FRC / FTC ready</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter bg-gradient-to-b from-zinc-100 to-zinc-400 bg-clip-text text-transparent mb-6 max-w-3xl leading-none">
            Vulcan
          </h1>
          
          <p className="text-zinc-500 text-lg md:text-xl max-w-xl mb-10 tracking-tight font-light">
            Organize parts, teams, and Kanban tasks for FIRST Robotics and Tech Challenge — open source, on Vercel + Supabase.
          </p>

          {/* Interactive CTA Buttons (Unified into single container) */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-xs sm:max-w-none">
            <Link 
              href={user ? "/dashboard" : "/login"}
              className={`${BTN_PRIMARY} w-full sm:w-auto px-8 py-3 text-sm text-center`}
            >
              {user ? "Dashboard" : "Sign in"}
            </Link>

            {/* Dashboard Mock Button */}
            
            
            {/* Functional GitHub Link Button */}
            <a 
              href="https://github.com/Aniko805/Vulcan-Organization-Tool" 
              target="_blank" 
              rel="noopener noreferrer"
              className={`${BTN_SECONDARY} w-full sm:w-auto px-8 py-3 text-sm`}
            >
              Visit Our GitHub
            </a>
          </div>
        </main>

        <section id="origin" className="relative z-10 max-w-5xl mx-auto px-6 pb-24 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`group relative p-6 ${CARD_INTERACTIVE} overflow-hidden`}>
            <h3 className="text-sm font-semibold text-zinc-100 tracking-tight mb-2">Parts & inventory</h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Track GoBilda and shop stock with statuses: inventory, to be used, used, or removed.
            </p>
          </div>

          <div className={`group relative p-6 ${CARD_INTERACTIVE} overflow-hidden`}>
            <h3 className="text-sm font-semibold text-zinc-100 tracking-tight mb-2">Teams & roles</h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Create a team, share an invite code, and assign Captain, Software, Hardware, or Member roles.
            </p>
          </div>

          <div className={`group relative p-6 ${CARD_INTERACTIVE} overflow-hidden`}>
            <h3 className="text-sm font-semibold text-zinc-100 tracking-tight mb-2">Kanban tasks</h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Team boards with subtasks, assignees, and personal task lists for what is on your plate.
            </p>
          </div>
        </section>
      </div>
  );
}