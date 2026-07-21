// discover.js
// Keeps the Playwright rules up to date automatically.
//
// Problem with hardcoded Playwright recordings: if a council changes their
// form (renamed field, new step, different button label), the recording breaks
// silently and submissions fail. Someone has to notice, re-record manually,
// and redeploy.
//
// This file replaces that manual process:
//   1. Navigates the real form with dummy data, page by page
//   2. Snapshots every page as ARIA text (what a screen reader sees)
//   3. AI reads ALL page snapshots and writes the Playwright rules to form-plan.json
//
// Why dummy data and not just fetching the URL:
//   Council forms are multi-page — you can't see page 3 without going through
//   pages 1 and 2 first. Dummy data is the key that opens each page so the AI
//   can see the full form. It fills in just enough to pass each page's
//   validation and advance, snapshots the result, then moves to the next page.
//   The dummy submission is always stopped before the final submit.
//
// form-plan.json IS the Playwright ruleset. It is generated, not hand-written.
// How often to run is a dial you control:
//   - Form rarely changes → run weekly or monthly. Cheap, predictable.
//   - Form changes frequently → run daily or before each submission batch.
//     More AI calls, but you're never submitting against a stale ruleset.
// The code doesn't change — just adjust the cron schedule.
//
// The submission agent (agent-v2.js) simply loads form-plan.json and executes
// it with real tenant data. It never touches form structure logic itself.
//
// The AI call that reads snapshots and writes the rules is STUBBED below.
// Swap `buildPlanFromSnapshots` for a real API call to go live.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const FORM_URL = 'https://coa-microsite.vercel.app/';
const TMP_DIR = path.join(__dirname, 'tmp');
const SNAPSHOTS_DIR = path.join(TMP_DIR, 'snapshots');
const PLAN_PATH = path.join(TMP_DIR, 'form-plan.json');

// Dummy data — just enough to advance through each page without triggering
// validation errors. Never submitted for real (discovery stops before submit).
const DUMMY = {
  fullName: 'Test User',
  email: 'test@example.com',
  phone: null,
  previousAddress: '1 Test Street, Manchester, M1 1AA',
  newAddress: '2 Test Road, Northgate, NG1 1BB',
  moveDate: '2026-01-01',
  numberOfOccupants: 1,
  additionalOccupants: [],
  council: 'Northgate Borough Council',
  candidateToken: 'DUMMY-TOKEN',
};

// ---------------------------------------------------------------------------
// Plan builder — swap this for a real API call to go live.
//
// Real version would send all page snapshots to a model and ask it to return
// a JSON plan template where values reference mover fields by key rather than
// being hardcoded. The model reads the actual field labels from the snapshots,
// so a changed form produces an updated plan automatically.
//
// Real call would look like:
//
//   const response = await client.messages.create({
//     model: 'claude-sonnet-4-6',
//     max_tokens: 4096,
//     messages: [{
//       role: 'user',
//       content: `Here are ARIA snapshots of each page of a council form:
//   ${Object.entries(snapshots).map(([p, s]) => `Page ${p}:\n${s}`).join('\n\n')}
//
//   Return a JSON array of actions to fill this form end-to-end.
//   Use "moverField" instead of "value" wherever the value comes from mover
//   data, referencing these keys: fullName, email, phone, previousAddress,
//   newAddress, moveDate, numberOfOccupants, additionalOccupants, council,
//   candidateToken.
//   Use "value" only for static choices (e.g. radio button labels).`
//     }]
//   });
// ---------------------------------------------------------------------------

async function buildPlanFromSnapshots(snapshots) {
  console.log(`\n[discover] Building plan from ${Object.keys(snapshots).length} page snapshots… (stub)`);
  Object.entries(snapshots).forEach(([page, snap]) =>
    console.log(`  Page ${page}: ${snap.length} chars`)
  );

  // Plan template — values that come from mover data use "moverField" so the
  // executor can substitute any mover's details at runtime.
  const plan = [
    { action: 'click', role: 'button', name: 'Start now' },
    { action: 'click', name: 'I am moving into the borough' },
    { action: 'click', role: 'button', name: 'Continue' },
    { action: 'fill', role: 'textbox', name: 'Full name',             moverField: 'fullName' },
    { action: 'fill', role: 'textbox', name: 'Contact email',         moverField: 'email' },
    { action: 'click', role: 'button', name: 'Continue' },
    { action: 'fill', role: 'textbox', name: 'Previous address',      moverField: 'previousAddress' },
    { action: 'fill', role: 'textbox', name: 'New address',           moverField: 'newAddress' },
    { action: 'fill', role: 'textbox', name: 'Date you moved (or are moving)', moverField: 'moveDate' },
    { action: 'click', role: 'button', name: 'Continue' },
    { action: 'click', name: 'Tenant', exact: true },
    { action: 'fill', role: 'spinbutton', name: 'Number of occupants', moverField: 'numberOfOccupants' },
    { action: 'fill', role: 'textbox', name: 'Names of other adult',  moverField: 'additionalOccupants' },
    { action: 'click', name: 'Yes' },
    { action: 'click', role: 'button', name: 'Continue' },
    { action: 'upload_file' },
    { action: 'click', role: 'button', name: 'Continue' },
    { action: 'select_option', name: 'Select the council',            moverField: 'council' },
    { action: 'click', role: 'button', name: 'Continue' },
    { action: 'fill', role: 'textbox', name: 'Candidate token',       moverField: 'candidateToken' },
    { action: 'submit' },
  ];

  return plan;
}

