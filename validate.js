// validate.js
// Automated pre-flight check before any browser opens.
//
// Validates that all required data is present and correct before a submission
// is attempted. If anything fails, errors out loudly with exactly what's
// missing. No submission is attempted on a failed validation.
//
// At scale this replaces the manual confirmation prompt — humans only get
// involved when something is actually wrong, not as a rubber stamp on every run.

const fs = require('fs');
const path = require('path');

const SUPPORTED_COUNCILS = [
  'Northgate Borough Council',
  // add councils here as discover.js covers them
];

const VALID_DOCUMENT_TYPES = [
  'tenancy-agreement.pdf',
  'completion-statement.pdf',
  // extend as new document types are recognised
];

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function validate(mover, chosenDocument) {
  const errors = [];

  // Required mover fields
  if (!mover.fullName?.trim())
    errors.push('fullName is missing or empty');

  if (!mover.email?.trim())
    errors.push('email is missing or empty');
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mover.email))
    errors.push(`email is not valid: "${mover.email}"`);

  if (!mover.previousAddress?.trim())
    errors.push('previousAddress is missing or empty');

  if (!mover.newAddress?.trim())
    errors.push('newAddress is missing or empty');

  if (!mover.moveDate?.trim())
    errors.push('moveDate is missing or empty');
  else if (!DATE_REGEX.test(mover.moveDate))
    errors.push(`moveDate must be YYYY-MM-DD format, got: "${mover.moveDate}"`);

  if (!mover.numberOfOccupants || mover.numberOfOccupants < 1)
    errors.push('numberOfOccupants must be 1 or more');

  if (!mover.council?.trim())
    errors.push('council is missing or empty');
  else if (!SUPPORTED_COUNCILS.includes(mover.council))
    errors.push(`council not supported: "${mover.council}" — run discover.js against this council first`);

  // Document checks
  if (!chosenDocument)
    errors.push('no document selected — extract.js found no qualifying document');
  else {
    if (!chosenDocument.path || !fs.existsSync(chosenDocument.path))
      errors.push(`document file not found at path: ${chosenDocument.path}`);

    if (!VALID_DOCUMENT_TYPES.includes(chosenDocument.label))
      errors.push(`document type not recognised: "${chosenDocument.label}"`);
  }

  // Plan check — submission can't run without it
  const planPath = path.join(__dirname, 'tmp', 'form-plan.json');
  if (!fs.existsSync(planPath))
    errors.push('form-plan.json not found — run `node discover.js` first');

  return errors;
}

function run(mover, chosenDocument) {
  const errors = validate(mover, chosenDocument);

  if (errors.length === 0) {
    console.log('[validate] All checks passed — proceeding with submission.');
    return true;
  }

  console.error('\n[validate] Submission blocked. Fix the following before retrying:\n');
  errors.forEach((e) => console.error(`  ✗ ${e}`));
  console.error('');
  return false;
}

module.exports = { run };
