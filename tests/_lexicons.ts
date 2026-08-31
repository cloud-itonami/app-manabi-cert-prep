// Resolve the lexicon contracts this app's constitutional gates assert against.
//
// These used to be read from a sibling repo via `join(PWA_ROOT, "..", "..",
// "orgs/etzhayyim/com-etzhayyim-manabi/wire/lexicons")`. That path was wrong in
// two independent ways -- the real directory is `wire/contracts/lexicons`, and
// after this app was split out of the monorepo `../..` no longer lands on the
// superproject root -- so G15's two schema assertions and all of G16 have never
// executed. They threw ENOENT, which reads as "this gate is failing" and not as
// "this gate has never asked its question".
//
// The contracts are now vendored under contracts/lexicons/ so the gates run
// against this repo's own tree. See contracts/lexicons/provenance.json.

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export const PWA_ROOT = join(import.meta.dirname ?? __dirname, "..");
export const LEXICON_DIR = join(PWA_ROOT, "contracts", "lexicons");

/**
 * Read a vendored lexicon.
 *
 * Refuses rather than returning something empty-but-truthy: an absent input
 * must not be able to produce the same result as a present input that satisfies
 * the invariant. Every caller below asserts on `.defs.main.record.properties`,
 * and `{}` would make several of those assertions pass vacuously.
 */
export function readLexicon(name: string): any {
  const path = join(LEXICON_DIR, `${name}.json`);
  if (!existsSync(path)) {
    throw new Error(
      `lexicon contract not found: ${path}\n` +
        `This gate cannot ask its question without the contract. Re-vendor from ` +
        `etzhayyim/actor-manabi wire/contracts/lexicons (see contracts/lexicons/provenance.json). ` +
        `Do not delete the assertion to make the suite green.`,
    );
  }
  const lex = JSON.parse(readFileSync(path, "utf-8"));
  const props = lex?.defs?.main?.record?.properties;
  if (!props || typeof props !== "object" || Object.keys(props).length === 0) {
    throw new Error(
      `lexicon ${name} parsed but has no defs.main.record.properties -- ` +
        `negative-space assertions below would pass vacuously against it.`,
    );
  }
  return lex;
}
