// Build-output diagnostics. The build is the oracle, and its failure modes
// are learnable — the highest-value signature: a large class of source
// mistakes fails with a COMPLETELY EMPTY build log. If the log stops after
// "Downloading source code" with no Validating/Compiling lines, the grammar
// never parsed — an unknown property, a non-ASCII character, or an id
// collision — NOT a logic error, and staring at logic won't find it.

/**
 * @param {string} log combined build/upload output
 * @returns {null | { signature: string, hint: string }}
 */
export function diagnoseBuildLog(log) {
  const t = String(log ?? '');
  const started = /downloading source code/i.test(t);
  const progressed = /validating|compiling/i.test(t);

  if (started && !progressed) {
    return {
      signature: 'parse_error_empty_log',
      hint:
        'The build log stops after "Downloading source code" with no Validating/Compiling lines. ' +
        'This is a PARSE error — an unknown property, a non-ASCII character in a label or script, ' +
        'or an id collision — not a logic error. Diff against the last green build and bisect: ' +
        'revert to green, re-apply one change per build.',
    };
  }

  return null;
}
