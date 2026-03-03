"use client";

import { useState } from "react";

interface BadgeIconProps {
  src: string | null;
  fallback: string;
  alt: string;
  size?: number;
}

export function BadgeIcon({ src, fallback, alt, size = 40 }: BadgeIconProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return <span className="leading-none" style={{ fontSize: size * 0.75 }}>{fallback}</span>;
  }

  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className="object-contain"
      onError={() => setFailed(true)}
    />
  );
}