// ---------------------------------------------------------------------------
// Discovery pass — fill with dummy data, snapshot each page
// ---------------------------------------------------------------------------

async function run() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR);
  if (!fs.existsSync(SNAPSHOTS_DIR)) fs.mkdirSync(SNAPSHOTS_DIR);

  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const page = await browser.newPage();
  await page.goto(FORM_URL);

  const snapshots = {};
  let pageNum = 1;

  async function snap(label) {
    const text = await page.ariaSnapshot();
    snapshots[label] = text;
    fs.writeFileSync(path.join(SNAPSHOTS_DIR, `page-${pageNum}-${label}.txt`), text);
    console.log(`[discover] Snapshot: ${label} (${text.length} chars)`);
    pageNum++;
  }

  console.log('[discover] Starting discovery pass with dummy data…\n');

  await snap('landing');

  await page.getByRole('button', { name: 'Start now' }).click();
  await snap('type-of-move');

  await page.getByText('I am moving into the borough').click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await snap('your-details');

  await page.getByRole('textbox', { name: 'Full name' }).fill(DUMMY.fullName);
  await page.getByRole('textbox', { name: 'Contact email' }).fill(DUMMY.email);
  await page.getByRole('button', { name: 'Continue' }).click();
  await snap('addresses');

  await page.getByRole('textbox', { name: 'Previous address' }).fill(DUMMY.previousAddress);
  await page.getByRole('textbox', { name: 'New address' }).fill(DUMMY.newAddress);
  await page.getByRole('textbox', { name: 'Date you moved (or are moving)' }).fill(DUMMY.moveDate);
  await page.getByRole('button', { name: 'Continue' }).click();
  await snap('occupancy');

  await page.getByText('Tenant', { exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Number of occupants' }).fill(String(DUMMY.numberOfOccupants));
  await page.getByText('Yes').click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await snap('document-upload');

  // Upload a throwaway PDF to pass the form's upload validation and unlock
  // the next page. This has nothing to do with any real tenant's documents —
  // it's a minimal blank PDF generated purely for the discovery pass.
  const dummyDocPath = path.join(TMP_DIR, 'discover-dummy.pdf');
  if (!fs.existsSync(dummyDocPath)) {
    // Minimal valid PDF — just enough to satisfy a file upload field.
    const minimalPdf = '%PDF-1.0\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 1 1]>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n190\n%%EOF';
    fs.writeFileSync(dummyDocPath, minimalPdf);
  }
  await page.getByRole('button', { name: 'Upload a file' }).setInputFiles(dummyDocPath);
  await page.getByRole('button', { name: 'Continue' }).click();
  await snap('council-selection');

  await page.getByLabel('Select the council').selectOption(DUMMY.council);
  await page.getByRole('button', { name: 'Continue' }).click();
  await snap('candidate-token');

  // Stop here — don't submit with dummy data
  console.log('\n[discover] Reached final page. Stopping before submit (dummy run).');
  await page.screenshot({ path: path.join(TMP_DIR, 'discover-final.png'), fullPage: true });

  await browser.close();

  // Build and save the plan template
  const plan = await buildPlanFromSnapshots(snapshots);
  fs.writeFileSync(PLAN_PATH, JSON.stringify(plan, null, 2));
  console.log(`\n[discover] Plan saved → tmp/form-plan.json (${plan.length} actions)`);
  console.log('[discover] Run agent-v2-run.js to execute with real mover data.');
}

module.exports = { run };

if (require.main === module) {
  run().catch((err) => {
    console.error('[discover] Failed:', err);
    process.exit(1);
  });
}
