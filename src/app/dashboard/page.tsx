"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell, { EmptyState, Label, Panel, PrimaryButton } from "@/app/components/AppShell";
import { countPartsByStatus } from "@/lib/parts";
import { supabase } from "@/lib/supabase";
import { listMyTeams } from "@/lib/teams";
import { listPersonalAndAssignedTasks, listTeamTasks } from "@/lib/tasks";
import type { Team } from "@/lib/types";

type Stats = {
  teams: number;
  openTasks: number;
  personalTasks: number;
  partsInventory: number;
  activeTeamName: string | null;
  topTaskName: string | null;
  logs: string[];
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    teams: 0,
    openTasks: 0,
    personalTasks: 0,
    partsInventory: 0,
    activeTeamName: null,
    topTaskName: null,
    logs: ["Loading workspace…"],
  });
  const [syncing, setSyncing] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);

  const load = async () => {
    setSyncing(true);
    const logs: string[] = [];
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setStats((s) => ({ ...s, logs: ["Not authenticated."] }));
        return;
      }
      logs.push("Session authenticated.");

      const myTeams = await listMyTeams();
      setTeams(myTeams);
      logs.push(`Loaded ${myTeams.length} team(s).`);

      let openTasks = 0;
      let topTaskName: string | null = null;
      let partsInventory = 0;

      for (const team of myTeams) {
        const tasks = await listTeamTasks(team.id);
        const open = tasks.filter((t) => t.status !== "done");
        openTasks += open.length;
        if (!topTaskName && open[0]) topTaskName = open[0].name;
        const counts = await countPartsByStatus(team.id);
        partsInventory += counts.inventory;
      }

      const personal = await listPersonalAndAssignedTasks(user.id);
      const personalOnly = personal.filter((t) => t.is_personal && t.status !== "done");

      logs.push("Task and inventory aggregates refreshed.");
      logs.push("Workspace in sync.");

      setStats({
        teams: myTeams.length,
        openTasks,
        personalTasks: personalOnly.length,
        partsInventory,
        activeTeamName: myTeams[0]?.name ?? null,
        topTaskName,
        logs,
      });
    } catch (e) {
      logs.push(e instanceof Error ? e.message : "Sync failed");
      setStats((s) => ({ ...s, logs }));
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <AppShell
      eyebrow="Workspace"
      title="System Control"
      actions={
        <PrimaryButton disabled={syncing} onClick={load}>
          {syncing ? "Syncing…" : "Sync Database"}
        </PrimaryButton>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Panel className="lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <Label>Live system logs</Label>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="bg-black/40 border border-zinc-900 rounded p-4 font-mono text-xs text-zinc-500 h-48 overflow-y-auto space-y-2">
              {stats.logs.map((log, index) => (
                <p key={`${log}-${index}`} className="leading-relaxed">
                  <span className="text-zinc-700">&gt;</span> {log}
                </p>
              ))}
            </div>
          </div>
          <p className="text-[10px] font-mono text-zinc-600 mt-4">
            Sync pulls live counts from Supabase for your memberships.
          </p>
        </Panel>

        <Panel className="flex flex-col justify-between">
          <div>
            <Label>Active focus</Label>
            <div className="mt-4 space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-zinc-100">
                  {stats.topTaskName ?? "No open team tasks"}
                </h4>
                <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                  {stats.activeTeamName
                    ? `Primary team: ${stats.activeTeamName}`
                    : "Create or join a team to populate this panel."}
                </p>
              </div>
              <div className="border-t border-zinc-900 pt-3 flex flex-wrap gap-2">
                <Link
                  href="/team"
                  className="text-[10px] font-mono border border-zinc-800 px-2 py-0.5 rounded text-zinc-400 hover:text-white"
                >
                  Team
                </Link>
                <Link
                  href="/team-tasks"
                  className="text-[10px] font-mono border border-zinc-800 px-2 py-0.5 rounded text-zinc-400 hover:text-white"
                >
                  Tasks
                </Link>
                <Link
                  href="/parts"
                  className="text-[10px] font-mono border border-zinc-800 px-2 py-0.5 rounded text-zinc-400 hover:text-white"
                >
                  Parts
                </Link>
                <Link
                  href="/personal-tasks"
                  className="text-[10px] font-mono border border-zinc-800 px-2 py-0.5 rounded text-zinc-400 hover:text-white"
                >
                  Personal
                </Link>
              </div>
            </div>
          </div>
          {teams.length === 0 ? (
            <EmptyState>No teams linked to this session.</EmptyState>
          ) : (
            <p className="text-[10px] font-mono text-zinc-600">
              {teams.map((t) => t.name).join(" · ")}
            </p>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Teams" value={String(stats.teams)} />
        <StatCard label="Open team tasks" value={String(stats.openTasks)} accent />
        <StatCard label="Personal open" value={String(stats.personalTasks)} />
        <StatCard label="Parts in inventory" value={String(stats.partsInventory)} />
      </div>
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <Panel className="!p-5">
      <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1">
        {label}
      </p>
      <p
        className={`text-2xl font-bold font-mono ${accent ? "text-emerald-500" : ""}`}
      >
        {value}
      </p>
    </Panel>
  );
}
