import { wdcli } from '../wdcli.mjs';
import { ok, err } from '../respond.mjs';

export function register(server) {
  server.tool(
    'get_extend_whoami',
    'Show the current WDCLI user and account. Apps you create are named <name>_<orgShortId> — this is where the org short id comes from. Also a cheap way to check the account session is alive.',
    {},
    async () => {
      const result = await wdcli(['whoami']);
      if (!result.ok) {
        return err('WHOAMI_FAILED', result.error, result.auth?.fix ?? 'Check WDCLI credentials.');
      }
      return ok({ identity: result.data });
    }
  );
}
