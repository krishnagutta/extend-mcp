import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assessValidation } from '../src/validation-verdict.mjs';

// Independent oracle: each case is a literal wdcli-style transcript with a
// hand-specified expected verdict.

test('silent on good: clean validation with a "0 errors" summary passes', () => {
  const out = 'Validating app...\nChecked 42 files.\nValidation completed with 0 errors.';
  const v = assessValidation(true, out);
  assert.equal(v.valid, true);
  assert.deepEqual(v.error_lines, []);
});

test('silent on good: "no errors found" phrasing passes', () => {
  const v = assessValidation(true, 'Scan finished. No errors found.');
  assert.equal(v.valid, true);
});

test('fires on bad: an explicit error line fails even when exit code is 0', () => {
  const out = 'Validating...\nError: presentation/home.pmd: unknown widget type "gird"\nDone.';
  const v = assessValidation(true, out);
  assert.equal(v.valid, false);
  assert.equal(v.error_lines.length, 1);
  assert.match(v.error_lines[0], /unknown widget/);
});

test('fires on bad: non-zero exit fails even with quiet output', () => {
  const v = assessValidation(false, 'wdcli crashed');
  assert.equal(v.valid, false);
});

test('regression: a filename containing "error" does not fail validation', () => {
  // old code: output.toLowerCase().includes('error') → false negative
  const out = 'Checked presentation/errorBanner.pmd\nValidation completed with 0 errors.';
  const v = assessValidation(true, out);
  assert.equal(v.valid, true, 'filename mentioning error must not fail the verdict');
});

test('fires on bad: "3 errors" summary line fails', () => {
  const v = assessValidation(true, 'Validation completed with 3 errors.');
  assert.equal(v.valid, false);
});

test('empty/undefined output with clean exit passes', () => {
  assert.equal(assessValidation(true, '').valid, true);
  assert.equal(assessValidation(true, undefined).valid, true);
});
