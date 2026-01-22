# Claude Config

Configuration helper for **Claude Code** — manage MCPs, rules, permissions, and memory through a visual UI or CLI.

## Why?

Claude Code works great out of the box. This tool helps when you need more control:

| | |
|---|---|
| **MCP Servers** | Configure without editing JSON files |
| **Permissions** | Visual editor for allow/deny rules |
| **MCP Tool Permissions** | Discover and control individual MCP tools |
| **Rules & Commands** | Manage project-specific guidelines |
| **Memory** | Persistent context across sessions |
| **Multi-Project** | Share configurations via hierarchy |

## Installation

```bash
npm install -g @regression-io/claude-config
```

Requires Node.js 18+.

## Quick Start

```bash
# 1. Install
npm install -g @regression-io/claude-config

# 2. Set up auto-start (recommended)
claude-config ui install

# 3. Open the UI
open http://localhost:3333
```

The server starts automatically on login. Install as a PWA from your browser for app-like access.

### Updating

```bash
claude-config update
# Then restart: claude-config ui stop && claude-config ui
```

### CLI Alternative

```bash
# Initialize a project
claude-config init

# Add MCPs to your project
claude-config add postgres github

# Generate .mcp.json for Claude Code
claude-config apply
```

## CLI Commands

### Project Commands

```bash
claude-config init                        # Initialize project
claude-config apply                       # Generate .mcp.json from config
claude-config show                        # Show current project config
claude-config list                        # List available MCPs (✓ = active)
claude-config add <mcp> [mcp...]          # Add MCP(s) to project
claude-config remove <mcp> [mcp...]       # Remove MCP(s) from project
```

### Memory Commands

```bash
claude-config memory                         # Show memory status
claude-config memory init                    # Initialize project memory
claude-config memory add <type> "<content>"  # Add entry
claude-config memory search <query>          # Search all memory

# Types: preference, correction, fact (global)
#        context, pattern, decision, issue, history (project)
```

### Environment Commands

```bash
claude-config env                    # List environment variables
claude-config env set <KEY> <value>  # Set variable in .claude/.env
claude-config env unset <KEY>        # Remove variable
```

### Project Commands

```bash
claude-config project                      # List registered projects
claude-config project add [path]           # Add project (defaults to cwd)
claude-config project add [path] --name X  # Add with custom display name
claude-config project remove <name|path>   # Remove from registry
```

### Workstream Commands

```bash
claude-config workstream                   # List all workstreams
claude-config workstream create "Name"     # Create new workstream
claude-config workstream delete <name>     # Delete workstream
claude-config workstream use <name>        # Activate workstream (this terminal)
claude-config workstream active            # Show current active workstream
claude-config workstream deactivate        # Deactivate workstream (this terminal)
claude-config workstream add <ws> <path>   # Add project to workstream
claude-config workstream remove <ws> <path>  # Remove project from workstream
claude-config workstream inject [--silent] # Output restriction + context (for hooks)
claude-config workstream detect [path]     # Detect workstream for directory
claude-config workstream check-path <path> # Check if path is within workstream (exit 0/1)
claude-config workstream install-hook      # Install hook for Claude Code
claude-config workstream install-hook --gemini  # Install hook for Gemini CLI
claude-config workstream install-hook --all     # Install hooks for all supported tools
```

