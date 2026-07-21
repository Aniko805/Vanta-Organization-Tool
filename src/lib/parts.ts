import { supabase } from "./supabase";
import type { Part, PartStatus } from "./types";

export async function listParts(teamId: string): Promise<Part[]> {
  const { data, error } = await supabase
    .from("parts")
    .select("*")
    .eq("team_id", teamId)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Part[];
}

export async function listAssignableParts(teamId: string): Promise<Part[]> {
  const { data, error } = await supabase
    .from("parts")
    .select("*")
    .eq("team_id", teamId)
    .neq("status", "removed")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as Part[];
}

export async function createPart(input: {
  teamId: string;
  name: string;
  sku?: string;
  notes?: string;
  status?: PartStatus;
  createdBy: string;
}): Promise<Part> {
  const { data, error } = await supabase
    .from("parts")
    .insert({
      team_id: input.teamId,
      name: input.name.trim(),
      sku: input.sku?.trim() || null,
      notes: input.notes?.trim() || null,
      status: input.status ?? "inventory",
      created_by: input.createdBy,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as Part;
}

export async function updatePartStatus(
  partId: string,
  status: PartStatus
): Promise<Part> {
  const { data, error } = await supabase
    .from("parts")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", partId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as Part;
}

export async function updatePart(
  partId: string,
  updates: Partial<{ name: string; sku: string | null; notes: string | null; status: PartStatus }>
): Promise<Part> {
  const { data, error } = await supabase
    .from("parts")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", partId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as Part;
}

export async function deletePart(partId: string): Promise<void> {
  const { error } = await supabase.from("parts").delete().eq("id", partId);
  if (error) throw new Error(error.message);
}

export async function countPartsByStatus(teamId: string) {
  const parts = await listParts(teamId);
  return {
    total: parts.length,
    inventory: parts.filter((p) => p.status === "inventory").length,
    to_be_used: parts.filter((p) => p.status === "to_be_used").length,
    used: parts.filter((p) => p.status === "used").length,
    removed: parts.filter((p) => p.status === "removed").length,
  };
}
