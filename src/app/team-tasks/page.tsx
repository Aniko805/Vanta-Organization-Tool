import { Suspense } from "react";
import TeamTasksClient from "./TeamTasksClient";
import { supabase } from "@/lib/supabase";

async function TeamTasksContent() {
  // Fetch tasks
  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });

  // Fetch profiles for team members
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*");

  // Fetch parts catalog/parts
  const { data: parts } = await supabase
    .from("parts")
    .select("*");

  // Get current user's team or active team (fallback to default string if not found)
  const teamId = tasks?.[0]?.team_id || "";

  return (
    <TeamTasksClient
      initialTasks={tasks || []}
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