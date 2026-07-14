import { supabase } from "@/lib/supabase";

export default function Home() {
  console.log(supabase);

  return (
    <main>
      <h1>Welcome to vanta user</h1>
    </main>
  );
}