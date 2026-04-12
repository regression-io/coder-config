# Coder-Config Roadmap

**Last updated:** 2026-04-12

---

## Roadmap Conventions

- **Status values:** `PLANNED` | `IN_PROGRESS` | `PARTIAL` | `COMPLETE` | `SUPERSEDED` | `PARKED`
- **Feature IDs:** `CC-` prefix (e.g., CC-1, CC-2)
- **Hierarchy:** `FEATURE (required) → TASK (required)`
- **Organize by features, not dates**

---

## CC-1: Micro-Standards Registry

**Status:** `PLANNED`

Just-in-time discovery of bite-sized, domain-specific config guides instead of monolithic instruction files. Config rules organized as small, tagged, independently loadable units. Tools discover relevant standards based on the current task context.

**Source:** [The Agent-Ready Repository](https://medium.com/@doyond/the-agent-ready-repository-58e08b273878)

| # | Item | Status |
|---|------|--------|
| 1 | Standard format: markdown files with YAML frontmatter (name, tags, trigger conditions) | `PLANNED` |
| 2 | Registry index: auto-generated from standards directory | `PLANNED` |
| 3 | Context-based activation: match active file types/directories to relevant standards | `PLANNED` |
| 4 | Cross-tool sync: standards apply uniformly across Claude/Gemini/Codex | `PLANNED` |

**Dependencies:** None

**Exit criteria:**
- [ ] Standards directory with at least 3 example standards
- [ ] Auto-generated registry index from standards directory
- [ ] Context matcher resolves relevant standards for a given file path
- [ ] Standards load identically across Claude Code, Gemini CLI, and Codex CLI

---

## CC-2: Multi-Provider Configuration

**Status:** `PLANNED`

Unified config for 8+ LLM providers with per-provider feature flags, env var management, and circuit breakers.

**Source:** [Claude Octopus](https://github.com/nyldn/claude-octopus) (2.4K stars)

| # | Item | Status |
|---|------|--------|
| 1 | Provider registry: YAML/JSON config for provider endpoints, API keys, model IDs | `PLANNED` |
| 2 | Per-provider feature flags: enable/disable tools, permissions per provider | `PLANNED` |
| 3 | Circuit breaker config: timeout, retry, fallback provider settings | `PLANNED` |
| 4 | `coder-config providers` CLI for listing/testing provider health | `PLANNED` |

**Dependencies:** None

**Exit criteria:**
- [ ] Provider config schema supports 8+ providers
- [ ] Feature flags toggle tools/permissions per provider
- [ ] Circuit breaker triggers fallback after configurable timeout/retry
- [ ] `coder-config providers` lists all providers with health status

---

## CC-3: Scope CLI Integration

**Status:** `PLANNED`

First-class support for configuring code intelligence tools (Scope CLI workspace.toml, skill files, MCP server setup).

**Source:** [Scope CLI](https://rynhardt-potgieter.github.io/scope/) — Rust-based code intelligence for LLM agents

| # | Item | Status |
|---|------|--------|
| 1 | Auto-detect Scope installation | `PLANNED` |
| 2 | Scaffold `.scope/` config during `coder-config init` | `PLANNED` |
| 3 | Manage Scope MCP server registration across tools | `PLANNED` |

**Dependencies:** None

**Exit criteria:**
- [ ] `coder-config init` detects Scope and offers `.scope/` scaffolding
- [ ] Generated `.scope/workspace.toml` is valid and functional
- [ ] Scope MCP server registered in Claude, Gemini, and Codex configs

---

## CC-4: Steering File Format

**Status:** `PLANNED`

Support markdown-with-YAML-frontmatter config files with inclusion modes: `always` (injected every prompt), `fileMatch` (injected when matching files are open), `manual` (on-demand).

**Source:** [Modo IDE](https://github.com/mohshomis/modo) steering file pattern

| # | Item | Status |
|---|------|--------|
| 1 | Steering file format spec: markdown + YAML frontmatter with `mode` field | `PLANNED` |
| 2 | File watcher: detect fileMatch triggers | `PLANNED` |
| 3 | Cross-tool translation: convert steering files to Claude rules, Gemini instructions, Codex guidelines | `PLANNED` |

**Dependencies:** CC-1 (shared frontmatter format)

**Exit criteria:**
- [ ] Steering file spec documented with `always`, `fileMatch`, and `manual` modes
- [ ] File watcher activates steering files when matching files are open
- [ ] Steering files translate correctly to Claude rules, Gemini instructions, and Codex guidelines

---

## CC-5: Cross-Tool Skill Management

**Status:** `PLANNED`

Install and manage skill/agent collections across Claude Code, Codex, Cursor, and Gemini CLI with cross-referencing and foundation context.

**Sources:** [marketingskills](https://github.com/coreyhaines31/marketingskills), [Agency Agents](https://github.com/msitarzewski/agency-agents) (72.8K stars)

| # | Item | Status |
|---|------|--------|
| 1 | Skill registry: index of installed skills with tool compatibility matrix | `PLANNED` |
| 2 | `coder-config skills install <pack>` CLI | `PLANNED` |
| 3 | Cross-reference resolution: skills that reference other skills get wired correctly per-tool | `PLANNED` |
| 4 | Foundation context: a base context skill injected before domain skills | `PLANNED` |

**Dependencies:** CC-1 (standard format for skill metadata)

**Exit criteria:**
- [ ] Skill registry lists installed skills with per-tool compatibility
- [ ] `coder-config skills install <pack>` installs and registers a skill pack
- [ ] Cross-references between skills resolve correctly in each tool
- [ ] Foundation context skill loads before domain skills in all tools

---

## CC-6: Agent Harness Auto-Optimization

**Status:** `PLANNED`

Optional benchmark-driven config tuning. Run agent configs against test tasks, measure quality/cost, auto-select best config. Human-facing layer on top, optimization engine underneath.

**Source:** [AutoAgent](https://github.com/kevinrgu/autoagent) (MarkTechPost)

| # | Item | Status |
|---|------|--------|
| 1 | Benchmark task format: YAML task definitions with expected outcomes | `PLANNED` |
| 2 | Config sweep: iterate over config permutations | `PLANNED` |
| 3 | Scoring: quality + cost composite | `PLANNED` |
| 4 | `coder-config optimize` CLI | `PLANNED` |

**Dependencies:** CC-2 (multi-provider config for sweep targets)

**Exit criteria:**
- [ ] Benchmark tasks define expected outcomes in YAML
- [ ] Config sweep runs tasks across permutations and records results
- [ ] Composite score ranks configs by quality and cost
- [ ] `coder-config optimize` outputs recommended config with rationale

---

## CC-7: Context Pruning Configuration

**Status:** `PLANNED`

Per-model and per-project compression thresholds, protected file patterns, and nudge-based trigger settings for context management.

**Source:** [OpenCode DCP](https://github.com/Opencode-DCP/opencode-dynamic-context-pruning) (1.8K stars)

| # | Item | Status |
|---|------|--------|
| 1 | Compression config schema: thresholds, protected patterns, mode (range/message) | `PLANNED` |
| 2 | Per-model overrides: different compression settings per LLM provider | `PLANNED` |
| 3 | Nudge triggers: configure when to suggest compression to the agent | `PLANNED` |

**Dependencies:** CC-2 (per-provider model config)

**Exit criteria:**
- [ ] Compression config schema validates thresholds and protected patterns
- [ ] Per-model overrides apply different settings per provider
- [ ] Nudge triggers fire at configured thresholds

---

## CC-8: Cross-Tool Format Converter

**Status:** `PLANNED`

Convert AI coding tool configurations between 11+ target formats. Single-source-of-truth config in Claude Code format, automatically converted to Codex (TOML), Gemini (JSON), Copilot (.agent.md), Windsurf, Kiro, OpenCode, and others. Includes managed-block merging for safe config updates without clobbering user customizations, symlink-based sync for instant propagation, and auto-detection of installed tools.

**Source:** [compound-engineering-plugin](https://github.com/EveryInc/compound-engineering-plugin) (Every Inc) — CLI converter covering 11 target formats with format-specific serialization

| # | Item | Status |
|---|------|--------|
| 1 | Target format specs: document each tool's config contract (skills format, MCP server config, rules/instructions format). Reference: compound-engineering's `docs/specs/` per-tool documentation. | `PLANNED` |
| 2 | Format converter engine: convert Claude Code plugin format (markdown + YAML frontmatter) to target-specific formats (TOML for Codex, JSON for Kiro, YAML for Qwen, `.agent.md` for Copilot). One converter per target in modular architecture. | `PLANNED` |
| 3 | Managed-block merging: use `BEGIN/END` markers to safely update tool configs without overwriting user customizations. Backup-before-overwrite for safety. | `PLANNED` |
| 4 | Symlink-based sync: symlink skills/configs rather than copying so edits to the canonical source propagate instantly. `coder-config sync` command. | `PLANNED` |
| 5 | Auto-detection: detect which AI coding tools are installed and sync to all of them automatically. `coder-config detect` command. | `PLANNED` |
| 6 | MCP server portability: translate MCP server configurations across tools (JSON for some, TOML for others, env var prefixing for Copilot). Handle tool-specific quirks. | `PLANNED` |

**Dependencies:** CC-1 (Micro-Standards Registry — provides the source format to convert from)

**Exit criteria:**
- [ ] `coder-config convert --target codex` produces valid Codex config
- [ ] `coder-config sync` detects installed tools and syncs all configs
- [ ] Managed-block markers prevent user config clobbering
- [ ] MCP server configs translate correctly across tools

---

## CC-9: Claude Code Router Integration

**Status:** `PLANNED`

Manage Claude Code Router (CCR) configuration through coder-config CLI and Web UI. CCR is a local proxy that routes Claude Code API calls to different LLM providers based on task type (default, background, reasoning, long-context, web-search, image). Config at `~/.claude-code-router/config.json`.

**Source:** [claude-code-router](https://github.com/musistudio/claude-code-router) (32K+ stars) — task-based model routing proxy for Claude Code

| # | Item | Status |
|---|------|--------|
| 1 | `lib/router.js` module: read/write `~/.claude-code-router/config.json` with provider CRUD and router rule management | `PLANNED` |
| 2 | CLI commands: `coder-config router list`, `router add-provider`, `router remove-provider`, `router set-rule <task> <provider,model>` | `PLANNED` |
| 3 | Web UI: Router view with provider management, task-to-model mapping editor, and transformer configuration | `PLANNED` |
| 4 | Env var bridging: resolve `$VAR` interpolation in CCR config using coder-config's existing env system | `PLANNED` |
| 5 | Preset support: import/export named router configurations via `coder-config router preset` | `PLANNED` |
| 6 | Auto-detect CCR installation and show router status in dashboard | `PLANNED` |

**Dependencies:** CC-2 (shared provider registry concepts)

**Exit criteria:**
- [ ] `coder-config router list` shows providers and routing rules from CCR config
- [ ] `coder-config router add-provider` creates valid provider entry in CCR config
- [ ] `coder-config router set-rule default openrouter,claude-opus-4-20250514` updates routing
- [ ] Web UI router view allows full CRUD on providers and rules
- [ ] Env vars in CCR config resolve correctly via coder-config's env system
- [ ] Dashboard shows CCR proxy status when installed

---

## CC-10: Full Settings.json Coverage

**Status:** `PLANNED`

Complete coverage of all 60+ Claude Code settings.json fields in the Web UI settings editor. Current editor covers ~20 fields; CC now has model overrides, auto mode classifier, managed settings, and many more.

| # | Item | Status |
|---|------|--------|
| 1 | Model overrides editor: `modelOverrides` mapping of Anthropic model IDs to provider-specific IDs | `PLANNED` |
| 2 | Auto mode classifier config: `autoMode.environment`, `autoMode.allow`, `autoMode.soft_deny` arrays | `PLANNED` |
| 3 | Managed settings viewer: read-only display of managed/MDM settings from all scopes (server, file, drop-in) | `PLANNED` |
| 4 | Company announcements editor: `companyAnnouncements` array for team/enterprise startup messages | `PLANNED` |
| 5 | API auth helpers: `apiKeyHelper`, `awsAuthRefresh`, `awsCredentialExport` script path editors | `PLANNED` |
| 6 | File suggestion config: `fileSuggestion` custom `@` autocomplete script | `PLANNED` |
| 7 | Spinner customization: `spinnerTipsOverride`, `spinnerVerbs` editors | `PLANNED` |
| 8 | Status line config: `statusLine` with `refreshInterval` and command editor | `PLANNED` |

**Dependencies:** None

**Exit criteria:**
- [ ] All 60+ settings.json fields editable or viewable in Web UI
- [ ] Settings editor validates field types against official JSON Schema
- [ ] Managed-only fields shown as read-only with explanation
- [ ] Auto mode classifier config generates valid `autoMode` block

---

## CC-11: Hook Builder

**Status:** `PLANNED`

Visual hook builder supporting all 30 Claude Code hook events and 4 handler types (command, http, prompt, agent). Replace the current raw JSON textarea with a structured editor.

| # | Item | Status |
|---|------|--------|
| 1 | Event picker: all 30 hook events with matcher configuration and descriptions | `PLANNED` |
| 2 | Handler type editors: command (with async/shell/timeout), HTTP (URL/headers), prompt (LLM eval), agent (subagent tools) | `PLANNED` |
| 3 | Conditional hooks: `if` field editor using permission rule syntax | `PLANNED` |
| 4 | Hook testing: dry-run a hook with sample payload and show output | `PLANNED` |
| 5 | Pre-built hook library: common hooks (workstream inject, session persist, activity track) as one-click installs | `PLANNED` |

**Dependencies:** None

**Exit criteria:**
- [ ] All 30 hook events configurable via visual builder
- [ ] All 4 handler types (command, http, prompt, agent) have dedicated editors
- [ ] Conditional `if` field generates valid permission rule syntax
- [ ] Generated hooks JSON validates against CC's expected format

---

## CC-12: Subagent & Agent Management

**Status:** `PLANNED`

Manage custom subagent definitions (`.claude/agents/*.md`) through CLI and Web UI. CC now supports project-scoped and user-scoped agents with YAML frontmatter configuration.

| # | Item | Status |
|---|------|--------|
| 1 | Agent CRUD: create/edit/delete agent markdown files with YAML frontmatter | `PLANNED` |
| 2 | Frontmatter editor: visual fields for name, description, tools, disallowedTools, model, permissionMode, maxTurns, skills, mcpServers, hooks, memory, isolation | `PLANNED` |
| 3 | Scope management: project (`.claude/agents/`) vs user (`~/.claude/agents/`) agent placement | `PLANNED` |
| 4 | Agent teams config: team definitions, task dependencies, teammate display modes | `PLANNED` |
| 5 | CLI commands: `coder-config agents list`, `agents create`, `agents edit` | `PLANNED` |

**Dependencies:** None

**Exit criteria:**
- [ ] Agent files created with valid YAML frontmatter and markdown body
- [ ] All frontmatter fields (tools, model, permissionMode, etc.) editable via UI
- [ ] Agent teams config generates valid team JSON
- [ ] `coder-config agents list` shows all project and user agents

---

## CC-13: Plugin Ecosystem Management

**Status:** `PLANNED`

Full plugin lifecycle management including marketplace discovery, trust configuration, and cross-tool plugin portability.

| # | Item | Status |
|---|------|--------|
| 1 | Marketplace management: `extraKnownMarketplaces` add/remove, trust warnings | `PLANNED` |
| 2 | Plugin trust config: `enabledPlugins`, blocked plugins, custom trust messages | `PLANNED` |
| 3 | Plugin MCP servers: handle `${CLAUDE_PLUGIN_ROOT}` and `${CLAUDE_PLUGIN_DATA}` variables | `PLANNED` |
| 4 | Plugin hooks: manage force-enabled plugin hooks with `allowManagedHooksOnly` | `PLANNED` |

**Dependencies:** CC-5 (cross-tool skill management)

**Exit criteria:**
- [ ] Marketplace sources configurable with validation
- [ ] Plugin trust/block lists manageable via UI
- [ ] Plugin MCP server variables resolve correctly
- [ ] Plugin hooks display in hook builder with managed status

---

## CC-14: Codex CLI Full Settings Coverage

**Status:** `PLANNED`

Complete Codex CLI config.toml management. Codex is now Rust-based (v0.120.0) with TOML config, 50+ feature flags, named profiles, multi-agent, and granular permissions. Current support is MCP-only.

**Source:** [Codex CLI](https://github.com/openai/codex) — OpenAI's coding CLI (Rust, TOML config, config.schema.json)

| # | Item | Status |
|---|------|--------|
| 1 | Model & provider config: `model`, `model_provider`, `model_providers` map with base_url/auth/wire_api, `model_reasoning_effort`, `service_tier` | `PLANNED` |
| 2 | Approval & sandbox: `approval_policy` (untrusted/on-request/never/granular), `sandbox_mode` (read-only/workspace-write/danger-full-access), network/filesystem permissions | `PLANNED` |
| 3 | Feature flags editor: 50+ boolean toggles under `[features]` (multi_agent, plugins, memories, web_search, shell_tool, hooks, etc.) | `PLANNED` |
| 4 | Profiles: `[profiles.<name>]` named config presets with full ConfigProfile fields, active profile selection | `PLANNED` |
| 5 | Multi-agent config: `[agents]` with max_threads, max_depth, job_max_runtime_seconds, named agent roles | `PLANNED` |
| 6 | Plugins & skills: `[plugins]`, `[skills]` with bundled/custom enable/disable, `[marketplaces]` with git sources | `PLANNED` |
| 7 | Memory system: `[memories]` with generate/use toggles, consolidation model, rollout management | `PLANNED` |
| 8 | TUI settings: `[tui]` theme, animations, notifications, status_line, terminal_title | `PLANNED` |
| 9 | Web UI: Codex settings view with TOML editor and structured field editors | `PLANNED` |

**Dependencies:** None

**Exit criteria:**
- [ ] All top-level config.toml sections editable in Web UI
- [ ] `coder-config codex show` displays current Codex config summary
- [ ] Profile switching works via CLI and UI
- [ ] Feature flags toggle generates valid TOML
- [ ] TOML round-trips without data loss (preserve comments where possible)

---

## CC-15: Codex CLI Instruction File Management

**Status:** `PARTIAL`

Manage AGENTS.md files for Codex CLI. Codex uses `AGENTS.md` (not CODEX.md) with directory-walk discovery, override files, and configurable fallback filenames.

| # | Item | Status |
|---|------|--------|
| 1 | AGENTS.md CRUD in Project Explorer: create/edit alongside CLAUDE.md and GEMINI.md | `COMPLETE` |
| 2 | Override support: `AGENTS.override.md` for local-only instructions (gitignored) | `COMPLETE` |
| 3 | Fallback filenames: respect `project_doc_fallback_filenames` config for non-standard names | `PARKED` |
| 4 | Hierarchy visualization: instruction-hierarchy API endpoint for directory-walk discovery | `COMPLETE` |

**Dependencies:** None

**Exit criteria:**
- [ ] Project Explorer shows AGENTS.md alongside other instruction files
- [ ] AGENTS.override.md created with .gitignore entry
- [ ] Fallback filename resolution matches Codex CLI behavior

---

## CC-16: Gemini CLI Full Settings Coverage

**Status:** `PLANNED`

Complete Gemini CLI settings.json management. Gemini CLI (v0.37.1) has 15+ top-level config sections including model configs, approval modes, sandbox, security, hooks, agents, extensions, context management, and enterprise admin. Current support is MCP-only.

**Source:** [Gemini CLI](https://github.com/google-gemini/gemini-cli) — Google's coding CLI (settings.schema.json)

| # | Item | Status |
|---|------|--------|
| 1 | Model config: `model.name`, `modelConfigs` aliases/chains/thinking, temperature, auto-routing between Pro/Flash | `PLANNED` |
| 2 | Approval & security: `general.defaultApprovalMode` (default/auto_edit/plan/yolo), `security.*` (toolSandboxing, disableYoloMode, folderTrust, envRedaction, conseca) | `PLANNED` |
| 3 | Sandbox config: `tools.sandbox` with 5 methods (seatbelt/docker/podman/gvisor/lxc), allowed paths, network access | `PLANNED` |
| 4 | Hooks: 11 lifecycle events (BeforeTool, AfterTool, BeforeAgent, AfterAgent, SessionStart, SessionEnd, PreCompress, BeforeModel, AfterModel, BeforeToolSelection, Notification) | `PLANNED` |
| 5 | Extensions: install/enable/disable, registry management, `gemini-extension.json` format, `security.allowedExtensions` | `PLANNED` |
| 6 | Agents: subagent overrides (model, maxTurns, maxTimeMinutes), browser agent config (headless, domains, profiles) | `PLANNED` |
| 7 | Context management: `contextManagement.*` (historyWindow, messageLimits, tool distillation, output masking) | `PLANNED` |
| 8 | UI & display: `ui.*` (theme, footer, inlineThinkingMode, accessibility, loadingPhrases, custom themes) | `PLANNED` |
| 9 | Experimental features: worktrees, JIT context, memory manager, model steering, ADK integration | `PLANNED` |
| 10 | Web UI: Gemini settings view with structured editors for all sections | `PLANNED` |

**Dependencies:** None

**Exit criteria:**
- [ ] All settings.json sections editable in Web UI
- [ ] `coder-config gemini show` displays current Gemini config summary
- [ ] Sandbox config generates valid settings for all 5 sandbox methods
- [ ] Hook events configurable with matcher patterns
- [ ] Extension management (install/enable/disable) works via CLI and UI

---

## CC-17: Gemini CLI Context & Memory Management

**Status:** `PLANNED`

Manage GEMINI.md files and context configuration. Gemini CLI uses hierarchical GEMINI.md discovery with boundary markers, import syntax, and configurable file names.

| # | Item | Status |
|---|------|--------|
| 1 | GEMINI.md CRUD in Project Explorer: create/edit at global and project scopes | `PLANNED` |
| 2 | Context config: `context.fileName` (array support), `context.memoryBoundaryMarkers`, `context.includeDirectories` | `PLANNED` |
| 3 | Import resolution: `@path/to/file.md` syntax preview showing resolved content | `PLANNED` |
| 4 | Session retention: `general.sessionRetention` config (maxAge, maxCount, minRetention) | `PLANNED` |

**Dependencies:** None

**Exit criteria:**
- [ ] GEMINI.md files manageable alongside CLAUDE.md and AGENTS.md
- [ ] Context config generates valid settings with array file names
- [ ] Session retention config applies correctly

---

## CC-18: Cross-Tool Approval & Sandbox Unification

**Status:** `PLANNED`

Unified approval mode and sandbox configuration across all three tools. Each tool has a different model (Claude: permissions + auto mode + sandbox, Codex: approval_policy + sandbox_mode, Gemini: defaultApprovalMode + sandbox + yoloMode) but the concepts map to similar intents.

| # | Item | Status |
|---|------|--------|
| 1 | Unified approval matrix: visual mapping of Claude/Codex/Gemini approval modes showing equivalent settings | `PLANNED` |
| 2 | Sandbox comparison view: side-by-side of what each tool restricts at each sandbox level | `PLANNED` |
| 3 | One-click presets: "Restrictive", "Balanced", "Permissive" presets that set appropriate values for all installed tools | `PLANNED` |
| 4 | Per-tool override: fine-tune individual tool settings after applying a preset | `PLANNED` |

**Dependencies:** CC-10 (Claude settings), CC-14 (Codex settings), CC-16 (Gemini settings)

**Exit criteria:**
- [ ] Approval matrix shows correct equivalences across tools
- [ ] Presets generate valid config for all installed tools
- [ ] Per-tool overrides persist without clobbering preset values

---

## Dependency Graph

```
CC-1  ← CC-4  (shared frontmatter format)
CC-1  ← CC-5  (standard format for skill metadata)
CC-1  ← CC-8  (source format to convert from)
CC-2  ← CC-6  (multi-provider config for sweep targets)
CC-2  ← CC-7  (per-provider model config)
CC-3           (independent)
CC-5  ← CC-13 (plugin ecosystem builds on skill management)
CC-9  ← CC-2  (shared provider registry concepts)
CC-10          (independent)
CC-11          (independent)
CC-12          (independent)
CC-14          (independent)
CC-15          (independent)
CC-16          (independent)
CC-17          (independent)
CC-10 + CC-14 + CC-16 ← CC-18 (cross-tool unification needs all three)
```
