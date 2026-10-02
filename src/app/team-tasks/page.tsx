import { Suspense } from "react";
import TeamTasksClient from "./TeamTasksClient";
import { supabase } from "@/lib/supabase";

interface PageProps {
  searchParams: Promise<{ team?: string }>;
}

async function TeamTasksContent({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;

  // 1. Get current authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let activeTeam: { id: string; name?: string; team_number?: string | number } | null = null;
  let teamId = resolvedParams.team || null;

  if (user) {
    // Query team_members joined with teams table
    const { data: member } = await supabase
      .from("team_members")
      .select("team_id, teams ( id, name, team_number )")
      .eq("user_id", user.id)
      .maybeSingle();

    if (member) {
      const teamData = member.teams as unknown as { id: string; name?: string; team_number?: string | number };
      if (!teamId && member.team_id) {
        teamId = member.team_id;
      }
      if (teamData) {
        activeTeam = teamData;
      }
    }
  }

  // 2. Fetch tasks for the active team
  let tasks = [];
  if (teamId) {
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("team_id", teamId)
      .eq("is_personal", false)
      .order("created_at", { ascending: false });
    tasks = data || [];
  }

  // 3. Fetch profiles for team members & parts catalog
  const { data: profiles } = await supabase.from("profiles").select("*");
  const { data: parts } = await supabase.from("parts").select("*");

  return (
    <TeamTasksClient
      initialTasks={tasks}
      teamMembers={profiles || []}
      assignableParts={parts || []}
      teamId={teamId}
      activeTeamInfo={activeTeam}
    />
  );
}

export default function Page({ searchParams }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black text-zinc-500 font-mono text-xs flex items-center justify-center">
          Loading team tasks…
        </div>
      }
    >
      <TeamTasksContent searchParams={searchParams} />
    </Suspense>
  );
}