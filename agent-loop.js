// agent-loop.js
// Agentic form-filler: snapshots the accessible tree each step, asks an AI
// what to do next, executes the action, repeats until done or flagged.
//
// The AI decision step is currently a STUB (see `decideAction` below) so the
// loop can run end-to-end without an API key. To go live, replace the stub
// body with a real client.messages.create() call — everything else stays the
// same. The stub returns the same JSON shape that Claude tool-use returns, so
// the swap is a one-liner.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const FORM_URL = 'https://coa-microsite.vercel.app/';
const CANDIDATE_TOKEN = 'CAND-2026-292A';
const MAX_STEPS = 40;

// ---------------------------------------------------------------------------
// Stub — replace this function body with a real Anthropic (or any other)
// API call to make the loop genuinely agentic.
//
// Real version would look like:
//
//   const Anthropic = require('@anthropic-ai/sdk');
//   const client = new Anthropic();
//
//   async function decideAction(messages, system) {
//     const response = await client.messages.create({
//       model: 'claude-sonnet-4-6',
//       max_tokens: 1024,
//       system,
//       tools: TOOLS,
//       tool_choice: { type: 'any' },
//       messages,
//     });
//     return response.content.find((b) => b.type === 'tool_use')?.input ?? null;
//   }
//
// The stub below returns pre-scripted actions derived from the same Playwright
// recording used by fill-form.js, proving the loop plumbing is correct.
// ---------------------------------------------------------------------------

function makeStub(mover, dryRun) {
  const script = [
    // Step 1 — home page
    { action: 'click', role: 'button', name: 'Start now' },
    // Step 2 — type of move
    { action: 'click', name: 'I am moving into the borough' },
    { action: 'click', role: 'button', name: 'Continue' },
    // Step 3 — your details
    { action: 'fill', role: 'textbox', name: 'Full name', value: mover.fullName },
    { action: 'fill', role: 'textbox', name: 'Contact email', value: mover.email },
    { action: 'click', role: 'button', name: 'Continue' },
    // Step 4 — addresses
    { action: 'fill', role: 'textbox', name: 'Previous address', value: mover.previousAddress },
    { action: 'fill', role: 'textbox', name: 'New address', value: mover.newAddress },
    { action: 'fill', role: 'textbox', name: 'Date you moved (or are moving)', value: mover.moveDate },
    { action: 'click', role: 'button', name: 'Continue' },
    // Step 5 — occupancy details
    { action: 'click', name: 'Tenant', exact: true },
    { action: 'fill', role: 'spinbutton', name: 'Number of occupants', value: String(mover.numberOfOccupants) },
    { action: 'fill', role: 'textbox', name: 'Names of other adult', value: mover.additionalOccupants.join(', ') },
    { action: 'click', name: 'Yes' },
    { action: 'click', role: 'button', name: 'Continue' },
    // Step 6 — document upload
    { action: 'upload_file' },
    { action: 'click', role: 'button', name: 'Continue' },
    // Step 7 — council selection
    { action: 'select_option', name: 'Select the council', value: mover.council },
    { action: 'click', role: 'button', name: 'Continue' },
    // Step 8 — candidate token + submit
    { action: 'fill', role: 'textbox', name: 'Candidate token', value: CANDIDATE_TOKEN },
    dryRun
      ? { action: 'flag', reason: 'dry-run guard — would click "Accept and submit" here. Set DRY_RUN=false to submit for real.' }
      : { action: 'click', role: 'button', name: 'Accept and submit' },
    { action: 'done', reason: 'Confirmation page reached.' },
  ];

  let cursor = 0;
  // signature matches what a real API call would return
  return async function decideAction(_messages, _system) {
    if (cursor >= script.length) return { action: 'flag', reason: 'Stub ran out of scripted actions.' };
    return script[cursor++];
  };
}

// ---------------------------------------------------------------------------
// Action executor
// ---------------------------------------------------------------------------

