# Changelog (@regression-io/claude-config)

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.24.0] - 2026-01-17

### Added

- **Plugin Management** - Claude Code plugins UI
  - Plugin Directory with search, filter by category, and source type toggles
  - PluginSelectorDialog for installing plugins from project context
  - "Install Plugins" menu item in Project Explorer's + menu
  - Support for project/global/local scope when installing
  - View installed plugins, available plugins, LSP/MCP/Commands badges
  - Marketplace management (add, refresh, view external plugins)

### Changed

- Plugins install from project context (Project Explorer) rather than global Plugins page
- PluginsView redesigned as discovery/browse view with filtering and sorting

---

## [0.23.0] - 2026-01-16

### Added

- **Manual Sub-Projects** - Link any folder as a sub-project
  - "Add Sub-project" in Project Explorer context menu
  - PathPicker for browsing to target directory
  - Works on root project and nested sub-projects

- **Hide/Unhide Sub-Projects** - Hide auto-detected sub-projects you don't need
  - Right-click → Hide to remove from view
  - Hidden sub-projects stored per-project
  - Unhide from Preferences or context menu

- **Nested Sub-Project Hierarchy** - Support for multiple levels of nesting
  - Sub-projects can have their own sub-projects (depth 2+)
  - Grey color for deeply nested items
  - Full tree navigation

- **Template Auto-Detection** - Suggest templates for sub-projects
  - Detects project type (Python, Node, etc.) from files
  - Shows "Apply Template" suggestion when entering unconfigured sub-project

### Changed

- Renamed "Switch" to "Select" in All Projects view
- FileExplorer redesigned as collapsible tree view
- Improved panel widths and scrollbar handling

---

## [0.22.0] - 2026-01-16

### Added

- **Gemini CLI Support** - Configure Gemini CLI alongside Claude Code
  - GeminiSettingsView for `~/.gemini/settings.json`
  - MCP server management for Gemini
  - Each AI tool reads from its own config folder

- **Batch Template Application** - Apply templates to multiple sub-projects
  - Multi-select checkboxes in Sub-Projects view
  - Action bar for batch operations

- **Sub-Projects in Project Explorer** - Merged into main tree view
  - Show all sub-projects as expandable folders
  - Direct navigation without separate view

### Changed

- Project Explorer shows unified tree of all .claude folders
- Template tracking via `.claude/templates.json`

---

## [0.15.0] - 2026-01-15

### Added

- **npm Update Detection** - Automatic check for updates from npm registry
  - Shows update notification in UI when new version available
  - One-click update via `npm update -g`
  - Version displayed in Preferences page

- **Auto-Release Pipeline**
  - GitHub Actions workflow for automatic npm publishing on version tags
  - Git hooks for automatic version bump, tag, and push on every commit
  - `./scripts/release.sh "message"` for manual releases with `--minor` or `--major` flags

### Changed

- **Daemon Mode Default** - `claude-config ui` now runs as daemon by default
  - Use `--foreground` or `-f` to run in foreground
  - Daemon spawns properly detached process

- **Project Selector** - Always shows project selector on initial UI load
  - Renamed "File Explorer" to "Project Explorer"
  - Reordered nav: All Projects first

- **npm Package Structure** - Clean install from npm registry
  - Removed old manual installation method
  - User config stored in `~/.claude-config/` (projects.json, config.json)
  - Package code in npm global location

### Fixed

- Daemon mode not starting server (was spawning another daemon infinitely)
- Version detection looking in wrong directory
- Missing `https` require in npm version check

---

## [0.14.0] - 2026-01-15

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
