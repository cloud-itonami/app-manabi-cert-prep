// pricing.json invariants — the price book may not out-run the product.
//
// Per docs/business-model.md. This is a gate on the COMMERCIAL surface, in the
// same spirit as the G3 / G15 / G16 / G18 / W1 gates on the study surface. The
// failure mode it exists for is a quiet edit that turns a proposal into a price
// list while every /xrpc/ route still returns 503.
//
// Four of these assertions read the actual Worker source, the actual deploy
// config, and the actual vendored lexicons rather than a copy of their
// contents, so the price book cannot claim a phase, a lexicon, or a meter the
// code does not have.
//
// The last one is the point of the file. Every entry in forbiddenDimensions
// carries a `why` that depends on a fact about the schema -- "there is no
// passRate field to sell", "the questionSource enum is closed". Those facts can
// change. A reason that has quietly become false still reads as a reason, so
// each one names a schemaCheck that is re-run here against the vendored
// contract. An unrecognised schemaCheck id FAILS rather than being skipped: a
// typo must not be able to turn a checked reason back into an unchecked one.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PWA_ROOT, readLexicon } from "./_lexicons";

interface Plan {
  id: string;
  status: string;
  monthlyBase: number;
  pricedDimensions: string[];
  includedLexicons: string[];
}

interface Forbidden {
  id: string;
  why: string;
  schemaCheck: string | null;
}

interface PriceBook {
  pricingVersion: number;
  currency: string;
  phaseGate: string;
  meteredDimensions: string[];
  candidateDimensions: { id: string; meteredToday: boolean }[];
  forbiddenDimensions: Forbidden[];
  billingGates: { id: string; description: string; met: boolean }[];
  plans: Plan[];
}

function readPriceBook(): PriceBook {
  return JSON.parse(readFileSync(join(PWA_ROOT, "pricing.json"), "utf-8")) as PriceBook;
}

function readSrc(): string {
  return readFileSync(join(PWA_ROOT, "src", "app.ts"), "utf-8");
}

/** NSIDs listed in a `const <name> = new Set([...])` block in src/app.ts. */
function nsidsFromSet(code: string, setName: string): string[] {
  const m = code.match(new RegExp(`const\\s+${setName}\\s*=\\s*new Set\\(\\[([\\s\\S]*?)\\]\\)`));
  if (!m) throw new Error(`${setName} not found in src/app.ts — this test is reading the wrong shape`);
  return [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
}

/** The phase gate as the deploy config actually sets it, not as the price book claims. */
function phaseGateFromWrangler(): string {
  const raw = readFileSync(join(PWA_ROOT, "wrangler.jsonc"), "utf-8");
  const m = raw.match(/"MANABI_CERT_PREP_R1_PHASE_GATE"\s*:\s*"([^"]*)"/);
  if (!m) throw new Error("MANABI_CERT_PREP_R1_PHASE_GATE not found in wrangler.jsonc");
  return m[1];
}

const PUBLISHED_STATUSES = new Set(["published", "active", "live"]);

/**
 * The schema fact each forbidden `why` rests on, re-checked against the
 * vendored contract. Throwing (not returning false) on an unknown id is
 * deliberate -- see the header note.
 */
const SCHEMA_CHECKS: Record<string, () => void> = {
  "certPrepSession-has-no-pass-rate-fields": () => {
    const props = readLexicon("certPrepSession").defs.main.record.properties;
    for (const f of ["passRate", "predictedScore", "relativeRanking", "estimatedPassProbability", "cohortPercentile"]) {
      expect(props[f], `certPrepSession now defines "${f}" — the per-pass-rate-uplift reason is no longer true`).toBeUndefined();
    }
  },
  "certPrepSession-questionSource-enum-is-closed": () => {
    const qs = readLexicon("certPrepSession").defs.main.record.properties.questionSource;
    expect(qs?.knownValues, "questionSource lost its closed enum — the per-official-question reason is no longer true")
      .toEqual(["synthetic-baien-generated", "user-imported-personal-only"]);
  },
  "domainMasteryAttestation-credentialClaimedAttested-is-const-false": () => {
    const prop = readLexicon("domainMasteryAttestation").defs.main.record.properties.credentialClaimedAttested;
    expect(prop?.const, "credentialClaimedAttested is no longer const false — the per-credential-issued reason is no longer true").toBe(false);
  },
  "certPrepSession-timerMode-is-opt-in": () => {
    const prop = readLexicon("certPrepSession").defs.main.record.properties.timerModeOptedIn;
    expect(prop, "certPrepSession lost timerModeOptedIn — the per-timed-sitting reason is no longer true").toBeDefined();
    const required = readLexicon("certPrepSession").defs.main.record.required as string[];
    expect(required, "timerModeOptedIn became required — opting in is no longer opt-in").not.toContain("timerModeOptedIn");
  },
  "certPrepSession-has-learner-age-bucket": () => {
    const props = readLexicon("certPrepSession").defs.main.record.properties;
    expect(props.learnerAgeBucket?.knownValues, "learnerAgeBucket lost its minor/adult discriminator — the per-minor-seat reason is no longer true")
      .toEqual(["minor", "adult"]);
    expect(props.learnerDidOrPseudonym, "learnerDidOrPseudonym is gone — there is no pseudonym path left to justify per-minor-seat").toBeDefined();
  },
};

