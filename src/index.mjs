import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { config } from './config.mjs';

import { register as registerListApps } from './tools/list-apps.mjs';
import { register as registerGetAppInfo } from './tools/get-app-info.mjs';
import { register as registerListAppVersions } from './tools/list-app-versions.mjs';
import { register as registerListAppBuilds } from './tools/list-app-builds.mjs';
import { register as registerListTenants } from './tools/list-tenants.mjs';
import { register as registerDownloadApp } from './tools/download-app.mjs';
import { register as registerListAppFiles } from './tools/list-app-files.mjs';
import { register as registerReadAppFile } from './tools/read-app-file.mjs';
import { register as registerWriteAppFile } from './tools/write-app-file.mjs';
import { register as registerValidateApp } from './tools/validate-app.mjs';
import { register as registerUploadApp } from './tools/upload-app.mjs';
import { register as registerDeployApp } from './tools/deploy-app.mjs';

const server = new McpServer({
  name: 'extend-mcp',
  version: '1.0.1',
});

// Discovery
registerListApps(server);
registerGetAppInfo(server);
registerListAppVersions(server);
registerListAppBuilds(server);
registerListTenants(server);

// Local file operations (download first, then read/write)
registerDownloadApp(server);
registerListAppFiles(server);
registerReadAppFile(server);
registerWriteAppFile(server);

// Validation & deployment
registerValidateApp(server);
registerUploadApp(server);
registerDeployApp(server);

const transport = new StdioServerTransport();
await server.connect(transport);

process.stderr.write(`[extend-mcp] Server started. Work dir: ${config.workDir}\n`);
