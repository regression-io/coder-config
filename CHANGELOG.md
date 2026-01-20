# Changelog (@regression-io/claude-config)

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.36.4] - 2026-01-20

### Added

- **Gemini CLI Settings Documentation** - In-app docs for model selection, display, sandbox
- **Antigravity Settings Documentation** - In-app docs for security policies, MCP, browser, agent mode

### Changed

- **Smart Sync UX** - Removed confusing "Phase 3" badge, added setup indicator when activity tracking not configured

---

## [0.36.0] - 2026-01-20

### Added

- **Antigravity Settings View** - Full configuration UI for Google Antigravity
  - Security policies (terminal execution, review, JavaScript)
  - MCP server management
  - Browser URL allowlist
  - Agent mode selection (Planning/Fast)

- **Enhanced Gemini CLI Settings** - Major improvements to match actual CLI format
  - Model selection with Gemini 2.5 Pro/Flash options
  - Preview features toggle
  - Correct settings structure matching Gemini CLI v2
  - Auto-update, checkpointing, vim mode
  - Screen reader accessibility option

### Changed

- **Professional Documentation** - Improved formatting throughout
  - Tables replace basic bullet lists
  - Consistent layout across README and UI docs
  - Clearer feature-benefit presentation

- **Claude Code Positioning** - Documentation emphasizes Claude Code as primary product
  - claude-config framed as configuration helper
  - Quick start shows normal Claude Code usage

---

## [0.35.25] - 2026-01-20

### Changed

- **CLI Command Standardization** - All commands now use space-separated subcommands
  - `workstream add-project` → `workstream add`
  - `workstream remove-project` → `workstream remove`
  - `registry add/remove` (was already correct)
  - Consistent pattern across all CLI commands

## [0.35.21] - 2026-01-20

### Added

- **CLI Commands Sections** - Added CLI reference to all relevant views
  - Memory, Environment, Registry, Claude Settings, Gemini Settings
  - Consistent with Workstreams view pattern

## [0.35.19] - 2026-01-20

### Added

- **Hook Integration Explainer** - Info icon with tooltip in Workstreams view
  - Explains what hooks are and how they work
  - Helps users understand automatic rule injection

## [0.35.15] - 2026-01-20

### Added

- **Shared Project Indicator** - Shows when a project belongs to multiple workstreams
  - "shared" badge appears next to projects in workstream dialogs
  - Non-blocking indicator (no confirmation required)

### Changed

- **README Quick Start** - `claude-config ui` now listed first as recommended approach

## [0.35.9] - 2026-01-20

### Changed

- **Workstreams Documentation** - Clarified mental model
  - Workstreams are "virtual project sets" for multi-repo products
  - Each workstream represents one product/feature spanning multiple repos

## [0.35.7] - 2026-01-20

### Fixed

- **Tutorial Navigation** - Scrolls to top when clicking Next/Previous buttons

## [0.35.5] - 2026-01-20

### Fixed

- **Tutorial Code Blocks** - Fixed escaped backticks showing as `\`\`\``
  - Properly unescapes nested backticks in code blocks

## [0.35.2] - 2026-01-20

### Fixed

- **Tutorial Screenshots** - Images now display correctly
  - Added image support to markdown formatter
  - Screenshots render with proper styling (rounded corners, borders, shadows)

## [0.35.0] - 2026-01-20

### Added

- **Interactive Tutorial** - New step-by-step guide under Help menu
  - 10 sections covering all features from basics to advanced
  - Conversational, easy-to-follow approach
  - Navigation with Previous/Next buttons
  - Covers: Projects, Rules, MCPs, Permissions, Memory, Plugins, Workstreams, Multi-tool

- **First-Time Welcome Modal** - Greeting for new users
  - Explains why we built Claude Config
  - Quick overview of features
  - Option to start tutorial or skip
  - Only shows once (remembers preference)

### Changed

- **Reorganized Sidebar Navigation** - Better logical grouping
  - New "Tools" section (above Configuration) with: MCP Registry, Plugins, Memory, Workstreams
  - "Configuration" section now focused on tool settings: Claude Code, Gemini CLI
  - Clearer separation between tools/features and per-tool configuration

### Fixed

- **Permission Chip Cursor** - Uses default cursor instead of jarring I-beam

---

## [0.34.16] - 2026-01-20

### Fixed

- **Tooltip Display Fix** - Fixed permission rule tooltips not appearing on hover
  - Wrapped trigger in span for proper event forwarding
  - Updated tooltip colors to use semantic theme tokens

---

## [0.34.12] - 2026-01-20

### Added