describe("pricing.json invariants", () => {
  it("parses, and declares the fields the rest of these assertions depend on", () => {
    const p = readPriceBook();
    // An empty or missing section must not read as "nothing to check".
    expect(Array.isArray(p.plans) && p.plans.length > 0).toBe(true);
    expect(Array.isArray(p.billingGates) && p.billingGates.length > 0).toBe(true);
    expect(Array.isArray(p.meteredDimensions)).toBe(true);
    expect(Array.isArray(p.forbiddenDimensions) && p.forbiddenDimensions.length > 0).toBe(true);
    expect(Array.isArray(p.candidateDimensions) && p.candidateDimensions.length > 0).toBe(true);
    expect(typeof p.phaseGate).toBe("string");
  });

  it("no plan is published while any billing gate is unmet", () => {
    const p = readPriceBook();
    const unmet = p.billingGates.filter((g) => !g.met).map((g) => g.id);
    if (unmet.length === 0) return; // all gates met — publishing is allowed
    for (const plan of p.plans) {
      expect(
        PUBLISHED_STATUSES.has(plan.status),
        `plan ${plan.id} is "${plan.status}" while gates are unmet: ${unmet.join(", ")}`,
      ).toBe(false);
    }
  });

  it("every priced dimension is one the Worker actually meters", () => {
    const p = readPriceBook();
    const metered = new Set(p.meteredDimensions);
    for (const plan of p.plans) {
      for (const dim of plan.pricedDimensions) {
        expect(
          metered.has(dim),
          `plan ${plan.id} prices "${dim}" but meteredDimensions does not contain it — that invoices from a meter that does not exist`,
        ).toBe(true);
      }
    }
  });

  it("no plan prices a forbidden dimension, and none is smuggled into the meter", () => {
    const p = readPriceBook();
    const forbidden = new Map(p.forbiddenDimensions.map((d) => [d.id, d.why]));
    for (const plan of p.plans) {
      for (const dim of plan.pricedDimensions) {
        expect(forbidden.has(dim), `plan ${plan.id} prices "${dim}": ${forbidden.get(dim) ?? ""}`).toBe(false);
      }
    }
    for (const id of forbidden.keys()) {
      expect(
        p.meteredDimensions.includes(id),
        `meteredDimensions contains forbidden unit "${id}": ${forbidden.get(id)}`,
      ).toBe(false);
      expect(
        p.candidateDimensions.some((d) => d.id === id),
        `candidateDimensions proposes forbidden unit "${id}": ${forbidden.get(id)}`,
      ).toBe(false);
    }
  });

  it("nothing is metered while the deploy config has the phase gate locked", () => {
    const p = readPriceBook();
    const deployed = phaseGateFromWrangler();
    // The price book must not disagree with the deploy config about the phase.
    expect(p.phaseGate, "pricing.json phaseGate disagrees with wrangler.jsonc").toBe(deployed);
    if (deployed === "locked") {
      expect(
        p.meteredDimensions,
        "every /xrpc/ route 503s at this phase, so the Worker counts nothing",
      ).toEqual([]);
      expect(p.candidateDimensions.every((d) => d.meteredToday === false)).toBe(true);
    }
  });

  it("no plan includes a lexicon the Worker refuses to serve", () => {
    const p = readPriceBook();
    const code = readSrc();
    const r1Active = new Set(nsidsFromSet(code, "R1_ACTIVE_NSIDS"));
    const r2Gated = new Set(nsidsFromSet(code, "R2_GATED_NSIDS"));
    expect(r1Active.size).toBeGreaterThan(0);
    expect(r2Gated.size).toBeGreaterThan(0);
    for (const plan of p.plans) {
      for (const nsid of plan.includedLexicons) {
        expect(r2Gated.has(nsid), `plan ${plan.id} includes "${nsid}", which src/app.ts gates as R2`).toBe(false);
        expect(r1Active.has(nsid), `plan ${plan.id} includes "${nsid}", which is not in R1_ACTIVE_NSIDS in src/app.ts`).toBe(true);
      }
    }
  });

  it("the adherent tier costs nothing and has no usage component", () => {
    const p = readPriceBook();
    const adherent = p.plans.find((x) => x.id === "adherent");
    expect(adherent, "the adherent-facing plan must exist in the price book").toBeDefined();
    expect(adherent!.monthlyBase).toBe(0);
    expect(adherent!.pricedDimensions).toEqual([]);
    expect(adherent!.status).toBe("free-permanent");
  });

  it("docs/business-model.md names every billing gate and every forbidden unit", () => {
    const p = readPriceBook();
    const doc = readFileSync(join(PWA_ROOT, "docs", "business-model.md"), "utf-8");
    for (const gate of p.billingGates) {
      expect(doc, `business-model.md does not mention gate "${gate.id}"`).toContain(gate.id);
    }
    for (const dim of p.forbiddenDimensions) {
      expect(doc, `business-model.md does not mention forbidden unit "${dim.id}"`).toContain(dim.id);
    }
  });

  it("each forbidden unit's stated reason is still true of the vendored lexicons", () => {
    const p = readPriceBook();
    const checked = p.forbiddenDimensions.filter((d) => d.schemaCheck !== null);
    // Floor: if this shrinks to nothing, the assertion below stops asking anything.
    expect(checked.length, "no forbidden unit carries a schemaCheck — this test would pass vacuously").toBeGreaterThan(0);
    for (const dim of checked) {
      const check = SCHEMA_CHECKS[dim.schemaCheck as string];
      if (!check) {
        throw new Error(
          `forbiddenDimensions["${dim.id}"].schemaCheck = "${dim.schemaCheck}" has no implementation in SCHEMA_CHECKS. ` +
            `Unknown ids fail rather than skip: an unchecked reason must not be able to look like a checked one.`,
        );
      }
      check();
    }
  });
});
