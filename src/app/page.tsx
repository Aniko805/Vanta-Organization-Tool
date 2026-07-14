import { supabase } from "@/lib/supabase";

export default function Home() {
  console.log(supabase);

  return (
    <main>
      <h1>hello ani</h1>
    </main>
  );
}