# AI Prompt Log

Candidate: Omar Sheikh (CAND-2026-292A)
Tools used: Claude Code (CLI), Playwright, GitHub

---

## Overview

I used Claude Code throughout — Anthropic's CLI that runs Claude directly in the terminal with full access to read, write, and run files. My contribution was directing the build, running everything, catching mistakes, and making judgment calls about what to build and why. I didn't write code by hand.

The build happened in two phases. Phase 1 was a working deterministic agent built to deadline. Phase 2 was a more agentic pipeline built in response to feedback that the original was too deterministic to scale.

---

## Phase 1 — Deterministic agent

### Step 1 — Read the brief and plan before building

Shared the full take-home brief with Claude Code and asked for a plan before touching any code. Agreed a sequence: build the working agent first (the only part with a hard pass/fail check), then the written sections reusing what the build surfaced.

**Example prompt:**
> "Here's the take-home brief. Before we build anything, give me a plan for how to approach this. What should we build first and why?"

---

### Step 2 — Read the actual form and mover pack

Had Claude Code fetch the live form and mover pack directly rather than work from the brief's summary. This surfaced the real mover data and — critically — the document trap: the energy bill states in its own text that it relates to the previous address. Asked for that to be checked explicitly.

**Example prompt:**
> "Fetch the mover pack from the URL and read both PDFs. Don't assume which document is correct — check what each one actually says and decide which one satisfies the form's requirement."

---

### Step 3 — Build as separate scripts, not one big file

Asked for a two-stage build: an extraction script that reads documents and decides which to attach, and a separate form-filling script. This kept the decision logic inspectable on its own.

**Example prompt:**
> "Build this as two separate scripts — one that handles the input and document decision, and one that drives the form. I want each piece to do one clear job."

---

### Step 4 — First attempt failed — selectors were guessed

The first form-filling script was written without visibility into the live form's actual HTML. Running it produced field-not-found errors — all the selectors were guesses.

---

### Step 5 — Fixed it by running Playwright codegen myself

Rather than keep guessing, ran `npx playwright codegen` against the live form, walked through the real 7-step flow manually, and pasted the recorded output back. This gave exact verified selectors and surfaced fields the brief hadn't mentioned — occupier type, number of occupants, main residence confirmation.

**Example prompt:**
> "Here's the Playwright codegen output from me manually filling the real form. Rewrite fill-form.js around this recording — use the exact selectors it captured, don't guess."

---

### Step 6 — Caught my own mistakes

My manual recording had two errors I caught on review: the move-in date was mistyped, and the candidate token was incomplete. Flagged both and had the correct values hardcoded.

**Example prompt:**
> "The move date in the recording is wrong — it should be 2026-06-01 per the tenancy agreement, not what I typed. Fix it. Also the candidate token is incomplete — it should be CAND-2026-292A in full."

---

### Step 7 — Phone number gap

The form has an optional phone number field with no source in any document. Asked Claude Code to check all three source documents explicitly.

**Example prompt:**
> "Check all three source documents — the note, the tenancy agreement, and the energy bill — for a phone number. If it's not in any of them, leave the field blank rather than fabricate one. The form marks it optional."

---

### Step 8 — Privacy issue on GitHub

Pushed the repo and noticed the source PDFs and screenshots had been committed publicly. Added a .gitignore and removed the folder from tracking.

**Example prompt:**
> "The tmp/ folder with the PDFs and screenshots got committed to GitHub and is now public. Add a .gitignore, remove the folder from tracking, and make sure it doesn't get committed again."

---

### Step 9 — Being honest about what's actually agentic

Asked Claude Code to help articulate clearly which parts involve real decision-making versus fixed rules. Pushed back when early drafts sounded more impressive than accurate.

**Example prompt:**
> "Write up what this agent actually does — but be completely honest. Which parts involve real logic and which parts are just hardcoded or replaying a recording? Don't make it sound more agentic than it is."

---

## Phase 2 — Agentic pipeline (built in response to feedback)

Feedback from Just Move In: the original solution was too deterministic and hard to scale. Built a second version alongside the original — new files, nothing overwritten.

---

### Step 10 — Scaffolded the agentic loop

Asked Claude Code to build a new entry point and loop structure where instead of replaying fixed steps, the system reads the live page at each step and decides the next action.

**Example prompt:**
> "Build a genuinely agentic version alongside the existing files — don't overwrite anything. New files only. Instead of replaying fixed steps, I want a loop that reads the current page's accessible structure and decides the next action itself. Use Playwright for browser control. Start by scaffolding the loop structure. Ask me before installing anything or making live submissions."

---

### Step 11 — Designed the discover/plan/execute split

Realised a per-step AI loop was expensive (one API call per action). Redesigned around a smarter architecture: one AI call to learn the form upfront, save the ruleset, execute it for any number of tenants.

**Example prompt:**
> "Instead of calling the AI once per action, I want one AI call that reads the whole form structure upfront and returns a complete action plan. The plan gets saved as a file. Submissions just load and execute the plan. Build that."

---

### Step 12 — Built discover.js

Asked Claude Code to build the discovery pass — navigates the form with dummy data and a throwaway PDF, snapshots every page, AI writes the Playwright ruleset.

**Example prompt:**
> "Build discover.js. It should open a real browser, navigate the form page by page using dummy data and a blank throwaway PDF (nothing from any real tenant), snapshot every page as ARIA text, and send all snapshots to an AI that writes the complete Playwright ruleset to form-plan.json. The dummy PDF is just to unlock each page — it's never submitted for real."

---

### Step 13 — Built compare.js

Asked Claude Code to build the AI cross-reference step — reads tenant data and form requirements together and flags any mismatches before the browser opens.

**Example prompt:**
> "Build compare.js. Before any submission, an AI should read two things together: the tenant's full dataset and the form-plan.json that discover.js generated. It should check whether the tenant's data satisfies what the form is going to ask for — not just format checks, but logical mismatches like wrong document type or address inconsistencies. Stop the submission immediately if anything doesn't line up."

---

### Step 14 — Built validate.js

Asked for a separate fast format-check layer — cheap deterministic checks that don't need AI.

**Example prompt:**
> "Build validate.js for the fast mechanical checks — required fields present, email format valid, move date correctly formatted, document file exists. This doesn't need AI. It runs after compare.js and before the browser opens."

---

### Step 15 — Wired it all together

Asked Claude Code to orchestrate the full pipeline in agent-v2-run.js and remove the manual confirmation gate.

**Example prompt:**
> "Wire it all together in agent-v2-run.js: extract → compare → validate → submit. Remove the manual confirmation step — I don't want a human reviewing every submission. If the data passes all checks, proceed automatically. If anything fails, halt with a clear error."

---

### Step 16 — Ran it end to end and pushed to GitHub

Ran the full pipeline, confirmed it worked, cleaned up old files, and pushed.

**Example prompt:**
> "Remove fill-form.js, run.js, and the intermediate versions from the repo. The new pipeline is the only version. Update the README to reflect what's actually been built. Then push."

---

## What's stubbed and why

The AI calls inside discover.js and compare.js are stubbed — the stubs return the identical output shape a real call would return. I built and tested this using Claude Code on my existing subscription rather than wiring up direct Anthropic API calls for a take-home exercise. Swapping each stub for a live claude-sonnet-4-6 call is one line per file.
