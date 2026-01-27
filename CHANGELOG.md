# Changelog (coder-config)

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.42.32] - 2026-01-27

### Changed

- **Session context now project-local** - `/flush` saves to `.claude/session-context.md` in each project
  - Each project has its own session context (no more global file)
  - Removed SessionEnd hook (no longer needed)
  - Simplified session-start hook

## [0.42.30] - 2026-01-27

### Added

- **Sessions Settings UI** - Visual interface for session persistence in System > Sessions

## [0.42.29] - 2026-01-27

### Added

- **Session Persistence** - Save and restore Claude Code session context across sessions
  - `coder-config session install` - one command installs hooks + /flush command
  - `/flush` command - tells Claude to save context to project-local file
  - `session-start.sh` hook - restores saved context when starting a new session

### Changed

- **Auto-refresh on server update** - UI now auto-refreshes when server version changes
- **Project Explorer synced with enabled tools** - Tool sections only show when enabled in Preferences
- **Sidebar synced with enabled tools** - Configuration nav items match enabled tools
- **Click version to check for updates** - Version number in sidebar footer is clickable
- **Ralph Loops behind experimental flag** - Hidden by default, enable in Preferences > Experimental Features

### Fixed

- **CD hook error messages** - Workstream cd hook now passes through clean error messages

## [0.42.14] - 2026-01-26

### Added

- **Workstream Folder Auto-Activation** - Automatically activate workstreams when you cd into matching folders
  - **CD hook**: Install with `coder-config workstream install-cd-hook` - adds shell function to `~/.zshrc` or `~/.bashrc`
  - **Trigger folders**: Add extra folders (beyond projects) that activate a workstream
  - **Auto-activate setting**: Per-workstream on/off/default, plus global default
  - **Multi-match prompting**: When multiple workstreams match a folder, prompts you to choose
  - **New CLI commands**: `add-trigger`, `remove-trigger`, `auto-activate`, `check-folder`, `install-cd-hook`, `uninstall-cd-hook`, `cd-hook-status`
  - **UI support**: Trigger folders section, auto-activate dropdown, global toggle, CD hook install button

## [0.42.13] - 2026-01-26

### Changed

- **UI Navigation** - Moved Ralph Loops from Tools section to Developer section (under Create MCP)

## [0.42.11] - 2026-01-24

### Changed

- **Apply now auto-cascades** - Single Apply button propagates changes to all child projects
  - No separate "Cascade" button needed - Apply always does the right thing
  - Shows count when multiple projects updated

## [0.42.10] - 2026-01-24

### Added

- **Cascade Apply API** - `/api/apply-cascade` endpoint for propagating MCP changes to child projects

## [0.42.9] - 2026-01-24

### Changed

- **Unified MCP list** - Inline and registry MCPs now shown in same list instead of separate sections

## [0.42.8] - 2026-01-24

### Added

- **Playwright MCP** - Added `@playwright/mcp` to bundled registry for browser automation

## [0.42.7] - 2026-01-24

### Enhanced

- **Auto-refresh sub-projects** - UI now automatically detects and displays new sub-projects
  - Added subprojects hash to file change detection polling
  - Creating new git repos inside a project triggers automatic refresh
  - All views (Projects, Explorer, etc.) now reflect sub-project changes in real-time
  - Works for both auto-detected and manual sub-projects

## [0.41.32] - 2026-01-24

### Enhanced

- **Workstream Integration for Ralph Loops** - Loops now fully integrate with workstreams
  - Workstream badge displayed on loop cards (purple with Layers icon)
  - Filter dropdown to show loops by workstream
  - Workstream name shown (not just ID) in expanded details
  - `CODER_WORKSTREAM` env passed to Claude terminal (pre-prompt hook injects context)
  - Auto-selects active workstream when creating new loop

## [0.41.30] - 2026-01-24

### Enhanced

- **Claude-Powered Rule Generation** - Option to use Claude Code for smarter workstream rules
  - "Use Claude" checkbox next to Generate button
  - When enabled, runs `claude -p` to analyze repos and generate intelligent context
  - Falls back to simple file parsing if Claude is unavailable
  - Works with subscription quota (not API quota)

## [0.41.28] - 2026-01-24

### Added

- **Generate Workstream Rules from Repos** - Auto-create context rules from project repositories
  - Reads README.md, package.json, CLAUDE.md, pyproject.toml, Cargo.toml, go.mod
  - Extracts project descriptions, tech stack, and summaries
  - "Generate" button in both Create and Edit workstream dialogs
  - One-click generation saves time when setting up workstreams

