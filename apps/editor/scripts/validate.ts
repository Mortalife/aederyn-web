/**
 * Validate editor data (apps/editor/data/*.json) against the entity schemas
 * and cross-entity references.
 *
 * Run with: pnpm --filter editor validate [--ids id1,id2] [--warnings] [--json]
 *
 *   --ids       Only fail on problems in these entities (the ones you created or
 *               edited). Problems elsewhere are summarised but don't fail.
 *   --warnings  Also list warnings (orphans, balance) for the scoped entities.
 *   --json      Machine-readable output.
 *
 * Exits 1 if any in-scope errors remain.
 */

import { runValidation } from "../src/services/validation.js";

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const option = (name: string) => {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 ? args[idx + 1] : undefined;
};

const ids = option("ids")
  ?.split(",")
  .map((id) => id.trim())
  .filter(Boolean);
const inScope = (id: string) => !ids || ids.includes(id);

const result = await runValidation();
const errors = result.errors.filter((e) => inScope(e.source));
const outOfScopeErrors = result.errors.length - errors.length;
const warnings = result.warnings.filter((w) => inScope(w.entity));

if (flag("json")) {
  console.log(
    JSON.stringify(
      {
        ok: errors.length === 0,
        scope: ids ?? "all",
        errors,
        warnings: flag("warnings") ? warnings : undefined,
        outOfScopeErrors,
      },
      null,
      2
    )
  );
} else {
  const scopeLabel = ids ? `entities ${ids.join(", ")}` : "all entities";
  if (errors.length === 0) {
    console.log(`✅ No errors in ${scopeLabel}.`);
  } else {
    console.log(`❌ ${errors.length} error(s) in ${scopeLabel}:\n`);
    for (const e of errors) {
      console.log(`  [${e.type}] ${e.sourceType} ${e.source} @ ${e.location}: ${e.reference}`);
    }
  }

  if (flag("warnings") && warnings.length > 0) {
    console.log(`\n⚠️  ${warnings.length} warning(s):\n`);
    for (const w of warnings) {
      console.log(`  [${w.type}] ${w.entityType} ${w.entity}: ${w.message}`);
    }
  }

  if (outOfScopeErrors > 0) {
    console.log(`\n(${outOfScopeErrors} pre-existing error(s) in other entities not shown; run without --ids to see them.)`);
  }
}

process.exit(errors.length === 0 ? 0 : 1);
