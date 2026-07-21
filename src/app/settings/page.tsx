"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";
import { getUserProfile, updateUserProfile } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type SettingsForm = {
  username: string;
  firstName: string;
  lastName: string;
  avatarUrl: string;
  bio: string;
};

const emptyForm: SettingsForm = {
  username: "",
  firstName: "",
  lastName: "",
  avatarUrl: "",
  bio: "",
};

export default function SettingsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [form, setForm] = useState<SettingsForm>(emptyForm);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (authError || !user) {
        router.replace("/login");
        return;
      }

      setUserId(user.id);

      const profile = await getUserProfile(user.id);

      if (!isMounted) return;

      setForm({
        username: profile?.username ?? "",
        firstName: profile?.first_name ?? "",
        lastName: profile?.last_name ?? "",
        avatarUrl: profile?.avatar_url ?? "",
        bio: profile?.bio ?? "",
      });
      setLoadingProfile(false);
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const updateField = (field: keyof SettingsForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!userId) {
      setError("User not found.");
      return;
    }

    const normalizedUsername = form.username.trim();

    if (!normalizedUsername) {
      setError("Username is required.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await updateUserProfile(userId, {
        username: normalizedUsername,
        first_name: form.firstName.trim() || undefined,
        last_name: form.lastName.trim() || undefined,
        avatar_url: form.avatarUrl.trim() || null,
        bio: form.bio.trim() || null,
      });

      setForm((current) => ({
        ...current,
        username: normalizedUsername,
        firstName: current.firstName.trim(),
        lastName: current.lastName.trim(),
        avatarUrl: current.avatarUrl.trim(),
        bio: current.bio.trim(),
      }));
      setSuccessMessage("Profile updated successfully.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans overflow-x-hidden flex select-none">
      <Sidebar />

      <main className="flex-1 p-10 max-w-5xl mx-auto space-y-8">
        <header className="border-b border-zinc-900 pb-6">
          <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-1">Settings</p>
          <h1 className="text-3xl font-extrabold tracking-tight">Profile Settings</h1>
          <p className="text-sm text-zinc-500 mt-2">Manage your public profile details and keep your username unique.</p>
        </header>

        <section className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-6">
          <div className="p-6 bg-zinc-950 border border-zinc-900 rounded-xl space-y-4 h-fit">
            <div className="h-32 w-32 rounded-full border border-zinc-800 overflow-hidden bg-zinc-900 flex items-center justify-center text-3xl font-semibold text-zinc-400 mx-auto">
              {form.avatarUrl ? (
                <img src={form.avatarUrl} alt="Profile avatar preview" className="h-full w-full object-cover" />
              ) : (
                <span>{form.username.charAt(0).toUpperCase() || "U"}</span>
              )}
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-zinc-200">{form.firstName || form.lastName ? `${form.firstName} ${form.lastName}`.trim() : form.username || "Your profile"}</p>
              <p className="text-xs font-mono text-zinc-500">@{form.username || "username"}</p>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed">Add an avatar URL, bio, and your name details here. Username changes must stay unique across the workspace.</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 bg-zinc-950 border border-zinc-900 rounded-xl space-y-5">
            <div>
              <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1.5">Username</label>
              <input
                type="text"
                required
                value={form.username}
                onChange={(event) => updateField("username", event.target.value)}
                placeholder="stevenzhang"
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-md px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1.5">First Name</label>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={(event) => updateField("firstName", event.target.value)}
                  placeholder="Steven"
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-md px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1.5">Last Name</label>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={(event) => updateField("lastName", event.target.value)}
                  placeholder="Zhang"
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-md px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1.5">Avatar URL</label>
              <input
                type="url"
                value={form.avatarUrl}
                onChange={(event) => updateField("avatarUrl", event.target.value)}
                placeholder="https://example.com/avatar.png"
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-md px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1.5">Bio</label>
              <textarea
                value={form.bio}
                onChange={(event) => updateField("bio", event.target.value)}
                placeholder="Tell your team a bit about yourself"
                rows={4}
                className="w-full resize-none bg-zinc-900/50 border border-zinc-800 rounded-md px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
              />
            </div>

            {error && <p className="text-sm text-rose-500">{error}</p>}
            {successMessage && <p className="text-sm text-emerald-400">{successMessage}</p>}

            <button
              type="submit"
              disabled={loadingProfile || saving}
              className="w-full md:w-auto px-5 py-2.5 bg-white text-black text-sm font-semibold rounded hover:bg-zinc-200 transition-colors active:scale-95 disabled:opacity-50"
            >
              {loadingProfile ? "Loading profile..." : saving ? "Saving changes..." : "Save Settings"}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}