## [0.41.26] - 2026-01-24

### Enhanced

- **Apply Indicator Detects Config Drift** - Banner now also shows when `.mcp.json` is out of sync
  - Compares expected MCPs (from merged hierarchy) with existing `.mcp.json`
  - Shows "Apply" button when MCPs have been added or removed
  - Covers both missing `.mcp.json` and outdated `.mcp.json` scenarios

## [0.41.24] - 2026-01-24

### Added

- **Apply Indicator in MCP Editor** - Shows a banner when `.mcp.json` needs to be generated
  - Appears when there are MCPs (inherited or local) but no `.mcp.json` exists
  - One-click "Apply" button to generate the config
  - Helps users understand when to run apply for new projects

## [0.41.22] - 2026-01-24

### Fixed

- **MCP Inheritance for All Projects** - Fixed inheritance not working for projects outside the active project
  - `getInheritedMcps` now correctly uses the edited config's directory to find parent configs
  - Previously it used the UI's active project, breaking inheritance for other projects

## [0.41.20] - 2026-01-23

### Removed

- **Cost Tracking from Loops** - Removed all cost/budget tracking from Ralph Loops
  - Claude Code uses subscription limits, not variable API costs
  - Removed cost fields from loop state, config, UI, and history
  - Simplified loop cards and config dialog

## [0.41.18] - 2026-01-23

### Changed

- **Ralph Loop Plugin Integration** - Integrated with official `ralph-loop` plugin from `claude-plugins-official`
  - Loop terminal now launches Claude with `/ralph-loop` command instead of `--continue`
  - Added `completionPromise` field to loop creation (used by plugin for `<promise>TEXT</promise>` completion detection)
  - Added `maxIterations` and `completionPromise` fields to create loop dialog
  - Added default completion promise setting in loop configuration
  - Hook status now checks for official plugin installation
  - Updated run command display to show `/ralph-loop` syntax
  - Uses `--dangerously-skip-permissions` for unattended loop execution

## [0.41.10] - 2026-01-23

### Fixed

- **Environment File Support in File Explorer** - Fixed two bugs with .env files:
  - `.env` files are now scanned and displayed in the file tree
  - Creating a new `.env` file now properly selects it and shows it in the editor
  - File type is now correctly preserved when creating env, mcps, settings, and other config files

## [0.41.9] - 2026-01-23

### Added

- **Auto-Update Preference** - New toggle in Preferences > About section
  - When enabled, updates install automatically when the page loads
  - No user interaction required - completely hands-free updates
  - Shows "Auto-updating to vX.X.X..." toast when triggered
  - Falls back to manual update badge if auto-update fails

## [0.41.8] - 2026-01-23

### Fixed

- **Update Toast Messages** - Removed manual restart commands from toast messages
  - PreferencesView now also auto-restarts like Dashboard
  - Messages now correctly reflect automatic restart behavior

## [0.41.6] - 2026-01-23

### Added

- **Codex CLI Support** - Full support for OpenAI's Codex CLI tool
  - Added Codex to Preferences > Enabled AI Tools with green toggle
  - Added `applyForCodex()` to generate `.codex/mcp.json` config
  - Added Codex detection in installed tools check
  - TOOL_PATHS now includes codex configuration

### Fixed

- **Auto-Restart After Update** - Updates now automatically restart the server
  - No longer shows manual restart command after npm update
  - Server restarts and page reloads automatically
  - Polls server until it comes back up, then refreshes

## [0.41.5] - 2026-01-23

### Changed

- Documentation updates for v0.41.1-0.41.4 changelog entries

## [0.41.4] - 2026-01-23

### Added

- **Inherited MCP Display** - MCP editor now shows MCPs inherited from parent configs
  - Greyscale display with "Inherited from X" tooltip showing source
  - Block/Unblock buttons to exclude parent-enabled MCPs at local level
  - New `exclude` array support in mcps.json config files
  - Blocked MCPs shown with red styling and strikethrough

## [0.41.3] - 2026-01-23

### Added

- **Streaming Progress for Project Init** - `claude -p /init` now streams output in real-time
  - Uses Server-Sent Events (SSE) instead of blocking `execFileSync`
  - Shows live Claude output in the Add Project dialog
  - Progress indicator with status (running/success/error)

## [0.41.2] - 2026-01-23

### Removed

- **Tauri Desktop App Code** - Removed all Tauri-related files (can recover from git history)
  - Removed `src-tauri/` directory
  - Removed `scripts/tauri-prepare.js`
  - Removed `.github/workflows/tauri-release.yml`
  - Removed tauri scripts from package.json

