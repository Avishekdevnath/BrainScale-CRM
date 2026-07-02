// Verifies every baseline method exists exactly once across the legacy class
// and the new domain files, so spread composition cannot silently drop or
// shadow a method.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const baseline = readFileSync("scripts/api-surface-baseline.txt", "utf8")
  .split(/\r?\n/).map(s => s.trim().replace(/^﻿/, "")).filter(Boolean);

// http.ts is intentionally NOT scanned: its refreshAccessToken is core plumbing;
// the public-surface copy lives on the legacy class (delegate) until auth.api.ts owns it.
const sources = ["src/lib/api-client.ts"];
const apiDir = "src/lib/api";
if (existsSync(apiDir)) {
  for (const f of readdirSync(apiDir)) {
    if (f.endsWith(".api.ts")) sources.push(join(apiDir, f));
  }
}

const counts = new Map(baseline.map(n => [n, 0]));
const methodRe = /^  (?:async )?([a-zA-Z_][a-zA-Z0-9_]*)\s*[(<]/;
for (const file of sources) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(methodRe);
    if (m && counts.has(m[1])) counts.set(m[1], counts.get(m[1]) + 1);
  }
}

const missing = [...counts].filter(([, c]) => c === 0).map(([n]) => n);
const dupes = [...counts].filter(([, c]) => c > 1).map(([n, c]) => `${n} (x${c})`);
if (missing.length || dupes.length) {
  if (missing.length) console.error("MISSING:", missing.join(", "));
  if (dupes.length) console.error("DUPLICATED:", dupes.join(", "));
  process.exit(1);
}
console.log(`OK — all ${baseline.length} methods present exactly once.`);
