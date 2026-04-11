/**
 * Imports party candidates from a CSV file into the party_candidates table.
 * - Snapshots existing images by full_name before clearing
 * - Clears table and reinserts with correct candidate numbers from CSV
 * - Downloads images only if the candidate has no image yet
 * - Candidate number is read from the last CSV column
 *
 * CSV columns (in order):
 *   Timestamp | Full Name | Phone | Social URL | Bio | Reason | Image (Drive URL) | Candidate Number
 *
 * Usage:
 *   npx ts-node -P scripts/tsconfig.json scripts/import-candidates.ts candidates.csv
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import fs from "fs";
import path from "path";
import heicConvert from "heic-convert";

// Load env
const envPath = path.join(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf-8")
    .split("\n")
    .forEach((line: string) => {
      const [k, ...v] = line.split("=");
      if (k && v.length) process.env[k.trim()] = v.join("=").trim();
    });
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

function driveFileId(url: string): string | null {
  if (!url?.trim()) return null;
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) ?? url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return match?.[1] ?? null;
}

async function downloadAndUpload(fileId: string, storagePath: string): Promise<string | null> {
  const downloadUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`;
  process.stdout.write(`  Downloading ${fileId}...`);
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    const res = await fetch(downloadUrl, { signal: controller.signal }).finally(() => clearTimeout(timeout));
    if (!res.ok) { console.log(` FAILED (${res.status})`); return null; }
    let buf = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") ?? "";

    const isHeic = contentType.includes("heic") || contentType.includes("heif") ||
      (buf[0] === 0x00 && buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70);
    if (isHeic) {
      process.stdout.write(" [converting HEIC]");
      buf = Buffer.from(await heicConvert({ buffer: buf as unknown as ArrayBuffer, format: "JPEG", quality: 0.9 }));
    }

    const up = await fetch(`${SUPABASE_URL}/storage/v1/object/candidate-photos/${storagePath}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SERVICE_KEY}`,
        "Content-Type": "image/jpeg",
        "x-upsert": "true",
      },
      body: buf,
    });

    if (!up.ok) { console.log(` Upload failed: ${await up.text()}`); return null; }
    console.log(` OK (${(buf.length / 1024).toFixed(0)} KB)`);
    return `${SUPABASE_URL}/storage/v1/object/public/candidate-photos/${storagePath}`;
  } catch (e) {
    console.log(` ERROR: ${e}`);
    return null;
  }
}

function parseCSV(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    const next = content[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      row.push(current.trim());
      current = "";
    } else if ((ch === "\n" || (ch === "\r" && next === "\n")) && !inQuotes) {
      if (ch === "\r") i++;
      row.push(current.trim());
      current = "";
      if (row.some(Boolean)) rows.push(row);
      row = [];
    } else {
      current += ch;
    }
  }
  row.push(current.trim());
  if (row.some(Boolean)) rows.push(row);

  return rows;
}

async function main() {
  const csvFile = process.argv[2];
  if (!csvFile) {
    console.error("Usage: npx ts-node -P scripts/tsconfig.json scripts/import-candidates.ts <file.csv>");
    process.exit(1);
  }

  const allRows = parseCSV(fs.readFileSync(csvFile, "utf-8"));
  const rows = allRows.slice(1).filter((cols: string[]) => cols[1]?.trim());

  // --- 1. Clear table ---
  console.log("Clearing existing candidates table...");
  const delRes = await fetch(`${SUPABASE_URL}/rest/v1/party_candidates?id=neq.00000000-0000-0000-0000-000000000000`, {
    method: "DELETE",
    headers: { "apikey": SERVICE_KEY, "Authorization": `Bearer ${SERVICE_KEY}` },
  });
  if (!delRes.ok) {
    console.error("Failed to clear table:", await delRes.text());
    process.exit(1);
  }
  console.log("Table cleared.");

  // --- 2. Clear all storage images ---
  console.log("Clearing all images from storage...");
  const listRes = await fetch(`${SUPABASE_URL}/storage/v1/object/list/candidate-photos`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prefix: "", limit: 1000 }),
  });
  if (listRes.ok) {
    const files: { name: string }[] = await listRes.json();
    if (files.length > 0) {
      const removeRes = await fetch(`${SUPABASE_URL}/storage/v1/object/candidate-photos`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ prefixes: files.map((f) => f.name) }),
      });
      if (removeRes.ok) console.log(`Deleted ${files.length} images.`);
      else console.error("Failed to delete images:", await removeRes.text());
    } else {
      console.log("No images to delete.");
    }
  } else {
    console.warn("Could not list storage files:", await listRes.text());
  }

  // --- 3. Download & upload all images fresh ---
  console.log(`\nDownloading images for ${rows.length} candidates...`);
  const imageUrls: (string | null)[] = [];

  for (let i = 0; i < rows.length; i++) {
    const cols = rows[i];
    const fullName = cols[1]?.trim() ?? "";
    const candidateNumber = parseInt(cols[cols.length - 1] ?? "", 10);
    const rawImageUrl = cols[6] ?? "";
    const fileId = driveFileId(rawImageUrl);

    if (!fileId) {
      console.log(`  #${candidateNumber} ${fullName}: no Drive URL`);
      imageUrls.push(null);
      continue;
    }

    process.stdout.write(`  #${candidateNumber} ${fullName}: `);
    const publicUrl = await downloadAndUpload(fileId, `candidate_${candidateNumber}.jpg`);
    imageUrls.push(publicUrl);
  }

  // --- 4. Build and insert rows ---
  const candidates = rows
    .map((cols: string[], i: number) => {
      const candidateNumber = parseInt(cols[cols.length - 1] ?? "", 10);
      if (isNaN(candidateNumber)) {
        console.warn(`  Skipping row ${i + 1} (${cols[1]}): invalid candidate number`);
        return null;
      }
      return {
        candidate_number: candidateNumber,
        full_name:        cols[1]?.trim() ?? "",
        phone:            cols[2]?.trim() || null,
        social_url:       cols[3]?.trim() || null,
        bio:              cols[4]?.trim() || null,
        reason:           cols[5]?.trim() || null,
        image_url:        imageUrls[i],
        sort_order:       i,
      };
    })
    .filter(Boolean);

  console.log(`\nInserting ${candidates.length} candidates...`);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/party_candidates`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SERVICE_KEY,
      "Authorization": `Bearer ${SERVICE_KEY}`,
      "Prefer": "return=minimal",
    },
    body: JSON.stringify(candidates),
  });

  if (!res.ok) {
    console.error("Import failed:", await res.text());
    process.exit(1);
  }

  console.log(`\nDone. ${candidates.length} candidates imported.`);
}

main();