## [0.41.1] - 2026-01-23

### Added

- **Project Edit Button** - All Projects view now has Edit button to rename projects
  - Edit dialog with name field and save functionality
  - Replaced Select button (dropdown selector serves that purpose)

## [0.41.0] - 2026-01-23

### Added

- **Ralph Loop Feature** - Autonomous development loops that run Claude Code until a task is completed
  - Three-phase workflow: Clarify -> Plan -> Execute
  - CLI commands: `coder-config loop create/start/pause/resume/cancel/approve/status/history/config`
  - Web UI: New "Ralph Loops" view in Tools section with full loop management
  - Dashboard widget showing active loop status
  - Safety mechanisms: iteration limits, cost budgets, phase gates
  - Hook templates for automatic loop continuation
  - Per-loop data storage in `~/.coder-config/loops/`
  - Run loops with: `export CODER_LOOP_ID=<id> && claude --continue "task"`

## [0.40.14] - 2026-01-23

### Changed

- **Renamed `bin/claude-config` to `bin/coder-config`** - Standalone CLI wrapper now uses new name
- **Renamed `claude-config-plugins` to `coder-config-plugins`** - Plugin marketplace reference updated
- **Added CLI Commands section to Plugins view** - Shows `/plugin` slash commands for Claude Code

### Fixed

- **`bin/coder-config` now checks both config paths** - Looks for `~/.coder-config/` first, falls back to `~/.claude-config/`

## [0.40.13] - 2026-01-23

### Fixed

- **`ui stop` and `ui` Now Work with LaunchAgent** - Commands properly handle macOS LaunchAgent daemon
  - `coder-config ui stop` now uses `launchctl unload` to actually stop the LaunchAgent
  - `coder-config ui` now uses `launchctl unload/load` to properly restart
  - Previously these commands only worked with PID file mode, not LaunchAgent mode

## [0.40.12] - 2026-01-23

### Fixed

- **Auto-Update No Longer Pretends to Reload** - After npm update, UI now shows the actual restart command instead of fake "Reloading..."
  - Shows: `Run: coder-config ui stop && coder-config ui`
  - The npm update changes files on disk but the server process must be restarted to load them

## [0.40.11] - 2026-01-23

### Fixed

- **Complete UI Branding Rename** - All UI text now uses `coder-config` consistently
  - Updated all CLI examples in views from `claude-config` to `coder-config`
  - Updated documentation content with correct paths and URLs
  - Updated GitHub links to point to `coder-config` repo

- **Legacy Config Path Support** - Now reads from `~/.claude-config/` if `~/.coder-config/` is empty
  - Preserves existing projects, workstreams, and activity data
  - No manual migration needed - data is found automatically
  - LocalStorage keys kept for backwards compatibility (preserves theme, tutorial progress)

## [0.40.9] - 2026-01-23

### Fixed

- **Auto-Update Pre-caching** - Package is now pre-cached before showing update notification
  - Prevents timing issues where notification appeared before package was fully downloaded
  - Improves reliability of the auto-update process

## [0.40.6] - 2026-01-23

### Fixed

- **Complete Branding Rename** - All CLI commands and help text now use `coder-config` consistently
  - Updated all CLI help messages from `claude-config` to `coder-config`
  - Updated auto-update to check new `coder-config` npm package
  - Renamed LaunchAgent from `io.regression.claude-config` to `io.regression.coder-config`
  - Updated shell integration file to `shell/coder-config.zsh`

- **Environment Variable Rename** - `CLAUDE_WORKSTREAM` → `CODER_WORKSTREAM`
  - New env var: `CODER_WORKSTREAM` (preferred)
  - Legacy `CLAUDE_WORKSTREAM` still supported for backward compatibility
  - All hooks updated to check both variables

- **Auto-Update Fix** - UI now correctly checks for updates from `coder-config` npm package

## [0.40.0] - 2026-01-23

### Changed

- **Package Renamed** - `@regression-io/claude-config` → `coder-config`
  - New npm package name: `coder-config`
  - New GitHub repo: `regression-io/coder-config`
  - Both `coder-config` and `claude-config` commands work (backwards compatible)
  - Config paths updated to `~/.coder-config/` (legacy `~/.claude-config/` still supported)
  - Old npm package deprecated with migration message
  - Old GitHub repo updated with redirect notice
  - **Migration for existing users:**
    ```bash
    npm uninstall -g @regression-io/claude-config
    npm install -g coder-config
    ```
  - Your settings are preserved automatically

