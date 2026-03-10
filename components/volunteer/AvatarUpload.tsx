"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { UserAvatar } from "@/components/ui/user-avatar";

interface AvatarUploadProps {
  name: string;
  avatarUrl: string | null;
  size?: number;
}

export function AvatarUpload({ name, avatarUrl, size = 80 }: AvatarUploadProps) {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);

      // Add cache-busting so the browser fetches the new image
      const cacheBustedUrl = `${publicUrl}?t=${Date.now()}`;

      const res = await fetch("/api/profile/avatar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar_url: cacheBustedUrl }),
      });

      if (!res.ok) throw new Error("Failed to save");

      toast.success("Նկարը պահպանված է");
      router.refresh();
    } catch {
      toast.error("Չհաջողվեց վերբեռնել");
      setPreviewUrl(null);
    } finally {
      setUploading(false);
      // Reset input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const displayUrl = previewUrl ?? avatarUrl;

  return (
    <div className="relative shrink-0" style={{ width: size + 4, height: size + 4 }}>
      <UserAvatar name={name} size={size} avatarUrl={displayUrl} />

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="absolute inset-0 rounded-full flex items-end justify-end p-0.5 group"
        aria-label="Փոխել նկարը"
      >
        <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground shadow-md group-hover:bg-primary/90 transition-colors">
          {uploading
            ? <Loader2 className="h-3 w-3 animate-spin" />
            : <Camera className="h-3 w-3" />
          }
        </span>
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
