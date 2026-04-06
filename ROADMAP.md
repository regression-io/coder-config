# Coder-Config Roadmap

**Last updated:** 2026-04-06

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

## Dependency Graph

```
CC-1 ← CC-4 (shared frontmatter format)
CC-1 ← CC-5 (standard format for skill metadata)
CC-1 ← CC-8 (source format to convert from)
CC-2 ← CC-6 (multi-provider config for sweep targets)
CC-2 ← CC-7 (per-provider model config)
CC-3    (independent)
```
