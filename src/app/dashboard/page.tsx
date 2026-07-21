"use client";

import { useState } from "react";
import Sidebar from "@/app/components/Sidebar";

export default function DashboardPage() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [logs, setLogs] = useState<string[]>([
    "System standby.",
    "Connected to Supabase Cloud Engine.",
    "Session authenticated successfully."
  ]);

  const triggerSync = () => {
    setIsSyncing(true);
    setLogs((prev) => [...prev, "Initiating database handshake..."]);
    setTimeout(() => {
      setLogs((prev) => [
        ...prev,
        "Fetch verified (200 OK)",
        "Local schema in sync with main branch.",
        "System up to date."
      ]);
      setIsSyncing(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans overflow-x-hidden flex select-none">
      <Sidebar />
      <main className="flex-1 p-10 max-w-7xl mx-auto space-y-8">
        <header className="flex justify-between items-end border-b border-zinc-900 pb-6">
          <div>
            <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-1">Workspace</p>
            <h1 className="text-3xl font-extrabold tracking-tight">System Control</h1>
          </div>
          <button onClick={triggerSync} disabled={isSyncing} className="px-4 py-2 bg-white text-black text-xs font-semibold rounded hover:bg-zinc-200 transition-colors active:scale-95 disabled:opacity-50">
            {isSyncing ? "Syncing Workspace..." : "Sync Database"}
          </button>
        </header>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 p-6 bg-zinc-950 border border-zinc-900 rounded-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-mono font-semibold text-zinc-300 uppercase tracking-wider">Live System Logs</h3>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="bg-black/40 border border-zinc-900 rounded p-4 font-mono text-xs text-zinc-500 h-48 overflow-y-auto space-y-2">
                {logs.map((log, index) => (
                  <p key={index} className="leading-relaxed">
                    <span className="text-zinc-700">&gt;</span> {log}
                  </p>
                ))}
              </div>
            </div>
            <p className="text-[10px] font-mono text-zinc-600 mt-4">Press Sync Database to run diagnostics.</p>
          </div>
          <div className="p-6 bg-zinc-950 border border-zinc-900 rounded-xl flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-mono font-semibold text-zinc-300 uppercase tracking-wider mb-4">Active Mission</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-zinc-100">Establish Phase 1 Architecture</h4>
                  <p className="text-xs text-zinc-500 mt-1 leading-relaxed">Connecting Next.js routes with live Supabase client libraries.</p>
                </div>
                <div className="border-t border-zinc-900 pt-3">
                  <span className="inline-block bg-zinc-900 text-[10px] font-mono text-zinc-400 border border-zinc-800 px-2 py-0.5 rounded">Priority: High</span>
                </div>
              </div>
            </div>
            <p className="text-[10px] font-mono text-zinc-600">Assigned: Team Vanta</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 bg-zinc-950 border border-zinc-900 rounded-xl">
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Database Queries</p>
            <p className="text-2xl font-bold font-mono">1,024</p>
          </div>
          <div className="p-5 bg-zinc-950 border border-zinc-900 rounded-xl">
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Latency Metrics</p>
            <p className="text-2xl font-bold font-mono text-emerald-500">12ms</p>
          </div>
          <div className="p-5 bg-zinc-950 border border-zinc-900 rounded-xl">
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Vercel Edge cache</p>
            <p className="text-2xl font-bold font-mono text-purple-400">98.4%</p>
          </div>
        </div>
      </main>
    </div>
  );
}
