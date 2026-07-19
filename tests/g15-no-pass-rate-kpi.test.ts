// G15 — no pass-rate KPI anywhere in the manabi cert_prep substrate.
// Per ADR-2605264400 G15: silenEducationReview cert_prep section schema-rejects
// pass-rate fields; only sessionCount + domainCoverageBreadth.
// Structural negative-space enforcement.

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { stripCComments, stripHtmlComments } from "./_helpers";

const PWA_ROOT = join(import.meta.dirname ?? __dirname, "..");
const REPO_ROOT = join(PWA_ROOT, "..", "..");
const PUBLIC_DIR = join(PWA_ROOT, "public");
const SRC_DIR = join(PWA_ROOT, "src");
const LEXICON_DIR = join(REPO_ROOT, "orgs/etzhayyim/com-etzhayyim-manabi/wire/lexicons");

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

describe("G15 no pass-rate KPI", () => {
  it("certPrepSession lexicon does NOT define passRate / predictedScore / relativeRanking", () => {
    const lex = JSON.parse(readFileSync(join(LEXICON_DIR, "certPrepSession.json"), "utf-8"));
    const props = lex.defs.main.record.properties as Record<string, unknown>;
    expect(props["passRate"]).toBeUndefined();
    expect(props["predictedScore"]).toBeUndefined();
    expect(props["relativeRanking"]).toBeUndefined();
    expect(props["estimatedPassProbability"]).toBeUndefined();
    expect(props["cohortPercentile"]).toBeUndefined();
  });

  it("domainMasteryAttestation lexicon has credentialClaimedAttested const false", () => {
    const lex = JSON.parse(readFileSync(join(LEXICON_DIR, "domainMasteryAttestation.json"), "utf-8"));
    const prop = lex.defs.main.record.properties.credentialClaimedAttested;
    expect(prop).toBeDefined();
    expect(prop.const).toBe(false);
  });

  it("no public/ HTML displays passRate / pass probability UI strings (comment-stripped)", () => {
    const files = listFiles(PUBLIC_DIR, [".html"]);
    for (const path of files) {
      const body = stripHtmlComments(readFileSync(path, "utf-8")).toLowerCase();
      // We DO allow the words "合格" / "pass" in disclaimer / non-goal documentation
      // (e.g. "合格保証ツールではありません" — N11 explicit disavowal).
      // What is forbidden is presenting a probability / rate / ranking UI.
      expect(body, `${path} must not display pass probability UI`).not.toContain("合格確率");
      expect(body, `${path} must not display pass probability UI`).not.toContain("合格可能性");
      expect(body, `${path} must not display pass probability UI`).not.toContain("pass probability");
      expect(body, `${path} must not display pass probability UI`).not.toContain("chance of passing");
      expect(body, `${path} must not display pass probability UI`).not.toContain("estimated passing rate");
    }
  });

  it("worker src/app.ts does not call any pass-rate-prediction endpoint (comment-stripped)", () => {
    const ts = stripCComments(readFileSync(join(SRC_DIR, "app.ts"), "utf-8")).toLowerCase();
    expect(ts).not.toContain("passrate");
    expect(ts).not.toContain("predictscore");
    expect(ts).not.toContain("predictpassprobability");
  });
});
