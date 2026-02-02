# Coder Config - ZSH Shell Integration
# Add to ~/.zshrc:  source /path/to/coder-config.zsh
# Or run: coder-config shell install

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

# =============================================================================
# COMPLETIONS
# =============================================================================

# Helper: get workstream names
_coder_config_workstreams() {
  local ws_file="$HOME/.coder-config/workstreams.json"
  if [[ -f "$ws_file" ]]; then
    # Extract workstream names from JSON
    grep -o '"name"[[:space:]]*:[[:space:]]*"[^"]*"' "$ws_file" 2>/dev/null | \
      sed 's/"name"[[:space:]]*:[[:space:]]*"//' | sed 's/"$//' | tr '\n' ' '
  fi
}

# Helper: get MCP names from registry
_coder_config_mcps() {
  local registry_file="$HOME/.coder-config/registry.json"
  if [[ -f "$registry_file" ]]; then
    grep -o '"[^"]*"[[:space:]]*:' "$registry_file" 2>/dev/null | \
      sed 's/"//g' | sed 's/[[:space:]]*:$//' | grep -v '^\$' | tr '\n' ' '
  fi
}

# Helper: get project names
_coder_config_projects() {
  local proj_file="$HOME/.coder-config/projects.json"
  if [[ -f "$proj_file" ]]; then
    grep -o '"name"[[:space:]]*:[[:space:]]*"[^"]*"' "$proj_file" 2>/dev/null | \
      sed 's/"name"[[:space:]]*:[[:space:]]*"//' | sed 's/"$//' | tr '\n' ' '
  fi
}

# Helper: get loop IDs
_coder_config_loops() {
  local loops_dir="$HOME/.coder-config/loops"
  if [[ -d "$loops_dir" ]]; then
    ls -1 "$loops_dir" 2>/dev/null | tr '\n' ' '
  fi
}

# Helper: get memory types
_coder_config_memory_types() {
  echo "preference correction fact context pattern decision issue history"
}

