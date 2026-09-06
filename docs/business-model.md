# Business Model: manabi cert-prep — adherent-facing CISA / CISSP study substrate

## Classification

- Repository: `cloud-itonami/app-manabi-cert-prep`
- Product: adherent-facing study PWA for the CISA and CISSP Common Bodies of
  Knowledge (`wrangler.jsonc` → `APP_DESCRIPTION`)
- Phase: **R0 scaffold, W0+W1.** Every `/xrpc/` route returns
  `503 ManabiCertPrepR1PhaseGateLocked` while
  `MANABI_CERT_PREP_R1_PHASE_GATE` is `"locked"` (`src/app.ts`,
  `wrangler.jsonc`). Static assets are served; nothing is metered, nobody is
  billed, and there is no LLM in the path (`tests/w1-no-llm-call-yet.test.ts`).
- Governing ADRs: ADR-2605264400 (cert_prep sub-charter) under ADR-2605261045
  (manabi master). Both live in `etzhayyim/actor-manabi` as `.edn`.
- Price book: [`pricing.json`](../pricing.json), gated by
  `tests/pricing-invariants.test.ts`.

## The short version

The two things the certification-prep market sells are **a higher pass rate**
and **access to real exam questions**. This repo's schema forbids both, not by
policy but structurally, and the gates that forbid them are already in the tree
and already tested. What is left to sell is small, and it is not sold to the
person studying.

That is the business model. The rest of this document is the derivation.

## Customer — the learner is not the payer

- **宗教法人 operators** running cert-prep as study infrastructure for adherents.
  This is the charter case: manabi exists because a religious corporation wanted
  a way to help adherents acquire knowledge, "whatever they choose to do with it
  afterward" (README).
- **Study circles / vocational pathway stewards.** `domainMasteryAttestation` is
  consumed by L5 Vocation pathway gating (charters_compliance reviewer steward,
  toritate audit steward, Murakumo operator steward) per ADR-2605261000 — the
  demonstration record, explicitly *never the external credential possession*
  (lexicon `description`).

The learner is outside the payment relationship. See *Why the adherent tier is
¥0* below — that is a constraint, not a promotion.

## What the constitution already removed from the price list

Each row is a unit a competitor charges for and this repo cannot. The right-hand
column is the file that makes it structural rather than aspirational, and each is
re-checked at test time by `pricing-invariants` (`schemaCheck` in `pricing.json`).

| Forbidden unit | Gate | Why it is not merely a policy |
|---|---|---|
| `per-pass-rate-uplift` | G15 | `certPrepSession` defines no `passRate`, `predictedScore`, `relativeRanking`, `estimatedPassProbability` or `cohortPercentile`. There is no such quantity in the record to invoice against. |
| `per-official-question` | G16 | `questionSource` is a closed enum of exactly `synthetic-baien-generated` and `user-imported-personal-only`. An official item bank is not a value this schema can hold. |
| `per-credential-issued` | G7 + N13 | `domainMasteryAttestation.credentialClaimedAttested` is `const false`. The record cannot assert a credential, so issuance is not a billable event. |
| `per-timed-sitting` | G10 | `timerModeOptedIn` is optional and defaults false; every `demonstrationType` is self-paced. Selling timed sittings would make the timed path the product that the untimed default exists to avoid. |
| `per-badge-or-streak` | G3 | `tests/g3-no-addiction-ux-tokens.test.ts` scans `public/` for streaks, XP, ranks and FOMO copy. A price per badge pays the operator to build exactly those. |
| `per-vendor-referral` | G17 | No external credential body partnership. There is no ISACA / (ISC)² / CompTIA relationship to take a cut of. |
| `per-minor-seat` | G6 | A minor is carried as a 30-day rotating pseudonym (`learnerDidOrPseudonym`). There is no stable person to count, and a seat price would require building the identity surface the design deliberately lacks. |

**The billing unit must not re-create the incentive a constitutional gate exists
to remove.** That rule is enforced in `tests/pricing-invariants.test.ts`, not
just asserted here — and so are the *reasons*: a `why` that quietly became false
(someone adds `passRate` to the lexicon) fails the suite rather than continuing
to read as a reason.

## What is left, and on what unit

Chargeable to the **operator**, never the adherent:

| Unit | What it describes | Available |
|---|---|---|
| managed tenancy (flat monthly) | the operator does not run the Worker itself | after the gates below |
| `study-session` | one completed `certPrepSession` record | only once a meter exists |
| `domain-mastery-attestation` | one demonstration record produced | only once a meter exists |

Both usage units describe **load**, and both are auditable by the operator
against their own PDS records — a number a customer cannot check from their own
side is a number that gets disputed at renewal.

Neither is metered today. `pricing.json` therefore declares
`meteredDimensions: []` and prices no usage at all. A month that was not measured
cannot be measured afterwards; a price can always be chosen later.

