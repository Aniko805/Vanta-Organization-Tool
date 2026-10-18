import { createClient } from "@supabase/supabase-js";
import { curateNotebook } from "@/lib/ai/curate";
import type { CurateEvent } from "@/lib/ai/events";

export const maxDuration = 60;
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token || token === header) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    notebookId?: unknown;
    confirmOverwrite?: unknown;
  } | null;
  if (!body || typeof body.notebookId !== "string") {
    return Response.json({ error: "Missing notebook." }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return Response.json({ error: "Supabase is not configured on the server." }, { status: 500 });
  }

  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: CurateEvent) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };
      try {
        await curateNotebook({
          supabase,
          userId: userData.user.id,
          notebookId: body.notebookId as string,
          confirmOverwrite: body.confirmOverwrite === true,
          send,
        });
      } catch (error) {
        send({
          type: "error",
          message: error instanceof Error ? error.message : "Curation failed.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
