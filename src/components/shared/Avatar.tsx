"use client";

import { useState } from "react";

interface AvatarProps {
  src: string | null;
  fallback: string;
  size?: "sm" | "md" | "lg";
  alt?: string;
}

const SIZES = {
  sm: "w-7 h-7 text-[12px]",
  md: "w-9 h-9 text-[14px]",
  lg: "w-12 h-12 text-[18px]",
};

export default function Avatar({ src, fallback, size = "md", alt }: AvatarProps) {
  const [imgError, setImgError] = useState(false);

  const initials = fallback
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className={`${SIZES[size]} rounded-full bg-mustard flex items-center justify-center overflow-hidden flex-shrink-0`}>
      {src && !imgError ? (
        <img
          src={src}
          alt={alt ?? fallback}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="font-[family-name:var(--font-display)] text-chalkboard leading-none">
          {initials}
        </span>
      )}
    </div>
  );
}
