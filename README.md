# manabi-cert-prep

manabi cert_prep adherent-facing knowledge-domain study PWA for **CISA / CISSP CBK** material.

**Status**: R0 scaffold; W0+W1 static UI only. **No LLM** at this phase.

**ADR**: ADR-2605264400 (sub-charter) under ADR-2605261045 (manabi master). Both live in the
`etzhayyim/actor-manabi` repo as `docs/adr/2605264400-manabi-cert-prep-subcell-r0.edn` and
`docs/adr/2605261045-manabi-education-tier-b-actor-r0.edn` -- another repo, and `.edn`, not `.md`.

## What this app is — and is not

**Is**: A calm study substrate for IT audit (CISA) and information security (CISSP) Common Body of Knowledge domains. Helps adherents who want to acquire the knowledge — whatever they choose to do with it afterward.

**Is not**:
- a credential — manabi never issues degrees / transcripts / certifications (G7 + N12)
- a pass-rate predictor — schema-level G15 negative-space enforcement
- an official past-question bank — schema-level G16 closed-enum enforcement (only `synthetic-baien-generated` and `user-imported-personal-only` are valid sources)
- a partner of ISACA / (ISC)² / CompTIA / EC-Council / SANS / Offensive Security (G17 + N12)
- gamified — no streaks / no leaderboards / no badges / no XP / no FOMO triggers (G3 inherited from manabi master)
- timed by default — self-paced demonstration (G10 inherited)

## W0 / W1 scope (this commit)

- Static entry page
- Domain selector (CISA 5 + CISSP 8 CBK domains)
- Concept readers (CBK overview content sourced from NIST SP / ISO 27001/27002 conceptual descriptions / COBIT framework references / GDPR + APPI + CCPA — all already ingested via ADR-2605262800 legal corpus)
- History view (localStorage-only cumulative session log; no chart, no progress bar)
- Anti-addiction CSS primitives (calm palette, no animations)
- Tests verifying anti-addiction tokens are NOT present in HTML

## W2+ (R1) scope (deferred)

- judah LiteLLM gateway client → baien-server-moemoekyun-* (Murakumo fleet only, per ADR-2605215000)
- Synthetic practice-question generation
- Socratic concept-explanation chat (no praise, no pass-rate, no past-question reproduction)
- Encrypted session-history persistence via ADR-2605181100 envelope on MST

## R2 scope (deferred)

- Personal-material import (Tier-C `internal_only` pattern from ADR-2605262400)
- Self-assessment demonstration recording → `domainMasteryAttestation`

## Local development

See **[docs/operator-quickstart.md](docs/operator-quickstart.md)** — every command there
was run against this repo and its result recorded, including the two traps (`wrangler` is
not a devDependency, and the constitutional gates assert absences, so they need the
vendored contracts present to mean anything).

```bash
npm install
npm run typecheck   # tsc --noEmit
npm test            # vitest -- 6 files / 28 tests, all green
npx wrangler dev    # local server; `npm run dev` needs a global wrangler
```

## Constitutional gates

Inherited from manabi master (ADR-2605261045 G1..G14). Additionally:

- **G15** no pass-rate KPI (`silenEducationReview` cert_prep section rejects pass-rate fields)
- **G16** no official past-question reproduction (closed enum in `certPrepSession.questionSource`)
- **G17** no external credential body partnership

The **commercial** surface has a gate of the same kind. `pricing.json` is the
price book and `tests/pricing-invariants.test.ts` refuses it if it out-runs the
product — if a plan is published while a billing gate is unmet, if it prices a
unit the Worker does not meter, or if it prices a unit one of the gates above
already removed. See **[docs/business-model.md](docs/business-model.md)**: the
two things this market sells, pass-rate uplift and an official item bank, are
both structurally absent from the schema, and the price book's stated reasons
for refusing them are re-checked against the vendored lexicons rather than
merely written down.

## Lexicons

Vendored under `contracts/lexicons/` (provenance and digests in
`contracts/lexicons/provenance.json`; upstream is `etzhayyim/actor-manabi`
`wire/contracts/lexicons`). They are vendored rather than referenced across repos so the
G15/G16 gates can run against this repo's own tree.

Under `com.etzhayyim.manabi.*`:

- `certPrepSession` — per-session record; closed enum on `questionSource`
- `personalMaterialImport` — Tier-C user-imported material; `internalOnly: true` const
- `domainMasteryAttestation` — subject-specific demonstration record; `credentialClaimedAttested: false` const

## License

Apache-2.0 with the etzhayyim Charter Compliance Rider v2.0 per ADR-2605192200.
