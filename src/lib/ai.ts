import type { CurateEvent } from "./ai/events";
import { supabase } from "./supabase";

export type { CurateEvent };

export async function curateNotebook(
  notebookId: string,
  confirmOverwrite: boolean,
  onEvent: (event: CurateEvent) => void
) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Not authenticated");

  const response = await fetch("/api/notebook/curate", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ notebookId, confirmOverwrite }),
  });

  if (!response.ok || !response.body) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || "Update notebook failed.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      onEvent(JSON.parse(trimmed) as CurateEvent);
    }
  }
  if (buffer.trim()) onEvent(JSON.parse(buffer) as CurateEvent);
}
