# AI Prompt Log

Tools used: Claude (chat), Claude Code / Playwright, [add anything else you use, e.g. codegen]

## 1. Understanding the target
- Fetched the mock council form and mover pack pages directly to extract
  the real field requirements and mover data, rather than guessing at the
  form's structure.

## 2. Document classification decision
- Prompted for identification of which of the two supplied documents
  (tenancy agreement vs energy bill) satisfies the form's stated
  requirement. Deliberately flagged that the energy bill states it
  "relates to your previous address" — a decoy in the exercise — and
  excluded it on that basis rather than attaching whichever document
  appeared first.

## 3. Agent architecture
- Asked for a two-stage pipeline (extract → act) rather than one monolithic
  script, so the document-decision logic is inspectable and testable
  independently of the browser-automation step.

## 4. Selector strategy
- [Fill in once you've run it locally: note any selectors you had to
  correct after inspecting the live DOM, and why.]

## 5. What I changed from the AI's first draft
- [Fill in — be specific, this is part of what they're assessing: not
  "did AI write it" but "did you exercise judgement over what it wrote".]