- **User-Friendly Permission Tooltips** - Hover over any rule for plain English explanations
  - Summary: "Run 'npm' command" instead of just showing `Bash(npm:*)`
  - Detail: "Allows running the npm command with any arguments"
  - Category meaning: "✓ Allowed automatically — Claude will do this without asking"
  - Examples: Shows sample values that would match the pattern
  - Technical pattern shown at bottom for advanced users

---

## [0.34.9] - 2026-01-20

### Changed

- **Compact Permissions Editor UI** - Redesigned for better scalability with many rules
  - Rules displayed as compact chips/badges instead of large rows
  - Collapsible groups by type (Bash, Read, Edit, Write, etc.)
  - Chips show edit/delete on hover, full pattern in tooltip
  - Color-coded by category (green=allow, amber=ask, red=deny)

### Added

- **Multi-Select for Adding Rules** - Add multiple permission presets at once
  - Checkboxes to select multiple presets in the Add Rules dialog
  - "Select All" / "Clear" buttons for quick selection
  - Shows count of selected presets
  - Already-added rules shown as disabled with "Added" badge
  - Submit button shows "Add X Rules" when multiple selected

---

## [0.34.7] - 2026-01-20

### Added

- **Gemini CLI Feature Parity** - Improved support to match Claude Code capabilities
  - Per-project MCP output: Now generates `.gemini/settings.json` in project directory (in addition to global `~/.gemini/settings.json`)
  - Rule syncing: Added Gemini CLI to SyncDialog - can now sync rules between Claude Code ↔ Gemini CLI ↔ Antigravity
  - Rules are synced from `.claude/rules/` ↔ `.gemini/rules/` ↔ `.agent/rules/`

---

## [0.34.5] - 2026-01-19

### Changed

- **Auto-save for Settings** - Removed manual Save/Reset buttons in favor of seamless auto-save
  - PermissionsEditor: Rules auto-save immediately when added, edited, deleted, or moved
  - ClaudeSettingsEditor: Toggles and model selection save immediately, text inputs use debounced save
  - McpEditor: MCP toggles and removals save immediately (JSON mode still requires Apply button)
  - MarkdownEditor: Content auto-saves with 800ms debounce while typing
  - Improved UX with "Saving..." indicator instead of "Unsaved changes" badge
  - No more "click Save to apply" toasts - changes apply instantly

---

## [0.34.3] - 2026-01-18

### Added

- **Auto-install Default Marketplace** - The `regression-io/claude-config-plugins` marketplace is now automatically installed when opening the Plugins view for the first time
  - No manual `claude plugin marketplace add` command needed
  - Seamless onboarding experience for new users
  - Marketplace includes all converted templates as plugins

### Changed

- Updated `lib/init.js` to reflect automatic marketplace installation
- Moved marketplace installation from manual to automatic

---

## [0.34.0] - 2026-01-18

### Removed

- **Template System** - Templates have been removed in favor of plugins
  - Removed `templates/` directory and all bundled templates
  - Removed `lib/templates.js` template library
  - Removed `claude-config templates` CLI command
  - Removed `claude-config apply-template` CLI command
  - Removed `--template` flag from `claude-config init`
  - Removed TemplatesView from Web UI
  - Removed template detection and suggestion features
  - Removed batch template application from Sub-Projects view
  - Removed template-related API endpoints

### Changed

- **Plugins Replace Templates** - Use Claude Code plugins for framework/language guidance
  - Plugins are always-on (not static files that can become stale)
  - Updates via plugin refresh instead of re-applying templates
  - Discoverable via marketplaces
  - Recommended marketplace: `regression-io/claude-config-plugins`

- **Marketplace Management** - Moved to popup dialog
  - "Manage Marketplaces" link in marketplace filter dropdown
  - Dialog shows all marketplaces with refresh buttons
  - Cleaner Plugins view without inline marketplace section

- **Marketplace Filtering** - Filter plugins by marketplace
  - Marketplace dropdown in Plugins view filter bar
  - Toggle individual marketplaces on/off
  - "All Marketplaces" option to show everything

### Updated

- README.md - Removed all template references, updated Quick Start for plugins
- Documentation - Removed templates section from docs

---

## [0.33.2] - 2026-01-18

### Added

- **Marketplace Filtering** - Filter plugins by marketplace in Plugins view
  - Marketplace dropdown with checkboxes for each marketplace
  - Shows marketplace count badges
  - "Clear all filters" now includes marketplace filters

### Changed

- Moved Marketplaces section above Plugin Directory in Plugins view

---

## [0.32.0] - 2026-01-18

