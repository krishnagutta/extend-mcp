import { execFile } from 'child_process';
import { promisify } from 'util';
import { config } from './config.mjs';

const execFileAsync = promisify(execFile);

const WDCLI_BIN = 'wdcli';
let authenticated = false;

async function ensureAuth() {
  if (authenticated) return;

  const env = {
    ...process.env,
    WDCLI_CLIENT_ID: config.clientId,
    WDCLI_CLIENT_SECRET: config.clientSecret,
  };

  await execFileAsync(WDCLI_BIN, ['auth', 'login', '--system-user'], { env });
  authenticated = true;
  process.stderr.write('[extend-mcp] Authenticated with Workday Developer Platform.\n');
}

/**
 * Run a wdcli command and return parsed JSON output.
 * Always appends -f json for machine-readable output.
 */
export async function wdcli(args, options = {}) {
  await ensureAuth();

  const fullArgs = [...args, '-f', 'json'];
  const timeout = options.timeout ?? 60_000;

  try {
    const { stdout, stderr } = await execFileAsync(WDCLI_BIN, fullArgs, {
      timeout,
      maxBuffer: 50 * 1024 * 1024,
      env: process.env,
    });

    if (stderr) {
      process.stderr.write(`[extend-mcp] wdcli stderr: ${stderr}\n`);
    }

    try {
      return { ok: true, data: JSON.parse(stdout) };
    } catch {
      // Some commands return non-JSON (e.g. deploy progress). Return raw text.
      return { ok: true, data: stdout.trim() };
    }
  } catch (err) {
    const stderr = err.stderr ?? '';
    const stdout = err.stdout ?? '';

    // Token may have expired — reset auth flag so next call re-authenticates
    if (stderr.includes('Authentication required') || stderr.includes('401')) {
      authenticated = false;
    }

    return {
      ok: false,
      error: stderr || stdout || err.message,
      code: err.code,
    };
  }
}

/**
 * Run a wdcli command without -f json (for commands like app:upload that
 * return human-readable build progress).
 */
export async function wdcliRaw(args, options = {}) {
  await ensureAuth();

  const timeout = options.timeout ?? 120_000;

  try {
    const { stdout, stderr } = await execFileAsync(WDCLI_BIN, args, {
      timeout,
      maxBuffer: 50 * 1024 * 1024,
      env: process.env,
    });

    return { ok: true, data: (stdout + stderr).trim() };
  } catch (err) {
    const stderr = err.stderr ?? '';
    const stdout = err.stdout ?? '';

    if (stderr.includes('Authentication required') || stderr.includes('401')) {
      authenticated = false;
    }

    return {
      ok: false,
      error: stderr || stdout || err.message,
      code: err.code,
    };
  }
}
