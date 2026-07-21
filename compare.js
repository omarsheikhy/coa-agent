// compare.js
// AI-powered cross-reference: takes what the tenant has and what the form
// needs, and checks they match before the browser opens.
//
// This is more useful than generic validation because it's form-aware.
// validate.js catches format errors (wrong date format, missing email).
// compare.js catches logical mismatches (form needs a tenancy agreement but
// tenant only has an energy bill, address on document doesn't match form
// address, occupant count in data contradicts the document).
//
// The AI call is STUBBED below — swap `crossReference` for a real API call
// to go live. The stub returns the same shape a real call would return.
//
// Real version would look like:
//
//   const response = await client.messages.create({
//     model: 'claude-sonnet-4-6',
//     max_tokens: 1024,
//     messages: [{
//       role: 'user',
//       content: `You are checking whether a tenant's data satisfies the
// requirements of a council form before submission.
//
// Form requirements (what the form will ask for):
// ${JSON.stringify(formPlan, null, 2)}
//
// Tenant data (what we have):
// ${JSON.stringify(tenantData, null, 2)}
//
// Cross-reference these two. Return a JSON object with:
// - "pass": true or false
// - "issues": array of specific mismatches or gaps found
// Be specific — don't flag things that aren't genuine problems.`
//     }]
//   });
//   return JSON.parse(response.content[0].text);

const fs = require('fs');
const path = require('path');

const PLAN_PATH = path.join(__dirname, 'tmp', 'form-plan.json');

async function crossReference(formPlan, tenantData) {
  // Stub — in production this is a single Claude API call that reads both
  // the form requirements and the tenant data and flags any mismatches.
  // The stub below simulates what a real call would check.

  const issues = [];
  const { mover, chosenDocument } = tenantData;

  // Check the form needs fields the tenant actually has
  const requiredMoverFields = ['fullName', 'email', 'previousAddress', 'newAddress', 'moveDate', 'numberOfOccupants', 'council'];
  for (const field of requiredMoverFields) {
    if (!mover[field]) {
      issues.push(`Form requires "${field}" but it is missing from tenant data`);
    }
  }

  // Check document type matches what the form accepts
  const formNeedsUpload = formPlan.some((step) => step.action === 'upload_file');
  if (formNeedsUpload && !chosenDocument) {
    issues.push('Form requires a document upload but no qualifying document was found for this tenant');
  }

  // Check council in tenant data matches a council the form actually offers
  const councilStep = formPlan.find((step) => step.action === 'select_option' && step.moverField === 'council');
  if (councilStep && mover.council && mover.council !== 'Northgate Borough Council') {
    issues.push(`Tenant's council "${mover.council}" may not match the options available on this form — verify before submitting`);
  }

  // Check move date is not in the past by more than 6 months (likely data error)
  if (mover.moveDate) {
    const moveDate = new Date(mover.moveDate);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    if (moveDate < sixMonthsAgo) {
      issues.push(`Move date ${mover.moveDate} is more than 6 months in the past — confirm this is correct`);
    }
  }

  return {
    pass: issues.length === 0,
    issues,
  };
}

async function run(tenantData) {
  if (!fs.existsSync(PLAN_PATH)) {
    throw new Error('form-plan.json not found — run discover.js first');
  }

  const formPlan = JSON.parse(fs.readFileSync(PLAN_PATH, 'utf8'));

  console.log('[compare] Cross-referencing tenant data against form requirements… (stub — AI call in production)');

  const result = await crossReference(formPlan, tenantData);

  if (result.pass) {
    console.log('[compare] Tenant data satisfies form requirements — proceeding.');
    return true;
  }

  console.error('\n[compare] Tenant data does not satisfy form requirements:\n');
  result.issues.forEach((issue) => console.error(`  ✗ ${issue}`));
  console.error('');
  return false;
}

module.exports = { run };
