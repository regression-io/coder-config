# Coder Config

A configuration manager for AI coding tools. Works with Claude Code, Gemini CLI, Codex CLI, and Antigravity.

> **Migration note:** This package was renamed from `@regression-io/claude-config` to `coder-config`. The `claude-config` command still works as an alias.

## The Problem

AI coding assistants are powerful, but managing their configuration across projects is tedious. Each tool has its own config format. MCP servers need to be set up per-project. Context gets lost between sessions. Working across multiple repos means re-explaining relationships every time.

## What Coder Config Does

**Workstreams**
Group related repos together. When a workstream is active, Claude automatically knows which directories it can access and receives your custom context. Useful for microservices, monorepos, or any multi-repo workflow where projects relate to each other.

**Unified MCP Registry**
Define your MCP servers once in a global registry. Enable them per-project with a toggle. Configuration inherits from global → workspace → project, so common tools are always available while project-specific ones stay scoped.

**Hierarchical Rules**
Rules cascade from `~/.claude/rules/` down to project-specific rules. Global conventions apply everywhere; project-specific instructions stay local.

**Persistent Memory**
Store preferences, corrections, and patterns that persist across sessions. When you tell Claude "always use our logger instead of console.log," it remembers — not just for this session, but permanently.

**Plugin System**
Install LSP servers, MCP tools, and custom commands from plugin marketplaces. Plugins can be scoped globally or per-project.

**Multi-Tool Output**
Write one config, generate outputs for Claude Code (`.mcp.json`), Gemini CLI (`settings.json`), Codex CLI (`config.toml`), and Antigravity. Switch tools without reconfiguring.

**Web UI**
Visual interface for managing everything above. File explorer for `.claude` folders, MCP toggles, memory editor, workstream management. Runs locally on port 3333.

## Installation

```bash
npm install -g coder-config
```

Requires Node.js 18+.

> **Migrating from @regression-io/claude-config?**
> ```bash
> npm uninstall -g @regression-io/claude-config
> npm install -g coder-config
> ```
> Your settings in `~/.claude-config/` are preserved automatically.

## Quick Start

```bash
# 1. Install
npm install -g coder-config

# 2. Set up auto-start (recommended)
coder-config ui install

# 3. Open the UI
open http://localhost:3333
```

The server starts automatically on login. Install as a PWA from your browser for app-like access.

### Updating

```bash
coder-config update
# Then restart: coder-config ui stop && coder-config ui
```

### CLI Alternative

```bash
# Initialize a project
coder-config init

# Add MCPs to your project
coder-config add postgres github

# Generate .mcp.json for Claude Code
coder-config apply
```

## CLI Commands

Both `coder-config` and `claude-config` work identically.

### Project Commands

```bash
coder-config init                        # Initialize project
coder-config apply                       # Generate .mcp.json from config
coder-config show                        # Show current project config
coder-config list                        # List available MCPs (✓ = active)
coder-config add <mcp> [mcp...]          # Add MCP(s) to project
coder-config remove <mcp> [mcp...]       # Remove MCP(s) from project
```

### Memory Commands

```bash
coder-config memory                         # Show memory status
coder-config memory init                    # Initialize project memory
coder-config memory add <type> "<content>"  # Add entry
coder-config memory search <query>          # Search all memory

# Types: preference, correction, fact (global)
#        context, pattern, decision, issue, history (project)
```

### Environment Commands

```bash
coder-config env                    # List environment variables
coder-config env set <KEY> <value>  # Set variable in .claude/.env
coder-config env unset <KEY>        # Remove variable
```

### Project Commands

```bash
coder-config project                      # List registered projects
coder-config project add [path]           # Add project (defaults to cwd)
coder-config project add [path] --name X  # Add with custom display name
coder-config project remove <name|path>   # Remove from registry
```

### Workstream Commands

