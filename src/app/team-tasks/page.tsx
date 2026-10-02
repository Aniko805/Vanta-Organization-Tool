import { Suspense } from "react";
import TeamTasksClient from "./TeamTasksClient";
import { supabase } from "@/lib/supabase";

async function TeamTasksContent() {
  // 1. Get current authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let teamId: string | null = null;

  // 2. Fetch user's team ID from team_members
  if (user) {
    const { data: member } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("user_id", user.id)
      .maybeSingle();

    teamId = member?.team_id || null;
  }

  // 3. Fetch tasks for the team
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

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black text-zinc-500 font-mono text-xs flex items-center justify-center">
          Loading team tasks…
        </div>
      }
    >
      <TeamTasksContent />
    </Suspense>
  );
}