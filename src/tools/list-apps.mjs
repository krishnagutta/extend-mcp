import { z } from 'zod';
import { wdcli } from '../wdcli.mjs';

export function register(server) {
  server.tool(
    'list_extend_apps',
    'List all Workday Extend apps for your organization. Returns app names, referenceIds, status, and latest version info. Use referenceId for all other app commands.',
    {
      limit: z.number().int().min(1).max(500).optional().describe('Max apps to return (default: all)'),
      offset: z.number().int().min(0).optional().describe('Offset for pagination (default: 0)'),
      status_filter: z.enum(['ACTIVE', 'INACTIVE']).optional().describe('Filter by app status'),
    },
    async ({ limit, offset, status_filter }) => {
      const args = ['app', 'list'];
      if (limit !== undefined) args.push('-l', String(limit));
      if (offset !== undefined) args.push('-o', String(offset));

      const result = await wdcli(args);
      if (!result.ok) return err('LIST_FAILED', result.error);

      let apps = Array.isArray(result.data) ? result.data : [];
      if (status_filter) apps = apps.filter(a => a.status === status_filter);

      return ok({ total: apps.length, apps: apps.map(summarize) });
    }
  );
}

function summarize(app) {
  const latest = app.versions?.[0];
  return {
    referenceId: app.referenceId,
    name: app.name,
    description: app.description,
    status: app.status,
    appId: app.appId,
    latest_version: latest ? { name: latest.name, status: latest.status, versionId: latest.versionId } : null,
    modified: app.modified,
  };
}

function ok(data) {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

function err(code, message, suggestion) {
  return { content: [{ type: 'text', text: JSON.stringify({ error: true, code, message, suggestion }) }] };
}
