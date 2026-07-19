// G3 anti-addiction UX — structural enforcement at HTML/CSS/JS layer.
// Per ADR-2605264400 + ADR-2605261045 G3 (anti-addiction UX inherited).
//
// Greps every public/ HTML/CSS/JS file for forbidden tokens and asserts absence.

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { stripCComments, stripHtmlComments, stripCssComments } from "./_helpers";

const PWA_ROOT = join(import.meta.dirname ?? __dirname, "..");
const PUBLIC_DIR = join(PWA_ROOT, "public");

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

function readAllStripped(): { path: string; body: string }[] {
  return listFiles(PUBLIC_DIR, [".html", ".css", ".js"]).map((p) => {
    const raw = readFileSync(p, "utf-8");
    let body: string;
    if (p.endsWith(".html")) body = stripHtmlComments(raw);
    else if (p.endsWith(".css")) body = stripCssComments(raw);
    else body = stripCComments(raw);
    return { path: p, body };
  });
}

describe("G3 anti-addiction UX tokens are NOT present", () => {
  // Tokens whose mere presence would imply engagement-bait mechanics.
  // (We test for STANDALONE / DELIMITED occurrences via word boundaries
  // so that this test does not trip on, e.g., a comment quoting the forbidden
  // term as an example. The actual content of the comments is verified
  // separately by reading the calm.css / calm.js "DELIBERATELY ABSENT" block.)
  // We forbid tokens that would constitute an IMPLEMENTATION of engagement-bait.
  // We deliberately do NOT forbid words like "leaderboard" / "streak" in
  // user-visible bodies, because honest constitutional disclosure ("streak は
  // 存在しません") is itself part of G3 framing. Structural absence is enforced
  // via CSS rule checks + JS API checks below.
  const forbiddenAsContent = [
    "🔥", "fire-streak", "current-streak", "longest-streak",
    "earn points", "earn xp", "level up now", "unlock badge",
    "global rank", "your rank", "cohort percentile", "you are #",
    "limited time", "act now", "don't miss out", "expires in",
    "congratulations!", "おめでとうございます!",
    "pass probability", "chance of passing", "合格確率", "合格可能性",
  ];

  it("no public/ file contains UI-facing engagement-bait phrases (comment-stripped scan)", () => {
    const files = readAllStripped();
    for (const { path, body } of files) {
      const lower = body.toLowerCase();
      for (const term of forbiddenAsContent) {
        expect(lower, `forbidden token '${term}' found in ${path}`).not.toContain(term.toLowerCase());
      }
    }
  });

  it("calm.css has no @keyframes (no animation; engagement-bait via motion banned)", () => {
    const css = readFileSync(join(PUBLIC_DIR, "calm.css"), "utf-8");
    // Match only the CSS at-rule declaration, not the literal token inside a comment
    // Our comment explicitly mentions "no @keyframes" — that is text, not a rule.
    const keyframeRule = /@keyframes\s+[a-zA-Z_-]+\s*\{/;
    expect(keyframeRule.test(css)).toBe(false);
  });

  it("calm.css has no progress-bar / leaderboard / badge class definitions", () => {
    const css = readFileSync(join(PUBLIC_DIR, "calm.css"), "utf-8");
    // Class selectors only — not the words "progress-bar" appearing in a comment
    expect(/\.progress-bar\s*\{/.test(css)).toBe(false);
    expect(/\.streak\s*\{/.test(css)).toBe(false);
    expect(/\.leaderboard\s*\{/.test(css)).toBe(false);
    expect(/\.badge\s*\{/.test(css)).toBe(false);
    expect(/\.xp\s*\{/.test(css)).toBe(false);
  });

  it("calm.js exposes no recordCorrect / recordStreak / getLeaderboard / scheduleReminder API", () => {
    const js = readFileSync(join(PUBLIC_DIR, "calm.js"), "utf-8");
    // Look only at function/property name positions (not comments). We accept the
    // file's "DELIBERATELY ABSENT" comment that lists these as forbidden,
    // and assert that they appear nowhere as actual JS identifiers being defined.
    const forbiddenAsDecl = [
      /function\s+recordCorrect\b/,
      /function\s+recordStreak\b/,
      /function\s+recordScore\b/,
      /function\s+getLeaderboard\b/,
      /function\s+schedulePushNotification\b/,
      /\.recordCorrect\s*=/,
      /\.recordStreak\s*=/,
      /\.recordScore\s*=/,
      /\.getLeaderboard\s*=/,
      /\.schedulePushNotification\s*=/,
    ];
    for (const re of forbiddenAsDecl) {
      expect(re.test(js), `forbidden declaration matching ${re} should not be defined in calm.js`).toBe(false);
    }
  });
});
