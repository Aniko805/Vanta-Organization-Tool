import { supabase } from "@/lib/supabase";

export default function Home() {
  console.log(supabase);

  return (
    <main>
      <h1>we are charlie kirk</h1>
    </main>
  );
}