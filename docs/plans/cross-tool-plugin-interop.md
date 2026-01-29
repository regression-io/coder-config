# Cross-Tool Plugin Interoperability Plan

## Overview

Enable plugins/skills from Claude Code marketplaces to work with Gemini CLI and Codex CLI, and potentially create a universal plugin format that works across all three tools.

## Current State

### Claude Code
- **Marketplaces**: Git repos with plugin definitions
- **Plugin structure**:
  - `skills/<name>/SKILL.md` - Interactive workflows with frontmatter
  - `commands/<name>.md` - Simple slash commands
  - `rules/*.md` - Auto-loaded instructions
  - `hooks/` - Pre/post tool execution scripts
  - `.claude-plugin/plugin.json` - Manifest
- **Install**: `claude plugin install <name>@<marketplace>`

### Gemini CLI
- **No native plugin system**
- **Instructions**: `GEMINI.md` (project) or `~/.gemini/GEMINI.md` (global)
- **MCPs**: `~/.gemini/settings.json`
- **No slash commands or hooks**

### Codex CLI
- **No native plugin system**
- **Instructions**: `~/.codex/instructions.md`
- **MCPs**: `~/.codex/config.toml`
- **No slash commands or hooks**

## Design Goals

1. **Read once, apply everywhere** - Install a plugin once, use across all tools
2. **Graceful degradation** - Features that can't port (hooks) are skipped gracefully
3. **Bidirectional where possible** - Universal format that any tool can consume
4. **Preserve tool-specific features** - Don't limit Claude plugins to lowest common denominator

## Component Portability Matrix

| Component | Claude → Gemini | Claude → Codex | Universal |
|-----------|-----------------|----------------|-----------|
| Rules | ✅ Append to GEMINI.md | ✅ Append to instructions.md | ✅ |
| Skills | ⚠️ As instruction blocks | ⚠️ As instruction blocks | ⚠️ |
| Commands | ⚠️ As instruction blocks | ⚠️ As instruction blocks | ⚠️ |
| Hooks | ❌ Not supported | ❌ Not supported | ❌ |
| MCPs | ✅ Already works | ✅ Already works | ✅ |

## Implementation Phases

### Phase 1: Rules Sync (Low effort, high value)

**Goal**: Plugin rules automatically apply to all tools.

**Implementation**:
```
coder-config plugins sync [--tool all|claude|gemini|codex]
```

**For each installed plugin**:
1. Read `rules/*.md` from plugin
2. For Claude: Already works (native)
3. For Gemini: Append to `~/.gemini/GEMINI.md` with plugin attribution
4. For Codex: Append to `~/.codex/instructions.md` with plugin attribution

**Format for Gemini/Codex**:
```markdown
<!-- BEGIN PLUGIN: security-guidance@claude-plugins-official -->
# Security Guidelines
[content from rules/security.md]
<!-- END PLUGIN: security-guidance@claude-plugins-official -->
```

**Considerations**:
- Track what's been synced to avoid duplicates
- Support removal when plugin is uninstalled
- Handle conflicts between plugins

### Phase 2: Skills as Instructions (Medium effort)

**Goal**: Make skills available as instruction-based workflows.

**Conversion approach**:
```markdown
<!-- Original SKILL.md -->
---
name: brainstorming
description: Explore ideas before implementation
---
# Brainstorming Process
[workflow content]

<!-- Converted for Gemini/Codex -->
## Skill: brainstorming
When the user asks to brainstorm, explore ideas, or design something:
[workflow content]
```

**Trigger mapping**:
- Claude: `/brainstorming` slash command
- Gemini/Codex: Natural language triggers in instructions

**Limitations**:
- No argument parsing (--flag style)
- No tool restrictions (allowed-tools frontmatter)
- User must know to ask for the skill

### Phase 3: Universal Plugin Format (Higher effort)

**Goal**: Create a coder-config plugin format that targets all tools natively.

**Proposed structure**:
```
my-plugin/
├── plugin.json              # Universal manifest
├── rules/
│   └── *.md                 # Work everywhere
├── skills/
│   ├── my-skill/
│   │   ├── SKILL.md         # Claude-native
│   │   ├── GEMINI.md        # Gemini-specific (optional)
│   │   └── CODEX.md         # Codex-specific (optional)
├── mcps/
│   └── mcps.json            # MCP definitions (work everywhere)
└── hooks/                   # Claude-only
    └── *.sh
```

**plugin.json**:
```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "Works across all AI coding tools",
  "supports": ["claude", "gemini", "codex"],
  "rules": ["rules/*.md"],
  "skills": ["skills/*"],
  "mcps": "mcps/mcps.json"
}
```

**Tool-specific skill overrides**:
- If `skills/foo/GEMINI.md` exists, use it for Gemini
- Otherwise, convert `skills/foo/SKILL.md` automatically

### Phase 4: Unified Marketplace (Future)

**Goal**: coder-config hosts/aggregates plugins for all tools.

**Approach**:
1. Continue supporting Claude marketplaces as primary source
2. Add coder-config marketplace format (universal plugins)
3. Auto-convert Claude plugins on install
4. Store converted versions in `~/.coder-config/plugins/`

