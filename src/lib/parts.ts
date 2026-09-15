import { supabase } from "./supabase";
import type { Part } from "./types";

export async function listParts(teamId: string): Promise<Part[]> {
  const { data, error } = await supabase
    .from("parts")
    .select(
      `
      *,
      part_catalog(*),
      part_status(*, status_list(*))
    `
    )
    .eq("team_id", teamId)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Part[];
}

export async function listAssignableParts(teamId: string): Promise<Part[]> {
  const { data, error } = await supabase
    .from("parts")
    .select(
      `
      *,
      part_catalog(*),
      part_status(*, status_list(*))
    `
    )
    .eq("team_id", teamId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []) as Part[];
}

export async function createPart(input: {
  teamId: string;
  catalogId: string;
  createdBy: string;
}): Promise<Part> {
  const { data, error } = await supabase
    .from("parts")
    .insert({
      team_id: input.teamId,
      part_catalog_id: input.catalogId,
      created_by: input.createdBy,
    })
    .select("*, part_catalog(*)")
    .single();

  if (error) throw new Error(error.message);
  return data as Part;
}

export async function deletePart(partId: string): Promise<void> {
  const { error } = await supabase.from("parts").delete().eq("id", partId);
  if (error) throw new Error(error.message);
}

export async function updatePartQuantity(
  partStatusId: string,
  quantity: number
): Promise<void> {
  const { error } = await supabase
    .from("part_status")
    .update({ quantity })
    .eq("id", partStatusId);

  if (error) throw new Error(error.message);
}

export async function updatePartStatus(
  partStatusId: string,
  statusId: string
): Promise<void> {
  const { error } = await supabase
    .from("part_status")
    .update({ status_id: statusId })
    .eq("id", partStatusId);

  if (error) throw new Error(error.message);
}

export async function countPartsByStatus(
  teamId: string
): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("part_status")
    .select("name, status_id, part!inner(team_id)")
    .eq("part.team_id", teamId);

  if (error) throw new Error(error.message);

  const counts: Record<string, number> = {};
  (data ?? []).forEach((row) => {
    const key = row.name || "Unknown";
    counts[key] = (counts[key] || 0) + 1;
  });

  return counts;
}