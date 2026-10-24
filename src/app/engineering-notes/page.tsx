import { Suspense } from "react";
import EngineeringNotesClient from "./EngineeringNotesClient";
import { PAGE_BG } from "@/app/components/ui";

export default function EngineeringNotesPage() {
  return (
    <Suspense fallback={<div className={`min-h-screen ${PAGE_BG}`} />}>
      <EngineeringNotesClient />
    </Suspense>
  );
}
