import { existsSync, mkdirSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';
import { config as loadDotenv } from 'dotenv';
import { resolveLearningsDir } from './learnings.mjs';

loadDotenv();

function loadConfig() {
  // Auth mode. With a system user (WDCLI_CLIENT_ID/SECRET) the server re-runs
  // `wdcli auth login --system-user` itself. Without one it relies on a browser
  // OAuth session the human created with `wdcli auth login` in the same HOME /
  // WDCLI_CONFIG_DIR this process runs with, and never attempts a login.
  const clientId = process.env.WDCLI_CLIENT_ID?.trim() || undefined;
  const clientSecret = process.env.WDCLI_CLIENT_SECRET?.trim() || undefined;
  if ((clientId && !clientSecret) || (!clientId && clientSecret)) {
    process.stderr.write(
      '[extend-mcp] ERROR: set BOTH WDCLI_CLIENT_ID and WDCLI_CLIENT_SECRET for system-user auth, ' +
        'or NEITHER to use a browser OAuth session (wdcli auth login).\n'
    );
    process.exit(1);
  }
  const authMode = clientId ? 'system-user' : 'browser';

  // Production tenant alias is REQUIRED. Deploys to this alias are refused by
  // the guard. If it is unset the guard cannot protect production, so we fail
  // loudly at startup rather than fail open (an unset value must never make
  // production deployable).
  const prodTenant = process.env.EXTEND_PROD_TENANT?.trim();
  if (!prodTenant) {
    process.stderr.write(
      '[extend-mcp] ERROR: EXTEND_PROD_TENANT must be set to your production ' +
        'tenant alias. It is refused by the production-deploy guard; leaving it ' +
        'unset would disarm that guard. See .env.example.\n'
    );
    process.exit(1);
  }

  // Optional advisory allowlist of known-safe (non-production) tenant aliases,
  // comma-separated. Surfaced in deploy output; does not itself gate deploys.
  const safeTenants = new Set(
    (process.env.EXTEND_SAFE_TENANTS ?? '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
  );

  const workDir = resolve(
    process.env.EXTEND_WORK_DIR ?? join(homedir(), 'extend-workspace')
  );

  if (!existsSync(workDir)) {
    mkdirSync(workDir, { recursive: true });
  }

  // Learnings location. Defaults to the repo-tracked docs/knowledge/learnings/;
  // EXTEND_LEARNINGS_DIR moves it (per-engagement isolation — this repo is public).
  const defaultLearningsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'knowledge', 'learnings');
  const learningsDir = resolveLearningsDir(process.env, defaultLearningsDir);

  return { clientId, clientSecret, authMode, workDir, prodTenant, safeTenants, learningsDir };
}

export const config = loadConfig();