**Per-terminal isolation**: With [shell integration](#shell-integration), each terminal can have its own active workstream:
```bash
# Terminal 1
claude-config workstream use project-a

# Terminal 2
claude-config workstream use project-b
```

When active, the AI receives a restriction telling it to only work within the workstream's directories.

**Multi-tool support**: Workstreams work with Claude Code, Gemini CLI, and Codex CLI. Install hooks for your preferred tool(s):
```bash
# For Claude Code only
claude-config workstream install-hook

# For Gemini CLI only
claude-config workstream install-hook --gemini

# For Codex CLI only
claude-config workstream install-hook --codex

# For all supported tools
claude-config workstream install-hook --all
```

### Registry Commands

```bash
claude-config registry                       # List MCPs in global registry
claude-config registry add <name> '<json>'   # Add MCP to global registry
claude-config registry remove <name>         # Remove MCP from registry
```

### Updates

```bash
claude-config update             # Check npm and install updates if available
claude-config update --check     # Check for updates without installing
claude-config update /path/src   # Update from local development source
```

The UI also checks for updates automatically and shows a notification when a new version is available.

### Web UI

```bash
claude-config ui                    # Start UI on port 3333
claude-config ui --port 8080        # Custom port
claude-config ui /path/to/project   # Specific project directory
claude-config ui --foreground       # Run in foreground (blocking)
claude-config ui status             # Check if daemon is running
claude-config ui stop               # Stop the daemon

# Auto-start on login (macOS)
claude-config ui install            # Install LaunchAgent for auto-start
claude-config ui uninstall          # Remove auto-start
```

**Daemon Mode**: By default, `claude-config ui` runs as a background daemon.
The UI runs from your home directory and persists across terminal sessions.
Switch between registered projects using the dropdown in the header.

**PWA / Auto-Start**: Install the UI as a PWA in your browser, then run `claude-config ui install`
to have the server start automatically on login. Your PWA will always connect instantly.

## Shell Integration

For full functionality, add to `~/.zshrc`:

```bash
source /path/to/claude-config/shell/claude-config.zsh
```

This enables:
- **Per-terminal workstreams** - `workstream use` activates for current terminal only
- Auto-generates `.mcp.json` when entering a project with `.claude/mcps.json`
- Tab completion for all commands

## Configuration Hierarchy

Settings merge from global to project to sub-project:

```
~/.claude/mcps.json                    # Global - applies everywhere
~/projects/.claude/mcps.json           # Workspace - applies to projects here
~/projects/my-app/.claude/             # Project - specific to this project
~/projects/my-app/server/.claude/      # Sub-project - inherits from parent
```

Sub-projects are automatically detected (folders with `.git`), or you can manually link any folder using "Add Sub-project" in the Web UI.

## Project Structure

After `claude-config init`:

```
your-project/
├── .claude/
│   ├── mcps.json       # MCP configuration
│   ├── settings.json   # Claude Code settings
│   ├── rules/          # Project rules (*.md)
│   └── commands/       # Custom commands (*.md)
└── .mcp.json           # Generated - Claude Code reads this
```

## MCP Configuration

`.claude/mcps.json`:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

Environment variables use `${VAR}` syntax and load from `.claude/.env`.

## Memory System

Persistent memory for Claude Code sessions.

**Global** (`~/.claude/memory/`)

| File | Purpose |
|------|---------|
| `preferences.md` | User preferences and style |
| `corrections.md` | Mistakes to avoid |
| `facts.md` | Environment facts |

**Project** (`<project>/.claude/memory/`)

| File | Purpose |
|------|---------|
| `context.md` | Project overview |
| `patterns.md` | Code patterns |
| `decisions.md` | Architecture decisions |
| `issues.md` | Known issues |
| `history.md` | Session history |

Manage via Web UI or edit files directly.

## Workstreams

Workstreams are **context sets** for multi-project workflows. They group related projects and inject context rules into every Claude session.

### Why Workstreams?

When working on complex features that span multiple repos (e.g., REST API + UI + shared library), you need Claude to understand the broader context. Workstreams solve this by:

1. Grouping related projects together
2. Defining rules specific to that workflow
3. Automatically injecting those rules into every Claude session

### Example

```bash
# Create a workstream for user authentication feature
claude-config workstream create "User Auth"

# Add related projects
claude-config workstream add "User Auth" ~/projects/api
claude-config workstream add "User Auth" ~/projects/ui
claude-config workstream add "User Auth" ~/projects/shared

# Activate it
claude-config workstream use "User Auth"
```

Then in the Web UI, edit the workstream to add rules like:
> Focus on user authentication flow. Use JWT tokens. React Query for state management. PostgreSQL for persistence.

### Hook Integration

For rules to be injected automatically, install the pre-prompt hook:

**Option 1: One-click install (recommended)**
- Open Web UI → Workstreams → Click "Install Hook Automatically"

**Option 2: Manual**
```bash
# Add to ~/.claude/hooks/pre-prompt.sh
claude-config workstream inject --silent
```

Once installed, your active workstream's rules are prepended to every Claude session.

### Activity Tracking & Suggestions

Claude-config can track which files you work on and suggest workstreams based on patterns:

**How it works:**
1. A post-response hook logs file paths accessed during Claude sessions
2. Co-activity patterns are detected (projects frequently worked on together)
3. Workstream suggestions appear in the UI based on these patterns

**Setup (optional):**
```bash
# Install the activity tracking hook
# Add to ~/.claude/hooks/post-response.sh:
source /path/to/claude-config/hooks/activity-track.sh
```

**In the Web UI:**
- Activity Insights panel shows sessions, files tracked, and active projects
- Suggested Workstreams appear when patterns are detected
- Click "Create" to open pre-filled dialog (tweak projects as needed)
- Click "X" to dismiss suggestions you don't want

## Web UI Features

| Feature | Description |
|---------|-------------|
| **Project Explorer** | Browse and edit `.claude/` folders across your project hierarchy |
| **Claude Code Settings** | Visual editor for permissions, model, hooks, and behavior |
| **Gemini CLI Settings** | Configure model, display options, and sandbox mode |
| **Codex CLI Settings** | Configure model, security, MCP servers, and features |
| **Antigravity Settings** | Configure security policies, browser allowlist, and agent mode |
| **MCP Registry** | Search GitHub/npm, add and configure MCP servers |
| **Plugins** | Browse marketplaces, install plugins with scope control |
| **Memory** | Manage preferences, corrections, patterns, and decisions |
| **Workstreams** | Group related projects with shared context rules |

Additional features: project/workstream switchers in header, sub-project detection, dark mode, auto-updates.

## Plugins

Claude Code plugins extend functionality with LSP servers, MCP servers, commands, and always-on guidance. **Plugins replace templates** - instead of static files that can become stale, plugins are always active and update automatically.

### Why Plugins Over Templates?

| Aspect | Plugins |
|--------|---------|
| Delivery | Enable plugin once |
| Updates | Auto-refresh from marketplace |
| Freshness | Always current |
| Scope | Global, project, or local |
| Discovery | Browse marketplaces |

### Installing Plugins

**From CLI:**
```bash
# Add the claude-config plugins marketplace
claude plugin marketplace add regression-io/claude-config-plugins

# Install framework-specific plugins
claude plugin install fastapi-support@claude-config-plugins
claude plugin install react-typescript@claude-config-plugins
claude plugin install python-support@claude-config-plugins
```

**From Web UI:**
1. Open Project Explorer
2. Click the **+** menu on any project folder
3. Select **Install Plugins**
4. Toggle plugins on/off with scope selection (Project/Global/Local)

### Plugin Directory

The **Plugins** page shows all available plugins:
- Filter by marketplace, category, source type (Anthropic/Community), installed status
- Search by name or description
- View plugin details (LSP/MCP/Commands included)

### Marketplaces

Plugins come from marketplaces (Git repositories):
- **claude-plugins-official** - Anthropic's official plugins
- **regression-io/claude-config-plugins** - Framework and language plugins
- Add community marketplaces via "Manage Marketplaces" in the filter dropdown

Supported marketplace formats:
- `owner/repo` — GitHub shorthand
- `https://github.com/owner/repo` — Full URL
- `/local/path` — Local directory

## Claude Code Settings

The Web UI provides a visual editor for `~/.claude/settings.json`:

### Permissions
Configure what Claude Code can do automatically:
- **Allow** - Tools that run without asking
- **Ask** - Tools that require confirmation
- **Deny** - Tools that are blocked

Pattern examples:
```
Bash(npm run build)      # Specific command
Bash(npm:*)              # Prefix match (npm anything)
Read(**)                 # All file reads
Edit(src/**)             # Edit files in src/
mcp__github__*           # All GitHub MCP tools
```

### Model Selection
Choose your preferred Claude model (Sonnet 4, Opus 4.5, etc.)

### Behavior
- Auto-accept edits
- Verbose mode
- Enable/disable MCP servers

## Gemini CLI Settings

The Web UI provides a visual editor for `~/.gemini/settings.json`:

### Model Selection
Choose Gemini model (2.5 Pro, 2.5 Flash, etc.) and enable preview features.

### Display Options
Configure theme, token count display, diff view, and streaming.

### General Settings
- Vim keybindings
- Auto-save
- Check for updates

### Sandbox Mode
Control command execution safety (enabled/disabled).

## Codex CLI Settings

The Web UI provides a visual editor for `~/.codex/config.toml`:

### Model Settings
- **Model** - Select GPT-5.2 Codex, GPT-5, o3-mini, etc.
- **Reasoning Effort** - Control thoroughness (minimal to xhigh)

### Security
- **Approval Policy** - When to ask for command approval (on-request, untrusted, on-failure, never)
- **Sandbox Mode** - Filesystem access level (read-only, workspace-write, full-access)

### MCP Servers
Configure MCP servers for Codex CLI with the same format as other tools.

### Features
Toggle feature flags like shell snapshots and web search.

### Display & History
Configure TUI animations, notifications, and session history persistence.

For full configuration options, see [Codex CLI docs](https://developers.openai.com/codex/config-reference/).

## Antigravity Settings

The Web UI provides a visual editor for `~/.gemini/antigravity/settings.json`:

### Security Policies
| Policy | Options |
|--------|---------|
| **Terminal Execution** | Off, Auto, Turbo |
| **Code Review** | Enabled, Disabled |
| **JS Execution** | Sandboxed, Direct |

### MCP Servers
Configure MCP servers for Antigravity. Note: Antigravity does NOT support `${VAR}` interpolation - variables are resolved to actual values.

### Browser Allowlist
Control which URLs Antigravity can access during sessions.

### Agent Mode
Configure autonomous multi-step operations, iteration limits, and confirmation requirements.

## Preferences

User settings stored in `~/.claude-config/config.json`:

```json
{
  "toolsDir": "~/mcp-tools",
  "registryPath": "~/.claude/registry.json",
  "ui": {
    "port": 3333,
    "openBrowser": true
  }
}
```

| Key | Description |
|-----|-------------|
| `toolsDir` | Directory for local MCP tools |
| `registryPath` | Path to custom MCP registry |
| `ui.port` | Default port for web UI |
| `ui.openBrowser` | Auto-open browser on `claude-config ui` |

## Requirements

- Node.js 18+
- Build tools (for newer Node.js versions without prebuilt binaries):
  - **macOS**: Xcode Command Line Tools (`xcode-select --install`)
  - **Linux**: `build-essential` package
  - **Windows**: Visual Studio Build Tools

## Development

```bash
git clone https://github.com/regression-io/claude-config.git
cd claude-config
npm install
npm run build
npm start
```

## License

MIT
