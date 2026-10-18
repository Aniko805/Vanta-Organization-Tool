import { Suspense } from "react";
import EngineeringNotesClient from "./EngineeringNotesClient";

export default function EngineeringNotesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <EngineeringNotesClient />
    </Suspense>
  );
}
