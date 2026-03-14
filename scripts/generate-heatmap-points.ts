/**
 * Generates GPS heatmap dot positions from the campaign text SVG.
 * The full SVG (all three rows) is projected onto a bounding box in Yerevan.
 *
 * Usage:
 *   npx ts-node -P scripts/tsconfig.json scripts/generate-heatmap-points.ts <project_id> [stride]
 *
 * Example:
 *   npx ts-node -P scripts/tsconfig.json scripts/generate-heatmap-points.ts abc-123 > seed.sql
 *
 * Dependencies: @resvg/resvg-js (npm install --save-dev @resvg/resvg-js)
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const { Resvg } = require("@resvg/resvg-js");
const fs = require("fs");
const path = require("path");

// ─── Configuration ────────────────────────────────────────────────

/**
 * Bounding box centered on Yerevan.
 * SVG aspect ratio: 55/42 ≈ 1.31
 * At lat 40.19°: 1° lng ≈ 85 km, 1° lat ≈ 111 km
 * Box: ~10 km wide × ~7.6 km tall  →  0.118° lng × 0.069° lat  (aspect ≈ 1.31 ✓)
 */
const BOUNDS = {
  latMin: 40.1527,
  latMax: 40.2217,
  lngMin: 44.4562,
  lngMax: 44.5742,
};

/**
 * SVG row y-ranges. Each row's x-extent is detected from the rasterized pixels
 * and normalized to the full lng range so all three rows are centered.
 */
const SVG_HEIGHT = 42;
const ROW_DEFS = [
  { svgYMin: 0,  svgYMax: 10 },  // ԲՈЛЛОРÏН
  { svgYMin: 15, svgYMax: 26 },  // ДЕМ
  { svgYMin: 31, svgYMax: 42 },  // ЕМ
];

/** Points awarded for every dot (all in Yerevan) */
const DOT_POINTS = 50;

/** Rasterization scale factor (SVG is 55×42 px, scaled to 1100×840) */
const SCALE = 20;

/** Pixel sampling stride (~2000 dots) */
const DEFAULT_STRIDE = 8;

// ─── Main ─────────────────────────────────────────────────────────

function main() {
  const projectId = process.argv[2];
  if (!projectId) {
    console.error("Usage: npx ts-node -P scripts/tsconfig.json scripts/generate-heatmap-points.ts <project_id> [stride]");
    process.exit(1);
  }

  const strideArg = parseInt(process.argv[3] ?? "", 10);
  const stride = isNaN(strideArg) ? DEFAULT_STRIDE : strideArg;

  const svgPath = path.join(__dirname, "text-heatmap.svg");
  const svgContent = fs.readFileSync(svgPath, "utf-8");

  const resvg = new Resvg(svgContent, {
    fitTo: { mode: "width", value: 55 * SCALE },
    background: "rgba(0,0,0,0)",
  });
  const rendered = resvg.render();
  const pixels: Uint8Array = rendered.pixels;
  const width: number = rendered.width;
  const height: number = rendered.height;

  process.stderr.write(`Rasterized: ${width}×${height}px, stride=${stride}\n`);

  // First pass (stride=1): find the pixel x-extent of each row.
  const rowXBounds = ROW_DEFS.map(() => ({ xMin: Infinity, xMax: -Infinity }));
  for (let py = 0; py < height; py++) {
    const svgY = (py / height) * SVG_HEIGHT;
    const ri = ROW_DEFS.findIndex((r) => svgY >= r.svgYMin && svgY <= r.svgYMax);
    if (ri === -1) continue;
    for (let px = 0; px < width; px++) {
      const idx = (py * width + px) * 4;
      if (pixels[idx + 3] <= 128) continue;
      if (px < rowXBounds[ri].xMin) rowXBounds[ri].xMin = px;
      if (px > rowXBounds[ri].xMax) rowXBounds[ri].xMax = px;
    }
  }
  rowXBounds.forEach((b, i) => {
    const status = b.xMin === Infinity ? "NO PIXELS FOUND" : `${b.xMin}–${b.xMax} px`;
    process.stderr.write(`  Row ${i + 1} x: ${status}\n`);
  });

  // Second pass (with stride): each row independently fills the full lng range
  const dots: Array<{ lat: number; lng: number; points: number }> = [];
  const rowDotCounts = [0, 0, 0];

  for (let py = 0; py < height; py += stride) {
    const svgY = (py / height) * SVG_HEIGHT;
    const ri = ROW_DEFS.findIndex((r) => svgY >= r.svgYMin && svgY <= r.svgYMax);
    if (ri === -1) continue;
    if (rowXBounds[ri].xMin === Infinity) continue;

    const rowXMin = rowXBounds[ri].xMin;
    const rowXMax = rowXBounds[ri].xMax;
    const rowWidth = rowXMax - rowXMin;

    for (let px = 0; px < width; px += stride) {
      const idx = (py * width + px) * 4;
      if (pixels[idx + 3] <= 128) continue;

      // Normalize x within this row's own extent → fills full lng bounds
      const normX = (px - rowXMin) / rowWidth;
      const lng = BOUNDS.lngMin + normX * (BOUNDS.lngMax - BOUNDS.lngMin);
      const lat = BOUNDS.latMax - (py / height) * (BOUNDS.latMax - BOUNDS.latMin);
      dots.push({ lat, lng, points: DOT_POINTS });
      rowDotCounts[ri]++;
    }
  }

  rowDotCounts.forEach((n, i) => process.stderr.write(`  Row ${i + 1} dots: ${n}\n`));

  process.stderr.write(`Found ${dots.length} dots\n`);

  const safeProjectId = projectId.replace(/[^a-zA-Z0-9_-]/g, "");

  console.log(`-- Generated ${dots.length} heatmap dots for project ${safeProjectId}`);
  console.log(`-- All dots in Yerevan (${DOT_POINTS} pts each)`);
  console.log(`-- Run: psql $DATABASE_URL -f seed.sql`);
  console.log();
  console.log("INSERT INTO heatmap_points (project_id, lat, lng, points) VALUES");

  const sqlRows = dots.map(
    (d) => `  ('${safeProjectId}', ${d.lat.toFixed(6)}, ${d.lng.toFixed(6)}, ${d.points})`
  );
  console.log(sqlRows.join(",\n") + ";");

  process.stderr.write(`Done. ${dots.length} points\n`);
}

main();
