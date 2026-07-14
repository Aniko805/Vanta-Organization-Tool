import { supabase } from "@/lib/supabase";

export default function Home() {
  console.log(supabase);

  return (
    <main>
      <h1>welcome to vanta nga</h1>
    </main>
  );
}