```bash
coder-config workstream                   # List all workstreams
coder-config workstream create "Name"     # Create new workstream
coder-config workstream delete <name>     # Delete workstream
coder-config workstream use <name>        # Activate workstream (this terminal)
coder-config workstream active            # Show current active workstream
coder-config workstream deactivate        # Deactivate workstream (this terminal)
coder-config workstream add <ws> <path>   # Add project to workstream
coder-config workstream remove <ws> <path>  # Remove project from workstream
coder-config workstream inject [--silent] # Output restriction + context (for hooks)
coder-config workstream detect [path]     # Detect workstream for directory
coder-config workstream check-path <path> # Check if path is within workstream (exit 0/1)
coder-config workstream install-hook      # Install hook for Claude Code
coder-config workstream install-hook --gemini  # Install hook for Gemini CLI
coder-config workstream install-hook --codex   # Install hook for Codex CLI
coder-config workstream install-hook --all     # Install hooks for all supported tools

# Folder auto-activation
coder-config workstream add-trigger <ws> <folder>  # Add trigger folder
coder-config workstream remove-trigger <ws> <folder>  # Remove trigger folder
coder-config workstream auto-activate <ws> [on|off|default]  # Set auto-activate
coder-config workstream check-folder [path] [--json]  # Check folder for matches
coder-config workstream install-cd-hook    # Install cd hook for shell
coder-config workstream uninstall-cd-hook  # Remove cd hook
coder-config workstream cd-hook-status     # Check cd hook status
```

