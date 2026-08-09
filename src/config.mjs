import { existsSync, mkdirSync } from 'fs';
import { resolve, join } from 'path';
import { homedir } from 'os';
import { config as loadDotenv } from 'dotenv';

loadDotenv();

function loadConfig() {
  const clientId = process.env.WDCLI_CLIENT_ID;
  const clientSecret = process.env.WDCLI_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    process.stderr.write(
      '[extend-mcp] ERROR: WDCLI_CLIENT_ID and WDCLI_CLIENT_SECRET must be set.\n'
    );
    process.exit(1);
  }

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

  return { clientId, clientSecret, workDir, prodTenant, safeTenants };
}

export const config = loadConfig();
