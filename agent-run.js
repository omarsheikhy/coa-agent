// agent-run.js — agentic entry point.
// Reuses extract.js's document-picking logic unchanged, then hands control
// to the AI loop instead of the deterministic recorder.
//
// Usage:
//   node agent-run.js            # dry-run (stops before final submit)
//   DRY_RUN=false node agent-run.js   # live submission

const extractor = require('./extract');
const agentLoop = require('./agent-loop');

const dryRun = process.env.DRY_RUN !== 'false';

if (dryRun) {
  console.log('[agent-run] DRY RUN — will flag instead of submitting. Set DRY_RUN=false to submit for real.\n');
}

(async () => {
  const { mover, chosenDocument, rejectedDocuments } = await extractor.run();

  console.log('\nDocument decision:');
  console.log(' Chosen:', chosenDocument.label);
  rejectedDocuments.forEach((d) => console.log(' Rejected:', d.label, '—', d.reason));

  console.log('\nHanding off to agentic loop…\n');
  await agentLoop.run(mover, chosenDocument.path, { dryRun });
})().catch((err) => {
  console.error('Agentic run failed:', err);
  process.exit(1);
});
