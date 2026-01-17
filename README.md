# Claude Config

Configuration management for **Claude Code** with CLI and optional Web UI.

## Installation

```bash
npm install -g @regression-io/claude-config
```

Or from GitHub:
```bash
npm install -g github:regression-io/claude-config
```

## Updating

```bash
npm update -g @regression-io/claude-config
```

The Web UI automatically detects when updates are available and shows a notification in the Preferences page.

## Quick Start

```bash
# Initialize a project with a template
claude-config init --template fastapi

# Add MCPs to your project
claude-config add postgres github

# Generate .mcp.json for Claude Code
claude-config apply

# Or open the Web UI
claude-config ui
```

## CLI Commands

### Project Commands

```bash
claude-config init [--template <name>]   # Initialize project
claude-config apply                       # Generate .mcp.json from config
claude-config apply-template <name>       # Add template to existing project
claude-config show                        # Show current project config
claude-config list                        # List available MCPs (✓ = active)
claude-config templates                   # List available templates
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
claude-config workstream use <name>        # Set active workstream
claude-config workstream active            # Show current active workstream
claude-config workstream add-project <ws> <path>     # Add project to workstream
claude-config workstream remove-project <ws> <path>  # Remove project from workstream
claude-config workstream inject [--silent] # Output active workstream rules (for hooks)
claude-config workstream detect [path]     # Detect workstream for directory
```

### Registry Commands

```bash
claude-config registry-add <name> '<json>'   # Add MCP to global registry
claude-config registry-remove <name>         # Remove MCP from registry
```

### Web UI

```bash
claude-config ui                    # Start UI on port 3333
claude-config ui --port 8080        # Custom port
claude-config ui /path/to/project   # Specific project directory
claude-config ui --foreground       # Run in foreground (blocking)
claude-config ui status             # Check if daemon is running
claude-config ui stop               # Stop the daemon
```

**Daemon Mode**: By default, `claude-config ui` runs as a background daemon.
The UI runs from your home directory and persists across terminal sessions.
Switch between registered projects using the dropdown in the header.

## Templates

Initialize projects with pre-configured rules and settings:

```bash
# List available templates
claude-config templates

# Frameworks
claude-config init --template fastapi
claude-config init --template react-ts
claude-config init --template python-cli
claude-config init --template mcp-python

# Languages
claude-config init --template python
claude-config init --template typescript

# Monorepos
claude-config init --template fastapi-react-ts
claude-config init --template fastapi-react-js
```

Add templates to existing projects:
```bash
claude-config apply-template python
```

## Shell Integration

For auto-apply on directory change, add to `~/.zshrc`:

```bash
source /path/to/claude-config/shell/claude-config.zsh
```

This enables:
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

Persistent memory for Claude Code sessions:

**Global Memory** (`~/.claude/memory/`):
- `preferences.md` - User preferences (tools, style)
- `corrections.md` - Mistakes to avoid
- `facts.md` - Environment facts

**Project Memory** (`<project>/.claude/memory/`):
- `context.md` - Project overview
- `patterns.md` - Code patterns
- `decisions.md` - Architecture decisions
- `issues.md` - Known issues
- `history.md` - Session history

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
claude-config workstream add-project "User Auth" ~/projects/api
claude-config workstream add-project "User Auth" ~/projects/ui
claude-config workstream add-project "User Auth" ~/projects/shared

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

### Smart Sync

Smart Sync intelligently suggests workstream switches based on your coding activity:

**Features:**
- Auto-detect which workstream matches your current work
- Non-blocking toast notifications: "Working on X, Y. Switch to 'Auth Feature'?"
- Auto-switch when 80%+ activity matches (configurable threshold)
- Learn from your choices (Always/Never options)
- Rate-limited nudges (max once per 5 minutes)

**Actions:**
- **Yes** - Switch to suggested workstream
- **No** - Dismiss this nudge
- **Always** - Remember to always switch for this project-workstream pair
- **Never** - Never suggest this again

**Settings:**
In Workstreams view, adjust Smart Sync settings:
- Enable/disable Smart Sync
- Adjust auto-switch confidence threshold (0-100%)

**Bulletproof design:**
- Fails silently, never blocks your workflow
- All nudges are dismissible
- Defaults to last-used workstream if detection fails

## Web UI Features

When you run `claude-config ui`:

- **Project Switcher** - Switch between registered projects from header dropdown
- **Workstream Switcher** - Quick-switch between workstreams from header
- **Project Explorer** - Browse/edit all .claude folders in hierarchy
- **Workstreams** - Create and manage context sets for multi-project workflows
  - Activity tracking with co-activity pattern detection
  - AI-powered workstream suggestions
  - Smart Sync for intelligent workstream switching
  - Manual project add/remove in create/edit dialogs
- **Sub-Projects** - Auto-detects git repos, plus manually add/hide external folders
- **Plugins** - Browse and install Claude Code plugins with scope control
  - Plugin directory with search and filtering
  - Marketplace management
  - Scope selection (project/global/local)
- **MCP Registry** - Search GitHub/npm, add/edit/delete MCPs
- **Claude Code Settings** - Visual editor for `~/.claude/settings.json`
  - Permissions (allow/ask/deny rules)
  - Model selection
  - Behavior settings
  - Hooks and advanced options
- **Gemini CLI Settings** - Visual editor for `~/.gemini/settings.json`
  - MCP server management for Gemini
  - Gemini-specific options
- **Memory System** - Manage preferences, corrections, patterns, decisions
- **Templates** - Apply rule templates to projects
- **Preferences** - Configure claude-config tool settings
  - Enabled AI tools (Claude Code, Gemini CLI, Antigravity)
- **One-Click Updates** - Update badge appears when new version available
- **Dark Mode** - Theme toggle (light/dark/system)

## Plugins

Claude Code plugins extend functionality with LSP servers, MCP servers, and commands.

### Installing Plugins

From the Web UI:
1. Open Project Explorer
2. Click the **+** menu on any project folder
3. Select **Install Plugins**
4. Toggle plugins on/off with scope selection (Project/Global/Local)

### Plugin Directory

The **Plugins** page shows all available plugins:
- Filter by category, source type (Anthropic/Community), installed status
- Search by name or description
- View plugin details (LSP/MCP/Commands included)

### Marketplaces

Plugins come from marketplaces (Git repositories):
- **claude-plugins-official** - Anthropic's official plugins
- Add community marketplaces via "Add Marketplace"

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
