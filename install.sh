#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────
# Extend MCP — one-line installer
# Usage:
#   WDCLI_CLIENT_ID=xxx WDCLI_CLIENT_SECRET=yyy EXTEND_PROD_TENANT=zzz \
#     curl -fsSL https://raw.githubusercontent.com/krishnagutta/extend-mcp/main/install.sh | bash
# ─────────────────────────────────────────────

REPO="https://github.com/krishnagutta/extend-mcp.git"
INSTALL_DIR="$HOME/Documents/extend-mcp"
CONFIG_FILE="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
WORK_DIR="$HOME/extend-workspace"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()    { echo -e "${GREEN}[extend-mcp]${NC} $*"; }
warn()    { echo -e "${YELLOW}[extend-mcp]${NC} $*"; }
error()   { echo -e "${RED}[extend-mcp] ERROR:${NC} $*" >&2; exit 1; }

# ── 1. Check prerequisites ──────────────────
command -v node  >/dev/null 2>&1 || error "Node.js is required. Install from https://nodejs.org"
command -v npm   >/dev/null 2>&1 || error "npm is required (comes with Node.js)"
command -v git   >/dev/null 2>&1 || error "git is required"
command -v wdcli >/dev/null 2>&1 || error "wdcli is required. Install from https://developer.workday.com/tools/cli"

NODE_MAJOR=$(node -e "process.stdout.write(process.version.split('.')[0].replace('v',''))")
[[ "$NODE_MAJOR" -ge 18 ]] || error "Node.js 18+ required (found $(node --version))"

# ── 2. Collect credentials ──────────────────
CLIENT_ID="${WDCLI_CLIENT_ID:-}"
CLIENT_SECRET="${WDCLI_CLIENT_SECRET:-}"

if [[ -z "$CLIENT_ID" || -z "$CLIENT_SECRET" ]]; then
  warn "WDCLI_CLIENT_ID / WDCLI_CLIENT_SECRET not set. Enter them now."
  echo  "(Create a system user at https://developer.workday.com → your org → System Users)"
  echo
  read -rp "  WDCLI_CLIENT_ID:     " CLIENT_ID
  read -rsp "  WDCLI_CLIENT_SECRET: " CLIENT_SECRET
  echo
fi

[[ -n "$CLIENT_ID" && -n "$CLIENT_SECRET" ]] || error "Credentials are required."

# ── 2b. Collect tenant config ───────────────
# EXTEND_PROD_TENANT is required: the server refuses to start without it so the
# production-deploy guard can never be silently disarmed.
PROD_TENANT="${EXTEND_PROD_TENANT:-}"
SAFE_TENANTS="${EXTEND_SAFE_TENANTS:-}"

if [[ -z "$PROD_TENANT" ]]; then
  warn "EXTEND_PROD_TENANT not set. Enter it now."
  echo  "(Your production tenant alias — deploys to it are refused by the safety guard)"
  echo
  read -rp "  EXTEND_PROD_TENANT:  " PROD_TENANT
fi

[[ -n "$PROD_TENANT" ]] || error "EXTEND_PROD_TENANT is required — the server will not start without it."

# ── 3. Test credentials ─────────────────────
info "Testing credentials with Workday Developer Platform..."
if ! WDCLI_CLIENT_ID="$CLIENT_ID" WDCLI_CLIENT_SECRET="$CLIENT_SECRET" \
     wdcli auth login --system-user 2>&1 | grep -q "Logged in"; then
  error "Authentication failed. Check your WDCLI_CLIENT_ID and WDCLI_CLIENT_SECRET."
fi
info "Credentials verified ✓"

# ── 4. Clone / update repo ──────────────────
if [[ -d "$INSTALL_DIR/.git" ]]; then
  info "Updating existing install at $INSTALL_DIR ..."
  git -C "$INSTALL_DIR" pull --ff-only
else
  info "Cloning extend-mcp to $INSTALL_DIR ..."
  git clone "$REPO" "$INSTALL_DIR"
fi

# ── 5. Install dependencies ─────────────────
info "Installing npm dependencies..."
npm --prefix "$INSTALL_DIR" install --silent

# ── 6. Create work directory ────────────────
mkdir -p "$WORK_DIR"

# ── 7. Patch claude_desktop_config.json ─────
if [[ ! -f "$CONFIG_FILE" ]]; then
  warn "Claude Desktop config not found at $CONFIG_FILE"
  warn "Make sure Claude Desktop is installed: https://claude.ai/download"
  warn "Then add this to $CONFIG_FILE manually:"
  cat <<JSON
{
  "mcpServers": {
    "extend-mcp": {
      "command": "node",
      "args": ["$INSTALL_DIR/src/index.mjs"],
      "env": {
        "WDCLI_CLIENT_ID": "$CLIENT_ID",
        "WDCLI_CLIENT_SECRET": "$CLIENT_SECRET",
        "EXTEND_PROD_TENANT": "$PROD_TENANT",
        "EXTEND_SAFE_TENANTS": "$SAFE_TENANTS",
        "EXTEND_WORK_DIR": "$WORK_DIR"
      }
    }
  }
}
JSON
  exit 0
fi

# Use node to safely merge JSON (avoids Python/jq dependency).
# NB: with `node -` (script on stdin), argv[1] is "-", so real args start at argv[2].
node - "$CONFIG_FILE" "$INSTALL_DIR" "$CLIENT_ID" "$CLIENT_SECRET" "$WORK_DIR" "$PROD_TENANT" "$SAFE_TENANTS" <<'NODE'
const fs = require('fs');
const [file, dir, id, sec, work, prod, safe] = process.argv.slice(2);

let cfg = {};
try { cfg = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}

cfg.mcpServers = cfg.mcpServers || {};
cfg.mcpServers['extend-mcp'] = {
  command: 'node',
  args: [dir + '/src/index.mjs'],
  env: {
    WDCLI_CLIENT_ID:      id,
    WDCLI_CLIENT_SECRET:  sec,
    EXTEND_PROD_TENANT:   prod,
    EXTEND_SAFE_TENANTS:  safe,
    EXTEND_WORK_DIR:      work,
  }
};
fs.writeFileSync(file, JSON.stringify(cfg, null, 2) + '\n');
NODE

info "Claude Desktop config updated ✓"

# ── 8. Done ─────────────────────────────────
echo
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  extend-mcp installed successfully!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo
echo "  Installed at:  $INSTALL_DIR"
echo "  Work dir:      $WORK_DIR"
echo
echo "  Next step: Restart Claude Desktop (Cmd+Q, then reopen)"
echo "  Then ask Claude: 'list all Extend apps' to verify."
echo
