// Pure argv builders for app-lifecycle commands, verified against wdcli's
// oclif.manifest.json (2026-08-20). Kept pure so tests can assert the exact
// command surface without spawning anything.

// App names become referenceIds (<name>_<orgShortId>) and apps are PERMANENT —
// wdcli has no delete — so the name gate is strict enough to block path
// tricks but loose enough for real names.
const APP_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9 _-]{2,79}$/;

export function isValidAppName(name) {
  return typeof name === 'string' && APP_NAME_RE.test(name);
}

/** wdcli app create <appName> <directory> [--app-type] [-d] [--no-build-wait] */
export function buildCreateArgs({ appName, directory, description, appType = 'EXTEND', waitForBuild = true }) {
  const args = ['app', 'create', appName, directory, '--app-type', appType];
  if (description) args.push('-d', description);
  if (!waitForBuild) args.push('--no-build-wait');
  return args;
}

/**
 * wdcli app copy <sourceDir> <destinationDir> [-n] [-d] [--no-build-wait]
 *
 * `source` MUST be a local directory path, never a bare reference ID: wdcli
 * accepts a reference ID here, but that path silently uploads nothing
 * (bootstrap-session finding). The tool layer resolves the reference ID to
 * its downloaded directory before calling this.
 */
export function buildCopyArgs({ sourceDir, destinationDir, newName, description, waitForBuild = true }) {
  const args = ['app', 'copy', sourceDir, destinationDir, '-n', newName];
  if (description) args.push('-d', description);
  if (!waitForBuild) args.push('--no-build-wait');
  return args;
}
