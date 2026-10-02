import { Suspense } from "react";
import TeamTasksClient from "./TeamTasksClient";
import { supabase } from "@/lib/supabase";

interface PageProps {
  searchParams: Promise<{ team?: string }>;
}

async function TeamTasksContent({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const { data: { user } } = await supabase.auth.getUser();

  let teamId = resolvedParams.team || null;

  // Fallback to team_members if not present in searchParams URL
  if (!teamId && user) {
    const { data: member } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("user_id", user.id)
      .maybeSingle();

    teamId = member?.team_id || null;
  }

  // Fetch tasks for this team
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

  // Fetch profiles and parts catalog
  const { data: profiles } = await supabase.from("profiles").select("*");
  const { data: parts } = await supabase.from("parts").select("*");

  return (
    <TeamTasksClient
      initialTasks={tasks}
      teamMembers={profiles || []}
      assignableParts={parts || []}
      teamId={teamId}
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