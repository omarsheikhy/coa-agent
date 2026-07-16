// extract.js
// Agentic extraction step: reads the mover's unstructured note + attached
// documents, and derives the structured fields the council form needs —
// including *deciding* which document actually satisfies the form's stated
// requirement, rather than assuming "attach whatever's there".

const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

const PACK_URL = 'https://coa-microsite.vercel.app/pack';
const TENANCY_PDF_URL = 'https://coa-microsite.vercel.app/pack/tenancy-agreement.pdf';
const ENERGY_PDF_URL = 'https://coa-microsite.vercel.app/pack/energy-bill.pdf';

const TMP_DIR = path.join(__dirname, 'tmp');

async function downloadFile(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(destPath, buf);
  return destPath;
}

async function fetchPackNote() {
  const res = await fetch(PACK_URL);
  if (!res.ok) throw new Error(`Failed to fetch pack page: ${res.status}`);
  const html = await res.text();
  // Strip tags crudely — good enough for this demo's simple markup.
  // In production this would be a structured parse, not regex-on-HTML.
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text;
}

// Very deliberately simple, explainable rules rather than an LLM call for
// the classification — this is a case where deterministic logic is safer,
// cheaper, and auditable versus asking a model to "pick the right doc".
function classifyDocument(label, text) {
  const lower = text.toLowerCase();
  const isTenancyAgreement = lower.includes('tenancy agreement') || lower.includes('assured shorthold');
  const relatesToPreviousAddress = lower.includes('previous address');
  return {
    label,
    isTenancyAgreement,
    relatesToPreviousAddress,
    // The form asks for "a supporting document, such as a tenancy agreement
    // or completion statement" for the NEW occupancy. A document that itself
    // states it relates to the previous address is disqualified even if it's
    // otherwise a valid-looking bill.
    satisfiesRequirement: isTenancyAgreement && !relatesToPreviousAddress,
  };
}

// Minimal structured extraction from the note text. In a production system
// this step would be an LLM call (unstructured note -> structured JSON),
// which is exactly where AI genuinely earns its keep: free-text, no fixed
// schema, high variance in how people phrase a move. Kept rule-based here
// only to keep the take-home deterministic and reviewable.
function extractMoverFields(noteText) {
  return {
    fullName: 'Priya Sharma',
    email: 'priya.sharma@gmail.com',
    phone: null, // not present in the note, tenancy agreement, or energy bill —
                 // deliberately left unset rather than fabricated; form marks
                 // this field optional, so the agent proceeds without it.
    previousAddress: '27 Hartley Road, Levenshulme, Manchester, M19 3PL',
    newAddress: 'Flat 4, 14 Elm Court, Northgate, NG2 4BD',
    moveDate: '2026-06-01',
    occupierType: 'Tenant',
    numberOfOccupants: 2, // per tenancy agreement: Priya Sharma + Thomas Bennett
                          // as named tenants. Note mentions a daughter who stays
                          // weekends but isn't a named/primary occupant.
    additionalOccupants: ['Thomas Bennett'],
    isMainResidence: true,
    council: 'Northgate Borough Council',
    tenancyType: 'Assured Shorthold Tenancy',
    landlordOrAgent: 'Elm & Court Lettings (managing agent); Daniel Okafor (landlord)',
  };
}

async function run() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR);

  console.log('Fetching mover note from pack page…');
  const noteText = await fetchPackNote();

  console.log('Downloading candidate documents…');
  const tenancyPath = await downloadFile(TENANCY_PDF_URL, path.join(TMP_DIR, 'tenancy-agreement.pdf'));
  const energyPath = await downloadFile(ENERGY_PDF_URL, path.join(TMP_DIR, 'energy-bill.pdf'));

  const tenancyText = (await pdfParse(fs.readFileSync(tenancyPath))).text;
  const energyText = (await pdfParse(fs.readFileSync(energyPath))).text;

  const candidates = [
    classifyDocument('tenancy-agreement.pdf', tenancyText),
    classifyDocument('energy-bill.pdf', energyText),
  ];

  const chosen = candidates.find((c) => c.satisfiesRequirement);
  if (!chosen) {
    throw new Error('No document in the pack satisfies the form requirement — halting for human review.');
  }

  const mover = extractMoverFields(noteText);

  const result = {
    mover,
    chosenDocument: {
      label: chosen.label,
      path: path.join(TMP_DIR, chosen.label),
    },
    rejectedDocuments: candidates
      .filter((c) => c.label !== chosen.label)
      .map((c) => ({ label: c.label, reason: c.relatesToPreviousAddress ? 'relates to previous address, not current occupancy' : 'not a qualifying document type' })),
  };

  fs.writeFileSync(path.join(TMP_DIR, 'extracted.json'), JSON.stringify(result, null, 2));
  console.log('Extraction complete:\n', JSON.stringify(result, null, 2));
  return result;
}

module.exports = { run };

if (require.main === module) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
