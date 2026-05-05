# extend-mcp

MCP server for Workday Extend app development at Lyft. Gives Claude Desktop full read/write access to your Extend apps via the [Workday Developer CLI (WDCLI)](https://developer.workday.com/tools/cli).

## What it does

| Tool | What you can ask Claude |
|---|---|
| `list_extend_apps` | "List all our Extend apps" |
| `get_extend_app_info` | "Show info on the headcount-management app" |
| `list_extend_app_versions` | "What versions does spotBonus have?" |
| `list_extend_app_builds` | "Show build history for v427" |
| `list_extend_tenants` | "What tenants can I deploy to?" |
| `download_extend_app` | "Download the check-in hub app" |
| `list_extend_app_files` | "What files does the app have?" |
| `read_extend_app_file` | "Read the home page of headcount-management" |
| `write_extend_app_file` | "Update the Open Positions section" |
| `validate_extend_app` | "Validate before I upload" |
| `upload_extend_app` | "Upload my changes and wait for build" |
| `deploy_extend_app` | "Deploy v428 to sandbox (lyft-sb)" |

## Prerequisites

- [Claude Desktop](https://claude.ai/download)
- [Node.js 18+](https://nodejs.org)
- [WDCLI 1.0+](https://developer.workday.com/tools/cli) — install the macOS/Linux binary
- A Workday Developer Platform **system user** with CLI access for Lyft

## Quick install

```bash
WDCLI_CLIENT_ID=your_id \
WDCLI_CLIENT_SECRET=your_secret \
  curl -fsSL https://raw.githubusercontent.com/lyft/extend-mcp/main/install.sh | bash
```

Restart Claude Desktop after install. That's it.

## Getting credentials

You need a Workday Developer Platform system user:

1. Go to [developer.workday.com](https://developer.workday.com) → sign in with your Lyft SSO
2. Navigate to your org (**Lyft, Inc.**) → **System Users**
3. Create a new system user or use an existing one
4. Copy the **Client ID** and **Client Secret**
5. Pass them as `WDCLI_CLIENT_ID` / `WDCLI_CLIENT_SECRET` in the install command above

> Each team member should create their own system user. Do not share credentials.

## Manual install

```bash
git clone https://github.com/lyft/extend-mcp.git ~/Documents/extend-mcp
cd ~/Documents/extend-mcp
npm install
```

Then add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "extend-mcp": {
      "command": "node",
      "args": ["/Users/YOUR_USERNAME/Documents/extend-mcp/src/index.mjs"],
      "env": {
        "WDCLI_CLIENT_ID": "your_client_id",
        "WDCLI_CLIENT_SECRET": "your_client_secret",
        "EXTEND_WORK_DIR": "/Users/YOUR_USERNAME/extend-workspace"
      }
    }
  }
}
```

Restart Claude Desktop.

## Updating

```bash
cd ~/Documents/extend-mcp && git pull && npm install
```

Then restart Claude Desktop.

## Contributing

1. Fork this repo and create a branch
2. Add your tool in `src/tools/your-tool.mjs` following the existing pattern
3. Register it in `src/index.mjs`
4. Test locally: `WDCLI_CLIENT_ID=xxx WDCLI_CLIENT_SECRET=yyy node src/index.mjs`
5. Open a PR

Each tool file exports a single `register(server)` function. See `src/tools/list-apps.mjs` for the simplest example.

## Architecture

```
src/
├── index.mjs          # MCP server entry point — registers all tools
├── config.mjs         # Reads WDCLI_CLIENT_ID/SECRET from env
├── wdcli.mjs          # Subprocess wrapper — runs wdcli, handles auth/retries
└── tools/
    ├── list-apps.mjs
    ├── get-app-info.mjs
    ├── list-app-versions.mjs
    ├── list-app-builds.mjs
    ├── list-tenants.mjs
    ├── download-app.mjs
    ├── list-app-files.mjs
    ├── read-app-file.mjs
    ├── write-app-file.mjs
    ├── validate-app.mjs
    ├── upload-app.mjs
    └── deploy-app.mjs
```

All tools return JSON. Errors always include `{ error: true, code, message, suggestion }`.

## Safety notes

- **Production deploys are blocked** — `deploy_extend_app` refuses to deploy to `lyft` (prod). Promote through the Workday Developer Site after validating in sandbox.
- **Backups on write** — `write_extend_app_file` creates a `.bak` before overwriting.
- **Credentials stay local** — never commit `.env` or put credentials in `config.json`.
