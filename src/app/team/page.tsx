"use client";

import Sidebar from "@/app/components/Sidebar";

export default function TeamPage() {
  return (
    <div className="min-h-screen bg-black text-white font-sans overflow-x-hidden flex select-none">
      <Sidebar />
      <main className="flex-1 p-10 max-w-7xl mx-auto space-y-8">
        <header className="border-b border-zinc-900 pb-6">
          <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-1">Collaboration</p>
          <h1 className="text-3xl font-extrabold tracking-tight">Team</h1>
        </header>
        <div className="p-6 bg-zinc-950 border border-zinc-900 rounded-xl">
          <p className="text-xs font-mono text-zinc-500">No team data yet.</p>
        </div>
      </main>
    </div>
  );
}
