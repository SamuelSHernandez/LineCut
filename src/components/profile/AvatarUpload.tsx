"use client";

import { useState, useRef, useTransition } from "react";
import { useProfile } from "@/lib/profile-context";
import { uploadAvatar } from "@/app/(dashboard)/profile/actions";

function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      const size = 400;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d")!;

      // Center-crop to square
      const minDim = Math.min(img.width, img.height);
      const sx = (img.width - minDim) / 2;
      const sy = (img.height - minDim) / 2;
      ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Compression failed"));
        },
        "image/jpeg",
        0.8
      );
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = url;
  });
}

export default function AvatarUpload() {
  const profile = useProfile();
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const initials = profile.displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const displayUrl = preview || profile.avatarUrl;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    if (file.size > 2 * 1024 * 1024) {
      setError("File must be under 2MB.");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("File must be an image.");
      return;
    }

    startTransition(async () => {
      try {
        const compressed = await compressImage(file);
        setPreview(URL.createObjectURL(compressed));

        const formData = new FormData();
        formData.append(
          "avatar",
          new File([compressed], "avatar.jpg", { type: "image/jpeg" })
        );

        const result = await uploadAvatar(formData);
        if (result.error) {
          setError(result.error);
          setPreview(null);
        }
      } catch {
        setError("Failed to upload avatar.");
        setPreview(null);
      }
    });
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isPending}
        className="relative w-16 h-16 rounded-full overflow-hidden bg-mustard flex items-center justify-center cursor-pointer group"
      >
        {displayUrl ? (
          <img
            src={displayUrl}
            alt={profile.displayName}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="font-[family-name:var(--font-display)] text-[22px] text-chalkboard leading-none">
            {initials}
          </span>
        )}
        <div className="absolute inset-0 bg-chalkboard/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            stroke="#FFFDF5"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 6.5L7.5 14H4.5V11L12 3.5L15 6.5Z" />
            <path d="M10 5.5L13 8.5" />
          </svg>
        </div>
        {isPending && (
          <div className="absolute inset-0 bg-chalkboard/60 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-ticket border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      {error && (
        <p className="font-[family-name:var(--font-body)] text-[11px] text-ketchup text-center">
          {error}
        </p>
      )}
    </div>
  );
}
