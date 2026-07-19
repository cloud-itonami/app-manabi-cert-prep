// G16 — no official past-question reproduction.
// Per ADR-2605264400 G16: questionSource closed enum at PDS write time.
// Only `synthetic-baien-generated` or `user-imported-personal-only` are valid;
// `official-isaca-reproduced` / `official-isc2-reproduced` /
// `commercial-test-bank-reproduced` are NOT valid members.

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const PWA_ROOT = join(import.meta.dirname ?? __dirname, "..");
const REPO_ROOT = join(PWA_ROOT, "..", "..");
const PUBLIC_DIR = join(PWA_ROOT, "public");
const LEXICON_PATH = join(
  REPO_ROOT,
  "orgs/etzhayyim/com-etzhayyim-manabi/wire/lexicons/certPrepSession.json",
);

function listFiles(dir: string, exts: string[]): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) {
      out.push(...listFiles(p, exts));
    } else if (exts.some((ext) => entry.endsWith(ext))) {
      out.push(p);
    }
  }
  return out;
}

describe("G16 no official past-question reproduction", () => {
  it("certPrepSession.questionSource enum is closed to exactly 2 allowed values", () => {
    const lex = JSON.parse(readFileSync(LEXICON_PATH, "utf-8"));
    const qs = lex.defs.main.record.properties.questionSource;
    expect(qs).toBeDefined();
    expect(qs.knownValues).toBeDefined();
    const known = qs.knownValues as string[];
    expect(known).toEqual(["synthetic-baien-generated", "user-imported-personal-only"]);
    expect(known).not.toContain("official-isaca-reproduced");
    expect(known).not.toContain("official-isc2-reproduced");
    expect(known).not.toContain("commercial-test-bank-reproduced");
  });

  it("study HTML does NOT contain official-question-reproduction tokens", () => {
    const files = listFiles(PUBLIC_DIR, [".html"]);
    for (const path of files) {
      const body = readFileSync(path, "utf-8").toLowerCase();
      // Allow the literal references "official", "ISACA", "(ISC)²" to APPEAR in
      // contexts that disclaim use (e.g., "公式の過去問は再現しません"). What we
      // forbid is the appearance of a question-text style reproduction marker.
      expect(body, `${path} must not claim official-question source`).not.toContain(
        "official-isaca-reproduced",
      );
      expect(body, `${path} must not claim official-question source`).not.toContain(
        "official-isc2-reproduced",
      );
      expect(body, `${path} must not claim official-question source`).not.toContain(
        "commercial-test-bank-reproduced",
      );
    }
  });

  it("domains.html clearly states that question outline structure is fair-use referenced, not reproduced", () => {
    const html = readFileSync(join(PUBLIC_DIR, "domains.html"), "utf-8");
    // Honest framing tokens — should be PRESENT
    expect(html).toContain("fair-use");
    expect(html).toContain("reproduction");
    expect(html).toContain("G16");
  });
});