**Per-terminal isolation**: With [shell integration](#shell-integration), each terminal can have its own active workstream:
```bash
# Terminal 1
coder-config workstream use project-a

# Terminal 2
coder-config workstream use project-b
```

When active, the AI receives a restriction telling it to only work within the workstream's directories.

**Multi-tool support**: Workstreams work with Claude Code, Gemini CLI, and Codex CLI. Install hooks for your preferred tool(s):
```bash
# For Claude Code only
coder-config workstream install-hook

# For Gemini CLI only
coder-config workstream install-hook --gemini

# For Codex CLI only
coder-config workstream install-hook --codex

# For all supported tools
coder-config workstream install-hook --all
```

**Folder auto-activation**: Automatically activate workstreams when you cd into matching directories:
```bash
# Install the cd hook (adds function to ~/.zshrc or ~/.bashrc)
coder-config workstream install-cd-hook

# Now when you cd into a project folder:
cd ~/projects/my-app  # Auto-activates matching workstream
# Output: 📂 Workstream: My App

# If multiple workstreams match, you'll be prompted:
cd ~/projects
# Output: Multiple workstreams match this folder:
#   1) Frontend
#   2) Backend
#   0) Skip
# Choose [0-2]:
```

**Trigger folders**: Besides project paths, you can add extra trigger folders:
```bash
coder-config workstream add-trigger "My Work" ~/projects
coder-config workstream remove-trigger "My Work" ~/projects
```

**Auto-activate setting**: Control per-workstream or globally:
```bash
coder-config workstream auto-activate "My Work" on      # Always auto-activate
coder-config workstream auto-activate "My Work" off     # Never auto-activate
coder-config workstream auto-activate "My Work" default # Use global setting
```

### Registry Commands

```bash
coder-config registry                       # List MCPs in global registry
coder-config registry add <name> '<json>'   # Add MCP to global registry
coder-config registry remove <name>         # Remove MCP from registry
```

### Updates

```bash
coder-config update             # Check npm and install updates if available
coder-config update --check     # Check for updates without installing
coder-config update /path/src   # Update from local development source
```

The UI checks for updates automatically and auto-updates when enabled in Preferences. After server updates, the UI auto-refreshes to load the new version.

### Web UI

```bash
coder-config ui                    # Start UI on port 3333
coder-config ui --port 8080        # Custom port
coder-config ui /path/to/project   # Specific project directory
coder-config ui --foreground       # Run in foreground (blocking)
coder-config ui status             # Check if daemon is running
coder-config ui stop               # Stop the daemon

# Auto-start on login (macOS)
coder-config ui install            # Install LaunchAgent for auto-start
coder-config ui uninstall          # Remove auto-start
```

**Daemon Mode**: By default, `coder-config ui` runs as a background daemon.
The UI runs from your home directory and persists across terminal sessions.
Switch between registered projects using the dropdown in the header.

**PWA / Auto-Start**: Install the UI as a PWA in your browser, then run `coder-config ui install`
to have the server start automatically on login. Your PWA will always connect instantly.

## Shell Integration

For full functionality, add to `~/.zshrc`:

```bash
source /path/to/coder-config/shell/claude-config.zsh
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

After `coder-config init`:

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

## Session Persistence

Save context from a Claude Code session and restore it on the next session start.

### How It Works

1. **Save context** - Use `/flush` in Claude Code to write a context summary
2. **Auto-restore** - The `session-start` hook injects saved context into your next session

Context is stored per-project in `.claude/session-context.md`.

### Setup

**From the UI:** Go to **System > Sessions** and click "Install All"

**From the CLI:**
```bash
coder-config session install
```

This installs the SessionStart hook and the `/flush` command.

### CLI Commands

```bash
coder-config session           # Show session status
coder-config session install   # Install hooks and /flush command
coder-config session clear     # Clear saved context
```

### Storage Location

Session context is stored in each project at `.claude/session-context.md`.

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
coder-config workstream create "User Auth"

# Add related projects
coder-config workstream add "User Auth" ~/projects/api
coder-config workstream add "User Auth" ~/projects/ui
coder-config workstream add "User Auth" ~/projects/shared

# Activate it
coder-config workstream use "User Auth"
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
coder-config workstream inject --silent
```

Once installed, your active workstream's rules are prepended to every Claude session.

### Activity Tracking & Suggestions

Coder-config can track which files you work on and suggest workstreams based on patterns:

**How it works:**
1. A post-response hook logs file paths accessed during Claude sessions
2. Co-activity patterns are detected (projects frequently worked on together)
3. Workstream suggestions appear in the UI based on these patterns

**Setup (optional):**
```bash
# Install the activity tracking hook
# Add to ~/.claude/hooks/post-response.sh:
source /path/to/coder-config/hooks/activity-track.sh
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
# Add the coder-config plugins marketplace
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
| `ui.openBrowser` | Auto-open browser on `coder-config ui` |

## Ralph Loops (Experimental)

> **Note:** Ralph Loops is an experimental feature, disabled by default. Enable it in the Web UI under **Preferences > Experimental Features**.

Ralph Loops enable autonomous development - Claude Code runs continuously until a task is completed.

```bash
coder-config loop                           # List all loops
coder-config loop create "Task description" # Create new loop
coder-config loop create "Task" --workstream <name>  # Create loop in workstream context
coder-config loop start <id>                # Start/resume a loop
coder-config loop pause <id>                # Pause loop at next safe point
coder-config loop resume <id>               # Resume paused loop
coder-config loop cancel <id>               # Cancel loop
coder-config loop delete <id>               # Delete loop and its data
coder-config loop approve <id>              # Approve plan (when in plan phase)
coder-config loop complete <id>             # Mark loop as complete
coder-config loop status [id]               # Show status (active loop if no id)
coder-config loop active                    # Show current active loop
coder-config loop history                   # Show completed loops
coder-config loop config                    # Show loop configuration
coder-config loop config --max-iterations 50    # Set max iterations
coder-config loop config --auto-approve-plan    # Skip manual plan approval
```

**Three-Phase Workflow**:
1. **Clarify** - Claude asks questions to understand requirements
2. **Plan** - Claude creates an implementation plan (requires approval)
3. **Execute** - Claude implements the plan until complete

**Running a loop**:
```bash
export CODER_LOOP_ID=<id>
claude --continue "Your task description"
```

**Safety mechanisms**:
- Iteration limits (default: 50)
- Phase gates (manual plan approval)
- Graceful pause on limit exceeded

## Requirements

- Node.js 18+
- Build tools (for newer Node.js versions without prebuilt binaries):
  - **macOS**: Xcode Command Line Tools (`xcode-select --install`)
  - **Linux**: `build-essential` package
  - **Windows**: Visual Studio Build Tools

## Development

```bash
git clone https://github.com/regression-io/coder-config.git
cd coder-config
npm install
npm run build
npm start
```

### Testing

The project has comprehensive test coverage with 230 tests across 10 test files:

```bash
# Run all tests
npm test
```

Test coverage includes:
- Core utilities and configuration management
- MCP registry operations
- Memory and environment variable systems
- Project initialization and registry
- Config generation and hierarchy

See [TEST_COVERAGE.md](TEST_COVERAGE.md) for detailed coverage information.

## License

MIT
