# Coder Config - ZSH Shell Integration
# Add to ~/.zshrc:  source /path/to/coder-config.zsh

# =============================================================================
# CONFIGURATION
# =============================================================================

CODER_CONFIG_LOADER="${CODER_CONFIG_LOADER:-$HOME/.coder-config/config-loader.js}"
CODER_CONFIG_AUTO_APPLY="${CODER_CONFIG_AUTO_APPLY:-true}"
CODER_CONFIG_VERBOSE="${CODER_CONFIG_VERBOSE:-true}"
_CODER_CONFIG_LAST_DIR=""

# =============================================================================
# MAIN COMMAND - Pass everything to Node
# =============================================================================

coder-config() {
  if [[ ! -f "$CODER_CONFIG_LOADER" ]]; then
    echo "Error: config-loader.js not found at $CODER_CONFIG_LOADER"
    return 1
  fi

  # Special case: auto on/off is shell-only
  if [[ "$1" == "auto" ]]; then
    case "$2" in
      on)  CODER_CONFIG_AUTO_APPLY="true"; echo "Auto-apply enabled" ;;
      off) CODER_CONFIG_AUTO_APPLY="false"; echo "Auto-apply disabled" ;;
      *)   echo "Auto-apply is: $CODER_CONFIG_AUTO_APPLY" ;;
    esac
    return
  fi

  # Special case: workstream use sets env var for per-session isolation
  if [[ "$1" == "workstream" && "$2" == "use" && -n "$3" ]]; then
    export CODER_WORKSTREAM="$3"
    echo "✓ Activated workstream: $3 (this session)"
    return
  fi

  # Special case: workstream deactivate unsets env var
  if [[ "$1" == "workstream" && "$2" == "deactivate" ]]; then
    unset CODER_WORKSTREAM
    echo "✓ Deactivated workstream (this session)"
    return
  fi

  # Pass all other commands to Node
  node "$CODER_CONFIG_LOADER" "$@"
}

# Alias for backward compatibility
alias claude-config='coder-config'

# =============================================================================
# AUTO-APPLY HOOK
# =============================================================================

_coder_config_chpwd_hook() {
  [[ "$CODER_CONFIG_AUTO_APPLY" != "true" ]] && return
  [[ "$PWD" == "$_CODER_CONFIG_LAST_DIR" ]] && return

  local check_dir="$PWD"
  local found_config=""

  # Find nearest .claude/mcps.json
  while [[ "$check_dir" != "/" ]]; do
    if [[ -f "$check_dir/.claude/mcps.json" ]]; then
      found_config="$check_dir"
      break
    fi
    check_dir="$(dirname "$check_dir")"
  done

  if [[ -n "$found_config" && "$found_config" != "$_CODER_CONFIG_LAST_DIR" ]]; then
    _CODER_CONFIG_LAST_DIR="$found_config"

    # Check if .mcp.json needs updating
    local config_mtime=$(stat -f %m "$found_config/.claude/mcps.json" 2>/dev/null || stat -c %Y "$found_config/.claude/mcps.json" 2>/dev/null)
    local mcp_mtime=$(stat -f %m "$found_config/.mcp.json" 2>/dev/null || stat -c %Y "$found_config/.mcp.json" 2>/dev/null || echo "0")

    if [[ "$config_mtime" -gt "$mcp_mtime" ]] || [[ ! -f "$found_config/.mcp.json" ]]; then
      [[ "$CODER_CONFIG_VERBOSE" == "true" ]] && echo "🔄 Applying Coder Config..."
      (cd "$found_config" && node "$CODER_CONFIG_LOADER" apply > /dev/null 2>&1)
      if [[ "$CODER_CONFIG_VERBOSE" == "true" ]]; then
        local mcp_count=$(grep -c '"command"' "$found_config/.mcp.json" 2>/dev/null || echo "0")
        echo "✓ Loaded $mcp_count MCPs"
      fi
    fi
  fi
}

autoload -Uz add-zsh-hook
add-zsh-hook chpwd _coder_config_chpwd_hook

# Completions
_coder_config_completions() {
  local -a commands
  commands=(
    'init:Initialize project with template'
    'apply:Generate .mcp.json from config'
    'show:Show current project config'
    'list:List available MCPs'
    'add:Add MCP(s) to project'
    'remove:Remove MCP(s) from project'
    'workstream:Manage workstreams'
    'project:Manage projects'
    'memory:Manage memory'
    'env:Manage environment variables'
    'registry:Manage MCP registry'
    'update:Check and install updates'
    'ui:Start web UI'
    'version:Show version info'
    'auto:Toggle auto-apply on cd'
  )
  _describe 'command' commands
}
compdef _coder_config_completions coder-config
compdef _coder_config_completions claude-config

# Run on shell start
_coder_config_chpwd_hook
