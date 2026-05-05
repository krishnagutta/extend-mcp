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

  const workDir = resolve(
    process.env.EXTEND_WORK_DIR ?? join(homedir(), 'extend-workspace')
  );

  if (!existsSync(workDir)) {
    mkdirSync(workDir, { recursive: true });
  }

  return { clientId, clientSecret, workDir };
}

export const config = loadConfig();
