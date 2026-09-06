# Operator quickstart — manabi cert-prep

Every command below was run in this repo on 2026-08-31 and its result is recorded
next to it. Where a step has a trap, the trap is written down rather than left for
you to hit.

Prerequisites: Node with `npm`. The repo pins nothing else — see step 4 for the
one tool that is *not* pinned and needs to be on your PATH.

## 1. Clone and install

```bash
git clone git@github.com:cloud-itonami/app-manabi-cert-prep
cd app-manabi-cert-prep
npm install
```

Installs 4 dev dependencies (typescript, vitest, `@cloudflare/workers-types`,
`@types/node`). No runtime dependencies — this phase is static assets plus a thin
Worker dispatcher.

npm will warn that `fsevents` has an unapproved install script. That is vitest's
macOS file watcher; `npm test` runs once and exits, so you can leave it unapproved.

## 2. Typecheck

```bash
npm run typecheck     # tsc --noEmit
```

Exits 0 with no output.

## 3. Run the constitutional gates

```bash
npm test              # vitest run
```

**Expect `Test Files 6 passed (6) / Tests 28 passed (28)`.**

These are not unit tests of behaviour. They are the structural gates from
ADR-2605264400, and they assert *absences* — that the schema has no pass-rate
field, that the question-source enum cannot name an official vendor, that the
mastery record cannot claim a credential. An absence assertion passes against an
input that is missing or empty just as readily as against an input that is
correct, so two guards sit in front of them:

- `tests/_lexicons.ts` throws if a lexicon contract is missing, and throws again
  if it parses but carries no properties. Either way you get a named refusal, not
  a green run.
- `tests/g18-lexicon-provenance.test.ts` recomputes the sha256 of each vendored
  contract against `contracts/lexicons/provenance.json`.

If you change a vendored contract, g18 goes red **on purpose**. Change it upstream
in `etzhayyim/actor-manabi` first, then re-vendor and update the digests.

To satisfy yourself the gates discriminate rather than merely agreeing with you,
break one and watch the named assertion fail:

```bash
# admit an official vendor into the closed enum
python3 - <<'PY'
p = "contracts/lexicons/certPrepSession.json"
s = open(p).read()
old = '["synthetic-baien-generated", "user-imported-personal-only"]'
assert s.count(old) == 1
open(p, "w").write(s.replace(old, old[:-1] + ', "official-isaca-reproduced"]'))
PY
npm test          # -> G16 "questionSource enum is closed to exactly 2 allowed values" fails
git checkout contracts/lexicons/certPrepSession.json
```

The sixth file, `tests/pricing-invariants.test.ts`, is the same kind of gate
pointed at `pricing.json`. It discriminates too, and on a file you can edit
without touching a digest:

```bash
# claim a price for something nobody counts
python3 - <<'PY'
import json
d = json.load(open("pricing.json"))
d["plans"][2]["pricedDimensions"] = ["study-session"]
json.dump(d, open("pricing.json", "w"), indent=2)
PY
npm test          # -> "every priced dimension is one the Worker actually meters" fails
git checkout pricing.json
```

Each entry in `forbiddenDimensions` also carries a `schemaCheck`, and the reason
it states is re-run against the vendored contract. Give one a name that does not
exist and the suite fails rather than skipping it — an unchecked reason must not
be able to look like a checked one.

## 4. Serve it locally

```bash
npx wrangler dev --port 8799 --ip 127.0.0.1
```

**Trap: `wrangler` is not a devDependency of this repo.** `package.json` declares
`"dev": "wrangler dev"`, so on a machine that already has wrangler installed
globally the script works and nothing looks wrong; on a clean checkout it is
`wrangler: command not found`. `npx wrangler` above fetches it on demand. If you
would rather pin it, add it to `devDependencies` — that is a real gap, not a
preference.

Verify:

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8799/           # 200
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8799/study/cisa # 200
```

The root serves the Japanese calm-UI entry page (`<title>manabi · cert prep</title>`,
`robots: noindex`). Static assets come from `public/` via the `ASSETS` binding;
`src/app.ts` is a thin dispatcher.

Wrangler will warn that the requested `compatibility_date` (2026-05-26) is newer
than the installed runtime supports and fall back. It serves correctly anyway.

## 5. What this app will not do

Before changing anything, read the non-goals in `README.md`. They are enforced by
the tests in step 3, not merely stated: no credentials, no pass-rate prediction,
no official past-question reproduction, no gamification, no default timer. A
change that needs one of those to land needs the ADR amended first.

## Where things live

| | |
|---|---|
| Worker entry | `src/app.ts` |
| Static UI | `public/` (`index.html`, `domains.html`, `history.html`, `study/*.html`) |
| Constitutional gates | `tests/g3-*`, `tests/g15-*`, `tests/g16-*`, `tests/g18-*`, `tests/w1-*` |
| Commercial gate | `tests/pricing-invariants.test.ts` against `pricing.json` |
| Price book / business model | `pricing.json`, `docs/business-model.md` |
| Vendored contracts | `contracts/lexicons/` (+ `provenance.json`) |
| Charter ADRs | `etzhayyim/actor-manabi` → `docs/adr/2605264400-manabi-cert-prep-subcell-r0.edn` (sub-charter) and `docs/adr/2605261045-manabi-education-tier-b-actor-r0.edn` (master) — another repo, and `.edn`, not `.md` |

## Deploying

Deployment is Cloudflare Workers against `manabi-cert-prep.etzhayyim.com` and
`mncprp01.etzhayyim.com` (see `wrangler.jsonc`). This quickstart does not cover it
because it was not exercised here — running `wrangler deploy` from a checkout
behind `main` silently reverts whatever landed in between, so sync first. That is
a workspace-wide rule, not a rule of this app.
