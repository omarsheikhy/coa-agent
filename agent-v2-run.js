// agent-v2-run.js — entry point for the plan-based agentic version.
//
// Prerequisite: run `node discover.js` first (or on a schedule) to generate
// tmp/form-plan.json — the Playwright rules for this form. discover.js keeps
// those rules current automatically; this file just uses them.
//
// Flow:
//   1. Pull mover data (extract.js — at scale, replaced by a read from your
//      central tenant store: CRM, property management system, or internal API)
//   2. Validate all required data is present and correct — halt loudly if not
//   3. Load the Playwright rules from tmp/form-plan.json and execute
//
// Usage:
//   node agent-v2-run.js              # dry-run (stops before final submit)
//   DRY_RUN=false node agent-v2-run.js    # live submission

const extractor = require('./extract');
const comparer = require('./compare');
const validator = require('./validate');
const agentV2 = require('./agent-v2');

const dryRun = process.env.DRY_RUN !== 'false';

if (dryRun) {
  console.log('[agent-v2-run] DRY RUN — set DRY_RUN=false to submit for real.');
}

(async () => {
  // Step 1 — pull mover data
  // At scale: swap extractor.run() for a fetch from your central tenant store.
  console.log('\nPulling mover data…');
  const { mover, chosenDocument, rejectedDocuments } = await extractor.run();

  console.log('\nDocument decision:');
  console.log(' Chosen:', chosenDocument.label);
  rejectedDocuments.forEach((d) => console.log(' Rejected:', d.label, '—', d.reason));

  // Step 2 — AI cross-reference: does this tenant's data satisfy what this
  // specific form needs? Catches logical mismatches (wrong document type,
  // address mismatch, missing fields the form will ask for) before the
  // browser opens. In production this is a single Claude API call.
  const matches = await comparer.run({ mover, chosenDocument });
  if (!matches) process.exit(1);

  // Step 3 — hard format validation: are all fields present and correctly
  // formatted? Cheap deterministic checks that don't need a model.
  const valid = validator.run(mover, chosenDocument);
  if (!valid) process.exit(1);

  // Step 3 — execute
  console.log('\nHanding off to agent-v2…\n');
  await agentV2.run(mover, chosenDocument.path, { dryRun });
})().catch((err) => {
  console.error('agent-v2 run failed:', err);
  process.exit(1);
});
