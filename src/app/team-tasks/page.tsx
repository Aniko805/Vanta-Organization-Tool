import { Suspense } from "react";
import TeamTasksClient from "./TeamTasksClient";
import { PAGE_BG } from "@/app/components/ui";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className={`min-h-screen ${PAGE_BG} text-zinc-500 font-mono text-xs flex items-center justify-center`}>
          Loading team tasks…
        </div>
      }
    >
      <TeamTasksClient />
    </Suspense>
  );
}