# CC-11: Hook Builder — Design Spec

**Status:** APPROVED
**Date:** 2026-04-13
**Related:** [ROADMAP.md CC-11](../../../ROADMAP.md#cc-11-hook-builder)

## Summary

Replace the raw-JSON textarea that currently edits Claude Code `settings.json` `hooks` with a visual Hook Builder view in the Web UI. The Builder renders structured forms for all 30 hook events and 4 handler types (command, http, prompt, agent), validates input inline and at save-time, and is driven by a JSON catalog so new events or handlers can be added without touching UI code. Shipped in three phases.

## Problem

Today, users edit hook configuration as freeform JSON in the settings editor (`ui/src/components/ClaudeSettingsEditor/index.jsx:1018-1040`). This means:

- No discoverability of what events exist or what each one means
- No field-level documentation for matcher syntax or handler fields
- Validation only fires at save; malformed JSON silently blocks all edits
- No templates for common patterns (workstream inject, session persist, activity track, etc. — which already exist as `.sh` scripts in `hooks/`)
- No way to test a hook before relying on it

## Scope

**In scope (Phase 1):**
- New top-level `/hooks` view with event-first navigation
- Scope toggle: Global (`~/.claude/settings.json`) or active project (`<project>/.claude/settings.json`)
- Registry-driven catalog of 30 events and 4 handler types
- Structured handler editors (command, http, prompt, agent)
- Auto-import of existing `hooks` JSON on first open
- Inline + save-time validation
- Removal of the raw textarea from the settings editor, replaced with a link to the Hook Builder

**In scope (Phase 2):**
- Conditional `if` field editor using permission rule syntax
- Pre-built hook library: one-click install of curated hook entries (populated from existing `hooks/*.sh` scripts)

**In scope (Phase 3):**
- Dry-run testing — real execution for command and http handlers, preview-only for prompt and agent (with opt-in "actually run")
- Editable sample payload seeded from catalog

**Out of scope:**
- CLI commands (`coder-config hooks ...`) — UI-only for now
- Multi-tool support — Claude Code only; Gemini/Codex have different hook systems
- Workspace and sub-project scopes — Global + active project only
- Sandbox isolation for dry-run execution — run in the same process as the server

## User Experience

### Entry Point

New "Hooks" entry in the main Web UI nav, alongside Memory, Workstreams, and Loops. In the Claude Settings Editor, the existing hooks textarea is removed and replaced with:

- The "Disable All Hooks" killswitch (stays)
- A link: "Manage hooks in the Hook Builder →"

### View Layout

Three-pane layout:

1. **Top bar — Scope toggle.** `Global` / `<active project name>` segmented control. Changes which `settings.json` the Builder reads and writes. Shows a dirty indicator when there are unsaved changes; switching scope with unsaved changes prompts for confirmation.
2. **Left sidebar — Event catalog.** All 30 hook events, grouped by lifecycle phase (e.g., "Tool Use", "Session", "Prompt", "Agent"). Each event shows a count badge when it has configured hooks at the current scope. Selecting an event loads the main panel.
3. **Main panel — Hook list for selected event.** Rows for each configured hook under the selected event, each showing matcher + handler type + one-line summary. Row is expandable to the full editor. "Add Hook" button opens the handler picker → form for the selected handler type.

### Handler Editor

Per-type form rendered dynamically from the handler catalog schema:

- **Common fields (all types):** matcher (string, with hint from the selected event's `matcherHint`)
- **Command:** command (string, required), timeout (seconds), async (bool), shell (string)
- **HTTP:** URL (required), headers (key-value list), method, body template
- **Prompt:** prompt text, model (defaults to user's configured default)
- **Agent:** subagent picker (from installed agents), allowed tools list

### Save Model

Explicit Save button. Dirty-state tracking indicates unsaved changes. Save writes the full `hooks` field back to the active scope's `settings.json` via the existing `saveJson` utility.

### Validation

- **Inline (real-time):** required-field checks, URL format, matcher syntax, command path existence (soft warning), incompatible event/handler combinations grayed out in the handler picker
- **Save-time:** full schema validation against Claude Code's hooks format; save disabled when invalid; error summary identifies offending row and field

### Empty State

When no hooks are configured at the current scope, the main panel shows:

> "No hooks yet. Pick an event on the left to configure one, or install a pre-built hook from the library."

(Library link disabled in Phase 1; enabled in Phase 2.)

### Migration

On first open, the Builder parses the existing `hooks` field from the active scope's `settings.json` and renders it in the structured view. No explicit migration prompt. If parsing fails (malformed JSON), the main panel shows an error banner with the parse error and a "Reset hooks" button (destructive, requires confirmation).

## Architecture

### Frontend: `ui/src/views/Hooks/` (new)

```
ui/src/views/Hooks/
  index.jsx                    — route entry; orchestrates scope, catalog load, and save
  ScopeBar.jsx                 — Global / Project toggle + dirty indicator
  EventSidebar.jsx             — left pane; renders grouped events from catalog; badges
  HookList.jsx                 — main pane; rows per configured hook for the selected event
  HandlerEditor/
    index.jsx                  — envelope + matcher field + per-type switch
    CommandEditor.jsx          — command/timeout/async/shell fields
    HttpEditor.jsx             — url/headers/method/body fields
    PromptEditor.jsx           — prompt/model fields
    AgentEditor.jsx            — subagent picker, tools
  EmptyState.jsx               — first-run empty state
  useHooks.js                  — React hook wrapping fetch/save for the active scope
```

Routing: registered in `ui/src/main.jsx` alongside existing views. Nav entry added in the main nav component.

### Backend: `ui/routes/hooks.js` (new)

Follows the existing route module pattern (`ui/routes/*.js` export a function that takes `(app, config)` and registers routes). Routes:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/hooks?scope=global\|project` | Read `hooks` field from the scope's `settings.json`. Returns `{ hooks, scopePath }`. |
| PUT | `/api/hooks?scope=global\|project` | Write `hooks` field back. Body: `{ hooks }`. Validates against handler schemas before write. |
| GET | `/api/hooks/catalog` | Return combined catalog: events + handlers (+ library in Phase 2). |

`scope=project` uses the active project as stored by the existing Projects module. The Builder UI is disabled when no active project is set and the user selects "project" scope.

All I/O uses existing utilities: `loadJson`, `saveJson` from `lib/utils.js`.

### Catalog: `shared/hooks/` (new) + `lib/hook-catalog.js` (new)

Data files in `shared/hooks/`:

- `events.json` — array of 30 event definitions
- `handlers.json` — array of 4 handler type definitions
- `library.json` — (Phase 2) array of pre-built hook entries

Loader module `lib/hook-catalog.js`:

- `loadCatalog()` — reads all three files, returns combined catalog
- `getEvent(name)` — lookup by name
- `getHandler(type)` — lookup by type
- `validateHook(eventName, hook)` — returns list of validation errors based on handler schema

Used by both the backend route (for server-side validation on PUT) and exposed via the catalog endpoint (for frontend form rendering).

### Catalog Schema

**`events.json` — entries:**

```json
{
  "name": "PreToolUse",
  "group": "tool-use",
  "groupLabel": "Tool Use",
  "description": "Fires before any tool invocation. Matcher selects which tool.",
  "matcherHint": "Tool name or glob, e.g. 'Bash' or 'Edit|Write'",
  "samplePayload": { "tool_name": "Bash", "tool_input": { "command": "ls" } },
  "compatibleHandlers": ["command", "http", "prompt", "agent"]
}
```

**`handlers.json` — entries:**

```json
{
  "type": "command",
  "label": "Shell Command",
  "description": "Run a shell command. Stdout piped to Claude.",
  "fields": [
    { "name": "command", "type": "string", "required": true, "label": "Command", "placeholder": "~/.claude/hooks/script.sh" },
    { "name": "timeout", "type": "number", "default": 60, "unit": "seconds" },
    { "name": "async", "type": "boolean", "default": false },
    { "name": "shell", "type": "string", "default": "/bin/bash" }
  ]
}
```

The `fields` array is the single source of truth for both the rendered form UI and the save-time validator.

**`library.json` — entries (Phase 2):**

```json
{
  "id": "workstream-inject",
  "name": "Workstream Inject",
  "description": "Auto-injects active workstream context into every session.",
  "event": "SessionStart",
  "matcher": "*",
  "handler": { "type": "command", "command": "~/.coder-config/hooks/workstream-inject.sh" },
  "source": "hooks/workstream-inject.sh"
}
```

"Install" action: append the `event`/`matcher`/`handler` to the target scope's `settings.json` and copy `source` to `~/.coder-config/hooks/` if not already present.

### Data Flow

1. User navigates to `/hooks` → frontend GETs `/api/hooks/catalog` and `/api/hooks?scope=<active>`
2. Render event sidebar from catalog; render main panel from current hook data
3. User edits → React state holds the in-memory hook tree; dirty flag set
4. User clicks Save → frontend PUTs `/api/hooks?scope=<active>` with the full updated `hooks` object
5. Backend validates against handler schemas, writes to disk via `saveJson`
6. Next `coder-config apply` run picks up the new hooks — no special apply logic needed

### Apply Integration

No changes to `lib/apply.js`. The Hook Builder writes to `settings.json` directly; the existing apply pipeline handles merging and output generation unchanged.

## Phased Delivery

### Phase 1 — Core visual builder (MVP)

**Acceptance criteria:**

- [ ] New `/hooks` route registered and reachable from top-level nav
- [ ] Scope toggle reads from and writes to the correct `settings.json` for Global and active-project scopes
- [ ] Event sidebar renders all 30 events from `events.json`, grouped by phase, with configured-count badges
- [ ] Handler editors exist for all 4 types (command, http, prompt, agent), rendered from `handlers.json` schemas
- [ ] Existing `hooks` JSON at the active scope is auto-imported on view load
- [ ] Inline validation shows field-level errors; save-time validation blocks invalid saves
- [ ] `ClaudeSettingsEditor/index.jsx` hooks textarea removed; link to Hook Builder added
- [ ] `shared/hooks/events.json` populated with all 30 Claude Code hook events
- [ ] `shared/hooks/handlers.json` populated with all 4 handler type schemas
- [ ] `lib/hook-catalog.js` loader + `validateHook()` implemented
- [ ] `ui/routes/hooks.js` GET/PUT endpoints + catalog endpoint implemented

### Phase 2 — Conditional hooks + pre-built library

**Acceptance criteria:**

- [ ] `if` field editor added to `HandlerEditor/index.jsx`, generates valid permission rule syntax
- [ ] `shared/hooks/library.json` populated with entries for all 8 existing `hooks/*.sh` scripts
- [ ] "Install from library" UI reachable from the empty state and from a top-bar "Library" button
- [ ] Install action copies the source script to `~/.coder-config/hooks/` (if not present) and appends the hook entry to the target scope's `settings.json`
- [ ] Install preview shows a diff of what will change before confirming

### Phase 3 — Dry-run testing

**Acceptance criteria:**

- [ ] Each configured hook row has a "Dry-run" button
- [ ] Editable sample-payload panel, seeded from the event's `samplePayload`
- [ ] Command handler dry-run: fork subprocess, pass payload via stdin, capture stdout/stderr/exit code, display result
- [ ] HTTP handler dry-run: send request, display status code + response body + headers
- [ ] Prompt handler dry-run: preview-only by default (show resolved prompt + model); "Actually run" opt-in triggers real LLM call
- [ ] Agent handler dry-run: preview-only by default (show resolved subagent + tools); "Actually run" opt-in dispatches a real subagent invocation
- [ ] Results panel is separate from the configuration form and persists until dismissed

## Testing Strategy

### Golden Flow (integration, real backends)

Open Hooks view → switch scope to active project → select `PreToolUse` event → add command hook with matcher `Bash` → save → verify hook present in project's `settings.json` on disk → reopen view → edit command path → save → delete hook → verify `hooks.PreToolUse` is removed (or entire `hooks` field is removed if empty).

### Backend Contract Tests (`test/hooks-route.test.js`, new)

- GET `/api/hooks` returns shape `{ hooks, scopePath }` for each scope
- PUT `/api/hooks` with valid data persists to disk
- PUT `/api/hooks` with invalid data (bad handler field, incompatible event/handler combo) returns 400 with field-level errors
- GET `/api/hooks/catalog` returns 30 events + 4 handlers

### Unit Tests (`test/hook-catalog.test.js`, new)

- `loadCatalog()` parses all three JSON files
- `getEvent(name)` returns the right entry, null for unknown
- `validateHook()` catches: missing required fields, wrong field types, incompatible handler type for event, malformed matcher

### Error Harness

- Malformed existing `hooks` field → view shows error banner with reset option
- Missing required field on save → save blocked, row-level error displayed
- Incompatible event/handler combination → grayed out in picker, blocked at validation
- Unwritable `settings.json` (EACCES) → error toast with exact path
- Active project unset but project scope selected → scope toggle disables project option

### Conventions

- Real file I/O to temp directories (no mocks) — matches existing `test/` pattern
- Tests use Node.js built-in test runner (`node --test`)
- Console mocking for output validation where relevant

## Error Handling

| Condition | Behavior |
|-----------|----------|
| Malformed existing `hooks` JSON | Error banner in main panel; disable editing; offer "Reset hooks" (destructive, confirms) |
| Save fails (disk/permission) | Keep dirty state; toast with exact error and file path |
| Catalog load fails on startup | Disable Hook Builder view; show recovery message ("Hook catalog is corrupted; reinstall coder-config") |
| Active project unset while project scope selected | Disable project option in scope toggle; tooltip explains |
| Unknown event in existing `hooks` (catalog doesn't know about it) | Show event anyway under "Custom / Unknown" group; allow edit of matcher/handler but warn it won't be validated |
| Unknown handler type | Same — show with warning, no structured editor (falls back to raw JSON textarea for that hook only) |

## Non-goals / Explicit Decisions

- **No CLI commands in Phase 1.** Rationale: hook configuration has too much structural complexity to serialize cleanly into shell arguments. Users will gravitate to the visual builder. If demand arises later, a `coder-config hooks list` read-only command is the most likely first addition.
- **No multi-tool support.** Hooks semantics differ across Claude Code, Gemini CLI, and Codex CLI. This spec is Claude Code only.
- **No workspace or sub-project scopes in Phase 1.** Only Global and active project. Users who need those levels continue editing `settings.json` directly.
- **No sandbox for dry-run.** Phase 3 executes hooks in the same process as the server. Users running untrusted hooks should review them before dry-run.
- **No custom matcher-rule builder.** Matcher is a plain string with hints from the event catalog; if users want regex or globs, they type them directly.

## Open Questions Resolved During Brainstorming

- **Scope of first spec:** Phase all three deliverables under this one spec (one design, phased implementation plan).
- **Phase order:** P1 event picker + handlers, P2 `if` editor + library, P3 dry-run.
- **Builder location:** New top-level view, not inline in settings editor.
- **Config scope:** Global + active project only (not full hierarchy).
- **CLI parity:** UI-only for Phase 1.
- **Information architecture:** Event-first sidebar (not flat list or hybrid).
- **Existing hooks migration:** Auto-import, no explicit migration prompt.
- **Dry-run semantics:** Real execution for command/http, preview-only for prompt/agent with opt-in to run.
- **Architectural pattern:** Registry-driven catalog (events and handlers as data), not hardcoded constants.

## Related Documents

- [ROADMAP.md CC-11](../../../ROADMAP.md)
- [CLAUDE.md](../../../CLAUDE.md) — project architecture overview
- (Pending) Implementation plan: `docs/superpowers/plans/2026-04-13-cc-11-hook-builder.md`
