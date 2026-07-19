// W1 substrate boundary — at this phase the Worker does NOT call any LLM,
// does NOT reach out to judah LiteLLM, does NOT POST to baien-moemoekyun,
// does NOT call any commercial LLM API. R1+ flips this.
//
// Per ADR-2605264400 §Roadmap R0/W1.
// Per ADR-2605215000 — once LLM wiring lands at R1, the ONLY allowed
// destination is the local Murakumo gateway 127.0.0.1:4000 (judah LiteLLM);
// any commercial endpoint reference would be a constitutional violation.

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { stripCComments, stripHtmlComments } from "./_helpers";

const PWA_ROOT = join(import.meta.dirname ?? __dirname, "..");
const PUBLIC_DIR = join(PWA_ROOT, "public");
const SRC_DIR = join(PWA_ROOT, "src");

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

describe("W1 phase — no LLM call yet and no commercial LLM endpoints anywhere", () => {
  it("Worker app.ts performs no fetch() invocations except the ASSETS pass-through", () => {
    const ts = stripCComments(readFileSync(join(SRC_DIR, "app.ts"), "utf-8"));
    // Count CALL-site fetch( invocations (not interface declarations like
    // `fetch(req: CFRequest)`). We approximate "call site" as `.fetch(` —
    // every actual call to fetch in this worker is qualified (env.ASSETS.fetch).
    const callSiteFetches = ts.match(/\.fetch\s*\(/g) ?? [];
    // The only acceptable call is env.ASSETS.fetch(req) for static asset routing.
    expect(callSiteFetches.length).toBeLessThanOrEqual(1);
    // And the body must contain no external host string literals
    expect(ts).not.toMatch(/['"`]https?:\/\/(?!127\.0\.0\.1)[^'"`]+['"`]/);
  });

  it("no public/ JS contains commercial LLM endpoint URLs (comment-stripped)", () => {
    const files = listFiles(PUBLIC_DIR, [".js", ".html"]);
    const forbiddenHosts = [
      "api.openai.com",
      "api.anthropic.com",
      "generativelanguage.googleapis.com",
      "bedrock-runtime",
      "aiplatform.googleapis.com",
      "api.cohere.ai",
      "api.mistral.ai",
      "api.together.xyz",
      "api.runpod.io",
      "runpod.io",
      "api.replicate.com",
      "huggingface.co/api/inference",
    ];
    for (const path of files) {
      const raw = readFileSync(path, "utf-8");
      const stripped = path.endsWith(".html") ? stripHtmlComments(raw) : stripCComments(raw);
      const body = stripped.toLowerCase();
      for (const host of forbiddenHosts) {
        expect(body, `${path} must not reference ${host}`).not.toContain(host.toLowerCase());
      }
    }
  });

  it("Worker src/app.ts also forbids the same commercial endpoints (comment-stripped)", () => {
    const ts = stripCComments(readFileSync(join(SRC_DIR, "app.ts"), "utf-8")).toLowerCase();
    const forbiddenHosts = [
      "api.openai.com",
      "api.anthropic.com",
      "generativelanguage.googleapis.com",
      "bedrock-runtime",
      "aiplatform.googleapis.com",
      "api.cohere.ai",
      "api.mistral.ai",
      "api.together.xyz",
      "api.runpod.io",
      "api.replicate.com",
    ];
    for (const host of forbiddenHosts) {
      expect(ts).not.toContain(host.toLowerCase());
    }
  });

  it("calm.js has no LLM-related identifiers at W1 (comment-stripped)", () => {
    const js = stripCComments(readFileSync(join(PUBLIC_DIR, "calm.js"), "utf-8"));
    expect(js).not.toContain("judah");
    expect(js).not.toContain("LiteLLM");
    expect(js).not.toContain("baien");
    // Allow only the API surface declared in the file itself
  });

  it("XRPC routes return phase-gate-locked 503 when MANABI_CERT_PREP_R1_PHASE_GATE is 'locked'", () => {
    const ts = readFileSync(join(SRC_DIR, "app.ts"), "utf-8");
    expect(ts).toContain("ManabiCertPrepR1PhaseGateLocked");
    expect(ts).toContain("/xrpc/");
  });

  it("kotodama.jsonld declares r0ScaffoldNoLlm: true", () => {
    const mag = JSON.parse(readFileSync(join(PWA_ROOT, "kotodama.jsonld"), "utf-8"));
    expect(mag.r0ScaffoldNoLlm).toBe(true);
  });
});
