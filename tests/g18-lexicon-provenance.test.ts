// The vendored lexicon contracts must stay byte-identical to what was vendored.
//
// Vendoring buys the G15/G16 gates the ability to run at all (see
// tests/_lexicons.ts), and it costs the ability to drift silently from
// etzhayyim/actor-manabi. This test is the second half of that trade: edit a
// vendored contract and the digest goes red, so a change to a constitutional
// contract cannot arrive as an unreviewed local edit.

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { LEXICON_DIR } from "./_lexicons";

const PROVENANCE_PATH = join(LEXICON_DIR, "provenance.json");

describe("vendored lexicon provenance", () => {
  it("records where the contracts came from", () => {
    expect(existsSync(PROVENANCE_PATH), `${PROVENANCE_PATH} must exist`).toBe(true);
    const p = JSON.parse(readFileSync(PROVENANCE_PATH, "utf-8"));
    expect(p.source?.repo).toBe("etzhayyim/actor-manabi");
    expect(p.source?.path).toBe("wire/contracts/lexicons");
    expect(p.source?.commit).toMatch(/^[0-9a-f]{40}$/);
  });

  it("every vendored contract matches its recorded sha256", () => {
    const p = JSON.parse(readFileSync(PROVENANCE_PATH, "utf-8"));
    const digests = p.digests as Record<string, string>;

    // Evidence floor: an empty digest map would make the loop below vacuous,
    // and a vacuous loop reports the same "no drift" as a loop that checked.
    const names = Object.keys(digests ?? {});
    expect(names.length, "provenance.json records no digests to check").toBeGreaterThanOrEqual(2);

    for (const name of names) {
      const path = join(LEXICON_DIR, name);
      expect(existsSync(path), `${name} is recorded in provenance.json but not vendored`).toBe(true);
      const actual = createHash("sha256").update(readFileSync(path)).digest("hex");
      expect(actual, `${name} drifted from the vendored contract`).toBe(digests[name]);
    }
  });
});
