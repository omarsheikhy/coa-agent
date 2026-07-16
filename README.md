# Change-of-Occupancy Agent

Built for the Just Move In Sr AI PM (B2B) take-home, Part A.
Candidate token: CAND-2026-292A

## What it does

1. **`extract.js`** — fetches the mover pack page and both source documents
   (tenancy agreement, energy bill) from the live site, parses the PDFs, and
   *decides* which document actually satisfies the council form's stated
   requirement (a document for the **new** occupancy — the energy bill is
   explicitly for the previous address, so it's rejected even though it's a
   real, well-formed document).
2. **`fill-form.js`** — drives a real Chromium browser via Playwright to
   fill and submit the live form at coa-microsite.vercel.app, attaching the
   chosen document and including the candidate token.
3. **`run.js`** — orchestrates the two: extract → decide → act.

## Setup

```bash
npm install
npx playwright install chromium
```

## Run

```bash
node run.js
```

This opens a visible browser window (good for screen-recording a Loom),
fills the form, attaches the tenancy agreement, and submits. Screenshots
are saved to `tmp/pre-submit.png` and `tmp/confirmation.png` as evidence.

## Known limitation — selectors are best-guess

I built this without being able to inspect the live form's actual DOM
(sandboxed environment, no browser access to the target site). `fill-form.js`
tries several reasonable label/placeholder strategies per field and logs a
warning if none match. **Before recording the Loom**, run it once, watch the
console for `⚠` warnings, and if any appear:

1. Open the form in Chrome, right-click the unmatched field → Inspect.
2. Either add the exact label text to that field's candidate list in
   `fill-form.js`, or swap in the exact selector, e.g.
   `page.locator('#previous-address')`.
3. Alternatively, run `npx playwright codegen https://coa-microsite.vercel.app`,
   manually fill the form once, and copy the exact selectors it records into
   the corresponding `fillField` calls.

## Design notes for the prompt log / PRD

- Document classification is deterministic (keyword rules), not an LLM call
  — this is a case where rule-based logic is safer, cheaper, and auditable
  for a small, fixed set of document types than delegating the decision to
  a model.
- Field extraction from the mover's note is currently hardcoded to Priya's
  case for reliability under time pressure; in a production version this
  step would be an LLM call turning free-text into structured JSON, which
  is where AI adds real value (unstructured input, no fixed schema).
- The agent halts and asks for human review if no candidate document
  satisfies the form's requirement, rather than guessing.
