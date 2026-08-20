// wdcli subprocess client, as a factory so tests can inject a fake exec.
// Fixes two defects in the original module-level implementation:
//  1. Auth race — N concurrent first calls each ran `wdcli auth login`.
//     A single shared in-flight promise now serialises them.
//  2. Expired-token UX — a 401 mid-session failed the current call and only
//     re-authenticated on the NEXT one. Now the failing call re-auths and
//     retries itself exactly once.

const WDCLI_BIN = 'wdcli';

// WDCLI has THREE independent credentials, each expiring on its own clock:
//   account session   (wdcli auth login)          — upload, build, most commands
//   tenanted token    (wdcli tenant login <alias>) — deploy only; one tenant at a time
//   API Explorer token (developer.workday.com/api-explorer) — direct REST, ~1h life
// Retrying account login cannot fix an expired TENANT token, so failures must
// be classified before deciding to retry, and errors must name the exact fix.

/**
 * Classify a wdcli failure's auth flavour, or null if it isn't an auth error.
 * @returns {null | { kind: 'account'|'tenant', fix: string }}
 */
export function classifyAuthFailure(text) {
  const t = String(text ?? '').toLowerCase();
  if (!/401|unauthorized|authentication|not logged in|login required|expired/.test(t)) {
    return null;
  }
  if (/tenant/.test(t)) {
    return {
      kind: 'tenant',
      fix:
        'Tenanted token missing or expired. This is separate from the account session and only ' +
        'a human can mint it: run `wdcli tenant login <alias>` (browser SSO), then retry. ' +
        'Tenanted tokens are per-tenant — logging into one tenant does not cover another.',
    };
  }
  return {
    kind: 'account',
    fix:
      'Account session expired. The server re-runs `wdcli auth login --system-user` automatically; ' +
      'if this persists, verify WDCLI_CLIENT_ID / WDCLI_CLIENT_SECRET are valid.',
  };
}

/**
 * @param {{ execFileImpl: Function, clientId: string, clientSecret: string }} deps
 *   execFileImpl: promisified execFile-compatible (bin, args, opts) => {stdout, stderr}
 */
export function createWdcliClient({ execFileImpl, clientId, clientSecret }) {
  let authPromise = null;

  function ensureAuth() {
    if (!authPromise) {
      const env = {
        ...process.env,
        WDCLI_CLIENT_ID: clientId,
        WDCLI_CLIENT_SECRET: clientSecret,
      };
      authPromise = execFileImpl(WDCLI_BIN, ['auth', 'login', '--system-user'], { env }).then(
        () => {
          process.stderr.write('[extend-mcp] Authenticated with Workday Developer Platform.\n');
        },
        (e) => {
          authPromise = null; // failed auth must not poison future attempts
          throw e;
        }
      );
    }
    return authPromise;
  }

  async function attempt(args, { timeout, maxBuffer }) {
    try {
      const { stdout, stderr } = await execFileImpl(WDCLI_BIN, args, {
        timeout,
        maxBuffer,
        env: process.env,
      });
      return { ok: true, stdout, stderr };
    } catch (e) {
      return {
        ok: false,
        stdout: e.stdout ?? '',
        stderr: e.stderr ?? '',
        message: e.message,
        code: e.code,
      };
    }
  }

  /**
   * Run wdcli with auth. ACCOUNT-session failures re-auth and retry exactly
   * once; TENANT-token failures fail fast (account re-login cannot fix them)
   * with the exact remediation attached as `auth`.
   */
  async function run(args, options = {}) {
    const timeout = options.timeout ?? 60_000;
    const maxBuffer = 50 * 1024 * 1024;

    // --ci disables interactive prompts (every non-auth wdcli command supports
    // it, per the oclif manifest). A subprocess behind MCP must fail fast, not
    // hang waiting for a keypress nobody can deliver.
    const fullArgs = [...args, '--ci'];

    await ensureAuth();
    let result = await attempt(fullArgs, { timeout, maxBuffer });

    if (!result.ok) {
      const auth = classifyAuthFailure(`${result.stderr || ''}\n${result.stdout || ''}`);
      if (auth?.kind === 'account') {
        authPromise = null;
        await ensureAuth();
        result = await attempt(fullArgs, { timeout, maxBuffer });
      }
      if (!result.ok) {
        const finalAuth = classifyAuthFailure(`${result.stderr || ''}\n${result.stdout || ''}`);
        if (finalAuth) result.auth = finalAuth;
      }
    }

    return result;
  }

  /** JSON-mode command: appends -f json, parses stdout. */
  async function wdcli(args, options = {}) {
    const result = await run([...args, '-f', 'json'], options);

    if (!result.ok) {
      return { ok: false, error: result.stderr || result.stdout || result.message, code: result.code, auth: result.auth };
    }

    if (result.stderr) {
      process.stderr.write(`[extend-mcp] wdcli stderr: ${result.stderr}\n`);
    }

    try {
      return { ok: true, data: JSON.parse(result.stdout) };
    } catch {
      // Some commands return non-JSON (e.g. deploy progress). Return raw text.
      return { ok: true, data: result.stdout.trim() };
    }
  }

  /** Raw-mode command: for human-readable build/deploy progress output. */
  async function wdcliRaw(args, options = {}) {
    const result = await run(args, { ...options, timeout: options.timeout ?? 120_000 });

    if (!result.ok) {
      return { ok: false, error: result.stderr || result.stdout || result.message, code: result.code, auth: result.auth };
    }

    return { ok: true, data: (result.stdout + result.stderr).trim() };
  }

  return { wdcli, wdcliRaw };
}