async function execute(page, input, documentPath) {
  const { action, role, name, value, exact } = input;
  const nameOpt = { name, exact: exact ?? false };

  switch (action) {
    case 'click':
      if (role) {
        await page.getByRole(role, nameOpt).click();
      } else {
        await page.getByText(name, { exact: exact ?? false }).click();
      }
      break;

    case 'fill':
      await page.getByRole(role || 'textbox', nameOpt).fill(value);
      break;

    case 'select_option':
      await page.getByLabel(name).selectOption(value);
      break;

    case 'upload_file':
      // Always use the pre-vetted document path from extract.js.
      await page.getByRole('button', { name: 'Upload a file' }).setInputFiles(documentPath);
      break;

    case 'done':
    case 'flag':
      return;
  }

  await page.waitForTimeout(400);
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

async function run(mover, documentPath, { dryRun = true } = {}) {
  if (dryRun) {
    console.log('[agent-loop] Dry-run mode: will flag before final submit.\n');
  }

  const decideAction = makeStub(mover, dryRun);
  // ↑ swap this line for a real API client when going live

  const browser = await chromium.launch({ headless: false, slowMo: 150 });
  const page = await browser.newPage();
  await page.goto(FORM_URL);

  // message history — passed to decideAction each turn so a real model has
  // full context; the stub ignores it but the shape is identical.
  const messages = [];
  const system = `You are an AI agent filling in a UK council change-of-occupancy form on behalf of a mover. A human has already verified the information below — your job is to transfer it accurately into the form, one action at a time.

## Mover details
Full name:           ${mover.fullName}
Email:               ${mover.email}
Phone:               ${mover.phone ?? 'not provided — leave blank, the field is optional'}
Previous address:    ${mover.previousAddress}
New address:         ${mover.newAddress}
Move date:           ${mover.moveDate}
Occupier type:       ${mover.occupierType}
Number of occupants: ${mover.numberOfOccupants}
Other occupants:     ${mover.additionalOccupants?.join(', ') || 'none'}
Main residence:      ${mover.isMainResidence ? 'Yes' : 'No'}
Council:             ${mover.council}

## Supporting document
Path: ${documentPath}
(Pre-vetted — use upload_file when you reach the upload step.)

## Candidate token
${CANDIDATE_TOKEN}

## How to respond
- Every response must be exactly one browser_action tool call. Never reply in plain text.
- Read the page snapshot carefully before acting — match field labels exactly.
- For radio buttons and checkboxes, use action "click" with the visible label text as "name".
- If you see a validation error on the page, re-fill the offending field before continuing.
- If you reach a page or field you don't recognise, call flag and describe what you see.
- When you see a confirmation page with a reference number, call done.
${dryRun ? '\n## Dry-run mode\nDo NOT click the final submit button. When you reach it, call flag with reason "dry-run guard".' : ''}`;


  for (let step = 1; step <= MAX_STEPS; step++) {
    const snapshotText = await page.ariaSnapshot();

    // Build the user turn (tool_result for the previous action + new snapshot).
    const userContent = [];
    const prevTurn = messages[messages.length - 1];
    if (prevTurn?.role === 'assistant') {
      const prevToolUse = prevTurn.content.find?.((b) => b?.type === 'tool_use');
      if (prevToolUse) {
        userContent.push({ type: 'tool_result', tool_use_id: prevToolUse.id, content: 'Action executed.' });
      }
    }
    userContent.push({ type: 'text', text: `Step ${step} snapshot:\n\`\`\`json\n${snapshotText}\n\`\`\`` });
    messages.push({ role: 'user', content: userContent });

    console.log(`\n[Step ${step}] Deciding next action…`);
    const input = await decideAction(messages, system);

    // Append a synthetic assistant turn so history stays consistent.
    messages.push({
      role: 'assistant',
      content: [{ type: 'tool_use', id: `stub-${step}`, name: 'browser_action', input }],
    });

    const actionDesc = [
      input.action,
      input.role && input.name ? `${input.role}["${input.name}"]` : input.name,
      input.value != null ? `= "${input.value}"` : null,
      input.reason ? `(${input.reason})` : null,
    ]
      .filter(Boolean)
      .join(' ');
    console.log(`[Step ${step}] → ${actionDesc}`);

    if (input.action === 'done') {
      console.log('\n[Agent] Completed:', input.reason);
      break;
    }

    if (input.action === 'flag') {
      console.log('\n[Agent] Flagged for human review:', input.reason);
      break;
    }

    await execute(page, input, documentPath);
  }

  const tmpDir = path.join(__dirname, 'tmp');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);
  await page.screenshot({ path: path.join(tmpDir, 'agent-final.png'), fullPage: true });
  console.log('\nFinal screenshot → tmp/agent-final.png');

  await browser.close();
}

module.exports = { run };
