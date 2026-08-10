"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

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
      <div className="relative min-h-screen bg-black text-white font-sans overflow-hidden select-none flex items-center justify-center">
        <div className="text-zinc-500">Loading...</div>
      </div>
    );
  }

  if (!user) {
    // Show the public landing page (we'll keep the current one but without the auth check)
    // We'll return the same JSX as before but without the user check.
    // We'll copy the old JSX here.
    return (
      <div className="relative min-h-screen bg-black text-white font-sans overflow-hidden select-none">
        {/* 1. Subtle Background Grid Effect */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f2e_1px,transparent_1px),linear-gradient(to_bottom,#1f1f2e_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />

        {/* 2. Top Minimal Navigation Bar */}
        <nav className="relative z-10 flex items-center justify-between px-8 py-6 border-b border-zinc-900 backdrop-blur-md bg-black/50">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-white rotate-45 transform origin-center transition-transform hover:rotate-90 duration-500" />
            <span className="text-lg font-semibold tracking-tight uppercase">Vulcan</span>
          </div>
          <div className="flex items-center space-x-6 text-sm text-zinc-400">
            <a 
              href="https://github.com/Aniko805/Vulcan-Organization-Tool/blob/main/specs/mission.md" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-white transition-colors"
            >
              Documentation
            </a>
            <a 
              href="https://github.com/Aniko805/Vulcan-Organization-Tool" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-white transition-colors"
            >
              Repository
            </a>
            <a href="#origin" className="hover:text-white transition-colors">Origin</a>
            <span className="h-4 w-px bg-zinc-800" />
            <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-mono">Open Source</span> 
            </div>
          </div>
        </nav>

        {/* 3. Hero / Main Interactive Section */}
        <main className="relative z-10 flex flex-col items-center justify-center text-center px-4 pt-24 pb-16">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none" />

          <div className="inline-flex items-center space-x-2 bg-zinc-900/80 border border-zinc-800 px-3 py-1 rounded-full text-xs text-zinc-400 mb-6 hover:border-zinc-700 transition-all duration-300">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="font-mono uppercase tracking-widest">FRC / FTC ready</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent mb-6 max-w-3xl leading-none">
            Vulcan
          </h1>
          
          <p className="text-zinc-500 text-lg md:text-xl max-w-xl mb-10 tracking-tight font-light">
            Organize parts, teams, and Kanban tasks for FIRST Robotics and Tech Challenge — open source, on Vercel + Supabase.
          </p>

          {/* Interactive CTA Buttons (Unified into single container) */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-xs sm:max-w-none">
            {/* Sign In Button Linked to /login */}
            <Link 
              href="/login"
              className="w-full sm:w-auto px-8 py-3 bg-white text-black font-medium text-sm rounded-md hover:bg-zinc-200 transition-all duration-200 shadow-lg shadow-white/5 active:scale-95 text-center flex items-center justify-center"
            >
              Sign In
            </Link>

            {/* Dashboard Mock Button */}
            <Link 
              href="/dashboard"
              className="w-full sm:w-auto px-8 py-3 bg-zinc-900 border border-zinc-800 text-white font-medium text-sm rounded-md hover:bg-zinc-800 transition-all duration-200 active:scale-95 text-center flex items-center justify-center"
            >
              Dashboard
            </Link>
            
            {/* Functional GitHub Link Button */}
            <a 
              href="https://github.com/Aniko805/Vulcan-Organization-Tool" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-8 py-3 bg-zinc-950 border border-zinc-800 text-zinc-300 font-medium text-sm rounded-md hover:bg-zinc-900 hover:border-zinc-700 transition-all duration-200 active:scale-95 inline-flex items-center justify-center"
            >
              Visit Our GitHub
            </a>
          </div>
        </main>

        <section id="origin" className="relative z-10 max-w-5xl mx-auto px-6 pb-24 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="group relative p-6 bg-zinc-950/40 border border-zinc-900 rounded-xl hover:border-zinc-800 transition-all duration-300 overflow-hidden backdrop-blur-md">
            <h3 className="text-sm font-semibold text-zinc-100 tracking-tight mb-2">Parts & inventory</h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Track GoBilda and shop stock with statuses: inventory, to be used, used, or removed.
            </p>
          </div>

          <div className="group relative p-6 bg-zinc-950/40 border border-zinc-900 rounded-xl hover:border-zinc-800 transition-all duration-300 overflow-hidden backdrop-blur-md">
            <h3 className="text-sm font-semibold text-zinc-100 tracking-tight mb-2">Teams & roles</h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Create a team, share an invite code, and assign Captain, Software, Hardware, or Member roles.
            </p>
          </div>

          <div className="group relative p-6 bg-zinc-950/40 border border-zinc-900 rounded-xl hover:border-zinc-800 transition-all duration-300 overflow-hidden backdrop-blur-md">
            <h3 className="text-sm font-semibold text-zinc-100 tracking-tight mb-2">Kanban tasks</h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Team boards with subtasks, assignees, and personal task lists for what is on your plate.
            </p>
          </div>
        </section>
      </div>
    );
  }

  // User is logged in
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="relative min-h-screen bg-black text-white font-sans overflow-hidden select-none flex flex-col items-center justify-center p-10">
      {/* Simplified header with logout */}
      <header className="mb-8 flex items-center justify-between w-full">
        <h1 className="text-3xl font-bold text-white">
          Welcome back, {user.email?.split('@')[0] ?? 'User'}!
        </h1>
        <button onClick={handleLogout} className="px-4 py-2 bg-white text-black text-xs font-semibold rounded hover:bg-zinc-200 transition-colors active:scale-95">
          Sign Out
        </button>
      </header>

      {/* Quick links grid */}
      <div className="gap-6 w-full max-w-4xl">
        <Link 
          href="/dashboard"
          className="group flex items-center justify-center p-6 bg-zinc-950/30 border border-zinc-800/50 rounded-xl hover:bg-zinc-900/40 hover:border-zinc-800/70 transition-all duration-300"
        >
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-emerald-500/20 rounded flex items-center justify-center">
              <span className="text-emerald-400 font-bold text-xl">📊</span>
            </div>
            <div>
              <h3 className="font-semibold text-white">Dashboard</h3>
              <p className="text-xs text-zinc-400">Overview of your teams and tasks</p>
            </div>
          </div>
        </Link>

        <Link 
          href="/team"
          className="group flex items-center justify-center p-6 bg-zinc-950/30 border border-zinc-800/50 rounded-xl hover:bg-zinc-900/40 hover:border-zinc-800/70 transition-all duration-300"
        >
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-purple-500/20 rounded flex items-center justify-center">
              <span className="text-purple-400 font-bold text-xl">👥</span>
            </div>
            <div>
              <h3 className="font-semibold text-white">Teams</h3>
              <p className="text-xs text-zinc-400">Manage your teams and roles</p>
            </div>
          </div>
        </Link>

        <Link 
          href="/team-tasks"
          className="group flex items-center justify-center p-6 bg-zinc-950/30 border border-zinc-800/50 rounded-xl hover:bg-zinc-800/70 transition-all duration-300"
        >
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-500/20 rounded flex items-center justify-center">
              <span className="text-blue-400 font-bold text-xl">📋</span>
            </div>
            <div>
              <h3 className="font-semibold text-white">Team Tasks</h3>
              <p className="text-xs text-zinc-400">Kanban boards for team projects</p>
            </div>
          </div>
        </Link>

        <Link 
          href="/parts"
          className="group flex items-center justify-center p-6 bg-zinc-950/30 border border-zinc-800/50 rounded-xl hover:bg-zinc-800/70 transition-all duration-300"
        >
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-green-500/20 rounded flex items-center justify-center">
              <span className="text-green-400 font-bold text-xl">🔧</span>
            </div>
            <div>
              <h3 className="font-semibold text-white">Parts</h3>
              <p className="text-xs text-zinc-400">Inventory and parts management</p>
            </div>
          </div>
        </Link>

        <Link 
          href="/personal-tasks"
          className="group flex items-center justify-center p-6 bg-zinc-950/30 border border-zinc-800/50 rounded-xl hover:bg-zinc-800/70 transition-all duration-300"
        >
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-yellow-500/20 rounded flex items-center justify-center">
              <span className="text-yellow-400 font-bold text-xl">📝</span>
            </div>
            <div>
              <h3 className="font-semibold text-white">Personal Tasks</h3>
              <p className="text-xs text-zinc-400">Your individual task list</p>
            </div>
          </div>
        </Link>

        <Link 
          href="/settings"
          className="group flex items-center justify-center p-6 bg-zinc-950/30 border border-zinc-800/50 rounded-xl hover:bg-zinc-800/70 transition-all duration-300"
        >
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-500/20 rounded flex items-center justify-center">
              <span className="text-gray-400 font-bold text-xl">⚙️</span>
            </div>
            <div>
              <h3 className="font-semibold text-white">Settings</h3>
              <p className="text-xs text-zinc-400">Manage your profile and preferences</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}