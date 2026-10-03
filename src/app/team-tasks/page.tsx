import { Suspense } from "react";
import TeamTasksClient from "./TeamTasksClient";
import { supabase } from "@/lib/supabase";

interface PageProps {
  searchParams: Promise<{ team?: string }>;
}

async function TeamTasksContent({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let activeTeam: { id: string; name?: string; team_number?: string | number } | null = null;
  let teamId = resolvedParams.team || null;

  if (user) {
    // Fetch membership entry first
    const { data: member } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    const resolvedTeamId = teamId || member?.team_id;

    if (resolvedTeamId) {
      teamId = resolvedTeamId;
      
      // Query team details directly from 'teams'
      const { data: teamData } = await supabase
        .from("teams")
        .select("id, name, team_number")
        .eq("id", resolvedTeamId)
        .maybeSingle();

      if (teamData) {
        activeTeam = teamData;
      }
    }
  }

  // Fetch tasks
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