### Added

- **Smart Sync (Phase 3)** - Intelligent workstream switching based on activity patterns
  - Auto-detect workstream from current coding activity
  - Non-blocking toast nudges: "Working on X, Y. Switch to 'Auth Feature'?"
  - Action buttons: Yes / No / Always (remembers choice)
  - Auto-switch when 80%+ activity matches (configurable threshold)
  - Remember user choices per project-workstream pair
  - "Never" option to permanently dismiss specific suggestions
  - Rate-limited nudges (max once per 5 minutes)
  - Settings panel in Workstreams view to enable/disable and adjust threshold

- **SmartSyncToast Component** - Floating notification for workstream suggestions
  - Gradient header with confidence percentage
  - Switch/Add project action types
  - Always/Never quick actions for learning preferences

### Changed

- WorkstreamsView now shows Smart Sync settings panel
- Activity tracking integrates with smart sync for detection

### Technical

- New API endpoints: `/api/smart-sync/*` (status, detect, nudge, action, settings, remember)
- Smart sync preferences stored in `~/.claude-config/smart-sync.json`
- Bulletproof design: fails silently, never blocks user, all nudges dismissible

---

## [0.31.0] - 2026-01-17

### Added

- **Activity Tracking** - Track file activity to suggest workstreams
  - Logs file access from Claude sessions via post-response hook
  - Detects co-activity patterns (projects worked on together)
  - Activity Insights panel in Workstreams view (sessions, files, projects)
  - Top active projects list

- **Workstream Suggestions** - AI-powered workstream recommendations
  - Suggests workstreams based on co-activity patterns
  - Shows co-activity score percentage
  - One-click create from suggestions
  - Dismiss suggestions you don't want (persists to localStorage)

- **Manual Project Editing** - Full control over workstream projects
  - Add/remove projects when creating workstreams
  - Add/remove projects when editing existing workstreams
  - Project picker shows all registered projects
  - Pre-fill create dialog from suggestions with ability to tweak

- **Activity Tracking Hook** - `hooks/activity-track.sh`
  - Post-response hook extracts file paths from Claude responses
  - Logs activity via API for pattern detection

### Changed

- Create/Edit workstream dialogs now support project management
- Suggestions filter out already-created workstreams

---

## [0.30.2] - 2026-01-17

### Added

