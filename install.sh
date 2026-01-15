#!/bin/bash

# Claude Code Configuration System - Installer
# Installs the config manager and shell integration

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Get version from config-loader.js
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VERSION=$(grep "const VERSION" "$SCRIPT_DIR/config-loader.js" 2>/dev/null | sed "s/.*'\([^']*\)'.*/\1/" || echo "unknown")
INSTALL_DIR="${CLAUDE_CONFIG_INSTALL_DIR:-$HOME/.claude-config}"

# Check for --update flag (quick update without prompts)
UPDATE_ONLY=false
if [[ "$1" == "--update" ]] || [[ "$1" == "-u" ]]; then
  UPDATE_ONLY=true
fi

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║     Claude Code Configuration System v${VERSION}                  ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

if [[ "$UPDATE_ONLY" == true ]]; then
  echo -e "${YELLOW}Quick update mode${NC}\n"
fi

echo -e "${YELLOW}Installation directory: ${INSTALL_DIR}${NC}\n"

# Check for Node.js
if ! command -v node &> /dev/null; then
  echo -e "${RED}Error: Node.js is required but not installed.${NC}"
  echo "Please install Node.js first: https://nodejs.org/"
  exit 1
fi

# Create installation directory structure
echo -e "${BLUE}Installing files...${NC}"
mkdir -p "$INSTALL_DIR"
mkdir -p "$INSTALL_DIR/shared"
mkdir -p "$INSTALL_DIR/templates"
mkdir -p "$INSTALL_DIR/shell"
mkdir -p "$INSTALL_DIR/bin"
mkdir -p "$INSTALL_DIR/ui"

# Copy core files
cp "$SCRIPT_DIR/config-loader.js" "$INSTALL_DIR/"
cp "$SCRIPT_DIR/shell/claude-config.zsh" "$INSTALL_DIR/shell/"
cp "$SCRIPT_DIR/bin/claude-config" "$INSTALL_DIR/bin/" 2>/dev/null || mkdir -p "$INSTALL_DIR/bin" && cp "$SCRIPT_DIR/bin/claude-config" "$INSTALL_DIR/bin/"
chmod +x "$INSTALL_DIR/bin/claude-config"

# Copy shared files (MCP registry)
cp "$SCRIPT_DIR/shared/mcp-registry.json" "$INSTALL_DIR/shared/"

# Copy templates (entire directory structure)
if [[ -d "$SCRIPT_DIR/templates" ]]; then
  cp -r "$SCRIPT_DIR/templates/"* "$INSTALL_DIR/templates/" 2>/dev/null || true
fi

# Copy UI files (server and dist)
if [[ -d "$SCRIPT_DIR/ui" ]]; then
  # Copy server files
  cp "$SCRIPT_DIR/ui/server.cjs" "$INSTALL_DIR/ui/" 2>/dev/null || true
  cp "$SCRIPT_DIR/ui/terminal-server.cjs" "$INSTALL_DIR/ui/" 2>/dev/null || true
  cp "$SCRIPT_DIR/ui/package.json" "$INSTALL_DIR/ui/" 2>/dev/null || true

  # Build UI if needed (--update always rebuilds, or if dist doesn't exist)
  if [[ "$UPDATE_ONLY" == true ]] || [[ ! -d "$SCRIPT_DIR/ui/dist" ]]; then
    if [[ "$UPDATE_ONLY" == true ]]; then
      echo -e "${YELLOW}Building UI with version bump...${NC}"
    else
      echo -e "${YELLOW}UI not built. Building now...${NC}"
    fi
    (cd "$SCRIPT_DIR" && npm run build)
    # Re-read version after build (it may have been bumped)
    VERSION=$(grep "const VERSION" "$SCRIPT_DIR/config-loader.js" 2>/dev/null | sed "s/.*'\([^']*\)'.*/\1/" || echo "unknown")
    # Re-copy config-loader.js with updated version
    cp "$SCRIPT_DIR/config-loader.js" "$INSTALL_DIR/"
    echo -e "${GREEN}✓ Updated to v${VERSION}${NC}"
  fi

  # Copy built UI (dist folder) - this is required for the web UI
  if [[ -d "$SCRIPT_DIR/ui/dist" ]]; then
    mkdir -p "$INSTALL_DIR/ui/dist"
    cp -r "$SCRIPT_DIR/ui/dist/"* "$INSTALL_DIR/ui/dist/"
    echo -e "${GREEN}✓ UI dist copied${NC}"
  else
    echo -e "${RED}✗ UI build failed. Check npm run build output.${NC}"
  fi
