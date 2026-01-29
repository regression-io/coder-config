# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Coder Config** is a configuration manager for AI coding tools (Claude Code, Gemini CLI, Codex CLI, Antigravity). It provides both CLI and Web UI for managing MCPs, rules, permissions, memory, workstreams, and autonomous development loops.

**Tech Stack:**
- **CLI**: Node.js (CommonJS), modular architecture in `lib/`
- **Web UI**: React + Vite, TailwindCSS, server in `ui/server.cjs`
- **Desktop App**: Tauri v2 (Rust) wrapping Node.js backend (paused development)

## Build & Development Commands

```bash
# Start web UI (default port 3333)
npm start
# or
node cli.js ui

# Run tests
npm test

# Build UI for production
npm run build

# Version management
npm run version:sync          # Sync versions across package files
npm run version:bump          # Bump patch version

# Development
npm run ui:dev                # Start Vite dev server (port 5173)

# Tauri desktop app (paused but functional)
npm run tauri:dev             # Dev mode
npm run tauri:build           # Production build
```

## Architecture

### CLI Architecture (`cli.js` + `config-loader.js`)

**Entry Point:** `cli.js` - Handles `ui` subcommands (start/stop/status/install/uninstall), delegates everything else to `config-loader.js`

**Core:** `config-loader.js` - Exports `ClaudeConfigManager` class, loads modular libraries from `lib/`, runs CLI via `lib/cli.js`

**Modular Libraries:**
- `lib/constants.js` - VERSION, TOOL_PATHS constants
- `lib/config.js` - Configuration hierarchy, merging, path resolution
- `lib/apply.js` - Generate tool-specific config files (.mcp.json, settings.json)
- `lib/mcps.js` - MCP add/remove/list
- `lib/registry.js` - Global MCP registry management
- `lib/memory.js` - Memory system (preferences, corrections, patterns)
- `lib/projects.js` - Project registry (tracks all user projects)
- `lib/workstreams.js` - Multi-project context management
- `lib/loops.js` - Ralph Loop autonomous development system
- `lib/activity.js` - Activity tracking for workstream suggestions
- `lib/env.js` - Environment variable management
- `lib/cli.js` - CLI command router and help

### Web UI Architecture (`ui/`)

**Server:** `ui/server.cjs` - Express server with REST API + SSE for real-time updates
- Routes in `ui/routes/*.js` - Modular API endpoints
- Terminal server: `ui/terminal-server.cjs` - WebSocket PTY for embedded terminals

**Frontend:** React SPA built with Vite
- `ui/src/main.jsx` - Entry point, routing, theme
- `ui/src/views/*.jsx` - Page components (Dashboard, Memory, Workstreams, Loops)
- `ui/src/components/ui/*` - shadcn/ui component library
- `ui/dist/` - Build output (served by server)

### Configuration Hierarchy

Configs merge from global → workspace → project → sub-project:

```
~/.claude/                           # Global (all projects)
~/projects/.claude/                  # Workspace (projects in this dir)
~/projects/my-app/.claude/           # Project
~/projects/my-app/server/.claude/    # Sub-project (inherits from parent)
```

Files:
- `mcps.json` - MCP server configuration
- `settings.json` - Claude Code settings (permissions, model)
- `rules/*.md` - Project-specific rules
- `commands/*.md` - Custom commands
- `memory/*.md` - Persistent context

Generated output:
- `.mcp.json` - Claude Code reads this (generated from mcps.json)
- `.gemini/settings.json` - Gemini CLI output
- `.codex/config.toml` - Codex CLI output

### Key Features

**Ralph Loops** (`lib/loops.js`):
- Three-phase workflow: Clarify → Plan → Execute
- Loop state stored in `~/.coder-config/loops/<id>/`
- Files: `state.json`, `clarifications.json`, `plan.md`, `transcript.txt`
- Safety: iteration limits, cost budgets, phase gates
- Hook integration for automatic continuation

**Workstreams** (`lib/workstreams.js`):
- Group related projects with shared context
- Per-terminal activation via `CODER_WORKSTREAM` env var
- Hook injection via `hooks/workstream-inject.sh`
- Activity tracking suggests workstreams based on co-activity patterns

**Memory System** (`lib/memory.js`):
- Global: preferences, corrections, facts
- Project: context, patterns, decisions, issues, history
- CLI: `coder-config memory add <type> "<content>"`

**Plugin System**:
- Marketplaces: Git repos with plugin definitions
- Plugins provide LSP servers, MCP servers, commands, rules
- Replace old template system (removed in v0.34.0)

## Common Patterns

### Adding New CLI Commands

