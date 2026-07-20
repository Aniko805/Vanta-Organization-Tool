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

export async function getUserDisplayName(user: { id: string; email?: string | null } | null | undefined) {
  if (!user?.id) {
    return user?.email?.split("@")[0] ?? "User";
  }

  const profile = await getUserProfile(user.id);
  const firstName = profile?.first_name?.trim();
  const lastName = profile?.last_name?.trim();

  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }

  if (firstName) {
    return firstName;
  }

  if (lastName) {
    return lastName;
  }

  return user.email?.split("@")[0] ?? "User";
}