**Commands**:
```bash
# Install from any marketplace
coder-config plugin install security-guidance

# Apply to specific tool
coder-config plugin apply --tool gemini

# Apply to all tools
coder-config plugin apply --tool all
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Plugin Marketplaces                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ claude-plugins- │  │ coder-config-   │  │ custom          │ │
│  │ official        │  │ plugins         │  │ marketplace     │ │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘ │
└───────────┼─────────────────────┼─────────────────────┼─────────┘
            │                     │                     │
            └─────────────────────┼─────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │     coder-config        │
                    │   Plugin Manager        │
                    │                         │
                    │ • Parse plugin format   │
                    │ • Convert components    │
                    │ • Track installations   │
                    └───────────┬─────────────┘
                                │
            ┌───────────────────┼───────────────────┐
            │                   │                   │
            ▼                   ▼                   ▼
    ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
    │  Claude Code  │   │  Gemini CLI   │   │  Codex CLI    │
    │               │   │               │   │               │
    │ • Native      │   │ • GEMINI.md   │   │ • instructions│
    │   plugins     │   │   injection   │   │   .md inject  │
    │ • skills/     │   │ • settings    │   │ • config.toml │
    │ • hooks/      │   │   .json MCPs  │   │   MCPs        │
    └───────────────┘   └───────────────┘   └───────────────┘
```

## API Design

### New lib/plugins-sync.js

```javascript
/**
 * Sync installed plugins to target tool
 */
function syncPlugins(tool = 'all') {
  const plugins = getInstalledPlugins();

  for (const plugin of plugins) {
    if (tool === 'all' || tool === 'claude') {
      // Native - already works
    }
    if (tool === 'all' || tool === 'gemini') {
      syncRulesToGemini(plugin);
      syncSkillsToGemini(plugin);
    }
    if (tool === 'all' || tool === 'codex') {
      syncRulesToCodex(plugin);
      syncSkillsToCodex(plugin);
    }
  }
}

/**
 * Inject rules into Gemini's instruction file
 */
function syncRulesToGemini(plugin) {
  const geminiMd = loadGeminiMd();
  const rules = loadPluginRules(plugin);

  // Remove old plugin section if exists
  geminiMd = removePluginSection(geminiMd, plugin.id);

  // Append new section
  geminiMd += formatPluginSection(plugin.id, rules);

  saveGeminiMd(geminiMd);
}
```

### CLI Commands

```bash
# Sync all plugins to all tools
coder-config plugins sync

# Sync to specific tool
coder-config plugins sync --tool gemini

# Sync specific plugin
coder-config plugins sync security-guidance

# Remove synced content
coder-config plugins unsync --tool codex

# Show sync status
coder-config plugins status
```

### UI Integration

Add to Plugins view:
- "Sync to other tools" button
- Tool checkboxes (Claude ✓, Gemini ✓, Codex ✓)
- Sync status per plugin per tool
- "Unsync" option

## File Tracking

Track synced content in `~/.coder-config/plugin-sync.json`:

```json
{
  "gemini": {
    "security-guidance@claude-plugins-official": {
      "syncedAt": "2026-01-29T12:00:00Z",
      "components": ["rules"],
      "targetFile": "~/.gemini/GEMINI.md",
      "hash": "abc123"
    }
  },
  "codex": {
    "security-guidance@claude-plugins-official": {
      "syncedAt": "2026-01-29T12:00:00Z",
      "components": ["rules"],
      "targetFile": "~/.codex/instructions.md",
      "hash": "def456"
    }
  }
}
```

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Instruction files get too large | Section-based injection, optional per-plugin |
| Conflicts between plugins | Namespace with plugin ID, warn on conflicts |
| Breaking changes to tools | Version-check tool configs, graceful fallback |
| Skills lose functionality | Document limitations, keep Claude as primary |
| User confusion | Clear UI showing what works where |

## Success Metrics

1. **Phase 1 complete**: Rules sync works for 5+ popular plugins
2. **Phase 2 complete**: Skills available as instructions, tested manually
3. **Phase 3 complete**: 3+ universal plugins created and published
4. **Adoption**: 100+ users syncing plugins across tools

## Timeline Estimate

| Phase | Effort | Dependencies |
|-------|--------|--------------|
| Phase 1: Rules Sync | 3-4 hours | None |
| Phase 2: Skills as Instructions | 4-6 hours | Phase 1 |
| Phase 3: Universal Format | 8-12 hours | Phase 2 |
| Phase 4: Unified Marketplace | 16-24 hours | Phase 3 |

## Open Questions

1. Should we fork/cache Claude plugins or reference in place?
2. How to handle plugin updates - auto-resync?
3. Should Gemini/Codex instruction injection be opt-in per plugin?
4. Do we need a "plugin compatibility" field in manifests?

## Next Steps

1. [ ] Review and approve this plan
2. [ ] Implement Phase 1 (rules sync)
3. [ ] Test with security-guidance and superpowers plugins
4. [ ] Gather feedback before Phase 2
