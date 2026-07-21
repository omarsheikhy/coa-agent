# Change-of-Occupancy Agent

Built for the Just Move In Sr AI PM (B2B) take-home, Part A.
Candidate token: CAND-2026-292A

## What it does

A system that handles council change-of-occupancy form submissions automatically, for any number of tenants, across any number of councils, without breaking when forms change.

Four files, four stages:

1. **`discover.js`** — learns the form. Navigates the real council form page by page using dummy data and a throwaway blank PDF. Snapshots every page as ARIA text, sends all snapshots to an AI, and the AI writes a complete Playwright ruleset to `tmp/form-plan.json`. Run once per council to set up, then on a schedule to keep it current. If the form changes, the next run rewrites the rules automatically.

2. **`extract.js`** — pulls the tenant's data. Downloads the tenant's documents, reads them, and picks the right one to attach. At scale, replaced by a read from a central tenant store.

3. **`compare.js`** — cross-references tenant data against form requirements. An AI reads the tenant's dataset and `form-plan.json` together and checks they match before the browser opens. Flags mismatches (wrong document type, missing fields, address inconsistencies) before a submission is attempted.

4. **`validate.js`** — fast automated format checks. Confirms all required fields are present and correctly formatted. No AI needed for this step.

5. **`agent-v2.js`** — executes the submission. Loads `form-plan.json`, substitutes real tenant data, drives Playwright through every page and submits.

**`agent-v2-run.js`** orchestrates all stages: extract → compare → validate → submit.

## Setup

```bash
npm install
npx playwright install chromium
```

## Run

**Step 1 — learn the form (run once per council, then on a schedule):**
```bash
node discover.js
```

**Step 2 — submit for a tenant (dry-run by default):**
```bash
node agent-v2-run.js
```

**Step 2 — live submission:**
```bash
DRY_RUN=false node agent-v2-run.js
```

## What's stubbed

The two AI calls — inside `discover.js` (reading form snapshots and writing the ruleset) and `compare.js` (cross-referencing tenant data against form requirements) — are currently stubbed. The full pipeline runs end-to-end without an API key. The stubs return the identical output shape a real call would return. Swapping each for a live `claude-sonnet-4-6` call is a single line change per file.

## Design decisions

- **discover.js uses dummy data** because council forms are multi-page — you can't see page 4 without completing pages 1 to 3 first. Dummy data opens each page so the AI can snapshot the full form.
- **AI sits in two places only**: learning what a form needs, and checking tenant data satisfies it. Both require judgment. Everything in between — form filling, format checks, browser navigation — is deterministic code. Cheap, fast, auditable.
- **Discovery frequency is a dial**: run it rarely for stable forms, daily for forms that change often. Same code, different schedule.
- **Validation halts loudly**: if tenant data doesn't pass the AI cross-reference or format checks, the submission stops immediately with a clear error. Nothing gets submitted with bad data.
