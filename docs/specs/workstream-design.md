# Workstream System Design Specification

## Overview

A system for restricting Claude Code's attention to specific repositories within a multi-repo project, while leveraging existing hierarchical config inheritance for tooling and rules.

**Primary Goal:** When a workstream is active, Claude Code is restricted to ONLY the repositories in that workstream.

---

## Core Concepts

### Project

A root directory containing multiple related repositories. Serves as:

- The umbrella for all workstreams (workstreams cannot cross project boundaries)
- The location for shared configuration (MCPs, rules, commands)
- The anchor for sub-project detection

**Example:** `~/rcp` is a project containing 45 repositories

### Sub-project

A repository detected within a project. Identified by presence of:

- `.git` directory, or
- `.claude` directory

Sub-projects can have their own configuration that overrides/extends the parent project's configuration.

**Example:** `~/rcp/rcp-admin-console`, `~/rcp/rcp-admin-service`

### Workstream

A named subset of sub-projects within a single project, plus contextual information about how they relate. Provides:

- **Attention restriction**: Claude can ONLY access directories in the workstream
- **Context**: How the sub-projects relate to each other
- **Activation**: Per-session, supporting parallel work

**Example:** Workstream "Admin Console" = `[rcp-admin-console, rcp-admin-service, rcp-core-minimal]`

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Config Inheritance                      │
│                     (Vertical)                           │
│                                                          │
│   ~/.claude/                    Global defaults          │
│       ↓ merges                                           │
│   ~/rcp/.claude/                Project-wide config      │
│       ↓ merges                                           │
│   ~/rcp/repo/.claude/           Sub-project config       │
│                                                          │
│   Handles: MCPs, rules, commands, settings               │
│   Mechanism: File-based, merges child over parent        │
└─────────────────────────────────────────────────────────┘
                          +
┌─────────────────────────────────────────────────────────┐
│                     Workstream                           │
│                    (Horizontal)                          │
│                                                          │
│   Selects: Which sub-projects Claude can access          │
│   Provides: Cross-repo context and relationships         │
│   Constraint: Must be within a single project            │
│                                                          │
│   Handles: Attention restriction, cross-repo context     │
│   Mechanism: Runtime injection via hooks                 │
└─────────────────────────────────────────────────────────┘
```

**Key Insight:** These are orthogonal layers. Config inheritance handles "what tools and rules apply." Workstreams handle "what directories are visible and how they relate."

---

## Injection Mechanism

### How Claude Code Loads Configuration

Claude Code reads configuration from files at startup and during operation:

```
Claude Code starts in ~/rcp/rcp-admin-console
                        ↓
