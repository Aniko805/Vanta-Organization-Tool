import { supabase } from "./supabase";

export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching profile:", error);
  }

  return data;
}

export async function updateUserProfile(
  userId: string,
  updates: { first_name?: string; last_name?: string }
) {
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update profile: ${error.message}`);
  }

  return data;
}

export async function hasCompletedProfile(userId: string) {
  const profile = await getUserProfile(userId);
  return profile && profile.first_name && profile.last_name;
}