# Main completion function
_coder_config() {
  local curcontext="$curcontext" state line
  typeset -A opt_args

  local -a commands
  commands=(
    'init:Initialize project with .claude/mcps.json'
    'apply:Generate .mcp.json from config'
    'show:Show current project config'
    'list:List available MCPs (✓ = active)'
    'add:Add MCP(s) to project'
    'remove:Remove MCP(s) from project'
    'global:Manage global MCPs (~/.claude.json)'
    'registry:Manage MCP registry'
    'memory:Manage memory files'
    'env:Manage environment variables'
    'project:Manage project registry'
    'workstream:Manage workstreams'
    'loop:Manage Ralph Loops'
    'session:Manage session context'
    'migrate:Migrate legacy configs'
    'update:Check and install updates'
    'ui:Start/manage web UI'
    'shell:Manage shell integration'
    'auto:Toggle auto-apply on cd'
    'version:Show version info'
    'help:Show help message'
  )

  _arguments -C \
    '(-v --version)'{-v,--version}'[Show version]' \
    '(-h --help)'{-h,--help}'[Show help]' \
    '1: :->command' \
    '*:: :->args'

  case $state in
    command)
      _describe -t commands 'coder-config command' commands
      ;;
    args)
      case $line[1] in
        # MCP management
        add)
          local mcps=($(_coder_config_mcps))
          _values 'MCP' $mcps
          ;;
        remove|rm)
          local mcps=($(_coder_config_mcps))
          _values 'MCP' $mcps
          ;;

        # Global MCPs
        global)
          local -a global_cmds
          global_cmds=(
            'add:Add MCP(s) to global config'
            'remove:Remove MCP from global config'
          )
          if (( CURRENT == 2 )); then
            _describe -t commands 'global subcommand' global_cmds
          elif (( CURRENT >= 3 )); then
            local mcps=($(_coder_config_mcps))
            _values 'MCP' $mcps
          fi
          ;;

        # Registry
        registry)
          local -a registry_cmds
          registry_cmds=(
            'add:Add MCP to registry'
            'remove:Remove MCP from registry'
          )
          if (( CURRENT == 2 )); then
            _describe -t commands 'registry subcommand' registry_cmds
          elif (( CURRENT >= 3 )) && [[ $line[2] == "remove" ]]; then
            local mcps=($(_coder_config_mcps))
            _values 'MCP' $mcps
          fi
          ;;

        # Memory
        memory)
          local -a memory_cmds
          memory_cmds=(
            'init:Initialize project memory'
            'add:Add entry to memory'
            'search:Search all memory files'
          )
          if (( CURRENT == 2 )); then
            _describe -t commands 'memory subcommand' memory_cmds
          elif (( CURRENT == 3 )) && [[ $line[2] == "add" ]]; then
            local types=($(_coder_config_memory_types))
            _values 'type' $types
          fi
          ;;

        # Environment
        env)
          local -a env_cmds
          env_cmds=(
            'set:Set variable in .claude/.env'
            'unset:Remove variable'
          )
          if (( CURRENT == 2 )); then
            _describe -t commands 'env subcommand' env_cmds
          fi
          ;;

        # Projects
        project|projects)
          local -a project_cmds
          project_cmds=(
            'add:Add project to registry'
            'remove:Remove project from registry'
          )
          if (( CURRENT == 2 )); then
            _describe -t commands 'project subcommand' project_cmds
          elif (( CURRENT == 3 )); then
            if [[ $line[2] == "add" ]]; then
              _files -/
            elif [[ $line[2] == "remove" ]]; then
              local projects=($(_coder_config_projects))
              _values 'project' $projects
            fi
          fi
          ;;

        # Workstreams
        workstream|ws)
          local -a ws_cmds
          ws_cmds=(
            'create:Create new workstream'
            'delete:Delete workstream'
            'use:Set active workstream (this session)'
            'add:Add project to workstream'
            'remove:Remove project from workstream'
            'deactivate:Deactivate current workstream'
            'active:Show active workstream'
            'detect:Detect workstream for path'
            'inject:Inject workstream context'
            'install-hook:Install pre-prompt hook'
            'install-cd-hook:Install cd auto-activation hook'
            'uninstall-cd-hook:Remove cd hook'
            'cd-hook-status:Check cd hook status'
            'add-trigger:Add trigger folder'
            'remove-trigger:Remove trigger folder'
            'auto-activate:Set auto-activation mode'
            'check-folder:Check folder for workstream'
            'check-path:Check if path is in workstream'
          )
          if (( CURRENT == 2 )); then
            _describe -t commands 'workstream subcommand' ws_cmds
          elif (( CURRENT == 3 )); then
            case $line[2] in
              use|switch|delete|rm|add-trigger|remove-trigger|auto-activate)
                local workstreams=($(_coder_config_workstreams))
                _values 'workstream' $workstreams
                ;;
              add|remove)
                local workstreams=($(_coder_config_workstreams))
                _values 'workstream' $workstreams
                ;;
              detect|check-folder|check-path)
                _files -/
                ;;
              install-hook)
                _values 'option' '--gemini' '--codex' '--all'
                ;;
            esac
          elif (( CURRENT == 4 )); then
            case $line[2] in
              add|remove|add-trigger|remove-trigger)
                _files -/
                ;;
              auto-activate)
                _values 'mode' 'on' 'off' 'default'
                ;;
            esac
          fi
          ;;

        # Loops
        loop|loops)
          local -a loop_cmds
          loop_cmds=(
            'create:Create new loop'
            'start:Start/resume a loop'
            'pause:Pause loop'
            'resume:Resume loop'
            'cancel:Cancel loop'
            'approve:Approve loop plan'
            'complete:Mark loop complete'
            'delete:Delete loop'
            'status:Show loop status'
            'history:Show loop history'
            'config:Show/set loop config'
            'inject:Inject loop context'
            'active:Show active loop'
          )
          if (( CURRENT == 2 )); then
            _describe -t commands 'loop subcommand' loop_cmds
          elif (( CURRENT == 3 )); then
            case $line[2] in
              start|pause|resume|cancel|approve|complete|delete|rm|status)
                local loops=($(_coder_config_loops))
                _values 'loop' $loops
                ;;
              config)
                _values 'option' '--max-iterations' '--auto-approve-plan' '--no-auto-approve-plan'
                ;;
            esac
          fi
          ;;

        # Session
        session)
          local -a session_cmds
          session_cmds=(
            'clear:Clear saved context'
            'install:Install hooks and /flush'
          )
          _describe -t commands 'session subcommand' session_cmds
          ;;

        # UI
        ui)
          local -a ui_cmds
          ui_cmds=(
            'start:Start the UI server'
            'stop:Stop the daemon'
            'status:Check daemon status'
            'install:Install auto-start (macOS)'
            'uninstall:Remove auto-start'
          )
          if (( CURRENT == 2 )); then
            _describe -t commands 'ui subcommand' ui_cmds
          elif (( CURRENT >= 3 )); then
            _values 'option' '--port' '--foreground' '--dir'
          fi
          ;;

        # Shell
        shell)
          local -a shell_cmds
          shell_cmds=(
            'install:Add shell integration to ~/.zshrc'
            'uninstall:Remove shell integration from ~/.zshrc'
            'status:Check shell integration status'
          )
          _describe -t commands 'shell subcommand' shell_cmds
          ;;

        # Auto
        auto)
          _values 'mode' 'on' 'off'
          ;;

        # Migrate
        migrate)
          _values 'option' '--force' '--remove'
          ;;
      esac
      ;;
  esac
}

compdef _coder_config coder-config
compdef _coder_config claude-config

# =============================================================================
# CD HOOK PASSTHROUGH (for workstream auto-activation)
# =============================================================================

# Allow normal cd completion to work when workstream cd hook is active
if (( $+functions[_coder_config_cd_hook] )); then
  compdef _cd cd 2>/dev/null
fi

# =============================================================================
# INITIALIZATION
# =============================================================================

# Run auto-apply hook on shell start
_coder_config_chpwd_hook
