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

// Approved candidate names with their correct numbers (exact match)
const APPROVED_CANDIDATES_MAP = new Map([
  [1, "Կյուրեղյան Սպարտակ"],
  [2, "Գևորգյան Իշխան"],
  [3, "Կարապետյանց Նինա"],
  [4, "Քոչարյան Արամ"],
  [5, "Նահապետյան Միքայել"],
  [6, "Քամալյան Տաթևիկ"],
  [7, "Մանասյան Հայկ"],
  [8, "Ղազարյան Հովսեփ"],
  [9, "Մուրադյան Լիլիթ"],
  [10, "Պետրոսյան Արամայիս"],
  [11, "Ամիրբեկյան Հրաչյա"],
  [12, "Երիցփոխյան Օլյա"],
  [13, "Պողոսյան Ժուրեմ"],
  [14, "Պետրոսյան Սմբատ"],
  [15, "Խալաթյան Արփի"],
  [16, "Մանուկյան Հարություն"],
  [17, "Սիմոնյան Գետեոն"],
  [18, "Մելանյա Հովհանիսյան"],
  [19, "Մարգարյան Միքայել"],
  [20, "Սահակյան Հայկ"],
  [21, "Մուրադյան Սուսաննա"],
  [22, "Աղայան Արմեն"],
  [23, "Օհանյան Խաչիկ"],
  [24, "Բարխուդարյան Հասմիկ"],
  [25, "Քամալյան  Արտակ"],
  [26, "Քալանթարյան Վարդան"],
  [27, "Հարությունյան Կարինե"],
  [28, "Բադալյան Արման"],
  [29, "Պետրոսյան Դավիթ"],
  [30, "Հարությունյան Գոհար"],
]);

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

  // --- 0. Clear table before importing ---
  console.log("Clearing candidates table...");
  const clearRes = await fetch(`${SUPABASE_URL}/rest/v1/party_candidates?id=neq.00000000-0000-0000-0000-000000000000`, {
    method: "DELETE",
    headers: { "apikey": SERVICE_KEY, "Authorization": `Bearer ${SERVICE_KEY}` },
  });
  if (!clearRes.ok) {
    console.error("Failed to clear table:", await clearRes.text());
    process.exit(1);
  }
  console.log("Table cleared.");

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

  // --- 4. Build rows and filter to approved candidates only ---
  const candidates: any[] = [];
  const importedNames = new Set<string>();

  for (const [candidateNumber, approvedName] of APPROVED_CANDIDATES_MAP) {
    // Find this candidate in the CSV by name (ignore CSV numbers)
    const row = rows.find((cols) => cols[1]?.trim() === approvedName);

    if (!row) {
      console.warn(`  Missing: #${candidateNumber} "${approvedName}" (not found in CSV)`);
      continue;
    }

    importedNames.add(approvedName);
    const fullName = row[1]?.trim() ?? "";

    candidates.push({
      candidate_number: candidateNumber,
      full_name:        fullName,
      phone:            row[2]?.trim() || null,
      social_url:       row[3]?.trim() || null,
      bio:              row[4]?.trim() || null,
      reason:           row[5]?.trim() || null,
      image_url:        imageUrls[rows.indexOf(row)] || null,
      sort_order:       candidateNumber - 1,
    });
  };

  console.log(`\nInserting ${candidates.length} candidates (approved list only)...`);

  // Safety check: only 30 approved candidates should be in the final list
  if (candidates.length !== 30) {
    console.error(`ERROR: Expected exactly 30 candidates, but got ${candidates.length}`);
    console.error("Missing candidates:");
    const imported = new Map(candidates.map((c: any) => [c.candidate_number, c.full_name]));
    for (const [num, name] of APPROVED_CANDIDATES_MAP) {
      if (!imported.has(num)) {
        console.error(`  - #${num} ${name}`);
      }
    }
    process.exit(1);
  }

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
