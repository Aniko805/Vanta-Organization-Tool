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