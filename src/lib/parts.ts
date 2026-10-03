import { supabase } from "./supabase";
import type { Part, PartCatalog, StatusList } from "./types";

export async function listPartCatalog(teamId: string): Promise<PartCatalog[]> {
  const [officialResult, teamResult] = await Promise.all([
    supabase
      .from("part_catalog")
      .select("*")
      .is("team_id", null)
      .eq("is_official", true)
      .order("name", { ascending: true }),
    supabase
      .from("part_catalog")
      .select("*")
      .eq("team_id", teamId)
      .order("name", { ascending: true }),
  ]);

  if (officialResult.error) throw new Error(officialResult.error.message);
  if (teamResult.error) throw new Error(teamResult.error.message);

  return [...(officialResult.data ?? []), ...(teamResult.data ?? [])] as PartCatalog[];
}

export async function listPartStatuses(teamId: string): Promise<StatusList[]> {
  const [globalResult, teamResult] = await Promise.all([
    supabase
      .from("status_list")
      .select("*")
      .is("team_id", null)
      .eq("is_default", true)
      .order("name", { ascending: true }),
    supabase
      .from("status_list")
      .select("*")
      .eq("team_id", teamId)
      .order("is_default", { ascending: false })
      .order("name", { ascending: true }),
  ]);

  if (globalResult.error) throw new Error(globalResult.error.message);
  if (teamResult.error) throw new Error(teamResult.error.message);

  return [...(teamResult.data ?? []), ...(globalResult.data ?? [])] as StatusList[];
}

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

export async function addPartToInventory(input: {
  teamId: string;
  catalogId: string | null;
  name: string;
  sku: string;
  description: string;
  statusId: string;
  quantity: number;
}): Promise<string> {
  const { data, error } = await supabase.rpc("add_part_to_inventory", {
    p_team_id: input.teamId,
    p_catalog_id: input.catalogId,
    p_name: input.name,
    p_sku: input.sku || null,
    p_description: input.description || null,
    p_status_id: input.statusId,
    p_quantity: input.quantity,
  });

  if (error) throw new Error(error.message);
  return data as string;
}

export async function deletePart(partId: string): Promise<void> {
  const { error } = await supabase.rpc("delete_part_from_inventory", {
    p_part_id: partId,
  });
  if (error) throw new Error(error.message);
}

export async function deletePartStatusListing(partStatusId: string): Promise<void> {
  const { error } = await supabase.rpc("delete_part_status_listing", {
    p_part_status_id: partStatusId,
  });
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
  const { error } = await supabase.rpc("merge_part_status", {
    p_part_status_id: partStatusId,
    p_status_id: statusId,
  });

  if (error) throw new Error(error.message);
}

export async function countPartsByStatus(
  teamId: string
): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("part_status")
    .select("status_id, part!inner(team_id)")
    .eq("part.team_id", teamId);

  if (error) throw new Error(error.message);

  const statuses = await listPartStatuses(teamId);
  const statusNames = new Map(statuses.map((status) => [status.id, status.name]));

  const counts: Record<string, number> = {};
  (data ?? []).forEach((row) => {
    const key = statusNames.get(row.status_id ?? "") || "Unknown";
    counts[key] = (counts[key] || 0) + 1;
  });

  return counts;
}