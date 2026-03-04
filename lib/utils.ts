import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const PIXEL_PALETTES = [
  { fg: "#2563eb", bg: "#dbeafe" },
  { fg: "#7c3aed", bg: "#ede9fe" },
  { fg: "#db2777", bg: "#fce7f3" },
  { fg: "#059669", bg: "#d1fae5" },
  { fg: "#d97706", bg: "#fef3c7" },
  { fg: "#dc2626", bg: "#fee2e2" },
  { fg: "#0891b2", bg: "#cffafe" },
  { fg: "#4f46e5", bg: "#e0e7ff" },
];

function pixelHash(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = (((h << 5) + h) ^ str.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function getPixelAvatarUrl(name: string, size = 64): string {
  const seed = pixelHash(name || "User");
  const { fg, bg } = PIXEL_PALETTES[seed % PIXEL_PALETTES.length];
  const GRID = 8;
  const cell = size / GRID;

  let h = seed;
  let rects = `<rect width="${size}" height="${size}" fill="${bg}"/>`;

  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID / 2; col++) {
      h ^= h << 13; h ^= h >> 17; h ^= h << 5; h = h >>> 0;
      if (h % 2 === 1) {
        const y = row * cell;
        rects += `<rect x="${col * cell}" y="${y}" width="${cell}" height="${cell}" fill="${fg}"/>`;
        rects += `<rect x="${(GRID - 1 - col) * cell}" y="${y}" width="${cell}" height="${cell}" fill="${fg}"/>`;
      }
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">${rects}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function formatPoints(points: number): string {
  return new Intl.NumberFormat().format(points);
}

export function getRankSuffix(rank: number): string {
  return rank === 1 ? `${rank}ին` : `${rank}րդ`;
}
