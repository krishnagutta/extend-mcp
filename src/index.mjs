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
import { register as registerGetPatterns } from './tools/get-extend-patterns.mjs';
import { register as registerSearchExamples } from './tools/search-extend-examples.mjs';
import { register as registerReadExample } from './tools/read-extend-example.mjs';
import { register as registerLogLearning } from './tools/log-extend-learning.mjs';
import { register as registerGetLearnings } from './tools/get-extend-learnings.mjs';
import { register as registerWhoami } from './tools/get-extend-whoami.mjs';
import { register as registerBuildLog } from './tools/get-extend-build-log.mjs';
import { register as registerCreateApp } from './tools/create-extend-app.mjs';
import { register as registerCopyApp } from './tools/copy-extend-app.mjs';
import { register as registerPromoteApp } from './tools/promote-extend-app.mjs';

const server = new McpServer({
  name: 'extend-mcp',
  version: '1.3.0',
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

// Identity & lifecycle (command surface verified against oclif.manifest.json)
registerWhoami(server);
registerBuildLog(server);
registerCreateApp(server);
registerCopyApp(server);
registerPromoteApp(server);

// Knowledge (curated patterns + Workday DevRel example corpus + learnings loop)
registerGetPatterns(server);
registerSearchExamples(server);
registerReadExample(server);
registerLogLearning(server);
registerGetLearnings(server);

const transport = new StdioServerTransport();
await server.connect(transport);

process.stderr.write(`[extend-mcp] Server started. Work dir: ${config.workDir}\n`);
