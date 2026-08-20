// Promotion guard. Promotion is the outward-visible action (production
// promotion publishes the app), so it requires an explicit human confirmation
// string — pure and testable, like tenant-guard.

export const PROMOTION_LEVELS = ['implementation', 'sandbox', 'production'];

/** The exact string a human must supply to authorise a promotion. */
export function expectedConfirmation(referenceId, version, level) {
  return `PROMOTE ${referenceId} v${version} TO ${String(level).toUpperCase()}`;
}

/**
 * @returns {{ ok: boolean, expected: string }} — ok only when `confirm`
 * matches the expected string exactly (no trimming, no case-folding: the
 * point is that a human typed precisely this).
 */
export function checkPromotion({ referenceId, version, level, confirm }) {
  const expected = expectedConfirmation(referenceId, version, level);
  return { ok: confirm === expected, expected };
}

export function buildPromoteArgs({ referenceId, version, level, releaseNotes }) {
  const args = ['app', 'promote', referenceId, '-v', version, '-l', level];
  if (releaseNotes) args.push('-n', releaseNotes);
  return args;
}
