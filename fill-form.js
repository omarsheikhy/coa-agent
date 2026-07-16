// fill-form.js
// Drives the real council form end-to-end. Selectors below are the exact
// ones captured via `npx playwright codegen`, run manually once against the
// live form — not guessed. See prompt-log.md for how this was derived.

const { chromium } = require('playwright');

const FORM_URL = 'https://coa-microsite.vercel.app/';
const CANDIDATE_TOKEN = 'CAND-2026-292A';

async function run(mover, documentPath) {
  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const page = await browser.newPage();

  console.log('Step 1/7: Navigating and starting the form…');
  await page.goto(FORM_URL);
  await page.getByRole('button', { name: 'Start now' }).click();

  console.log('Step 1/7: Type of move…');
  await page.getByText('I am moving into the borough').click();
  await page.getByRole('button', { name: 'Continue' }).click();

  console.log('Step 2/7: Your details…');
  await page.getByRole('textbox', { name: 'Full name' }).fill(mover.fullName);
  await page.getByRole('textbox', { name: 'Contact email' }).fill(mover.email);
  if (mover.phone) {
    await page.getByRole('textbox', { name: 'Contact phone (optional)' }).fill(mover.phone);
  }
  // Phone is explicitly marked optional on this form — left blank when the
  // source documents don't contain one, rather than fabricating a number.
  await page.getByRole('button', { name: 'Continue' }).click();

  console.log('Step 3/7: Addresses…');
  await page.getByRole('textbox', { name: 'Previous address' }).fill(mover.previousAddress);
  await page.getByRole('textbox', { name: 'New address' }).fill(mover.newAddress);
  await page.getByRole('textbox', { name: 'Date you moved (or are moving)' }).fill(mover.moveDate);
  await page.getByRole('button', { name: 'Continue' }).click();

  console.log('Step 4/7: Occupancy details…');
  await page.getByText('Tenant', { exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Number of occupants' }).fill(String(mover.numberOfOccupants));
  if (mover.additionalOccupants && mover.additionalOccupants.length) {
    await page.getByRole('textbox', { name: 'Names of other adult' }).fill(mover.additionalOccupants.join(', '));
  }
  await page.getByText('Yes').click(); // main residence
  await page.getByRole('button', { name: 'Continue' }).click();

  console.log('Step 5/7: Uploading document:', documentPath);
  await page.getByRole('button', { name: 'Upload a file' }).setInputFiles(documentPath);
  await page.getByRole('button', { name: 'Continue' }).click();

  console.log('Step 6/7: Selecting council…');
  await page.getByLabel('Select the council').selectOption('Northgate Borough Council');
  await page.getByRole('button', { name: 'Continue' }).click();

  console.log('Step 7/7: Candidate token + submit…');
  await page.getByRole('textbox', { name: 'Candidate token' }).fill(CANDIDATE_TOKEN);
  await page.getByRole('button', { name: 'Accept and submit' }).click();

  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'tmp/confirmation.png', fullPage: true });

  const bodyText = await page.locator('body').innerText();
  const refMatch = bodyText.match(/COA-[A-Z0-9-]+/);
  if (refMatch) {
    console.log('Submitted. Reference number:', refMatch[0]);
  } else {
    console.log('Submitted — check tmp/confirmation.png to confirm reference number.');
  }

  await browser.close();
}

module.exports = { run };
