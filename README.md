# manabi-cert-prep

manabi cert_prep adherent-facing knowledge-domain study PWA for **CISA / CISSP CBK** material.

**Status**: R0 scaffold; W0+W1 static UI only. **No LLM** at this phase.

**ADR**: [ADR-2605264400](../../90-docs/adr/2605264400-manabi-cert-prep-subcell-r0.md) (sub-charter under [ADR-2605261045](../../90-docs/adr/2605261045-manabi-education-tier-b-actor-r0.md) manabi master).

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

```bash
cd 60-apps/manabi-cert-prep
npm install
npm run typecheck   # tsc --noEmit
npm run test        # vitest (anti-addiction structural tests)
npm run dev         # wrangler dev — opens calm UI in browser
```

## Constitutional gates

Inherited from manabi master (ADR-2605261045 G1..G14). Additionally:

- **G15** no pass-rate KPI (`silenEducationReview` cert_prep section rejects pass-rate fields)
- **G16** no official past-question reproduction (closed enum in `certPrepSession.questionSource`)
- **G17** no external credential body partnership

## Lexicons

Under `com.etzhayyim.manabi.*`:

- `certPrepSession` — per-session record; closed enum on `questionSource`
- `personalMaterialImport` — Tier-C user-imported material; `internalOnly: true` const
- `domainMasteryAttestation` — subject-specific demonstration record; `credentialClaimedAttested: false` const

## License

Apache-2.0 with [etzhayyim Charter Compliance Rider v2.0](../../CHARTER-RIDER.md) per ADR-2605192200.
