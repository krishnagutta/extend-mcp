// wdcli subprocess client, as a factory so tests can inject a fake exec.
// Fixes two defects in the original module-level implementation:
//  1. Auth race — N concurrent first calls each ran `wdcli auth login`.
//     A single shared in-flight promise now serialises them.
//  2. Expired-token UX — a 401 mid-session failed the current call and only
//     re-authenticated on the NEXT one. Now the failing call re-auths and
//     retries itself exactly once.

const WDCLI_BIN = 'wdcli';

function isAuthError(text) {
  return text.includes('Authentication required') || text.includes('401');
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
   * Run wdcli with auth, retrying exactly once after re-auth if the first
   * attempt failed with an authentication error.
   */
  async function run(args, options = {}) {
    const timeout = options.timeout ?? 60_000;
    const maxBuffer = 50 * 1024 * 1024;

    await ensureAuth();
    let result = await attempt(args, { timeout, maxBuffer });

    if (!result.ok && isAuthError(result.stderr || '')) {
      authPromise = null;
      await ensureAuth();
      result = await attempt(args, { timeout, maxBuffer });
    }

    return result;
  }

  /** JSON-mode command: appends -f json, parses stdout. */
  async function wdcli(args, options = {}) {
    const result = await run([...args, '-f', 'json'], options);

    if (!result.ok) {
      return { ok: false, error: result.stderr || result.stdout || result.message, code: result.code };
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
      return { ok: false, error: result.stderr || result.stdout || result.message, code: result.code };
    }

    return { ok: true, data: (result.stdout + result.stderr).trim() };
  }

  return { wdcli, wdcliRaw };
}
