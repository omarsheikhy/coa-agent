// run.js — entry point. This is "the agent": extract -> decide -> act.
const extractor = require('./extract');
const filler = require('./fill-form');

(async () => {
  const { mover, chosenDocument, rejectedDocuments } = await extractor.run();

  console.log('\nDocument decision:');
  console.log(' Chosen:', chosenDocument.label);
  rejectedDocuments.forEach((d) => console.log(' Rejected:', d.label, '—', d.reason));

  await filler.run(mover, chosenDocument.path);
})().catch((err) => {
  console.error('Agent run failed:', err);
  process.exit(1);
});
