# AI Prompt Log

Candidate: Omar Sheikh (CAND-2026-292A)
Tool: Claude Code (Anthropic's CLI — runs Claude directly in the terminal)

---

## How I worked

I directed Claude Code throughout. I didn't write code by hand — my contribution was the thinking: what to build, how to structure it, when to push back, when something wasn't good enough, and catching mistakes when I ran things. The prompts below are real, taken directly from the session.

---

## Phase 1 — Original deterministic agent

Built to deadline. Three scripts: extract.js picks the right document, fill-form.js replays a Playwright recording, run.js wires them together. Worked, but brittle — any change to the form would break it.

Key decisions I made:
- Told the AI to build as separate scripts rather than one big file so each piece was inspectable on its own
- Ran Playwright codegen myself against the live form rather than let the AI guess selectors
- Caught two errors in my own recording (wrong move date, incomplete candidate token) and corrected them
- Told the AI to leave the optional phone field blank rather than fabricate a number
- Caught that the source PDFs had been committed to GitHub publicly and fixed it

I was explicit with the AI about what was actually agentic versus hardcoded, and pushed back when early write-ups made it sound more impressive than it was.

---

## Phase 2 — Agentic pipeline

Built after feedback from Just Move In that the original was too deterministic to scale. This is where the real prompting work happened.

---

**Starting point — what I asked for:**

> "I have a working deterministic agent here (extract.js, fill-form.js, run.js) that fills a council form using a fixed Playwright recording. I want to build a genuinely agentic version alongside it — new files, don't overwrite the originals — where instead of replaying fixed steps, an AI reads the current page's accessible structure and decides the next action itself, in a loop, until the form is submitted or it flags something it doesn't recognise. Keep extract.js's document-picking logic as-is. Use Playwright for browser control, and call the Claude API for the decision-making step. Start by scaffolding the loop structure and ask me before installing anything or making live submissions."

---

**Deciding not to use the API:**

Claude Code scaffolded the loop and asked about installing the Anthropic SDK. I said yes to the install, then thought about it:

> "i dont want to use api as i will be charged yeah"

Claude Code suggested stubbing the AI call so the loop runs without API cost. I asked:

> "can i just prove the concept with claude code using the tokens i have and not api and explain i could switch out to api later"

This led to the stub pattern — the AI decision step returns pre-scripted actions in the same JSON shape a real API call would return. Swap one line to go live.

---

**Rethinking the architecture — one call not forty:**

After running the per-step loop, I questioned whether calling the AI once per action was the right approach:

> "i like the dummy data approach so get ai to keep an updated version of this page using ai to read and populate and do a dummy submission so the playwright rules are always up to date yeah"

This shifted the architecture entirely — instead of the AI making decisions at runtime for each tenant, it learns the form once and saves a ruleset. Submissions just execute the saved plan.

---

**Handling a multi-page form:**

I spotted a gap in the single-snapshot approach:

> "the form is multiple pages you click thru tho"

Claude Code acknowledged the issue and offered options. I chose the discovery pass approach — navigate through every page with dummy data to see the full form before generating the plan.

---

**Separating tenant data from the discovery pass:**

> "but i want to handle multiple tenants yeah"

This led to the throwaway PDF — the discovery pass should use a blank dummy document completely separate from any real tenant's files, so it's genuinely council-agnostic and tenant-agnostic.

---

**Removing the manual confirmation gate:**

The first version of agent-v2-run.js asked for a human "yes" before each submission. I pushed back:

> "i dont wana confirm manually think through this..."

This led to validate.js — automated checks that replace the human gate. Humans only get involved when something fails.

---

**Adding the AI cross-reference step:**

> "is there needed for an api call to review all the tenant data and make sure its all there too yeah"

Then I pushed further:

> "we compare the tenant data with what the form needs no??"

This became compare.js — an AI call that reads the tenant's dataset and form-plan.json together and checks they match before the browser opens. More useful than generic validation because it's form-aware.

---

**On discovery frequency:**

> "i can choose to update the playwright script with ai more regularly if i need to, will be less deterministic then but only if the form changes regularly"

This framing — discovery frequency as a dial you control, not a code change — is what makes the architecture genuinely less deterministic. The same pipeline becomes more or less adaptive depending on how often you run discover.js.

---

## What's stubbed and why

The AI calls in discover.js and compare.js are stubbed. I built and tested this using Claude Code on my existing subscription rather than paying separately for Anthropic API calls on a take-home exercise. The stubs return the identical output a real call would return. One line to swap per file.