Reads: ~/rcp/rcp-admin-console/.mcp.json           (MCP servers - generated)
Reads: ~/rcp/rcp-admin-console/.claude/settings.json (Settings)
Reads: ~/rcp/rcp-admin-console/.claude/rules/*.md  (Rules files)
Reads: ~/rcp/rcp-admin-console/.claude/commands/   (Slash commands)
Reads: ~/rcp/rcp-admin-console/CLAUDE.md           (Project instructions)
                        ↓
All determined by --project-dir (current directory)
```

### How Hooks Inject Content

Claude Code supports hooks that run at specific points:

```
~/.claude/hooks/
├── pre-prompt.sh       ← Runs BEFORE each prompt
│                         stdout is PREPENDED to conversation context
│
├── post-response.sh    ← Runs AFTER each response
│                         Can log activity, trigger actions
│
└── pre-tool-call.sh    ← Runs BEFORE tool execution
                          Can validate, warn, or block operations
```

**The key mechanism:** `pre-prompt.sh` output is captured and injected into Claude's context. This is runtime injection - no files are modified.

### Workstream Injection Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User activates workstream                                │
│    $ export CLAUDE_WORKSTREAM=admin-console                 │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. User starts Claude Code                                  │
│    $ claude                                                 │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Before each prompt, Claude Code runs pre-prompt.sh       │
│                                                             │
│    #!/bin/bash                                              │
│    if [ -n "$CLAUDE_WORKSTREAM" ]; then                     │
│      claude-config workstream inject                        │
│    fi                                                       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. claude-config outputs workstream markdown to stdout      │
│                                                             │
│    ## Active Workstream: Admin Console                      │
│    ### Restriction                                          │
│    You may ONLY access: [list of directories]               │
│    ### Context                                              │
│    [User-defined context]                                   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Claude Code captures stdout, prepends to context         │
│                                                             │
│    Claude sees workstream info as part of system context    │
│    No file is written - purely runtime                      │
└─────────────────────────────────────────────────────────────┘
```

### Why This Enables Parallel Work

```
Terminal A                          Terminal B
────────────────────────────────    ────────────────────────────────
CLAUDE_WORKSTREAM=admin-console     CLAUDE_WORKSTREAM=user-auth

pre-prompt.sh runs                  pre-prompt.sh runs
    ↓                                   ↓
Reads env var                       Reads env var
    ↓                                   ↓
Outputs admin-console context       Outputs user-auth context
    ↓                                   ↓
Claude sees admin-console           Claude sees user-auth

NO FILE CONFLICTS - each session has its own env var
```

---

## File-Based vs Hook-Injected: Analysis

### What MUST Be File-Based

These require files because Claude Code reads them directly:

| Config Type | Location | Why File-Based |
|-------------|----------|----------------|
| **MCP Servers** | `.mcp.json` | Claude Code spawns MCP processes from this file |
| **Settings** | `.claude/settings.json` | Claude Code reads at startup |
| **Rules** | `.claude/rules/*.md` | Claude Code loads as system context |
| **Commands** | `.claude/commands/*.md` | Claude Code registers as slash commands |
| **Instructions** | `CLAUDE.md` | Claude Code reads as project context |

**Implication:** These cannot be workstream-specific without file conflicts.

### What CAN Be Hook-Injected

These can be injected at runtime via `pre-prompt.sh`:

| Content Type | Mechanism | Conflict Risk |
|--------------|-----------|---------------|
| **Attention restriction** | Hook stdout → context | None (runtime) |
| **Cross-repo context** | Hook stdout → context | None (runtime) |
| **Relationship descriptions** | Hook stdout → context | None (runtime) |
| **Warnings/reminders** | Hook stdout → context | None (runtime) |

**Implication:** Workstreams can only provide these without causing conflicts.

### What Workstreams Should NOT Provide

| Feature | Why Not |
|---------|---------|
| Workstream MCPs | Would require writing to `.mcp.json` → conflicts |
| Workstream commands | Would require writing to `.claude/commands/` → conflicts |
| Workstream settings | Would require writing to `.claude/settings.json` → conflicts |
| Workstream rules (files) | Would require writing to `.claude/rules/` → conflicts |

**Solution:** Use the config hierarchy (global → project → sub-project) for these. Workstreams focus on restriction + context.

### The Clean Separation

```
┌─────────────────────────────────────────────────────────────┐
│                    FILE-BASED (Hierarchy)                   │
│                                                             │
│  ~/.claude/               Global defaults                   │
│      ↓ merges                                               │
│  ~/project/.claude/       Shared across project             │
│      ↓ merges                                               │
│  ~/project/repo/.claude/  Repo-specific                     │
│      ↓ generates                                            │
│  ~/project/repo/.mcp.json Applied config (Claude reads)     │
│                                                             │
│  Provides: MCPs, rules, commands, settings                  │
│  Persistence: Files on disk                                 │
│  Conflict model: Merge hierarchy, child wins                │
└─────────────────────────────────────────────────────────────┘
                            +
┌─────────────────────────────────────────────────────────────┐
│                   HOOK-INJECTED (Runtime)                   │
│                                                             │
│  CLAUDE_WORKSTREAM env var                                  │
│      ↓ read by                                              │
│  pre-prompt.sh hook                                         │
│      ↓ outputs                                              │
│  Workstream markdown (restriction + context)                │
│      ↓ captured by                                          │
│  Claude Code → prepended to conversation                    │
│                                                             │
│  Provides: Attention restriction, cross-repo context        │
│  Persistence: Session env var only                          │
│  Conflict model: None (each session independent)            │
└─────────────────────────────────────────────────────────────┘
```

### Enforcement via pre-tool-call Hook

For hard enforcement (optional), the `pre-tool-call.sh` hook can validate file operations:

```bash
#!/bin/bash
# ~/.claude/hooks/pre-tool-call.sh

# Hook receives tool name and arguments
TOOL_NAME="$1"
TOOL_ARGS="$2"

# Only check file operations
case "$TOOL_NAME" in
  Read|Write|Edit|Glob|Grep)
    # Extract file path from args
    FILE_PATH=$(echo "$TOOL_ARGS" | jq -r '.file_path // .path // empty')

    if [ -n "$FILE_PATH" ] && [ -n "$CLAUDE_WORKSTREAM" ]; then
      # Check if path is within workstream directories
      if ! claude-config workstream check-path "$FILE_PATH"; then
        echo "BLOCKED: Path $FILE_PATH is outside active workstream"
        exit 1  # Non-zero exit blocks the tool call
      fi
    fi
    ;;
esac
```

This provides hard enforcement beyond the soft guidance in the injected context.

---

## Data Model

### Projects Registry

```javascript
// ~/.claude-config/projects.json
{
  projects: [
    {
      id: "rcp",
      name: "RCP",
      path: "/Users/ruze/rcp"
    },
    {
      id: "coder-config",
      name: "Coder Config",
      path: "/Users/ruze/reg/my/coder-config"
    }
  ],
  activeProjectId: "rcp"
}
```

### Workstreams

```javascript
// ~/.claude-config/workstreams.json
{
  workstreams: [
    {
      id: "admin-console",
      name: "Admin Console",
      projectId: "rcp",           // Must reference a registered project
      subprojects: [              // Relative paths within project
        "rcp-admin-console",
        "rcp-admin-service",
        "rcp-core-minimal"
      ],
      context: "We are building the Admin Console. Frontend (React) calls backend (Python/Beanie) via REST. Both use core-minimal for shared types."
    },
    {
      id: "user-auth",
      name: "User Auth",
      projectId: "rcp",
      subprojects: [
        "rcp-auth",
        "rcp-user",
        "rcp-core-minimal"        // Shared sub-project, can be in multiple workstreams
      ],
      context: "User authentication system. JWT tokens, refresh flow, role-based access."
    }
  ]
}
```

**Note:** No `activeId` in this file. Activation is per-session.

### Session Activation

```bash
# Environment variable (per-terminal session)
export CLAUDE_WORKSTREAM=admin-console
```

This enables parallel work - different terminals can have different active workstreams.

---

## Config Inheritance (Unchanged)

### Directory Structure Example

```
~/.claude/
  mcps.json                      # Global MCPs (filesystem, git)
  settings.json                  # Global settings
  rules/                         # Global rules

~/rcp/.claude/
  mcps.json                      # Project MCPs (shared across all RCP repos)
  rules/
    coding-standards.md          # Applies to all RCP repos
    api-conventions.md

~/rcp/rcp-admin-console/.claude/
  mcps.json                      # Frontend MCPs (eslint, npm)
  rules/
    react-patterns.md            # Frontend-specific rules

~/rcp/rcp-admin-service/.claude/
  mcps.json                      # Backend MCPs (pytest, docker)
  rules/
    python-patterns.md           # Backend-specific rules
```

### Merge Behavior

When working in `~/rcp/rcp-admin-console`:

```
Applied config = merge(
  ~/.claude/mcps.json,                        # Global
  ~/rcp/.claude/mcps.json,                    # Project
  ~/rcp/rcp-admin-console/.claude/mcps.json   # Sub-project (wins on conflict)
)
```

Child config overrides parent config. This behavior is **unchanged** from current implementation.

---

## Workstream Injection

### Pre-prompt Hook

```bash
#!/bin/bash
# ~/.claude/hooks/pre-prompt.sh

if [ -n "$CLAUDE_WORKSTREAM" ]; then
  claude-config workstream inject --id "$CLAUDE_WORKSTREAM"
fi
```

### Injected Content

When workstream "Admin Console" is active, the following is injected into every Claude prompt:

```markdown
## Active Workstream: Admin Console

### Restriction

You are working within the "Admin Console" workstream. You may ONLY access files within these directories:

- /Users/ruze/rcp/rcp-admin-console
- /Users/ruze/rcp/rcp-admin-service
- /Users/ruze/rcp/rcp-core-minimal

**Do NOT read, write, search, or reference files outside these directories.**

### Context

We are building the Admin Console. Frontend (React) calls backend (Python/Beanie) via REST. Both use core-minimal for shared types.

### Repositories in this Workstream

| Repository | Path | Description |
|------------|------|-------------|
| rcp-admin-console | ~/rcp/rcp-admin-console | React frontend |
| rcp-admin-service | ~/rcp/rcp-admin-service | Python backend |
| rcp-core-minimal | ~/rcp/rcp-core-minimal | Shared types and utilities |
```

### Enforcement Hook (Optional)

```bash
#!/bin/bash
# ~/.claude/hooks/pre-tool-call.sh

# Intercept file operations (Read, Write, Edit, Glob, Grep)
# Validate paths are within active workstream
# Warn or block out-of-scope access
```

---

## Use Cases

### UC1: Single Repo Work

**Scenario:** Developer works on standalone project `~/my-app`

**Setup:**
- Register as project (optional, for UI convenience)
- No workstream needed

**Behavior:**
- Full access to all files
- Config inheritance from `~/.claude/` → `~/my-app/.claude/`

---

### UC2: Multi-Repo Feature Development

**Scenario:** Developer works on Admin Console feature spanning 3 repos

**Setup:**
1. Project "RCP" registered at `~/rcp`
2. Workstream "Admin Console" created with 3 sub-projects
3. Developer activates workstream: `export CLAUDE_WORKSTREAM=admin-console`

**Behavior:**
- Claude restricted to those 3 directories only
- Context about how repos relate is injected
- Config inheritance still works per-directory
- Claude understands the relationships between repos

---

### UC3: Context Switching

**Scenario:** Developer finishes Admin Console work, switches to User Auth

**Action:**
```bash
claude-config workstream use user-auth
# Sets: export CLAUDE_WORKSTREAM=user-auth
```

**Behavior:**
- New workstream's restriction and context apply immediately
- No file conflicts (runtime injection only)
- Previous workstream's context no longer visible

---

### UC4: Parallel Work (Different Features)

**Scenario:** Two terminals working on different features simultaneously

**Terminal A:**
```bash
export CLAUDE_WORKSTREAM=admin-console
cd ~/rcp/rcp-admin-console
claude
```

**Terminal B:**
```bash
export CLAUDE_WORKSTREAM=user-auth
cd ~/rcp/rcp-auth
claude
```

**Behavior:**
- Each terminal has independent workstream
- Shared repo (core-minimal) accessible in both, with different context
- No conflicts (workstreams are session-local, not file-based)

---

### UC5: Exploration Mode (No Restriction)

**Scenario:** Developer wants to explore entire codebase without restriction

**Action:**
```bash
unset CLAUDE_WORKSTREAM
# or: claude-config workstream deactivate
```

**Behavior:**
- No workstream restriction
- Full access to all files in project
- Config inheritance still applies normally

---

### UC6: Shared Sub-project Across Workstreams

**Scenario:** `rcp-core-minimal` is needed by both Admin Console and User Auth

**Configuration:**
```javascript
// Workstream: Admin Console
{ subprojects: ["rcp-admin-console", "rcp-admin-service", "rcp-core-minimal"] }

// Workstream: User Auth
{ subprojects: ["rcp-auth", "rcp-user", "rcp-core-minimal"] }
```

**Behavior:**
- Same sub-project can be in multiple workstreams
- Only one workstream active per session
- No conflict (workstreams don't modify files)
- Context differs based on which workstream is active

---

### UC7: Adding New Repo to Workstream

**Scenario:** New repo `rcp-admin-api` created, needs to join Admin Console workstream

**Steps:**
1. Create repo: `mkdir ~/rcp/rcp-admin-api && cd ~/rcp/rcp-admin-api && git init`
2. Optionally add config: `mkdir -p .claude && touch .claude/mcps.json`
3. Add to workstream: `claude-config workstream add-subproject admin-console rcp-admin-api`

**Behavior:**
- New repo now part of workstream
- Inherits project-level config from `~/rcp/.claude/` automatically
- No additional configuration needed for basic functionality

---

### UC8: Common Tooling Across All Repos

**Scenario:** All RCP repos need `git` and `filesystem` MCPs

**Setup:**
```javascript
// ~/rcp/.claude/mcps.json
{
  "mcpServers": {
    "git": { "command": "git-mcp", "args": [] },
    "filesystem": { "command": "fs-mcp", "args": [] }
  }
}
```

**Behavior:**
- All sub-projects within ~/rcp inherit these MCPs automatically
- No need to configure per-repo or per-workstream
- Individual repos can override if needed

---

### UC9: Working Outside Active Workstream

**Scenario:** Workstream "Admin Console" is active, but developer cd's to `~/rcp/rcp-reporting`

**Behavior:**
- Warning injected: "You are outside your active workstream"
- Claude still restricted to workstream directories
- Developer can either:
  - Switch to appropriate workstream
  - Deactivate workstream for full access

---

## Constraints

### C1: Workstreams Within Single Project

Workstreams cannot span multiple projects. All sub-projects must be within the same project root.

**Valid:**
```javascript
{
  projectId: "rcp",
  subprojects: ["rcp-admin-console", "rcp-admin-service"]
}
```

**Invalid:**
```javascript
{
  // ERROR: Cannot reference paths outside project
  subprojects: [
    "rcp-admin-console",
    "/Users/ruze/other-project/shared-lib"  // Different project!
  ]
}
```

**Rationale:**
- Simplifies the model significantly
- Ensures config inheritance has a common ancestor
- Prevents confusing cross-project dependencies

### C2: Workstreams Are Runtime-Only

Workstreams inject context via hooks at runtime. They do NOT:
- Write to `.mcp.json` files
- Modify directory config files
- Persist state between sessions (beyond the workstream definition itself)

**Rationale:**
- Prevents conflicts during parallel work
- Clear separation: files = config, runtime = workstream

### C3: Sub-projects Must Exist

Workstream can only reference sub-projects that exist within the project.

**Validation:** On workstream save, verify all referenced paths exist.

### C4: One Active Workstream Per Session

A terminal session can have at most one active workstream. To switch, deactivate current and activate new.

---

## CLI Commands

### Project Management

```bash
claude-config project list                    # List registered projects
claude-config project add <path> [--name]     # Register a project
claude-config project remove <id>             # Unregister a project
claude-config project use <id>                # Set active project for UI
```

### Sub-project Detection

```bash
claude-config subproject list [--project <id>]  # List detected sub-projects
claude-config subproject scan                   # Re-detect sub-projects in active project
```

### Workstream Management

```bash
claude-config workstream list                   # List workstreams for active project
claude-config workstream create <name>          # Create new workstream
claude-config workstream delete <id>            # Delete workstream
claude-config workstream show <id>              # Show workstream details

claude-config workstream add <id> <subproject>     # Add sub-project to workstream
claude-config workstream remove <id> <subproject>  # Remove sub-project from workstream
claude-config workstream context <id> "<text>"     # Set workstream context
```

### Workstream Activation (Per-Session)

```bash
claude-config workstream use <id>               # Activate workstream (sets env var)
claude-config workstream deactivate             # Deactivate (unsets env var)
claude-config workstream active                 # Show currently active workstream
```

### Hook Integration

```bash
claude-config workstream inject [--id <id>]     # Output injection text (called by hook)
claude-config workstream install-hook           # Install pre-prompt hook
```

---

## UI Structure

```
┌──────────────────────────────────────────────────────────────┐
│ Coder Config                     [RCP ▼] [Admin Console ▼]   │
│                                  Project   Workstream        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ ▸ Workstreams                    ← Primary view              │
│     • List workstreams for current project                   │
│     • Create/edit workstreams                                │
│     • Select sub-projects from tree picker                   │
│     • Edit context text                                      │
│     • Activate/deactivate button                             │
│                                                              │
│ ▸ Sub-projects                   ← Browse and configure      │
│     • List detected repos in project                         │
│     • Configure per-repo MCPs and rules                      │
│     • See which workstreams include each sub-project         │
│                                                              │
│ ▸ Project Config                 ← Shared configuration      │
│     • Project-level MCPs (inherited by all sub-projects)     │
│     • Project-level rules                                    │
│     • Project-level commands                                 │
│                                                              │
│ ▸ Global Config                  ← System defaults           │
│     • Global MCPs                                            │
│     • Global settings                                        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## What Changes from Current Implementation

### Removed

| Feature | Reason |
|---------|--------|
| Workstream-level MCPs | Use project/sub-project hierarchy instead |
| Workstream-level commands | Use project/sub-project hierarchy instead |
| Global `activeId` | Replaced with per-session env var |
| Cross-project workstreams | Enforced single-project constraint |

### Added

| Feature | Purpose |
|---------|---------|
| `projectId` on workstream | Enforces single-project constraint |
| Per-session activation | Enables parallel work |
| Enhanced injection | Auto-generated restriction + repo table |
| Enforcement hook | Optional hard restriction via pre-tool-call |

### Renamed

| Old | New | Reason |
|-----|-----|--------|
| `workstream.rules` | `workstream.context` | Clearer purpose (not Claude rules, but context) |
| `workstream.projects` | `workstream.subprojects` | Clearer terminology |

### Unchanged

| Feature | Notes |
|---------|-------|
| Config inheritance | Global → Project → Sub-project merge |
| Project registry | Still needed for workstream anchoring |
| Sub-project detection | Still scans for .git/.claude |
| Activity tracking | Can still suggest workstreams |
| Smart Sync | Can still auto-detect workstream from directory |

---

## Migration Path

1. **Add** `projectId` field to existing workstreams (infer from project paths)
2. **Rename** `projects` → `subprojects` in workstream data
3. **Rename** `rules` → `context` in workstream data
4. **Remove** `mcpServers` from workstream data (if present)
5. **Remove** global `activeId` from workstreams.json
6. **Update** hooks to read `CLAUDE_WORKSTREAM` env var
7. **Update** `workstream use` command to set env var instead of file
8. **Update** UI to show project selector and workstream selector
9. **Update** injection to include restriction text and repo table

---

## Summary

| Layer | Handles | Mechanism | Persistence |
|-------|---------|-----------|-------------|
| Global config | Default tooling | `~/.claude/` files | File |
| Project config | Shared tooling/rules | `~/project/.claude/` files | File |
| Sub-project config | Repo-specific tooling/rules | `~/project/repo/.claude/` files | File |
| Workstream | Attention restriction + context | Runtime hook injection | Session env var |

**The system provides:**

- **Vertical:** Config inheritance (unchanged, handles tooling)
- **Horizontal:** Workstream selection (simplified, handles attention)
- **Parallel:** Per-session activation (new, enables concurrent work)
- **Clear separation:** Files for config, runtime for workstream

---

## Appendix: Alternative Approaches Considered

### Alternative A: Everything at Workstream Level (No Projects)

**Concept:** Eliminate projects entirely. Workstreams define everything.

```javascript
// Hypothetical workstream-only model
{
  workstreams: [
    {
      name: "Admin Console",
      directories: ["/Users/ruze/rcp/rcp-admin-console", ...],
      mcpServers: { eslint: {...}, git: {...}, filesystem: {...} },
      rules: ["coding-standards.md", ...],
      commands: [...],
      context: "..."
    }
  ]
}
```

**Why This Doesn't Work:**

| Problem | Impact |
|---------|--------|
| Config duplication | 10 workstreams needing `git` MCP → configure 10 times |
| No shared defaults | Can't say "all repos get these MCPs" without repetition |
| File conflicts | Multiple workstreams writing to same `.mcp.json` |
| Loses inheritance benefit | The vertical merge reduces duplication |

**To avoid duplication, you'd need:**
- Workstream inheritance ("workstream A extends workstream B")
- That's just recreating hierarchy with different names

**Conclusion:** The vertical hierarchy exists to reduce duplication. Removing it recreates the problem.

### Alternative B: Workstream-Level Config Files

**Concept:** Workstreams have their own config directories that get merged.

```
~/.claude-config/workstreams/admin-console/
  mcps.json         # Workstream-specific MCPs
  rules/            # Workstream-specific rules
  commands/         # Workstream-specific commands
```

**Why This Is Problematic:**

| Problem | Impact |
|---------|--------|
| Where to write `.mcp.json`? | Workstream spans multiple directories |
| Parallel work conflicts | Two workstreams active → which config wins? |
| Merge complexity | Three-way merge: hierarchy + workstream + current |
| Claude Code doesn't support | Would need to generate temp files per-session |

**If we wanted this, we'd need:**
1. Generate temp `.mcp.json` merging hierarchy + workstream
2. Point Claude Code at temp directory
3. Clean up after session
4. Handle conflicts when same repo in multiple active workstreams

**Conclusion:** Too complex, too many edge cases. Not worth it when hierarchy handles config well.

### Alternative C: Cross-Project Workstreams

**Concept:** Allow workstreams to span multiple projects.

```javascript
{
  name: "Shared Infrastructure",
  directories: [
    "/Users/ruze/rcp/rcp-core-minimal",
    "/Users/ruze/other-project/shared-lib",  // Different project!
    "/Users/ruze/third-project/common"       // Another project!
  ]
}
```

**Why This Is Problematic:**

| Problem | Impact |
|---------|--------|
| No common config ancestor | Can't have shared MCPs via hierarchy |
| Confusing mental model | Which project's config applies? |
| Detection complexity | Which project does current directory belong to? |
| UI complexity | Project selector becomes meaningless |

**Conclusion:** Single-project constraint dramatically simplifies the model. Cross-project needs are rare and can use global config.

### Why The Chosen Design Works

The chosen design (hierarchy for config, workstreams for restriction) works because:

1. **Separation of concerns**: Files handle tooling, runtime handles attention
2. **No conflicts**: Each mechanism operates independently
3. **Leverages existing system**: Config hierarchy already works, just add workstreams
4. **Parallel-safe**: Env var per session, no shared mutable state
5. **Simple mental model**: Hierarchy = tools, Workstream = focus
