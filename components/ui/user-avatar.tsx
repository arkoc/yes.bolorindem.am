"use client";

import Avatar from "boring-avatars";

const COLORS = ["#2563eb", "#7c3aed", "#db2777", "#059669", "#d97706"];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    const chr = name.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

interface UserAvatarProps {
  name: string;
  size?: number;
  className?: string;
  border?: number; // width in px, 0 = none
  avatarUrl?: string | null;
}

export function UserAvatar({ name, size = 48, className, border = 2, avatarUrl }: UserAvatarProps) {
  const resolvedName = name || "User";
  return (
    <span
      className={className}
      style={{
        display: "block",
        width: size + border * 2,
        height: size + border * 2,
        borderRadius: "50%",
        flexShrink: 0,
        padding: border,
        backgroundColor: border > 0 ? getAvatarColor(resolvedName) : undefined,
        lineHeight: 0,
      }}
    >
      <span
        style={{
          display: "block",
          width: size,
          height: size,
          lineHeight: 0,
          overflow: "hidden",
          borderRadius: "50%",
        }}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={resolvedName}
            width={size}
            height={size}
            style={{ width: size, height: size, objectFit: "cover" }}
          />
        ) : (
          <Avatar size={size} name={resolvedName} variant="bauhaus" colors={COLORS} />
        )}
      </span>
    </span>
  );
}
