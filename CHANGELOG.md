# Changelog (@regression-io/claude-config)

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.14.0] - 2025-01-15

### Added

- **Project Management** - Register and switch between projects in the UI
  - Project switcher dropdown in the header for quick switching
  - Add projects via CLI (`claude-config project add`) or UI
  - Projects registry stored in `~/.claude-config/projects.json`
  - Manage all registered projects in dedicated Projects view

- **Daemon Mode** - Run the UI as a background service
  - `claude-config ui --daemon` - Start as background daemon
  - `claude-config ui status` - Check if daemon is running
  - `claude-config ui stop` - Stop the daemon
  - Runs from home directory, persists across terminal sessions
  - Logs stored in `~/.claude-config/ui.log`

- **Project CLI Commands**
  - `claude-config project` - List all registered projects
  - `claude-config project add [path]` - Add a project to registry
  - `claude-config project remove <name|path>` - Remove from registry

### Changed

- Server now loads active project from registry on startup (no `--dir` required)
- UI can be started from any directory and switch projects dynamically

---

## [0.13.0] - 2025-01-15

### Added

- **Claude Code Settings Editor** - Visual editor for `~/.claude/settings.json`
  - Permissions tab with allow/ask/deny rule management
  - Model selection with all Claude models
  - Behavior settings (auto-accept edits, verbose mode)
  - Advanced settings (API base URL, environment variables, hooks)
  - Import/export permissions as JSON

- **One-Click Updates** - Update badge in header when new version available
  - Click to update and auto-reload
  - No manual server restart needed for UI changes

- **Path Picker** - Directory/file browser for path inputs in Preferences
  - Browse button on MCP Tools Directory and Registry Path settings
  - Navigate directories with home button shortcut

- **Separated Settings Views**
  - "Claude Code" menu item for `~/.claude/settings.json` (permissions, model, behavior)
  - "Preferences" menu item for claude-config tool settings (directories, UI options)

### Changed

- **Refactored Dashboard** - Split 3400+ line file into modular view components
  - Extracted: PreferencesView, ClaudeSettingsView, MemoryView, RegistryView, etc.
  - Cleaner codebase, easier maintenance

- **Version Management** - Auto-bump patch version on build
  - `install.sh --update` now runs build automatically
  - Version synced across package.json, config-loader.js, ui/package.json

### Fixed

- Preferences API endpoint collision (renamed to `/api/preferences`)
- JSON placeholder formatting in Hooks and Custom Settings textareas
- TooltipProvider missing in PermissionsEditor components

---

## [1.0.0] - 2025-01-14

### Added

- **Web UI** for managing Claude Code configuration
  - File Explorer with full .claude folder management
  - MCP Registry with GitHub/npm search
  - Memory System for preferences, corrections, patterns, decisions
  - Settings panel for tools directory and UI preferences
  - Templates view for applying rule templates
  - Environment variables management

- **CLI** (`claude-config`)
  - `claude-config` / `claude-config ui` - Start web UI
  - `claude-config display` - Show current configuration
  - `claude-config init` - Initialize .claude folder
  - `--port`, `--dir` flags for customization

- **MCP Management**
  - Hierarchical configuration (global → workspace → project)
  - Toggle MCPs on/off per level
  - Smart import with Claude Code analysis
  - Local tools directory scanning

- **Memory System**
  - Global memory: preferences, corrections, facts
  - Project memory: context, patterns, decisions, issues, history
  - Structured entry forms matching shell command formats
  - Search across all memory files

- **Configuration**
  - `~/.claude/config.json` for user preferences
  - Configurable tools directory
  - Configurable UI port

### Security

- Path validation to prevent directory traversal
- Restricted file access to .claude directories only

---

## [Unreleased]

### Planned

- Windows support improvements
- Offline mode for MCP search
- Code splitting for smaller bundle size
- TypeScript type definitions
