import { Suspense } from "react";
import TeamTasksClient from "./TeamTasksClient";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black text-zinc-500 font-mono text-xs flex items-center justify-center">
          Loading team tasks…
        </div>
      }
    >
      <TeamTasksClient />
    </Suspense>
  );
}
