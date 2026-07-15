"use client";

import { useEffect, useState } from "react";
import Link from "next/link"; // Imported for routing
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);

  useEffect(() => {
    // Soft test to see if our Supabase environment variables are initialized
    if (supabase) {
      setDbConnected(true);
    } else {
      setDbConnected(false);
    }
  }, []);

  return (
    <div className="relative min-h-screen bg-black text-white font-sans overflow-hidden select-none">
      
      {/* 1. Subtle Background Grid Effect */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f2e_1px,transparent_1px),linear-gradient(to_bottom,#1f1f2e_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />

      {/* 2. Top Minimal Navigation Bar */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 border-b border-zinc-900 backdrop-blur-md bg-black/50">
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 bg-white rotate-45 transform origin-center transition-transform hover:rotate-90 duration-500" />
          <span className="text-lg font-semibold tracking-tight uppercase">Vanta</span>
        </div>
        <div className="flex items-center space-x-6 text-sm text-zinc-400">
          <a 
            href="https://github.com/Aniko805/Vanta-Organization-Tool/blob/main/README.md" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="hover:text-white transition-colors"
          >
            Documentation
          </a>
          <a 
            href="https://github.com/Aniko805/Vanta-Organization-Tool" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="hover:text-white transition-colors"
          >
            Repository
          </a>
          <a href="#origin" className="hover:text-white transition-colors">Origin</a>
          <span className="h-4 w-px bg-zinc-800" />
          <div className="flex items-center space-x-2">
            <span className={`w-2 h-2 rounded-full ${dbConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-xs font-mono">{dbConnected ? "DB Active" : "DB Missing"}</span>
          </div>
        </div>
      </nav>

      {/* 3. Hero / Main Interactive Section */}
      <main className="relative z-10 flex flex-col items-center justify-center text-center px-4 pt-24 pb-16">
        
        {/* Abstract Glowing Aura behind Header */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

        {/* Dynamic Badge */}
        <div className="inline-flex items-center space-x-2 bg-zinc-900/80 border border-zinc-800 px-3 py-1 rounded-full text-xs text-zinc-400 mb-6 hover:border-zinc-700 transition-all duration-300">
          <span className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
          <span>Vanta</span>
        </div>

        {/* Headings */}
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent mb-6 max-w-3xl leading-none">
          Simplify your collective organizational flow.
        </h1>
        
        <p className="text-zinc-500 text-lg md:text-xl max-w-xl mb-10 tracking-tight font-light">
          Welcome to <span className="text-zinc-200 font-medium">Vanta</span>. A clean, Open Source, hyper-responsive environment engineered to track missions, tech stacks, and shared progress.
        </p>

        {/* Interactive CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-xs sm:max-w-none">
          {/* Sign In Button Linked to /login */}
          <Link 
            href="/login"
            className="w-full sm:w-auto px-8 py-3 bg-white text-black font-medium text-sm rounded-md hover:bg-zinc-200 transition-all duration-200 shadow-lg shadow-white/5 active:scale-95 text-center flex items-center justify-center"
          >
            Sign In
          </Link>
          
          {/* Functional GitHub Link Button */}
          <a 
            href="https://github.com/Aniko805/Vanta-Organization-Tool" 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-8 py-3 bg-zinc-950 border border-zinc-800 text-zinc-300 font-medium text-sm rounded-md hover:bg-zinc-900 hover:border-zinc-700 transition-all duration-200 active:scale-95 inline-flex items-center justify-center"
          >
            Visit Our GitHub
          </a>
        </div>
      </main>

      {/* 4. Bento Grid Showcasing System Information */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pb-24 grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Card 1 */}
        <div className="group relative p-6 bg-zinc-950 border border-zinc-900 rounded-xl hover:border-zinc-800 transition-all duration-300 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          <h3 className="text-sm font-semibold text-zinc-100 tracking-tight mb-2">Spec-Driven Development</h3>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Every build phase is mapped directly out of markdown manifestos, guaranteeing no bloated features.
          </p>
        </div>

        {/* Card 2 */}
        <div className="group relative p-6 bg-zinc-950 border border-zinc-900 rounded-xl hover:border-zinc-800 transition-all duration-300 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          <h3 className="text-sm font-semibold text-zinc-100 tracking-tight mb-2">Supabase Ready</h3>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Fully scalable, relational cloud databases working silently to populate dashboard widgets in real-time.
          </p>
        </div>

        {/* Card 3 */}
        <div className="group relative p-6 bg-zinc-950 border border-zinc-900 rounded-xl hover:border-zinc-800 transition-all duration-300 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          <h3 className="text-sm font-semibold text-zinc-100 tracking-tight mb-2">Tailwind Styling</h3>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Blazing-fast visual adjustments using utility classes. Zero bloated stylesheets or slow layout render times.
          </p>
        </div>

      </section>
    </div>
  );
}