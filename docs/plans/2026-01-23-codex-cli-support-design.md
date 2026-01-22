# Codex CLI Support Design

**Date:** 2026-01-23
**Version:** 0.40.0
**Status:** Approved

## Overview

Add support for OpenAI Codex CLI configuration management, matching the existing pattern used for Gemini CLI. This includes a settings editor UI, server API endpoints, and workstream hook integration.

## Codex CLI Background

- **Config location:** `~/.codex/config.toml`
- **Format:** TOML (not JSON like Gemini)
- **Documentation:** https://developers.openai.com/codex/config-reference/

## Scope

### 1. Settings Editor (UI Component)

New file: `ui/src/components/CodexSettingsEditor.jsx`

**Sections:**

| Section | Settings | TOML Keys |
|---------|----------|-----------|
| Model | Model name, provider, reasoning effort | `model`, `model_provider`, `model_reasoning_effort` |
| Security | Approval policy, sandbox mode | `approval_policy`, `sandbox_mode` |
| MCP Servers | Add/remove/view servers | `[mcp_servers.*]` |
| Features | Shell snapshot, web search | `[features]` table |
| TUI | Animations, notifications | `[tui]` table |
| History | Persistence mode | `[history]` table |
| Analytics | Usage metrics | `[analytics]` table |

**View modes:**
- Rich UI for common settings
- TOML view for advanced editing (raw text)

### 2. Server API

New endpoints in `ui/routes/settings.js`:

```javascript
getCodexSettings()   // GET /api/codex-settings
saveCodexSettings()  // PUT /api/codex-settings
```

**Implementation notes:**
- Use `@iarna/toml` package for TOML parsing/serialization
- Read from `~/.codex/config.toml`
- Create directory if doesn't exist on first save
- Preserve comments where possible (best effort)

### 3. View Component

New file: `ui/src/views/CodexSettingsView.jsx`

- Follows same pattern as `GeminiSettingsView.jsx`
- Fetches settings on mount
- Passes to editor component
- Handles save with toast notifications

### 4. Navigation Integration

Update `ui/src/App.jsx` or navigation component:
- Add "Codex CLI" tab in settings area
- Position alongside Claude/Gemini/Antigravity

### 5. Workstream Hook Support

Update `lib/commands/workstream.js`:

```bash
claude-config workstream install-hook --codex    # Codex only
claude-config workstream install-hook --all      # Includes Codex
```

**Hook location:** `~/.codex/hooks/` (TBD - verify Codex hook system)

**Hook behavior:** Inject workstream context/restrictions into Codex sessions.

### 6. Documentation

Update in `ui/src/views/docs/`:
- Add `codex-settings.js` content file
- Document available settings and their effects

## Data Flow

```
User edits in UI
       ↓
CodexSettingsEditor (React state)
       ↓
api.saveCodexSettings(settings)
       ↓
PUT /api/codex-settings
       ↓
routes/settings.js → saveCodexSettings()
       ↓
Convert JSON → TOML
       ↓
Write ~/.codex/config.toml
```

## Settings Schema

```toml
# Model settings
model = "gpt-5.2-codex"
model_provider = "openai"
model_reasoning_effort = "medium"  # minimal, low, medium, high, xhigh

# Security
approval_policy = "on-request"  # untrusted, on-failure, on-request, never
sandbox_mode = "read-only"      # read-only, workspace-write, danger-full-access

# Feature flags
[features]
shell_snapshot = true
web_search_request = true

# TUI options
[tui]
animations = true
notifications = true

# History
[history]
persistence = "save-all"  # save-all, none

# Analytics
[analytics]
enabled = true

# MCP Servers
[mcp_servers.filesystem]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-filesystem", "/path"]
enabled = true
```

## Dependencies

Add to `package.json`:
```json
"@iarna/toml": "^3.0.0"
```

## Files to Create/Modify

**New files:**
- `ui/src/components/CodexSettingsEditor.jsx`
- `ui/src/views/CodexSettingsView.jsx`
- `ui/src/views/docs/data/content/codex-settings.js`

**Modified files:**
- `ui/routes/settings.js` - Add Codex endpoints
- `ui/server.cjs` - Route Codex API calls
- `ui/src/lib/api.js` - Add Codex API methods
- `ui/src/App.jsx` - Add navigation tab
- `lib/commands/workstream.js` - Add --codex flag
- `package.json` - Add @iarna/toml dependency
- `CHANGELOG.md` - Document new feature
- `README.md` - Add Codex CLI section

## Testing

1. Fresh install - no `~/.codex/` directory exists
2. Existing config - read and display correctly
3. Edit via rich UI - changes persist
4. Edit via TOML view - raw editing works
5. MCP server add/remove - updates config correctly
6. Workstream hook install - creates proper hook file

## Future (v0.41.0)

- Full settings coverage for both Codex and Gemini
- Codex profiles UI
- Shell environment policy editor
- Model providers configuration
