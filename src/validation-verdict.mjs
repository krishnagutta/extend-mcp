// Interpret `wdcli app validate` output. The CLI's exit code alone is not a
// reliable verdict (it can exit 0 with validation errors in the text), and the
// previous substring sniff — output.includes('error') — false-failed on any
// filename or summary line containing the word (e.g. "0 errors").

const ERROR_LINE_RE = /\b(errors?|failed|failures?)\b/i;
const CLEAN_LINE_RE = /\b(0|no)\s+(errors?|failures?)\b|\b0\s+failed\b/i;

/**
 * @param {boolean} exitOk  whether the wdcli process exited successfully
 * @param {string}  output  combined stdout/stderr text
 * @returns {{ valid: boolean, error_lines: string[] }}
 */
export function assessValidation(exitOk, output) {
  const errorLines = String(output ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => ERROR_LINE_RE.test(l) && !CLEAN_LINE_RE.test(l));

  return { valid: exitOk && errorLines.length === 0, error_lines: errorLines };
}