- **One-Click Hook Installation** - Install workstream hook automatically
  - "Install Hook Automatically" button in Workstreams view
  - Creates/updates `~/.claude/hooks/pre-prompt.sh`
  - Shows green "Hook Installed" status when active
  - Appends to existing hooks (doesn't overwrite)

---

## [0.30.0] - 2026-01-17

### Added

- **Workstreams** - Context sets for multi-project workflows
  - Group related projects and inject context rules into every Claude session
  - Active workstream indicator in header with quick-switch dropdown
  - WorkstreamsView UI for creating, editing, deleting workstreams
  - Add/remove projects from workstreams
  - Rules editor per workstream
  - CLI commands: `workstream create`, `use`, `inject`, `detect`, etc.
  - Pre-prompt hook integration for automatic rule injection
  - Sample hook script at `hooks/workstream-inject.sh`

### Changed

- Bumped to v0.30.0 for major new feature

---

## [0.24.9] - 2026-01-17

### Fixed

- **Changelog Scrolling** - Now uses explicit `h-[60vh]` height for reliable scrolling
  - Full changelog scrollable from v0.24.8 down to v1.0.0

---

## [0.24.8] - 2026-01-17

### Changed

- Added v0.24.6 and v0.24.7 entries to changelog

---

## [0.24.7] - 2026-01-17

### Fixed

- **Changelog Scrolling** - Dialog now scrolls properly
  - Added `overflow-hidden` to DialogContent
  - Added `min-h-0` to ScrollArea for proper flex scrolling
  - Moved padding inside scroll container

---

## [0.24.6] - 2026-01-17

### Added

- **Markdown Changelog Rendering** - Changelog displays with proper formatting
  - Headings, lists, code blocks styled correctly
  - react-markdown integration

### Changed

- **Complete Version History** - Backfilled CHANGELOG.md with all versions from v1.0.0

---

## [0.24.5] - 2026-01-17

### Fixed

- **Preferences Persistence** - Tool toggles now auto-save immediately
  - Gemini CLI, Claude Code, Antigravity toggles save without manual save button
  - Shows toast feedback when toggling tools
  - Reverts state on save error

---

## [0.24.4] - 2026-01-17

### Added

- **Auto-Apply Config** - Config changes now apply automatically
  - Saving `.claude/mcps.json` auto-generates `.mcp.json`
  - Updating registry auto-applies to current project
  - No need to manually click Apply Config

### Changed

- Apply Config button changed to subtle "Re-apply" for manual override

---

## [0.24.3] - 2026-01-17

### Fixed

- **Plugin Duplicates** - Removed duplicate plugins from marketplace
  - Plugins with source pointing to `external_plugins/` now correctly marked as external
  - Skip duplicate entries when scanning external_plugins directory
  - Reduced from 59 duplicates to 37 unique plugins

### Added

- **Changelog Popup** - View changelog from About section in Preferences
  - Click "Changelog" link to open dialog
  - Markdown rendering for better readability

### Changed

- Improved marketplace format examples in Add Marketplace dialog

---

## [0.24.2] - 2026-01-17

### Added

- **Documentation Updates**
  - CHANGELOG entries for v0.22.0, v0.23.0, v0.24.0
  - Plugins section in README
  - Gemini CLI added to Web UI features list

---

## [0.24.1] - 2026-01-17

### Fixed

- Plugin install passing `name@marketplace` twice (doubled marketplace suffix)

---

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

### Fixed

- PluginsView rendering object as React child (mp.source was object not string)
- Claude plugin CLI commands (`plugins` → `plugin` singular)

---

## [0.23.5] - 2026-01-16

### Fixed

- isManual flag propagation for manual sub-projects

---

## [0.23.4] - 2026-01-16

### Changed

- Use PathPicker for Add Sub-project dialog
- Add Sub-project available on sub-projects too (nested support)

---

## [0.23.3] - 2026-01-16

### Changed

- Move Add Sub-project to FileExplorer context menu
- Nested sub-projects (depth 2+) displayed in grey color

---

## [0.23.2] - 2026-01-16

### Fixed

- applyTemplate argument order in template suggestion

---

## [0.23.1] - 2026-01-16

### Added

- **Auto-Detect Template** - Suggests templates for sub-projects based on project type

---

## [0.23.0] - 2026-01-16

### Added

- **Manual Sub-Projects** - Link any folder as a sub-project
  - "Add Sub-project" in Project Explorer context menu
  - PathPicker for browsing to target directory
  - Works on root project and nested sub-projects

- **Hide/Unhide Sub-Projects** - Hide auto-detected sub-projects you don't need
  - Right-click → Hide to remove from view
  - Hidden sub-projects stored per-project in `~/.claude-config/config.json`
  - Unhide from Preferences or context menu

- **Nested Sub-Project Hierarchy** - Support for multiple levels of nesting
  - Sub-projects can have their own sub-projects (depth 2+)
  - Grey color for deeply nested items
  - Full tree navigation

### Changed

- Renamed "Switch" to "Select" in All Projects view
- FileExplorer redesigned as collapsible tree view
- Improved panel widths and scrollbar handling
- Hide + menu when template already applied, show badge only
- Replace "sub" badge with "root" badge on root project

### Fixed

- Service Worker caching issues
- Preferences persistence and update UX
- Memory creating individual files like rules/commands

---

## [0.22.7] - 2026-01-16

### Added

- Server version check and restart capability
- Memory option in Project Explorer menu

---

## [0.22.5] - 2026-01-16

### Added

- Track applied templates in `.claude/templates.json`

### Fixed

- getAppliedTemplate function name mismatch

---

## [0.22.3] - 2026-01-16

### Changed

- Redesign FileExplorer as collapsible tree view
- UX improvements: default to root project, hide Apply Template for root when sub-projects exist

---

## [0.22.1] - 2026-01-16

### Added

- MCP management to GeminiSettingsEditor
- Show all sub-projects in tree view

### Fixed

- Pass filePath to SettingsEditor to detect Gemini vs Claude
- Show GeminiSettingsEditor when clicking Gemini's settings.json

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

## [0.21.5] - 2026-01-16

### Added

- GeminiSettingsView for Gemini CLI settings

---

## [0.21.3] - 2026-01-16

### Fixed

- Each AI tool now reads from its own config folder

---

## [0.21.1] - 2026-01-16

### Added

- Gemini CLI as drop-in AI assistant option

---

## [0.21.0] - 2026-01-16

### Added

- **Gemini CLI Support** - Alongside Claude Code and Antigravity
  - Configure multiple AI coding assistants
  - Tool selector in Preferences

---

## [0.20.5] - 2026-01-15

### Added

- Dark mode support for Claude Code settings and permissions views

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

## [0.13.0] - 2026-01-15

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

## [1.0.0] - 2026-01-14

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
