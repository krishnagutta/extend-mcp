// Workspace path safety. Every tool that touches EXTEND_WORK_DIR resolves
// paths through these helpers.
//
// Two distinct holes these close:
//  1. `reference_id` was interpolated into the path unvalidated, so
//     "../../etc" escaped the workspace before any containment check ran.
//  2. Containment used absolute.startsWith(appDir), which admits sibling
//     directories sharing the prefix (/work/app1evil passes for /work/app1).

import { join, resolve, normalize, sep } from 'path';

// Extend referenceIds look like `myApp_gvptzl`: alphanumeric with underscores
// or hyphens, never path separators or dots.
const REFERENCE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

export function isValidReferenceId(referenceId) {
  return typeof referenceId === 'string' && REFERENCE_ID_RE.test(referenceId);
}

/**
 * Resolve the app directory for a referenceId, or null if the id is invalid.
 */
export function appDirFor(workDir, referenceId) {
  if (!isValidReferenceId(referenceId)) return null;
  return join(workDir, referenceId);
}

/**
 * Resolve `filePath` inside `appDir`, or null if it escapes it.
 * Exact-boundary containment: the result must be appDir itself or start
 * with appDir + separator — a sibling sharing the prefix does not qualify.
 */
export function resolveWithin(appDir, filePath) {
  const base = resolve(appDir);
  const absolute = resolve(join(base, normalize(filePath)));
  if (absolute !== base && !absolute.startsWith(base + sep)) return null;
  return absolute;
}