1. Add function to appropriate `lib/*.js` module
2. Export function from module
3. Import in `config-loader.js` and add to `ClaudeConfigManager` class
4. Add command handler in `lib/cli.js` (`runCli` function)

### Adding New API Endpoints

1. Create route file in `ui/routes/` (e.g., `ui/routes/foo.js`)
2. Export function that takes `(app, config)` and registers routes
3. Import and call in `ui/server.cjs`

### Environment Variables

- `${VAR}` syntax in mcps.json resolves from `.claude/.env`
- Use `lib/utils.js` functions: `loadEnvFile`, `interpolate`, `resolveEnvVars`
- Antigravity does NOT support `${VAR}` - variables resolved to actual values

### File Operations

All file operations go through:
- `lib/utils.js`: `loadJson`, `saveJson`, `copyDirRecursive`
- Native `fs` for other operations

## Testing

```bash
# Run all tests
npm test

# Tests are in test/*.test.js
# Uses Node.js built-in test runner (--test flag)
```

### Test Coverage

The project has comprehensive test coverage for core modules:

**test/config-loader.test.js** (21 tests)
- ClaudeConfigManager class methods
- loadJson, saveJson, loadEnvFile, interpolate
- findProjectRoot, mergeConfigs
- Integration test for project initialization

**test/utils.test.js** (44 tests)
- All utility functions from lib/utils.js
- JSON loading/saving with edge cases
- Environment file parsing
- Variable interpolation and resolution
- Directory copying operations

**test/mcps.test.js** (21 tests)
- MCP add/remove functionality
- Error handling for invalid inputs
- Config file validation
- Multiple MCP operations

**test/config.test.js** (20 tests)
- Configuration hierarchy (findAllConfigs)
- File collection from hierarchy
- Config merging with exclude functionality
- Plugin settings merging

**test/memory.test.js** (28 tests)
- Memory initialization and file creation
- Adding entries to global/project memory
- Memory search across all locations
- Timestamp tracking and error handling

**test/env.test.js** (23 tests)
- Environment variable set/unset operations
- Variable updates and preservation
- Special characters and edge cases
- Integration tests for multiple operations

**Total:** 157 tests across 6 test files, all passing ✅

### Writing Tests

Tests use Node.js built-in test runner:
- `describe()` for test suites
- `it()` for individual tests
- `before()`/`after()` for setup/teardown
- `beforeEach()` for per-test setup
- Temporary directories for isolation
- Console mocking for output validation

## Version Management

Version synced across:
- `package.json`
- `lib/constants.js` (VERSION constant)
- `ui/package.json`
- `src-tauri/tauri.conf.json`

Scripts:
- `npm run version:sync` - Sync from package.json to all files
- `npm run version:bump` - Increment patch version everywhere

Git hooks (`.githooks/`):
- Pre-commit: Auto-sync version, stage changes
- Pre-push: Version bump, commit, tag

## Package Distribution

Published as `coder-config` on npm (formerly `@regression-io/claude-config`)

Files included in npm package (see `package.json` files array):
- `cli.js`, `config-loader.js`
- `lib/**` - Core libraries
- `ui/server.cjs`, `ui/terminal-server.cjs`, `ui/routes/**`, `ui/dist/**`
- `templates/**`, `shared/**`, `scripts/**`, `hooks/**`

Build process:
- `prepublishOnly` runs `npm run build` (builds UI)
- `postinstall` runs `scripts/postinstall.js` (checks node-pty compatibility)

## Multi-Tool Support

Coder Config manages settings for:
- **Claude Code**: `~/.claude/settings.json`, `.mcp.json`
- **Gemini CLI**: `~/.gemini/settings.json`
- **Codex CLI**: `~/.codex/config.toml`
- **Antigravity**: `~/.gemini/antigravity/settings.json`

Each tool has its own config format and location. The UI provides unified management.

## Daemon & Auto-Start

**Daemon Mode:**
```bash
coder-config ui              # Start as daemon (default)
coder-config ui --foreground # Run in foreground
coder-config ui status       # Check if running
coder-config ui stop         # Stop daemon
```

**Auto-Start (macOS):**
```bash
coder-config ui install      # Create LaunchAgent
coder-config ui uninstall    # Remove LaunchAgent
```

LaunchAgent: `~/Library/LaunchAgents/io.regression.coder-config.plist`

## Important Notes

- Never use `npm ci` - just `npm run build` (per project rules)
- Always add `package-lock.json` to `.gitignore` (per project rules)
- Template system removed in v0.34.0 - use plugins instead
- Tauri desktop app paused but code remains in `src-tauri/`
- Legacy config path `~/.claude-config/` supported for backwards compatibility