### Planned

- **Folder Migration** - `~/.claude-config/` → `~/.coder-config/` (v0.41.0)
  - See `docs/plans/2026-01-23-folder-migration-design.md` for details
  - Will support both paths during transition
  - `coder-config migrate` command planned

### Added

- **Codex CLI Support** - Full configuration management for OpenAI Codex CLI
  - New "Codex CLI" tab in Configuration section
  - Settings editor for `~/.codex/config.toml` with rich UI and raw TOML view
  - Model selection (GPT-5.2 Codex, GPT-5, o3-mini)
  - Security settings (approval policy, sandbox mode)
  - MCP server management (add/remove/view servers)
  - Feature flags (shell snapshot, web search)
  - TUI options (animations, notifications)
  - History and analytics settings
  - TOML parsing via @iarna/toml

- **Codex CLI workstream support** - Workstreams now work with Codex CLI
  - New `--codex` flag for `workstream install-hook` command
  - `--all` flag now includes Codex CLI
  - Hook injects workstream context into Codex sessions

## [0.39.5] - 2026-01-23

### Changed

- **Tauri desktop app paused** - Focus shifted to CLI and web UI
  - Desktop app code remains in repository for future use
  - Use `claude-config ui install` for auto-start + PWA as recommended approach

## [0.39.1] - 2026-01-22

### Added

- **MCP Permissions Helper** - Quick UI for managing MCP server tool permissions
  - New "Quick MCP Permissions" section in Claude Code Permissions tab
  - Lists all configured MCP servers from registry
  - One-click "Allow all tools" toggle per server (`mcp__servername__*`)
  - Settings button opens detailed configuration dialog
  - **Tool Discovery** - Automatically discovers available tools from MCP servers
    - Spawns servers and queries via JSON-RPC `tools/list`
    - Shows tool names and descriptions
    - Works with stdio-based MCP servers
  - Per-tool permissions: Allow/Ask/Deny for individual tools
  - Manual tool entry for servers that fail discovery
  - Badge shows tool count or "All" status

## [0.39.0] - 2026-01-22

### Added

