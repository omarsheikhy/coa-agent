# AI Prompt Log

Candidate: Omar Sheikh (CAND-2026-292A)
Tools used: Claude (chat), terminal/Node, Playwright (incl. `codegen`), GitHub

## 1. Scoping and sequencing
Shared the full take-home brief and asked for an overall plan before diving
into code, given the exercise has five substantial parts. Agreed a
sequence: build the working agent first (the only part with a hard
pass/fail check), then the PRD, then the scale/segment/global sections,
then the written Q&A last — reusing material generated along the way.

## 2. Reading the actual target before building anything
Had the AI fetch the live form and the mover pack directly rather than
work from the brief's summary alone. This surfaced the real mover data
(Priya Sharma, her addresses, move date, household) and — critically — the
document trap in the exercise: the pack includes both a tenancy agreement
and an energy bill, and the energy bill states outright that it relates to
the *previous* address. Asked for that to be checked explicitly rather
than assumed, so the agent wouldn't just attach whichever file came first.

## 3. Scaffolding the agent
Asked for a two-stage build rather than one script: an extraction stage
that gathers and decides which document to use, and an action stage that
drives the form. This was so the document-decision logic would be
inspectable on its own, separate from the browser-automation mechanics.

## 4. First attempt failed — selectors were guessed
The first version of the form-filling script was written without visibility
into the live form's actual HTML (no browser access from the AI's sandbox).
Running it produced a string of "could not find field" warnings — none of
the guessed labels matched the real form.

## 5. Fixing it properly, hands-on
Rather than keep guessing, ran `npx playwright codegen` myself against the
live form, manually walked through the actual 7-step flow using the real
mover data, and pasted the recorded output back. This surfaced the form's
real structure — steps and fields the brief hadn't described (occupier
type, number of occupants, a main-residence confirmation, an optional
phone field) — and gave exact, verified selectors rather than guesses.
Asked the AI to rewrite the form-filling script around that real recording.

## 6. Catching my own mistakes
My manual recording had two errors I caught myself: the move-in date was
mistyped (26th instead of the 1st, per the tenancy agreement), and the
candidate token only partially entered ("4" instead of the full code).
Flagged both and had the correct values hardcoded into the final script
rather than trusting the raw recording verbatim.

## 7. A genuine data gap, checked rather than assumed
The form has an optional phone number field with no source anywhere in
the note, tenancy agreement, or energy bill. Asked the AI to check all
three explicitly. Decision: leave it blank rather than fabricate a number,
since the field is optional — flagged as the general policy (skip if
optional, escalate to a human if required and missing).

## 8. Deploying and catching a privacy/hygiene issue
Pushed the repo to GitHub, then noticed the source PDFs and generated
screenshots (`tmp/`) had been committed and were publicly visible. Added
a `.gitignore` and untracked the folder before final submission.

## 9. Being explicit about what's actually agentic vs hardcoded
Asked the AI to help articulate, honestly, which parts of the build
involve real decision-making versus fixed rules — this became the
trade-off explanation used in the Part A write-up: the document
classification is genuine logic (reads content, decides), while the
form-filling is a fixed, recorded script, and the mover's structured
details are hardcoded rather than extracted live from the note. Pushed
back explicitly when an early draft of the prompt log risked sounding more
"AI-authored" than truthful, and asked for the raw prompt sequence to be
laid out plainly rather than smoothed over.

## 10. What I'd build next with more time
Identified the clear next step as replacing both the hardcoded document
rules and the fixed Playwright recording with an AI agent that reads all
three source documents together (not just keyword-matching one), reads the
live page itself rather than replaying a script, and uses Playwright as
its execution layer rather than a fixed macro — trading reliability today
for adaptability if the form or document set changes.