## Why the adherent tier is ¥0 and will stay ¥0

manabi hands over knowledge. A wall in front of the concept readers — a price, a
trial limit, or an account requirement — is a price on access to the material the
charter exists to give away. The app is also explicitly *not* a credential
(G7 + N13), so there is no gated artifact behind the wall that would justify one.

The same reasoning removes the unit that would otherwise be obvious. A per-learner
seat is not merely disliked, it is **unbuildable for half the audience**: under G6
a minor has no stable identifier, only a rotating pseudonym. Charging per seat
would mean building durable per-minor identity — the exact surface ADR-2605181200
removed.

## Why managed tenancy is priced on upkeep, not compute

Running this is nearly free: static assets behind a thin dispatcher, no LLM at
W0/W1, no database. If the price tracked compute it would be a rounding error.

What actually costs something is the part that is not machinery — keeping the
Council ratification current, and keeping documented provenance that the
synthetic question generator reproduces no vendor item. `operator-managed` at
¥30,000/month is a starting point for that argument, and it is `status:
"proposed"`, meaning nobody may be billed from it.

## Gates that must all be met before anyone is charged

Mirrored as machine-checkable entries in `pricing.json` → `billingGates`. Every
one is `met: false` today.

1. `r1-phase-gate` — `MANABI_CERT_PREP_R1_PHASE_GATE` is no longer `locked`
2. `council-ratification` — Council Lv6+ ≥3 ratify of ADR-2605264400, which
   `src/app.ts` names in the 503 body as the condition for R1
3. `metering-exists` — the Worker actually counts `study-session`; today it
   emits no usage event of any kind
4. `synthetic-question-provenance` — documented provenance that
   `synthetic-baien-generated` items reproduce no vendor item. **G16 closes the
   enum; it does not by itself prove what the generator emitted.** The enum
   constrains what may be *recorded*, and that is a different claim from what was
   *shown to the learner*.
5. `operator-terms` — terms of service and 特定商取引法 disclosure for the
   operating entity
6. `payment-rail` — a payment rail exists at all

## Funnel

1. **Fork / self-host** — Apache-2.0 + etzhayyim Charter Compliance Rider v2.0.
   An operator runs it for one congregation or one study circle. Free, and stays
   free.
2. **Council ratification** — nothing that answers can be deployed until the R1
   gate opens. This is the real cost of entry and it is not payable in money.
3. **Managed tenancy** — for operators who want the ratification honoured and the
   Worker run for them.
4. **R2** — personal-material import (`com.etzhayyim.manabi.personalMaterialImport`)
   is R2-gated in `src/app.ts` and is not in scope for any price today. The price
   book may not include it; `pricing-invariants` reads `R2_GATED_NSIDS` from the
   Worker source and fails any plan that tries.

## What is not measured here, stated as unmeasured

- **No competitor price is benchmarked.** The nearest products price a pass-rate
  claim or an item bank. Both are units this product structurally does not have,
  so a benchmark against them would be a benchmark against a different good.
- **No willingness-to-pay figure exists.** None has been collected, and inventing
  one would put a number in a document whose whole argument is that unmeasured
  numbers do not get invoiced.
- **The credential bodies' own exam agreements were not read.** Their landing
  pages were fetched and returned 200 (see Sources); the candidate agreements and
  NDAs that would say what a third-party prep tool may reproduce were not
  reachable at fetch time. **G16 is therefore stated as this repository's own
  constitutional choice, not as a claim about what ISACA or (ISC)² permit.** The
  `synthetic-question-provenance` gate exists precisely because this document is
  not the thing that settles that question.

## Sources

Fetched 2026-09-06. Status codes are what the fetch actually returned.

| Source | Used for | URL | Status |
|---|---|---|---|
| ISACA — CISA credential | that CISA is an ISACA credential, i.e. the body G17 forbids partnering with | <https://www.isaca.org/credentialing/cisa> | 200 |
| ISC2 — CISSP certification | that CISSP is an (ISC)² credential, same | <https://www.isc2.org/certifications/cissp> | 200 |
| e-Gov 法令検索 — 特定商取引に関する法律（昭和五十一年法律第五十七号） | the `operator-terms` gate | <https://laws.e-gov.go.jp/law/351AC0000000057> | 200 (law id confirmed via e-Gov API: `351AC0000000057`, 昭和五十一年法律第五十七号, promulgated 1976-06-04 — the first id I tried, `348AC0000000057`, also returned 200 in the viewer but is a different law) |

Everything else in this document is derived from files in this repository —
`src/app.ts`, `wrangler.jsonc`, `contracts/lexicons/*.json`, and the `tests/`
gates — and is re-checked by `tests/pricing-invariants.test.ts` on every run.
