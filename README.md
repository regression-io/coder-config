# Coder Config

A configuration manager for AI coding tools. Works with Claude Code, Gemini CLI, Codex CLI, and Antigravity.

## The Problem

AI coding assistants lose context between sessions. You explain your project structure, then close the terminal, and next time you're starting from scratch. Working across multiple repos is worse—you constantly re-explain how projects relate to each other.

MCP servers need configuration per-project. Rules and preferences are scattered. Each AI tool has its own config format.

Coder Config fixes this.

## Quick Start

```bash
npm install -g coder-config
coder-config ui install   # auto-start on login
open http://localhost:3333
```

That's it. The Web UI runs on port 3333. Install it as a PWA from your browser for app-like access.

## Core Concepts

### Session Persistence

When you're deep in a task and need to stop, run `/flush` in Claude Code. This saves your context—what you were working on, decisions made, files touched—to `.claude/session-context.md`.

Next time you start Claude Code in that project, the context automatically loads. You pick up where you left off instead of re-explaining everything.

**Setup:**
```bash
coder-config session install
```

This installs a hook that loads context on session start, plus the `/flush` command.

### Workstreams

A workstream groups related projects. When you're building a feature that spans an API, a frontend, and a shared library, you want Claude to understand they're connected.

Create a workstream, add your projects, and write some context rules:

```bash
coder-config workstream create "User Auth"
coder-config workstream add "User Auth" ~/projects/api
coder-config workstream add "User Auth" ~/projects/frontend
coder-config workstream use "User Auth"
```

Now Claude knows: these three projects are related, here's how they connect, and here's what we're building together.

The workstream stays active in your terminal. When you cd into any of those projects, Claude sees the full context. When you switch to unrelated work, deactivate it or use a different workstream.

**Auto-activation**: Install the cd hook and workstreams activate automatically when you enter matching directories:

```bash
coder-config workstream install-cd-hook
source ~/.zshrc
```

Now `cd ~/projects/api` automatically activates the matching workstream.

### MCP Servers

MCP servers give Claude access to external tools—databases, APIs, file systems. Coder Config lets you define them once in a global registry, then enable them per-project.

Add an MCP to your project:
```bash
coder-config add postgres github
coder-config apply
```

This generates `.mcp.json` which Claude Code reads. Environment variables use `${VAR}` syntax and load from `.claude/.env`.

### Configuration Hierarchy

Settings cascade from global to project-specific:

```
~/.claude/                     # Global - applies everywhere
~/projects/.claude/            # Workspace - applies to projects here
~/projects/my-app/.claude/     # Project - this project only
```

Global rules like "always use conventional commits" go in `~/.claude/rules/`. Project-specific rules stay local.

### Memory vs Rules

**Rules** are prescriptive instructions that load automatically every session. Put them in `.claude/rules/*.md`:
- "Never use npm ci"
- "Always run tests before committing"
- "Use our custom logger, not console.log"

**Memory** is reference material for specific contexts. Store patterns, decisions, and history in `.claude/memory/`. Claude reads these when relevant (before architectural decisions, when debugging, etc.).

The difference: rules are always active, memory is consulted when needed.

### Plugins

Plugins provide skills, commands, LSP servers, and MCP tools. Install them from marketplaces:

```bash
claude /install coder-config@claude-config-plugins
```

Skills become available as slash commands (`/flush`, `/refactor`) and show up in Claude's available tools.

## Web UI

The UI at `localhost:3333` provides visual management for everything:

- **Project Explorer** - Browse `.claude/` folders, edit configs
- **MCPs** - Toggle servers on/off, configure environment variables
- **Workstreams** - Create, edit, manage project groups
- **Memory** - Edit preferences, corrections, patterns
- **Sessions** - Install hooks, view saved context
- **Settings** - Configure Claude Code, Gemini CLI, Codex CLI, Antigravity

The server runs as a daemon by default. It starts automatically on login if you ran `coder-config ui install`.

## Common Workflows

### Starting a new project

```bash
cd ~/projects/my-new-app
coder-config init
```

This creates `.claude/` with default structure. Edit `CLAUDE.md` to describe your project, add rules for your conventions.

### Ending a session

In Claude Code:
```
/flush
```

Context saves to `.claude/session-context.md`. Tomorrow, it loads automatically.

### Working across repos

```bash
# Create workstream
coder-config workstream create "Feature X"
coder-config workstream add "Feature X" ~/repos/api
coder-config workstream add "Feature X" ~/repos/web

# Edit rules in Web UI to describe how they connect
open http://localhost:3333

# Activate
coder-config workstream use "Feature X"
```

### Adding an MCP server

```bash
# Add to this project
coder-config add postgres

# Set credentials
coder-config env set POSTGRES_URL "postgres://..."

# Generate .mcp.json
coder-config apply
```

---

## Reference

Full command reference for power users.

### Session Commands
```bash
coder-config session           # Show status
coder-config session install   # Install hooks + /flush command
coder-config session clear     # Clear saved context
```

### Workstream Commands
```bash
coder-config workstream                      # List all
coder-config workstream create "Name"        # Create
coder-config workstream delete <name>        # Delete
coder-config workstream use <name>           # Activate (this terminal)
coder-config workstream add <ws> <path>      # Add project
coder-config workstream remove <ws> <path>   # Remove project
coder-config workstream install-cd-hook      # Auto-activate on cd
```

### MCP Commands
```bash
coder-config list              # Show available MCPs
coder-config add <mcp>         # Add to project
coder-config remove <mcp>      # Remove from project
coder-config apply             # Generate .mcp.json
coder-config registry          # List global registry
```

### Memory Commands
```bash
coder-config memory                        # Show status
coder-config memory init                   # Initialize project memory
coder-config memory add <type> "<text>"    # Add entry
coder-config memory search <query>         # Search
```

### Environment Commands
```bash
coder-config env                   # List variables
coder-config env set KEY value     # Set
coder-config env unset KEY         # Remove
```

### Project Commands
```bash
coder-config project               # List registered
coder-config project add [path]    # Register project
coder-config project remove <id>   # Unregister
```

### UI Commands
```bash
coder-config ui                # Start (daemon mode)
coder-config ui --foreground   # Start (blocking)
coder-config ui status         # Check if running
coder-config ui stop           # Stop daemon
coder-config ui install        # Auto-start on login
coder-config ui uninstall      # Remove auto-start
```

### Update Commands
```bash
coder-config update            # Check and install updates
coder-config update --check    # Check only
```

---

## Requirements

- Node.js 18+
- For native dependencies: Xcode CLI tools (macOS), build-essential (Linux), or VS Build Tools (Windows)

## Development

```bash
git clone https://github.com/regression-io/coder-config.git
cd coder-config
npm install
npm run build
npm start
```

## License

MIT
