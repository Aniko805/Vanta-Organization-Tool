import { supabase } from "./supabase";

export type UserProfileUpdates = {
  first_name?: string;
  last_name?: string;
  username?: string;
  avatar_image?: string | null;
  bio?: string | null;
};

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
  updates: UserProfileUpdates
) {
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("That username is already in use.");
    }

    throw new Error(`Failed to update profile: ${error.message}`);
  }

  return data;
}

export async function hasCompletedProfile(userId: string) {
  const profile = await getUserProfile(userId);
  return Boolean(profile?.first_name?.trim() && profile?.last_name?.trim());
}