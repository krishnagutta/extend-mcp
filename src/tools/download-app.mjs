import { z } from 'zod';
import { join } from 'path';
import { existsSync, readdirSync, statSync } from 'fs';
import { wdcliRaw } from '../wdcli.mjs';
import { config } from '../config.mjs';

export function register(server) {
  server.tool(
    'download_extend_app',
    'Download a Workday Extend app source files to the local workspace. Required before reading or editing app files. Files are stored in EXTEND_WORK_DIR/<referenceId>/.',
    {
      reference_id: z.string().describe('App referenceId (e.g. spotBonus_gvptzl)'),
      version: z.string().optional().describe('Version number to download (e.g. "427"). Omit for latest.'),
    },
    async ({ reference_id, version }) => {
      const appDir = join(config.workDir, reference_id);
      const args = ['app', 'download', reference_id, '-d', appDir, '--overwrite'];

      if (version) {
        args.push('-v', version);
      } else {
        args.push('--latest-version');
      }

      const result = await wdcliRaw(args, { timeout: 60_000 });
      if (!result.ok) return err('DOWNLOAD_FAILED', result.error, 'Check the referenceId and version are correct.');

      const files = collectFiles(appDir);
      return ok({
        message: `Downloaded ${reference_id} to ${appDir}`,
        local_dir: appDir,
        files,
        wdcli_output: result.data,
      });
    }
  );
}

function collectFiles(dir, base = dir) {
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(full, base));
    } else {
      const rel = full.slice(base.length + 1);
      const stat = statSync(full);
      files.push({ path: rel, size_bytes: stat.size });
    }
  }
  return files;
}

function ok(data) {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

function err(code, message, suggestion) {
  return { content: [{ type: 'text', text: JSON.stringify({ error: true, code, message, suggestion }) }] };
}