- **Tauri Desktop App** - Native desktop app using Tauri v2
  - **Download from [GitHub Releases](https://github.com/regression-io/claude-config/releases)** - no Node.js required
  - Cross-platform: macOS (Apple Silicon & Intel), Windows, Linux
  - Bundles Node.js server as sidecar process
  - WebView opens to localhost:3333 automatically
  - App icon with gear design in purple gradient
  - True desktop experience without CLI commands
  - GitHub Actions workflow for automated builds on version tags
  - Build locally with `npm run tauri:build` or develop with `npm run tauri:dev`
  - CLI package (`npm install -g @regression-io/claude-config`) still works independently

## [0.38.3] - 2026-01-22

### Fixed

- **node-pty compatibility** - Auto-rebuild node-pty from source for newer Node.js versions
  - Prebuilt binaries may not be available for Node.js 25+
  - Postinstall script now tests node-pty and rebuilds if incompatible
  - Shows clear progress messages during rebuild
  - Requires build tools (Xcode CLI on macOS, build-essential on Linux)

## [0.38.0] - 2026-01-21

### Added

- **Auto-start on login** - New commands for macOS LaunchAgent integration
  - `claude-config ui install` - Install auto-start so UI runs on login
  - `claude-config ui uninstall` - Remove auto-start
  - Server auto-restarts if it crashes
  - Perfect for PWA users who want the app always available

## [0.37.22] - 2026-01-21

### Fixed

- **Project switching error** - Fixed "Failed to switch project: Failed to fetch" error
  - Root cause: Missing `setProjectDir` callback parameter in server API call
  - The function signature required 5 arguments but only 4 were passed
  - This caused `getSubprojects()` to be `undefined`, crashing the request handler

- **npm update detection** - Improved reliability of version check
  - Added proper timeout handling using `setTimeout()` method (was using unreliable options property)
  - Added 10-second timeout on npm registry fetch (previously could hang indefinitely)
  - Added diagnostic logging to server console for debugging update check issues
  - Logging shows: installed version, npm version, and any fetch/timeout errors

## [0.37.20] - 2026-01-21

### Added

- **Gemini CLI workstream support** - Workstreams now work with Gemini CLI
  - New `--gemini` flag for `workstream install-hook` command
  - New `--all` flag to install hooks for all supported tools
  - SessionStart hook injects workstream context into Gemini sessions
  - Same `CLAUDE_WORKSTREAM` env var works across both tools

## [0.37.19] - 2026-01-21

### Added

- **`workstream check-path` command** - Check if a path is within the active workstream
  - Returns exit code 0 if valid, 1 if outside workstream
  - Used by pre-tool-call hooks for enforcement
  - Supports `--silent` flag for scripting

## [0.37.17] - 2026-01-21

### Fixed

- **Update availability check** - Verify tarball is accessible before showing update button
  - Previously: UI fetched version from npm registry API, but CDN may not have propagated yet
  - Now: HEAD request to tarball URL verifies it's actually downloadable
  - Added retry logic (3 attempts, 5s delay) as safety net for edge cases
  - Better error message when version not yet available on CDN

## [0.37.15] - 2026-01-21

### Fixed

- **Pre-commit hook staging** - Fixed version sync by staging correct file (`lib/constants.js` not `config-loader.js`)
  - Root cause of version mismatch between package.json and actual npm package
  - VERSION constant now correctly matches package.json on publish

## [0.37.14] - 2026-01-21

### Fixed

- **Update API** - Pass `targetVersion` from UI instead of re-fetching after update
  - Eliminates race condition where version check returned null
  - UI already knows the target version, so pass it through

## [0.37.13] - 2026-01-21

### Fixed

- **npm update command** - Changed from `npm update` to `npm install @latest`
  - `npm update -g` doesn't reliably get latest version
  - `npm install -g @regression-io/claude-config@latest` works correctly

## [0.37.11] - 2026-01-21

### Added

- **Per-session workstream activation** - Each terminal can have its own active workstream
  - `claude-config workstream use <name>` sets env var (with shell integration)
  - `claude-config workstream deactivate` clears it
  - No more global-only activation

### Fixed

- **UI update button** - Fixed showing "vnull" after update
- **Version check** - Only checks npm, removed local dev path detection
- **Double version bump** - Fixed build script bumping version twice

## [0.37.0] - 2026-01-21

### Added

- **Workstream Scoping** - Focus Claude's attention to only your workstream directories
  - Enhanced injection outputs restriction text telling Claude which directories to work in
  - `CLAUDE_WORKSTREAM` env var for per-session activation (enables parallel work in terminals)
  - `claude-config workstream install-hook` to install pre-prompt hook
  - `claude-config workstream deactivate` shows how to clear active workstream

### Changed

- **Badge logic improved** - "in use" (blue) when project in 1 workstream, "shared" (amber) when in 2+
- **Rules renamed to Context** - Better describes the purpose of workstream text field

## [0.36.18] - 2026-01-21

### Added

- **Multi-select in Add Project dialog** - Select multiple projects at once in workstreams
  - Checkbox-style selection UI with visual feedback
  - "Add Selected (N)" button shows selection count
  - Previously added projects shown as disabled with "added" label

## [0.36.17] - 2026-01-21

### Added

- **CLI update command** - Check npm for updates and install from command line
  - `claude-config update` - Check and install updates automatically
  - `claude-config update --check` - Check only, don't install
  - `claude-config update /path` - Update from local source (existing behavior)

## [0.36.16] - 2026-01-21

### Fixed

- **Fix npm package missing files** - Add `lib/**` and `ui/routes/**` to package.json files array
  - Fixes "Cannot find module './routes'" error on fresh install

## [0.36.14] - 2026-01-21

### Added

- **Subproject selection in all workstream dialogs** - Expand projects to select individual sub-projects
  - Add Project dialog now shows expandable chevrons
  - Edit dialog project picker now shows expandable chevrons
  - Create dialog already had this functionality

## [0.36.12] - 2026-01-20

### Fixed

- **Complete template system cleanup** - Remove remaining `getAppliedTemplate` calls from UI server and file-explorer routes
- Remove deprecated template tests from test suite

## [0.36.10] - 2026-01-20

### Fixed

- **Remove stale template references** - Clean up deprecated template system from config-loader.js that was causing startup failures

## [0.36.8] - 2026-01-20

### Added

- **Subproject Selection in Workstreams** - Expandable project picker shows sub-projects
  - Click chevron to expand a project and see its sub-projects
  - Select specific sub-projects to include in workstream
  - Visual indicators for already-added and shared projects

## [0.36.6] - 2026-01-20

### Added

- **Claude Code Init on Project Register** - Option to run `claude /init` when adding a project
  - Checkbox in Add Project dialog with preference buttons (Always/Never/Ask)
  - Creates CLAUDE.md using Claude Code's own initialization
  - Graceful fallback if Claude Code is not installed

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