fi

# Create global .env file if it doesn't exist
if [[ ! -f "$INSTALL_DIR/shared/.env" ]]; then
  cat > "$INSTALL_DIR/shared/.env" << 'EOF'
# Global secrets for all projects
# Add tokens here that you want available everywhere

# GITHUB_TOKEN=ghp_xxx
# GITLAB_TOKEN=glpat-xxx
EOF
  echo -e "${GREEN}✓ Created shared/.env template${NC}"
fi

echo -e "${GREEN}✓ Files installed to $INSTALL_DIR${NC}"

# Detect shell
SHELL_NAME=$(basename "$SHELL")
SHELL_RC=""

case "$SHELL_NAME" in
  zsh)
    SHELL_RC="$HOME/.zshrc"
    ;;
  bash)
    SHELL_RC="$HOME/.bashrc"
    echo -e "${YELLOW}Note: Shell hook is optimized for zsh. Bash support is limited.${NC}"
    ;;
  *)
    echo -e "${YELLOW}Unknown shell: $SHELL_NAME. Manual setup required.${NC}"
    ;;
esac

# Add to shell RC
if [[ -n "$SHELL_RC" ]]; then
  echo -e "\n${BLUE}Configuring shell integration...${NC}"

  SOURCE_LINE="source \"$INSTALL_DIR/shell/claude-config.zsh\""
  EXPORT_LINE="export CLAUDE_CONFIG_LOADER=\"$INSTALL_DIR/config-loader.js\""

  if grep -q "claude-config.zsh" "$SHELL_RC" 2>/dev/null; then
    echo -e "${YELLOW}Shell integration already configured in $SHELL_RC${NC}"
  else
    echo "" >> "$SHELL_RC"
    echo "# Claude Code Configuration System" >> "$SHELL_RC"
    echo "$EXPORT_LINE" >> "$SHELL_RC"
    echo "$SOURCE_LINE" >> "$SHELL_RC"
    echo -e "${GREEN}✓ Added to $SHELL_RC${NC}"
  fi
fi

# Done
echo -e "\n${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          Installation Complete! (v${VERSION})                      ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"

# If update mode, show simpler output
if [[ "$UPDATE_ONLY" == true ]]; then
  echo -e "\n${GREEN}Updated to v${VERSION}${NC}"
  echo -e "Restart the UI server: ${YELLOW}claude-config ui${NC}"
  exit 0
fi

echo -e "\n${BLUE}Next steps:${NC}"
echo -e "  1. Add to your PATH (choose one):"
echo -e "     ${YELLOW}ln -sf $INSTALL_DIR/bin/claude-config ~/bin/claude-config${NC}"
echo -e "     ${YELLOW}# OR add to ~/.zshrc: export PATH=\"$INSTALL_DIR/bin:\$PATH\"${NC}"
echo -e "  2. (Optional) Source shell hook for auto-apply on cd:"
echo -e "     ${YELLOW}source $INSTALL_DIR/shell/claude-config.zsh${NC}"
echo -e "  3. In your project, run: ${YELLOW}claude-config init${NC}"
echo -e "     Or with a template: ${YELLOW}claude-config init --template fastapi${NC}"
echo ""
echo -e "${BLUE}Commands:${NC}"
echo -e "  ${YELLOW}claude-config init${NC}        - Initialize project with config"
echo -e "  ${YELLOW}claude-config apply${NC}       - Generate .mcp.json from config"
echo -e "  ${YELLOW}claude-config list${NC}        - List available MCPs"
echo -e "  ${YELLOW}claude-config templates${NC}   - List available templates"
echo -e "  ${YELLOW}claude-config show${NC}        - Display current configuration"
echo -e "  ${YELLOW}claude-config add <mcp>${NC}   - Add MCP to project"
echo -e "  ${YELLOW}claude-config version${NC}     - Show version info"
echo ""
echo -e "The shell hook auto-applies configs when you cd into a project."
echo -e "To disable: ${YELLOW}claude-config auto off${NC}"
echo ""
