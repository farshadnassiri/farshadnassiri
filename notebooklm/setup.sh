#!/usr/bin/env bash
# Connect NotebookLM to Claude Code as an MCP server.
# Run this on your own machine (not in a remote/ephemeral session):
#   bash notebooklm/setup.sh
set -euo pipefail

SCOPE="${SCOPE:-user}"   # user | project | local

step() { printf '\n\033[1m==> %s\033[0m\n' "$1"; }

step "Checking prerequisites"
if ! command -v uv >/dev/null 2>&1; then
  echo "uv not found. Install it first:"
  echo "  curl -LsSf https://astral.sh/uv/install.sh | sh"
  exit 1
fi
export PATH="$HOME/.local/bin:$PATH"

step "Installing notebooklm-py (CLI + MCP server + browser login)"
uv tool install --upgrade "notebooklm-py[mcp,browser]"

step "Authenticating with Google"
if notebooklm auth check >/dev/null 2>&1; then
  echo "Already authenticated - skipping login."
else
  echo "A browser window will open. Sign in with the Google account that owns your notebooks."
  # --browser chrome avoids bundled-Chromium crashes on recent macOS.
  notebooklm login || notebooklm login --browser chrome
fi

step "Verifying access"
notebooklm auth check
notebooklm list

step "Registering the MCP server with Claude Code (scope: $SCOPE)"
if command -v claude >/dev/null 2>&1; then
  claude mcp remove notebooklm --scope "$SCOPE" >/dev/null 2>&1 || true
  claude mcp add notebooklm --scope "$SCOPE" -- notebooklm-mcp --transport stdio
  claude mcp list
else
  echo "The 'claude' CLI was not found; the repo's .mcp.json already declares the server"
  echo "for sessions started in this directory."
fi

step "Done"
echo "Start Claude Code and ask it to list your NotebookLM notebooks."
