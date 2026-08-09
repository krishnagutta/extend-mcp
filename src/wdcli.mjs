import { execFile } from 'child_process';
import { promisify } from 'util';
import { config } from './config.mjs';
import { createWdcliClient } from './wdcli-core.mjs';

const { wdcli, wdcliRaw } = createWdcliClient({
  execFileImpl: promisify(execFile),
  clientId: config.clientId,
  clientSecret: config.clientSecret,
});

export { wdcli, wdcliRaw };
