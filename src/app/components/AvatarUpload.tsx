"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

interface AvatarUploadProps {
  userId: string;
  currentAvatarUrl?: string | null;
  onUploadComplete: (publicUrl: string) => void;
}

export default function AvatarUpload({
  userId,
  currentAvatarUrl,
  onUploadComplete,
}: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    currentAvatarUrl || null
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!e.target.files || e.target.files.length === 0) return;

      const file = e.target.files[0];
      const fileExt = file.name.split(".").pop();

      // Must start with userId/ to pass your RLS folder check
      const filePath = `${userId}/${Date.now()}.${fileExt}`;

      // 1. Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Fetch the public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      setPreviewUrl(publicUrl);
      onUploadComplete(publicUrl);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      console.error("Avatar upload error:", err);
      alert(msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="h-16 w-16 rounded-full border border-zinc-800 overflow-hidden bg-zinc-900 flex items-center justify-center text-zinc-500 font-mono text-xs">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Profile avatar preview"
            className="h-full w-full object-cover"
          />
        ) : (
          "No Image"
        )}
      </div>

      <div>
        <label className="cursor-pointer bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 px-3 py-1.5 rounded-md text-xs font-medium transition-colors inline-block">
          {uploading ? "Uploading..." : "Upload Image"}
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={uploading}
            className="hidden"
          />
        </label>
        <p className="text-[10px] text-zinc-500 mt-1">PNG, JPG, WEBP up to 5MB</p>
      </div>
    </div>
  );
}