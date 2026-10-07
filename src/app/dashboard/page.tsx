"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import AppShell, {
  EmptyState,
  ErrorText,
  Label,
  Panel,
  PrimaryButton,
} from "@/app/components/AppShell";
import { listParts } from "@/lib/parts";
import { supabase } from "@/lib/supabase";
import { listMyTeams, listTeamMembers } from "@/lib/teams";
import { listPersonalAndAssignedTasks, listTeamTasks } from "@/lib/tasks";
import {
  displayNameFromProfile,
  type Part,
  type PartStatus,
  type TaskWithRelations,
  type Team,
  type TeamMember,
} from "@/lib/types";

type PartListing = {
  id: string;
  name: string;
  statusName: string | null;
  quantity: number | null;
  createdAt: string;
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [primaryTeam, setPrimaryTeam] = useState<Team | null>(null);
  const [personalTasks, setPersonalTasks] = useState<TaskWithRelations[]>([]);
  const [teamTasks, setTeamTasks] = useState<TaskWithRelations[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [partListings, setPartListings] = useState<PartListing[]>([]);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated.");

      const [teams, personal] = await Promise.all([
        listMyTeams(),
        listPersonalAndAssignedTasks(user.id),
      ]);
      const team = teams[0] ?? null;
      let tasks: TaskWithRelations[] = [];
      let teamMembers: TeamMember[] = [];
      let parts: Part[] = [];

      if (team) {
        [tasks, teamMembers, parts] = await Promise.all([
          listTeamTasks(team.id),
          listTeamMembers(team.id),
          listParts(team.id),
        ]);
      }

      if (!mounted.current) return;
      setPrimaryTeam(team);
      setPersonalTasks(sortTasksByDueDate(
        personal.filter((task) => task.is_personal && task.status !== "done")
      ).slice(0, 3));
      setTeamTasks(sortTasksByDueDate(
        tasks.filter((task) => task.status !== "done")
      ).slice(0, 3));
      setMembers(sortMembersByJoinDate(teamMembers).slice(0, 3));
      setPartListings(getRecentPartListings(parts));
    } catch (cause) {
      if (mounted.current) {
        setError(cause instanceof Error ? cause.message : "Dashboard data failed to load.");
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void load();
    return () => {
      mounted.current = false;
    };
  }, [load]);

  const teamTasksHref = primaryTeam
    ? `/team-tasks?team=${encodeURIComponent(primaryTeam.id)}`
    : "/team-tasks";
  const previewUnavailable = !loading && Boolean(error);

  return (
    <AppShell
      eyebrow="Workspace"
      title="Dashboard"
      actions={
        error ? (
          <PrimaryButton disabled={loading} onClick={load}>
            {loading ? "Loading…" : "Retry"}
          </PrimaryButton>
        ) : undefined
      }
    >
      {error ? <ErrorText>{error}</ErrorText> : null}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <FeatureWidget title="Personal Tasks" href="/personal-tasks" label="DUE SOON">
          {loading ? (
            <EmptyState>Loading personal tasks…</EmptyState>
          ) : previewUnavailable ? (
            <EmptyState>Preview unavailable.</EmptyState>
          ) : personalTasks.length === 0 ? (
            <EmptyState>No open personal tasks.</EmptyState>
          ) : (
            <TaskPreview tasks={personalTasks} />
          )}
        </FeatureWidget>

        <FeatureWidget title="Team" href="/team" label="MEMBERS">
          {loading ? (
            <EmptyState>Loading team members…</EmptyState>
          ) : previewUnavailable ? (
            <EmptyState>Preview unavailable.</EmptyState>
          ) : !primaryTeam ? (
            <EmptyState>No team joined yet.</EmptyState>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-zinc-500">{primaryTeam.name}</p>
              {members.length === 0 ? (
                <EmptyState>No members to display.</EmptyState>
              ) : (
                <ul className="space-y-2">
                  {members.map((member) => (
                    <li
                      key={member.id}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="truncate text-zinc-200">
                        {displayNameFromProfile(member.profiles)}
                      </span>
                      {member.joined_at ? (
                        <time
                          className="shrink-0 text-[10px] font-mono text-zinc-500"
                          dateTime={member.joined_at}
                        >
                          {formatDate(member.joined_at)}
                        </time>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </FeatureWidget>

        <FeatureWidget title="Team Tasks" href={teamTasksHref} label="DUE SOON">
          {loading ? (
            <EmptyState>Loading team tasks…</EmptyState>
          ) : previewUnavailable ? (
            <EmptyState>Preview unavailable.</EmptyState>
          ) : !primaryTeam ? (
            <EmptyState>Join a team to see its tasks.</EmptyState>
          ) : teamTasks.length === 0 ? (
            <EmptyState>No open team tasks.</EmptyState>
          ) : (
            <TaskPreview tasks={teamTasks} />
          )}
        </FeatureWidget>

        <FeatureWidget title="Parts" href="/parts" label="RECENT LISTINGS">
          {loading ? (
            <EmptyState>Loading parts…</EmptyState>
          ) : previewUnavailable ? (
            <EmptyState>Preview unavailable.</EmptyState>
          ) : !primaryTeam ? (
            <EmptyState>Join a team to see its inventory.</EmptyState>
          ) : partListings.length === 0 ? (
            <EmptyState>No inventory listings yet.</EmptyState>
          ) : (
            <ul className="space-y-3">
              {partListings.map((listing) => (
                <li key={listing.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-zinc-200">{listing.name}</p>
                    <p className="mt-1 text-[10px] font-mono text-zinc-500">
                      {listing.statusName ?? "No status"}
                      {listing.quantity === null ? "" : ` · Qty ${listing.quantity}`}
                    </p>
                  </div>
                  <time
                    className="shrink-0 text-[10px] font-mono text-zinc-500"
                    dateTime={listing.createdAt}
                  >
                    {formatDate(listing.createdAt)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </FeatureWidget>

        <FeatureWidget title="Part Identifier" href="/parts/identify" label="VISION TOOL">
          <div className="flex min-h-24 flex-col justify-between gap-4">
            <p className="text-sm leading-relaxed text-zinc-400">
              Identify a part from an image and add it to your inventory.
            </p>
            <span className="w-fit border border-amber-500/40 px-2 py-1 text-[10px] font-mono uppercase text-amber-300">
              Coming soon
            </span>
          </div>
        </FeatureWidget>
      </div>
    </AppShell>
  );
}

function FeatureWidget({
  title,
  href,
  label,
  children,
}: {
  title: string;
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Panel className="flex h-full flex-col !p-5">
      <div className="flex items-start justify-between gap-3">
        <Link href={href} className="text-sm font-semibold text-zinc-100 hover:text-white">
          {title}
          <span aria-hidden="true" className="ml-2 text-zinc-600">↗</span>
        </Link>
        <Label>{label}</Label>
      </div>
      <div className="mt-4 flex-1">{children}</div>
      <Link
        href={href}
        className="mt-5 inline-flex w-fit items-center gap-2 border-t border-zinc-900 pt-3 text-[10px] font-mono uppercase text-zinc-500 transition-colors hover:text-white"
      >
        Open {title} <span aria-hidden="true">→</span>
      </Link>
    </Panel>
  );
}

function TaskPreview({ tasks }: { tasks: TaskWithRelations[] }) {
  return (
    <ul className="space-y-3">
      {tasks.map((task) => (
        <li key={task.id} className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm text-zinc-200">{task.name}</p>
            <p className="mt-1 text-[10px] font-mono uppercase text-zinc-600">
              {task.importance.replace("_", " ")}
            </p>
          </div>
          <time
            className="shrink-0 text-[10px] font-mono text-zinc-500"
            dateTime={task.due_date ?? undefined}
          >
            {task.due_date ? formatDate(task.due_date) : "No due date"}
          </time>
        </li>
      ))}
    </ul>
  );
}

function sortTasksByDueDate(tasks: TaskWithRelations[]): TaskWithRelations[] {
  return [...tasks].sort((a, b) => {
    if (!a.due_date && !b.due_date) return a.name.localeCompare(b.name);
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return a.due_date.localeCompare(b.due_date) || a.name.localeCompare(b.name);
  });
}

function sortMembersByJoinDate(members: TeamMember[]): TeamMember[] {
  return [...members].sort((a, b) =>
    (b.joined_at ?? "").localeCompare(a.joined_at ?? "")
  );
}

function getRecentPartListings(parts: Part[]): PartListing[] {
  return parts
    .flatMap<PartListing>((part) => {
      const name = part.part_catalog?.name ?? "Uncataloged part";
      const statuses = part.part_status ?? [];
      if (statuses.length === 0) {
        return [{
          id: part.id,
          name,
          statusName: null,
          quantity: null,
          createdAt: part.created_at,
        }];
      }
      return statuses.map((status: PartStatus) => ({
        id: status.id,
        name,
        statusName: status.status_list?.name ?? null,
        quantity: status.quantity,
        createdAt: status.created_at || part.created_at,
      }));
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 3);
}

function formatDate(value: string): string {
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
