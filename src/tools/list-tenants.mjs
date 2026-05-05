import { wdcli } from '../wdcli.mjs';

export function register(server) {
  server.tool(
    'list_extend_tenants',
    'List all Workday tenants available for app deployment. Returns tenant aliases, environment types (PROD, IMPL, SANDBOX, WCPDEV), and base URLs. Use tenant_alias when deploying apps.',
    {},
    async () => {
      const result = await wdcli(['tenant', 'list']);
      if (!result.ok) return err('TENANTS_FAILED', result.error);

      return ok(result.data);
    }
  );
}

function ok(data) {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

function err(code, message, suggestion) {
  return { content: [{ type: 'text', text: JSON.stringify({ error: true, code, message, suggestion }) }] };
}
