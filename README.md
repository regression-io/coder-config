# Claude Config

Configuration management for **Claude Code** with CLI and optional Web UI.

## Installation

```bash
npm install -g claude-config
```

Or from GitHub:
```bash
npm install -g github:regression-io/claude-config
```

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
```

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

Settings merge from global to project:

```
~/.claude/mcps.json              # Global - applies everywhere
~/projects/.claude/mcps.json     # Workspace - applies to projects here
~/projects/my-app/.claude/       # Project - specific to this project
```

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

## Web UI Features

When you run `claude-config ui`:

- **File Explorer** - Browse/edit all .claude folders in hierarchy
- **MCP Registry** - Search GitHub/npm, add/edit/delete MCPs
- **Memory System** - Manage preferences, corrections, patterns, decisions
- **Templates** - Apply rule templates to projects

## Configuration File

User settings stored in `~/.claude/config.json`:

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
