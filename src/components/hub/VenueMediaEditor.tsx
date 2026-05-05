"use client";

import { useState, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Upload, X, Loader2 } from "lucide-react";
import { MediaLibrarySelector } from "@/components/hub/MediaLibrarySelector";
import { useToast } from "@/hooks/useToast";
import Image from "next/image";
import type { CoverMediaItem } from "./VenueCoverSection";

interface VenueMediaEditorProps {
  coverMedia: CoverMediaItem[];
  onChange: (items: CoverMediaItem[]) => void;
  className?: string;
}

export function VenueMediaEditor({
  coverMedia,
  onChange,
  className = "",
}: VenueMediaEditorProps) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const handleFile = async (file: File) => {
    const isVideo = file.type.startsWith("video/");
    const isImage =
      file.type.startsWith("image/") ||
      file.type === "image/svg+xml";

    if (!isVideo && !isImage) {
      toast("Use PNG, SVG, or MP4", "error");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const endpoint = isVideo ? "/api/upload/file" : "/api/upload/image";
      const res = await fetch(endpoint, { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Upload failed");

      let url: string | undefined;
      if (data.url) url = data.url;
      else if (data.files?.url) url = data.files.url;
      else if (data.urls?.[0]) url = data.urls[0];
      else if (Array.isArray(data.files) && data.files[0]?.url) url = data.files[0].url;

      if (url) {
        onChange([
          ...coverMedia,
          { type: isVideo ? "video" : "image", url },
        ]);
        toast("Uploaded", "info");
      } else throw new Error("No URL returned");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Upload failed", "error");
    } finally {
      setUploading(false);
    }
  };

  const remove = (index: number) => {
    onChange(coverMedia.filter((_, i) => i !== index));
  };

  return (
    <div className={className}>
      <Label className="block mb-2">Cover media (PNG, SVG, MP4)</Label>
      <p className="text-muted-foreground text-sm mb-3">
        Add images or video for the venue cover. Transitions cycle every 5 seconds.
      </p>

      <div className="flex items-center gap-2 mb-3">
        <MediaLibrarySelector
          mode="multiple"
          selectedUrls={coverMedia.filter((m) => m.type === "image").map((m) => m.url)}
          onSelect={(urls) =>
            onChange([...coverMedia, ...urls.map((url) => ({ type: "image" as const, url }))])
          }
          triggerLabel="Choose from library"
        />
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml,video/mp4,video/webm"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />

      <div className="flex flex-wrap gap-3">
        {coverMedia.map((item, i) => (
          <div
            key={`${item.url}-${i}`}
            className="relative group rounded-lg overflow-hidden border border-border w-24 h-24 bg-muted"
          >
            {item.type === "video" ? (
              <video
                src={item.url}
                className="w-full h-full object-cover"
                muted
                playsInline
              />
            ) : (
              <Image
                src={item.url}
                alt=""
                width={96}
                height={96}
                className="w-full h-full object-cover"
              />
            )}
            <button
              type="button"
              onClick={() => remove(i)}
              className="absolute top-1 right-1 p-1 rounded bg-black/60 text-white opacity-0 group-hover:opacity-100 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-24 h-24 rounded-lg border-2 border-dashed border-muted-foreground/40 flex items-center justify-center hover:border-accent/50 transition"
        >
          {uploading ? (
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          ) : (
            <Upload className="w-8 h-8 text-muted-foreground" />
          )}
        </button>
      </div>
    </div>
  );
}
