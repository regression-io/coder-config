# CC-11: Hook Builder — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the raw-JSON hooks textarea in the Claude Settings Editor with a visual Hook Builder: a top-level view backed by a JSON-driven catalog of 30 events and 4 handler types, shipped in three phases (MVP → conditional `if` + library → dry-run).

**Architecture:** Registry-driven. Event and handler schemas live in `shared/hooks/*.json`. A loader module (`lib/hook-catalog.js`) serves both the backend validator (`ui/routes/hooks.js`) and the frontend via a catalog endpoint. The Web UI (`ui/src/views/Hooks/`) renders a three-pane layout (scope bar / event sidebar / main hook list) and dynamic per-type handler forms. Data flows to `settings.json` via the existing `loadJson`/`saveJson` utilities — no changes to the apply pipeline.

**Tech Stack:** Node.js (CommonJS) for CLI/server; React + Vite + TailwindCSS + shadcn/ui for frontend. Node.js built-in test runner (`node --test`).

**Spec:** `docs/superpowers/specs/2026-04-13-cc-11-hook-builder-design.md`

**Deviation from convention (UI layout):** Existing views are single-file (`RouterView.jsx`, `LoopsView.jsx` etc.). This feature uses a `ui/src/views/Hooks/` subfolder with multiple component files, matching the existing precedent in `ui/src/views/docs/` and `ui/src/views/tutorial/`. The Hook Builder is too large for one file (scope bar + sidebar + hook list + 4 handler editors + empty state).

---

## PHASE 1 — Core visual builder (MVP)

### Task 1: Catalog data — events.json and handlers.json

**Files:**
- Create: `shared/hooks/events.json`
- Create: `shared/hooks/handlers.json`

- [ ] **Step 1: Create shared/hooks/events.json with seed events**

Claude Code's hook events are documented in Claude Code's source and docs. The roadmap calls for 30 events. Seed this file with the well-known events below; the list will be expanded in Task 12 after verifying against the current Claude Code version installed on the machine.

```json
[
  {
    "name": "PreToolUse",
    "group": "tool-use",
    "groupLabel": "Tool Use",
    "description": "Fires before any tool invocation. Matcher selects which tool by name.",
    "matcherHint": "Tool name or pipe-separated glob, e.g. 'Bash' or 'Edit|Write'",
    "samplePayload": { "tool_name": "Bash", "tool_input": { "command": "ls" } },
    "compatibleHandlers": ["command", "http", "prompt", "agent"]
  },
  {
    "name": "PostToolUse",
    "group": "tool-use",
    "groupLabel": "Tool Use",
    "description": "Fires after a tool invocation completes. Matcher selects by tool name.",
    "matcherHint": "Tool name or pipe-separated glob, e.g. 'Bash' or 'Edit|Write'",
    "samplePayload": { "tool_name": "Bash", "tool_input": { "command": "ls" }, "tool_output": "file1\nfile2" },
    "compatibleHandlers": ["command", "http", "prompt", "agent"]
  },
  {
    "name": "UserPromptSubmit",
    "group": "prompt",
    "groupLabel": "Prompt",
    "description": "Fires when the user submits a prompt. Matcher is typically '*'.",
    "matcherHint": "'*' for all prompts",
    "samplePayload": { "prompt": "hello" },
    "compatibleHandlers": ["command", "http", "prompt", "agent"]
  },
  {
    "name": "SessionStart",
    "group": "session",
    "groupLabel": "Session",
    "description": "Fires when a new session begins. Use to inject context, set env, etc.",
    "matcherHint": "'*' for all sessions",
    "samplePayload": { "session_id": "abc123", "cwd": "/path/to/project" },
    "compatibleHandlers": ["command", "http", "prompt", "agent"]
  },
  {
    "name": "SessionEnd",
    "group": "session",
    "groupLabel": "Session",
    "description": "Fires when a session ends. Use to persist state or flush logs.",
    "matcherHint": "'*' for all sessions",
    "samplePayload": { "session_id": "abc123" },
    "compatibleHandlers": ["command", "http"]
  },
  {
    "name": "Stop",
    "group": "lifecycle",
    "groupLabel": "Lifecycle",
    "description": "Fires when Claude stops responding.",
    "matcherHint": "'*' or empty",
    "samplePayload": { "session_id": "abc123" },
    "compatibleHandlers": ["command", "http", "prompt", "agent"]
  },
  {
    "name": "SubagentStop",
    "group": "lifecycle",
    "groupLabel": "Lifecycle",
    "description": "Fires when a subagent stops.",
    "matcherHint": "'*' or subagent type",
    "samplePayload": { "session_id": "abc123", "subagent": "general-purpose" },
    "compatibleHandlers": ["command", "http", "prompt", "agent"]
  },
  {
    "name": "PreCompact",
    "group": "lifecycle",
    "groupLabel": "Lifecycle",
    "description": "Fires before the context is compacted.",
    "matcherHint": "'*' or empty",
    "samplePayload": { "session_id": "abc123" },
    "compatibleHandlers": ["command", "http"]
  },
  {
    "name": "Notification",
    "group": "lifecycle",
    "groupLabel": "Lifecycle",
    "description": "Fires when Claude sends a user notification.",
    "matcherHint": "'*' or empty",
    "samplePayload": { "message": "Task complete" },
    "compatibleHandlers": ["command", "http"]
  }
]
```

- [ ] **Step 2: Create shared/hooks/handlers.json with all 4 handler schemas**

```json
[
  {
    "type": "command",
    "label": "Shell Command",
    "description": "Run a shell command. Stdout piped to Claude; non-zero exit blocks (unless async).",
    "fields": [
      { "name": "command", "type": "string", "required": true, "label": "Command", "placeholder": "~/.claude/hooks/script.sh" },
      { "name": "timeout", "type": "number", "default": 60, "label": "Timeout (seconds)", "min": 1, "max": 600 },
      { "name": "async", "type": "boolean", "default": false, "label": "Run asynchronously" },
      { "name": "shell", "type": "string", "default": "/bin/bash", "label": "Shell" }
    ]
  },
  {
    "type": "http",
    "label": "HTTP Request",
    "description": "Send an HTTP request to a URL. Response body piped to Claude on 2xx.",
    "fields": [
      { "name": "url", "type": "string", "required": true, "label": "URL", "placeholder": "https://example.com/hook" },
      { "name": "method", "type": "enum", "default": "POST", "label": "Method", "options": ["GET", "POST", "PUT", "DELETE"] },
      { "name": "headers", "type": "keyvalue", "label": "Headers", "default": {} },
      { "name": "body", "type": "string", "label": "Body (supports payload substitution)", "placeholder": "{\"tool\": \"${tool_name}\"}" },
      { "name": "timeout", "type": "number", "default": 30, "label": "Timeout (seconds)", "min": 1, "max": 120 }
    ]
  },
  {
    "type": "prompt",
    "label": "LLM Prompt",
    "description": "Evaluate the payload through an LLM prompt. LLM response returned to Claude.",
    "fields": [
      { "name": "prompt", "type": "textarea", "required": true, "label": "Prompt", "placeholder": "Evaluate whether this command is safe to run: ${tool_input.command}" },
      { "name": "model", "type": "string", "label": "Model", "default": "claude-haiku-4-5-20251001" }
    ]
  },
  {
    "type": "agent",
    "label": "Subagent",
    "description": "Dispatch a subagent to handle the hook. Subagent's final message returned to Claude.",
    "fields": [
      { "name": "subagent", "type": "string", "required": true, "label": "Subagent", "placeholder": "general-purpose" },
      { "name": "tools", "type": "stringlist", "label": "Allowed tools (optional)", "placeholder": "Read, Grep" },
      { "name": "prompt", "type": "textarea", "label": "Prompt to subagent", "required": true }
    ]
  }
]
```

- [ ] **Step 3: Commit**

```bash
mkdir -p shared/hooks
git add shared/hooks/events.json shared/hooks/handlers.json
git commit -m "feat(CC-11): seed hook catalog data files"
```

---

### Task 2: Catalog loader — lib/hook-catalog.js

**Files:**
- Create: `lib/hook-catalog.js`
- Create: `test/hook-catalog.test.js`

- [ ] **Step 1: Write the failing tests**

Create `test/hook-catalog.test.js`:

```js
const { describe, it } = require('node:test');
const assert = require('node:assert');
const { loadCatalog, getEvent, getHandler, validateHook } = require('../lib/hook-catalog');

describe('hook-catalog', () => {
  describe('loadCatalog', () => {
    it('returns events and handlers arrays', () => {
      const catalog = loadCatalog();
      assert.ok(Array.isArray(catalog.events), 'events is array');
      assert.ok(Array.isArray(catalog.handlers), 'handlers is array');
      assert.ok(catalog.events.length >= 9, 'has at least seed events');
      assert.strictEqual(catalog.handlers.length, 4, 'has 4 handlers');
    });

    it('each event has required fields', () => {
      const catalog = loadCatalog();
      for (const e of catalog.events) {
        assert.ok(e.name, 'has name');
        assert.ok(e.group, 'has group');
        assert.ok(e.groupLabel, 'has groupLabel');
        assert.ok(e.description, 'has description');
        assert.ok(Array.isArray(e.compatibleHandlers), 'compatibleHandlers is array');
      }
    });

    it('each handler has required fields', () => {
      const catalog = loadCatalog();
      for (const h of catalog.handlers) {
        assert.ok(h.type, 'has type');
        assert.ok(h.label, 'has label');
        assert.ok(Array.isArray(h.fields), 'fields is array');
      }
    });
  });

  describe('getEvent', () => {
    it('returns event by name', () => {
      const e = getEvent('PreToolUse');
      assert.strictEqual(e.name, 'PreToolUse');
      assert.strictEqual(e.group, 'tool-use');
    });

    it('returns null for unknown event', () => {
      assert.strictEqual(getEvent('NotAnEvent'), null);
    });
  });

  describe('getHandler', () => {
    it('returns handler by type', () => {
      const h = getHandler('command');
      assert.strictEqual(h.type, 'command');
    });

    it('returns null for unknown type', () => {
      assert.strictEqual(getHandler('notatype'), null);
    });
  });

  describe('validateHook', () => {
    it('passes for valid command hook', () => {
      const errors = validateHook('PreToolUse', {
        matcher: 'Bash',
        hooks: [{ type: 'command', command: '~/.claude/hooks/pre.sh' }]
      });
      assert.deepStrictEqual(errors, []);
    });

    it('fails when handler type is incompatible with event', () => {
      const errors = validateHook('SessionEnd', {
        matcher: '*',
        hooks: [{ type: 'prompt', prompt: 'hi' }]
      });
      assert.ok(errors.length > 0, 'should report error');
      assert.ok(errors.some(e => e.includes('compatible')), 'mentions compatibility');
    });

    it('fails when required field missing', () => {
      const errors = validateHook('PreToolUse', {
        matcher: 'Bash',
        hooks: [{ type: 'command' }]
      });
      assert.ok(errors.length > 0, 'should report error');
      assert.ok(errors.some(e => e.includes('command')), 'mentions missing command');
    });

    it('fails for unknown event', () => {
      const errors = validateHook('UnknownEvent', {
        matcher: '*',
        hooks: [{ type: 'command', command: '/bin/echo' }]
      });
      assert.ok(errors.length > 0);
      assert.ok(errors.some(e => e.includes('Unknown event')));
    });

    it('fails for unknown handler type', () => {
      const errors = validateHook('PreToolUse', {
        matcher: 'Bash',
        hooks: [{ type: 'nope' }]
      });
      assert.ok(errors.length > 0);
      assert.ok(errors.some(e => e.includes('Unknown handler')));
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/hook-catalog.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement lib/hook-catalog.js**

```js
/**
 * Hook catalog loader and validator.
 * Loads event and handler definitions from shared/hooks/*.json
 * and validates hook entries against handler schemas.
 */

const fs = require('fs');
const path = require('path');

const SHARED_DIR = path.join(__dirname, '..', 'shared', 'hooks');

let cache = null;

function loadCatalog() {
  if (cache) return cache;
  const events = JSON.parse(fs.readFileSync(path.join(SHARED_DIR, 'events.json'), 'utf8'));
  const handlers = JSON.parse(fs.readFileSync(path.join(SHARED_DIR, 'handlers.json'), 'utf8'));
  let library = [];
  const libraryPath = path.join(SHARED_DIR, 'library.json');
  if (fs.existsSync(libraryPath)) {
    library = JSON.parse(fs.readFileSync(libraryPath, 'utf8'));
  }
  cache = { events, handlers, library };
  return cache;
}

function clearCache() {
  cache = null;
}

function getEvent(name) {
  const { events } = loadCatalog();
  return events.find(e => e.name === name) || null;
}

function getHandler(type) {
  const { handlers } = loadCatalog();
  return handlers.find(h => h.type === type) || null;
}

function validateField(field, value) {
  const errors = [];
  if (field.required && (value === undefined || value === null || value === '')) {
    errors.push(`Field "${field.name}" is required`);
    return errors;
  }
  if (value === undefined || value === null) return errors;
  switch (field.type) {
    case 'string':
    case 'textarea':
      if (typeof value !== 'string') errors.push(`Field "${field.name}" must be a string`);
      break;
    case 'number':
      if (typeof value !== 'number') errors.push(`Field "${field.name}" must be a number`);
      else {
        if (field.min !== undefined && value < field.min) errors.push(`Field "${field.name}" must be >= ${field.min}`);
        if (field.max !== undefined && value > field.max) errors.push(`Field "${field.name}" must be <= ${field.max}`);
      }
      break;
    case 'boolean':
      if (typeof value !== 'boolean') errors.push(`Field "${field.name}" must be a boolean`);
      break;
    case 'enum':
      if (!field.options.includes(value)) errors.push(`Field "${field.name}" must be one of: ${field.options.join(', ')}`);
      break;
    case 'keyvalue':
      if (typeof value !== 'object' || Array.isArray(value)) errors.push(`Field "${field.name}" must be an object`);
      break;
    case 'stringlist':
      if (!Array.isArray(value)) errors.push(`Field "${field.name}" must be an array`);
      break;
  }
  return errors;
}

function validateHandler(handler) {
  const schema = getHandler(handler.type);
  if (!schema) return [`Unknown handler type "${handler.type}"`];
  const errors = [];
  for (const field of schema.fields) {
    errors.push(...validateField(field, handler[field.name]));
  }
  return errors;
}

/**
 * Validate a hook entry (matcher + hooks array) for a given event.
 * Returns an array of error strings. Empty array = valid.
 */
function validateHook(eventName, entry) {
  const event = getEvent(eventName);
  if (!event) return [`Unknown event "${eventName}"`];
  const errors = [];
  if (!Array.isArray(entry.hooks)) {
    errors.push('Entry must have a "hooks" array');
    return errors;
  }
  for (const handler of entry.hooks) {
    if (!event.compatibleHandlers.includes(handler.type)) {
      errors.push(`Handler type "${handler.type}" is not compatible with event "${eventName}"`);
      continue;
    }
    errors.push(...validateHandler(handler));
  }
  return errors;
}

module.exports = {
  loadCatalog,
  clearCache,
  getEvent,
  getHandler,
  validateHook,
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/hook-catalog.test.js`
Expected: All pass.

- [ ] **Step 5: Commit**

```bash
git add lib/hook-catalog.js test/hook-catalog.test.js
git commit -m "feat(CC-11): add hook catalog loader with event/handler validation"
```

---

### Task 3: Wire catalog into ClaudeConfigManager

**Files:**
- Modify: `config-loader.js`

- [ ] **Step 1: Import and bind catalog methods**

Find the section near the top of `config-loader.js` where other `lib/*` modules are required. Add:

```js
const hookCatalog = require('./lib/hook-catalog');
```

Find the `ClaudeConfigManager` class and add methods (after the last existing method, before `module.exports`):

```js
// Hook catalog
hookCatalogLoad() {
  return hookCatalog.loadCatalog();
}

hookCatalogGetEvent(name) {
  return hookCatalog.getEvent(name);
}

hookCatalogGetHandler(type) {
  return hookCatalog.getHandler(type);
}

hookValidate(eventName, entry) {
  return hookCatalog.validateHook(eventName, entry);
}
```

- [ ] **Step 2: Run full test suite**

Run: `npm test`
Expected: All pass including new `hook-catalog.test.js`.

- [ ] **Step 3: Commit**

```bash
git add config-loader.js
git commit -m "feat(CC-11): bind hook catalog methods to ClaudeConfigManager"
```

---

### Task 4: Backend routes — ui/routes/hooks.js

**Files:**
- Create: `ui/routes/hooks.js`
- Create: `test/hooks-route.test.js`
- Modify: `ui/server.cjs`

- [ ] **Step 1: Write failing tests for the route handlers**

Create `test/hooks-route.test.js`:

```js
const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const routes = require('../ui/routes/hooks');

// Minimal stub for the manager: routes/hooks.js only needs
// settings file paths and the hookValidate() method.
function makeManager(tempHome) {
  const hookCatalog = require('../lib/hook-catalog');
  hookCatalog.clearCache();
  return {
    getGlobalSettingsPath: () => path.join(tempHome, '.claude', 'settings.json'),
    getProjectSettingsPath: (projectDir) => path.join(projectDir, '.claude', 'settings.json'),
    hookValidate: (eventName, entry) => hookCatalog.validateHook(eventName, entry),
    hookCatalogLoad: () => hookCatalog.loadCatalog(),
  };
}

describe('routes/hooks', () => {
  let tempDir;
  let originalHome;

  before(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hooks-route-test-'));
    originalHome = process.env.HOME;
    process.env.HOME = tempDir;
  });

  after(() => {
    process.env.HOME = originalHome;
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    const claudeDir = path.join(tempDir, '.claude');
    if (fs.existsSync(claudeDir)) fs.rmSync(claudeDir, { recursive: true, force: true });
  });

  describe('getHooks', () => {
    it('returns empty hooks when settings.json does not exist', () => {
      const manager = makeManager(tempDir);
      const result = routes.getHooks(manager, 'global');
      assert.deepStrictEqual(result.hooks, {});
      assert.ok(result.scopePath.endsWith('settings.json'));
    });

    it('returns existing hooks from settings.json', () => {
      const claudeDir = path.join(tempDir, '.claude');
      fs.mkdirSync(claudeDir, { recursive: true });
      fs.writeFileSync(path.join(claudeDir, 'settings.json'), JSON.stringify({
        hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: '/bin/echo' }] }] }
      }));
      const manager = makeManager(tempDir);
      const result = routes.getHooks(manager, 'global');
      assert.ok(result.hooks.PreToolUse);
      assert.strictEqual(result.hooks.PreToolUse[0].matcher, 'Bash');
    });

    it('returns error when project scope requested but no projectDir', () => {
      const manager = makeManager(tempDir);
      const result = routes.getHooks(manager, 'project');
      assert.ok(result.error);
    });
  });

  describe('saveHooks', () => {
    it('writes hooks to global settings.json', () => {
      const manager = makeManager(tempDir);
      const result = routes.saveHooks(manager, 'global', null, {
        hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: '/bin/echo' }] }] }
      });
      assert.strictEqual(result.success, true);
      const saved = JSON.parse(fs.readFileSync(path.join(tempDir, '.claude', 'settings.json'), 'utf8'));
      assert.ok(saved.hooks.PreToolUse);
    });

    it('preserves other settings fields on save', () => {
      const claudeDir = path.join(tempDir, '.claude');
      fs.mkdirSync(claudeDir, { recursive: true });
      fs.writeFileSync(path.join(claudeDir, 'settings.json'), JSON.stringify({
        model: 'claude-opus-4-6',
        permissions: { allow: ['Bash'] }
      }));
      const manager = makeManager(tempDir);
      routes.saveHooks(manager, 'global', null, {
        hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: '/bin/echo' }] }] }
      });
      const saved = JSON.parse(fs.readFileSync(path.join(claudeDir, 'settings.json'), 'utf8'));
      assert.strictEqual(saved.model, 'claude-opus-4-6');
      assert.deepStrictEqual(saved.permissions.allow, ['Bash']);
      assert.ok(saved.hooks.PreToolUse);
    });

    it('rejects invalid hook payloads with 400', () => {
      const manager = makeManager(tempDir);
      const result = routes.saveHooks(manager, 'global', null, {
        hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command' /* missing required command field */ }] }] }
      });
      assert.ok(result.error);
      assert.ok(Array.isArray(result.errors));
    });

    it('removes hooks field when empty', () => {
      const claudeDir = path.join(tempDir, '.claude');
      fs.mkdirSync(claudeDir, { recursive: true });
      fs.writeFileSync(path.join(claudeDir, 'settings.json'), JSON.stringify({
        model: 'claude-opus-4-6',
        hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: '/bin/echo' }] }] }
      }));
      const manager = makeManager(tempDir);
      routes.saveHooks(manager, 'global', null, { hooks: {} });
      const saved = JSON.parse(fs.readFileSync(path.join(claudeDir, 'settings.json'), 'utf8'));
      assert.strictEqual(saved.hooks, undefined);
      assert.strictEqual(saved.model, 'claude-opus-4-6');
    });
  });

  describe('getCatalog', () => {
    it('returns events and handlers', () => {
      const manager = makeManager(tempDir);
      const result = routes.getCatalog(manager);
      assert.ok(Array.isArray(result.events));
      assert.ok(Array.isArray(result.handlers));
      assert.ok(result.events.length >= 9);
      assert.strictEqual(result.handlers.length, 4);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/hooks-route.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement ui/routes/hooks.js**

```js
/**
 * Hooks routes — read/write Claude Code hooks field in settings.json.
 * Backed by lib/hook-catalog for validation.
 */

const fs = require('fs');
const path = require('path');

function resolveSettingsPath(manager, scope, projectDir) {
  if (scope === 'global') {
    return manager.getGlobalSettingsPath
      ? manager.getGlobalSettingsPath()
      : path.join(process.env.HOME, '.claude', 'settings.json');
  }
  if (scope === 'project') {
    if (!projectDir) return null;
    return manager.getProjectSettingsPath
      ? manager.getProjectSettingsPath(projectDir)
      : path.join(projectDir, '.claude', 'settings.json');
  }
  return null;
}

function readSettings(settingsPath) {
  if (!fs.existsSync(settingsPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  } catch (err) {
    throw new Error(`Malformed settings.json: ${err.message}`);
  }
}

function writeSettings(settingsPath, settings) {
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
}

/**
 * GET /api/hooks?scope=global|project[&projectDir=...]
 */
function getHooks(manager, scope, projectDir) {
  const settingsPath = resolveSettingsPath(manager, scope, projectDir);
  if (!settingsPath) return { error: 'projectDir is required for project scope' };
  try {
    const settings = readSettings(settingsPath);
    return { hooks: settings.hooks || {}, scopePath: settingsPath };
  } catch (err) {
    return { error: err.message, scopePath: settingsPath };
  }
}

/**
 * PUT /api/hooks?scope=global|project  body: { hooks }
 */
function saveHooks(manager, scope, projectDir, body) {
  const settingsPath = resolveSettingsPath(manager, scope, projectDir);
  if (!settingsPath) return { error: 'projectDir is required for project scope' };
  if (!body || typeof body.hooks !== 'object') return { error: 'Body must include a "hooks" object' };

  // Validate every entry before writing
  const allErrors = [];
  for (const [eventName, entries] of Object.entries(body.hooks)) {
    if (!Array.isArray(entries)) {
      allErrors.push(`Event "${eventName}" entries must be an array`);
      continue;
    }
    for (let i = 0; i < entries.length; i++) {
      const errs = manager.hookValidate(eventName, entries[i]);
      if (errs.length) allErrors.push(...errs.map(e => `${eventName}[${i}]: ${e}`));
    }
  }
  if (allErrors.length) return { error: 'Validation failed', errors: allErrors };

  try {
    const settings = fs.existsSync(settingsPath) ? readSettings(settingsPath) : {};
    if (Object.keys(body.hooks).length === 0) {
      delete settings.hooks;
    } else {
      settings.hooks = body.hooks;
    }
    writeSettings(settingsPath, settings);
    return { success: true, scopePath: settingsPath };
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * GET /api/hooks/catalog
 */
function getCatalog(manager) {
  const catalog = manager.hookCatalogLoad();
  return {
    events: catalog.events,
    handlers: catalog.handlers,
    library: catalog.library || [],
  };
}

module.exports = { getHooks, saveHooks, getCatalog };
```

- [ ] **Step 4: Add helper methods to ClaudeConfigManager for settings paths**

In `config-loader.js`, find the `ClaudeConfigManager` class. If `getGlobalSettingsPath` and `getProjectSettingsPath` methods don't already exist, add them near the other path helpers:

```js
getGlobalSettingsPath() {
  return path.join(process.env.HOME, '.claude', 'settings.json');
}

getProjectSettingsPath(projectDir) {
  return path.join(projectDir, '.claude', 'settings.json');
}
```

(Check with `grep -n "getGlobalSettingsPath\|getProjectSettingsPath" config-loader.js` first. Skip this step if already present.)

- [ ] **Step 5: Register routes in ui/server.cjs**

At the top of `ui/server.cjs`, find where other routes are imported (around line 30). Add:

```js
hooks: require('./routes/hooks'),
```

In the `handleAPI()` method, find where other route `case` entries live (near the router routes around line 945). Add:

```js
case '/api/hooks':
  if (req.method === 'GET') return this.json(res, routes.hooks.getHooks(this.manager, query.scope, query.projectDir || this.projectDir));
  if (req.method === 'PUT') return this.json(res, routes.hooks.saveHooks(this.manager, query.scope, query.projectDir || this.projectDir, body));
  break;

case '/api/hooks/catalog':
  return this.json(res, routes.hooks.getCatalog(this.manager));
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `node --test test/hooks-route.test.js`
Expected: All pass.

Run: `npm test`
Expected: All previous tests still pass.

- [ ] **Step 7: Commit**

```bash
git add ui/routes/hooks.js test/hooks-route.test.js ui/server.cjs config-loader.js
git commit -m "feat(CC-11): add hooks backend routes with validation"
```

---

### Task 5: Frontend API client

**Files:**
- Modify: `ui/src/lib/api.js`

- [ ] **Step 1: Add hook API methods**

Find the `export const api = {` block in `ui/src/lib/api.js`. After the last method (before the closing `};`), add:

```js
// Hooks
async getHooks(scope, projectDir) {
  const params = new URLSearchParams({ scope });
  if (projectDir) params.set('projectDir', projectDir);
  return request(`/hooks?${params.toString()}`);
},

async saveHooks(scope, hooks, projectDir) {
  const params = new URLSearchParams({ scope });
  if (projectDir) params.set('projectDir', projectDir);
  return request(`/hooks?${params.toString()}`, { method: 'PUT', body: { hooks } });
},

async getHookCatalog() {
  return request('/hooks/catalog');
},
```

- [ ] **Step 2: Commit**

```bash
git add ui/src/lib/api.js
git commit -m "feat(CC-11): add hook API client methods"
```

---

### Task 6: useHooks state hook

**Files:**
- Create: `ui/src/views/Hooks/useHooks.js`

- [ ] **Step 1: Create the state hook**

```js
import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';

/**
 * Manages hook state for the current scope.
 * Returns: { hooks, setHooks, catalog, loading, error, dirty, save, reload }
 */
export function useHooks(scope, projectDir) {
  const [hooks, setHooksRaw] = useState({});
  const [catalog, setCatalog] = useState({ events: [], handlers: [], library: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [hooksRes, catalogRes] = await Promise.all([
        api.getHooks(scope, projectDir),
        api.getHookCatalog(),
      ]);
      if (hooksRes.error) {
        setError(hooksRes.error);
        setHooksRaw({});
      } else {
        setHooksRaw(hooksRes.hooks || {});
      }
      setCatalog(catalogRes);
      setDirty(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [scope, projectDir]);

  useEffect(() => { reload(); }, [reload]);

  const setHooks = useCallback((next) => {
    setHooksRaw(next);
    setDirty(true);
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await api.saveHooks(scope, hooks, projectDir);
      if (res.error) {
        setError(res.errors ? res.errors.join('\n') : res.error);
        return false;
      }
      setDirty(false);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setSaving(false);
    }
  }, [scope, hooks, projectDir]);

  return { hooks, setHooks, catalog, loading, error, dirty, saving, save, reload };
}
```

- [ ] **Step 2: Commit**

```bash
mkdir -p ui/src/views/Hooks
git add ui/src/views/Hooks/useHooks.js
git commit -m "feat(CC-11): add useHooks React hook for Hook Builder state"
```

---

### Task 7: HandlerEditor components

**Files:**
- Create: `ui/src/views/Hooks/HandlerEditor/index.jsx`
- Create: `ui/src/views/Hooks/HandlerEditor/FieldRenderer.jsx`

- [ ] **Step 1: Create the generic FieldRenderer**

The FieldRenderer renders a single field from a catalog schema. This keeps per-type editors trivial because they all share the same form-rendering logic.

```jsx
// ui/src/views/Hooks/HandlerEditor/FieldRenderer.jsx
import React from 'react';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Label } from '../../../components/ui/label';
import { Switch } from '../../../components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../../components/ui/select';
import { Button } from '../../../components/ui/button';

export function FieldRenderer({ field, value, onChange, error }) {
  const v = value ?? field.default ?? (field.type === 'boolean' ? false : field.type === 'keyvalue' ? {} : field.type === 'stringlist' ? [] : '');

  return (
    <div className="space-y-1">
      <Label className="text-sm">
        {field.label || field.name}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </Label>

      {field.type === 'string' && (
        <Input value={v} placeholder={field.placeholder} onChange={e => onChange(e.target.value)} />
      )}

      {field.type === 'textarea' && (
        <Textarea value={v} placeholder={field.placeholder} onChange={e => onChange(e.target.value)} className="font-mono text-sm" />
      )}

      {field.type === 'number' && (
        <Input type="number" min={field.min} max={field.max} value={v}
          onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))} />
      )}

      {field.type === 'boolean' && (
        <Switch checked={!!v} onCheckedChange={onChange} />
      )}

      {field.type === 'enum' && (
        <Select value={v} onValueChange={onChange}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {field.options.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
          </SelectContent>
        </Select>
      )}

      {field.type === 'keyvalue' && <KeyValueEditor value={v} onChange={onChange} />}
      {field.type === 'stringlist' && <StringListEditor value={v} onChange={onChange} />}

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function KeyValueEditor({ value, onChange }) {
  const entries = Object.entries(value || {});
  const update = (i, k, v) => {
    const next = { ...value };
    const oldKey = entries[i][0];
    if (k !== oldKey) delete next[oldKey];
    next[k] = v;
    onChange(next);
  };
  const remove = (i) => {
    const next = { ...value };
    delete next[entries[i][0]];
    onChange(next);
  };
  const add = () => onChange({ ...value, '': '' });
  return (
    <div className="space-y-1">
      {entries.map(([k, v], i) => (
        <div key={i} className="flex gap-2">
          <Input value={k} placeholder="Key" onChange={e => update(i, e.target.value, v)} />
          <Input value={v} placeholder="Value" onChange={e => update(i, k, e.target.value)} />
          <Button variant="ghost" size="sm" onClick={() => remove(i)}>✕</Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={add}>+ Add</Button>
    </div>
  );
}

function StringListEditor({ value, onChange }) {
  const csv = (value || []).join(', ');
  return (
    <Input
      value={csv}
      placeholder="comma-separated"
      onChange={e => onChange(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
    />
  );
}
```

- [ ] **Step 2: Create HandlerEditor envelope**

```jsx
// ui/src/views/Hooks/HandlerEditor/index.jsx
import React, { useMemo } from 'react';
import { FieldRenderer } from './FieldRenderer';
import { Label } from '../../../components/ui/label';
import { Input } from '../../../components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../../components/ui/select';

/**
 * Props:
 *   event: catalog event definition (used for matcher hint + compatible handlers)
 *   catalog: full catalog with handlers[]
 *   entry: { matcher, hooks: [ { type, ...handlerFields } ] }
 *   onChange: (nextEntry) => void
 *   fieldErrors: optional map of `handlerIndex.fieldName -> string`
 */
export function HandlerEditor({ event, catalog, entry, onChange, fieldErrors = {} }) {
  const updateMatcher = (matcher) => onChange({ ...entry, matcher });
  const updateHandler = (i, patch) => {
    const next = [...entry.hooks];
    next[i] = { ...next[i], ...patch };
    onChange({ ...entry, hooks: next });
  };
  const changeHandlerType = (i, type) => {
    const schema = catalog.handlers.find(h => h.type === type);
    const defaults = {};
    for (const f of schema.fields) if (f.default !== undefined) defaults[f.name] = f.default;
    const next = [...entry.hooks];
    next[i] = { type, ...defaults };
    onChange({ ...entry, hooks: next });
  };
  const removeHandler = (i) => {
    const next = entry.hooks.filter((_, j) => j !== i);
    onChange({ ...entry, hooks: next });
  };
  const addHandler = () => {
    const firstCompatible = catalog.handlers.find(h => event.compatibleHandlers.includes(h.type));
    if (!firstCompatible) return;
    changeHandlerType(entry.hooks.length, firstCompatible.type);
  };

  return (
    <div className="space-y-4 border rounded p-4 bg-slate-50 dark:bg-slate-900">
      <div>
        <Label>Matcher</Label>
        <Input value={entry.matcher || ''} placeholder={event.matcherHint}
          onChange={e => updateMatcher(e.target.value)} />
        <p className="text-xs text-slate-500 mt-1">{event.matcherHint}</p>
      </div>

      {entry.hooks.map((h, i) => {
        const schema = catalog.handlers.find(hd => hd.type === h.type);
        const compatible = event.compatibleHandlers;
        return (
          <div key={i} className="border rounded p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label>Handler type</Label>
                <Select value={h.type} onValueChange={(v) => changeHandlerType(i, v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {catalog.handlers.map(hd => (
                      <SelectItem key={hd.type} value={hd.type} disabled={!compatible.includes(hd.type)}>
                        {hd.label}{!compatible.includes(hd.type) ? ' (incompatible)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <button className="text-sm text-red-500 ml-4" onClick={() => removeHandler(i)}>Remove</button>
            </div>
            {schema && schema.fields.map(f => (
              <FieldRenderer
                key={f.name}
                field={f}
                value={h[f.name]}
                error={fieldErrors[`${i}.${f.name}`]}
                onChange={(v) => updateHandler(i, { [f.name]: v })}
              />
            ))}
          </div>
        );
      })}

      <button className="text-sm text-blue-500" onClick={addHandler}>+ Add handler</button>
    </div>
  );
}
```

- [ ] **Step 3: Build UI to verify compile**

Run: `npm run build`
Expected: Clean build with no errors related to Hooks view.

- [ ] **Step 4: Commit**

```bash
mkdir -p ui/src/views/Hooks/HandlerEditor
git add ui/src/views/Hooks/HandlerEditor/
git commit -m "feat(CC-11): add HandlerEditor with schema-driven field rendering"
```

---

### Task 8: Remaining Hooks view components

**Files:**
- Create: `ui/src/views/Hooks/ScopeBar.jsx`
- Create: `ui/src/views/Hooks/EventSidebar.jsx`
- Create: `ui/src/views/Hooks/HookList.jsx`
- Create: `ui/src/views/Hooks/EmptyState.jsx`

- [ ] **Step 1: Create ScopeBar.jsx**

```jsx
import React from 'react';
import { Button } from '../../components/ui/button';

export function ScopeBar({ scope, setScope, projectDir, dirty, saving, onSave }) {
  const hasProject = Boolean(projectDir);
  return (
    <div className="flex items-center justify-between border-b p-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-500">Editing:</span>
        <div className="inline-flex rounded-md border">
          <button
            className={`px-3 py-1 text-sm ${scope === 'global' ? 'bg-blue-500 text-white' : 'bg-white dark:bg-slate-800'}`}
            onClick={() => setScope('global')}
          >
            Global
          </button>
          <button
            className={`px-3 py-1 text-sm ${scope === 'project' ? 'bg-blue-500 text-white' : 'bg-white dark:bg-slate-800'}`}
            disabled={!hasProject}
            title={!hasProject ? 'No active project' : ''}
            onClick={() => setScope('project')}
          >
            {projectDir ? projectDir.split('/').pop() : 'Project'}
          </button>
        </div>
        {dirty && <span className="text-xs text-amber-600">• unsaved changes</span>}
      </div>
      <Button disabled={!dirty || saving} onClick={onSave}>
        {saving ? 'Saving...' : 'Save'}
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Create EventSidebar.jsx**

```jsx
import React from 'react';

export function EventSidebar({ catalog, hooks, selected, onSelect }) {
  const groups = {};
  for (const e of catalog.events) {
    if (!groups[e.group]) groups[e.group] = { label: e.groupLabel, events: [] };
    groups[e.group].events.push(e);
  }
  return (
    <aside className="w-64 border-r overflow-y-auto">
      {Object.entries(groups).map(([groupKey, group]) => (
        <div key={groupKey} className="mb-4">
          <div className="px-4 py-2 text-xs uppercase tracking-wide text-slate-500">{group.label}</div>
          {group.events.map(e => {
            const count = (hooks[e.name] || []).length;
            const active = selected === e.name;
            return (
              <button
                key={e.name}
                className={`w-full text-left px-4 py-2 flex items-center justify-between text-sm ${active ? 'bg-blue-50 dark:bg-slate-800 border-l-2 border-blue-500' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                onClick={() => onSelect(e.name)}
              >
                <span>{e.name}</span>
                {count > 0 && <span className="bg-blue-500 text-white text-xs rounded-full px-2">{count}</span>}
              </button>
            );
          })}
        </div>
      ))}
    </aside>
  );
}
```

- [ ] **Step 3: Create HookList.jsx**

```jsx
import React from 'react';
import { Button } from '../../components/ui/button';
import { HandlerEditor } from './HandlerEditor';

export function HookList({ event, catalog, entries, onChange, fieldErrorsForEntry }) {
  const updateEntry = (i, next) => {
    const nextEntries = [...entries];
    nextEntries[i] = next;
    onChange(nextEntries);
  };
  const removeEntry = (i) => onChange(entries.filter((_, j) => j !== i));
  const addEntry = () => onChange([...entries, { matcher: '*', hooks: [] }]);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4">
      <div>
        <h2 className="text-xl font-semibold">{event.name}</h2>
        <p className="text-sm text-slate-500 mt-1">{event.description}</p>
      </div>

      {entries.length === 0 && (
        <div className="text-sm text-slate-500 border rounded p-6 text-center">
          No hooks configured for this event.
        </div>
      )}

      {entries.map((entry, i) => (
        <div key={i} className="relative">
          <HandlerEditor
            event={event}
            catalog={catalog}
            entry={entry}
            onChange={(next) => updateEntry(i, next)}
            fieldErrors={fieldErrorsForEntry ? fieldErrorsForEntry(i) : {}}
          />
          <button className="absolute top-2 right-2 text-xs text-red-500" onClick={() => removeEntry(i)}>
            Remove entry
          </button>
        </div>
      ))}

      <Button variant="outline" onClick={addEntry}>+ Add Hook</Button>
    </div>
  );
}
```

- [ ] **Step 4: Create EmptyState.jsx**

```jsx
import React from 'react';

export function EmptyState({ hasLibrary }) {
  return (
    <div className="flex-1 flex items-center justify-center text-slate-500">
      <div className="text-center max-w-md">
        <p className="text-lg mb-2">No event selected</p>
        <p className="text-sm">
          Pick an event from the left sidebar to configure a hook
          {hasLibrary && <>, or install a pre-built hook from the library</>}.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Build to verify**

Run: `npm run build`
Expected: Clean build.

- [ ] **Step 6: Commit**

```bash
git add ui/src/views/Hooks/ScopeBar.jsx ui/src/views/Hooks/EventSidebar.jsx ui/src/views/Hooks/HookList.jsx ui/src/views/Hooks/EmptyState.jsx
git commit -m "feat(CC-11): add ScopeBar, EventSidebar, HookList, EmptyState components"
```

---

### Task 9: Main Hooks view + register in app

**Files:**
- Create: `ui/src/views/Hooks/index.jsx`
- Modify: `ui/src/views/index.js`
- Modify: `ui/src/pages/Dashboard.jsx`

- [ ] **Step 1: Create Hooks/index.jsx**

```jsx
import React, { useState, useMemo } from 'react';
import { ScopeBar } from './ScopeBar';
import { EventSidebar } from './EventSidebar';
import { HookList } from './HookList';
import { EmptyState } from './EmptyState';
import { useHooks } from './useHooks';

export default function HooksView({ projectDir }) {
  const [scope, setScope] = useState(projectDir ? 'project' : 'global');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const { hooks, setHooks, catalog, loading, error, dirty, saving, save } =
    useHooks(scope, scope === 'project' ? projectDir : null);

  const selected = useMemo(
    () => catalog.events.find(e => e.name === selectedEvent) || null,
    [catalog.events, selectedEvent]
  );

  const updateEntries = (eventName, nextEntries) => {
    const next = { ...hooks };
    if (nextEntries.length === 0) delete next[eventName];
    else next[eventName] = nextEntries;
    setHooks(next);
  };

  const handleSave = async () => {
    const ok = await save();
    // Error state is rendered below; no toast dependency.
  };

  if (loading) {
    return <div className="p-6 text-slate-500">Loading hooks…</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <ScopeBar
        scope={scope}
        setScope={(s) => { if (!dirty || confirm('Discard unsaved changes?')) setScope(s); }}
        projectDir={projectDir}
        dirty={dirty}
        saving={saving}
        onSave={handleSave}
      />

      {error && (
        <div className="bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-200 border-b border-red-200 p-3 text-sm whitespace-pre-wrap">
          <div>{error}</div>
          {error.toLowerCase().includes('malformed') && (
            <button
              className="mt-2 text-xs underline"
              onClick={() => {
                if (!confirm('This will clear the in-memory hooks. You must click Save to persist the empty state and overwrite the malformed file. Continue?')) return;
                setHooks({});
              }}
            >
              Clear hooks (requires Save to persist)
            </button>
          )}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <EventSidebar
          catalog={catalog}
          hooks={hooks}
          selected={selectedEvent}
          onSelect={setSelectedEvent}
        />

        {selected ? (
          <HookList
            event={selected}
            catalog={catalog}
            entries={hooks[selected.name] || []}
            onChange={(next) => updateEntries(selected.name, next)}
          />
        ) : (
          <EmptyState hasLibrary={(catalog.library || []).length > 0} />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Register in views/index.js**

Open `ui/src/views/index.js` and add:

```js
export { default as HooksView } from './Hooks';
```

Note: this relies on `ui/src/views/Hooks/index.jsx` being resolvable. Vite resolves `Hooks` to `Hooks/index.jsx` automatically.

- [ ] **Step 3: Add nav entry in Dashboard.jsx**

Open `ui/src/pages/Dashboard.jsx`. Find the `navItems` array (around line 39). Add an entry in the Tools section:

```js
{ id: 'hooks', label: 'Hooks', icon: Zap, section: 'Tools', isNew: true },
```

(Add `Zap` to the lucide-react imports at the top of the file if not already present.)

Find the imports block and add `HooksView` to the import from `../views`:

```js
import { /* existing views, */ HooksView } from '../views';
```

Find the view renderer switch (search for `case 'router':`). Add:

```js
case 'hooks':
  return <HooksView projectDir={activeProjectDir} />;
```

(Use whatever variable the rest of the switch uses for the active project directory.)

- [ ] **Step 4: Build and verify UI loads**

Run: `npm run build`
Expected: Clean build.

Run: `npm start` (in a separate terminal if needed).
Expected: UI starts at http://localhost:3333. Navigate to the Hooks entry in the sidebar. Verify:
- The view loads without console errors
- The event sidebar shows the seed events grouped by phase
- Clicking an event shows the hook list panel

Per the user's rule: **verify UI loads in browser before marking done**. If there are any runtime errors (undefined imports, missing components), fix them before proceeding.

- [ ] **Step 5: Commit**

```bash
git add ui/src/views/Hooks/index.jsx ui/src/views/index.js ui/src/pages/Dashboard.jsx
git commit -m "feat(CC-11): register Hooks view with top-level nav entry"
```

---

### Task 10: Remove raw textarea from Claude Settings Editor

**Files:**
- Modify: `ui/src/components/ClaudeSettingsEditor/index.jsx`

- [ ] **Step 1: Replace the hooks textarea with a link**

Find the `{/* Hooks */}` block in `ui/src/components/ClaudeSettingsEditor/index.jsx` (around line 1018-1040, the `<Textarea value={settings.hooks ? ...} />` section).

Replace the entire `<div>…</div>` block for hooks with:

```jsx
{/* Hooks — now managed in the Hook Builder view */}
<div>
  <Label className="text-base font-medium">Hooks</Label>
  <p className="text-sm text-gray-500 dark:text-slate-400 mb-3">
    Hook configuration has moved to the Hook Builder.
  </p>
  <button
    type="button"
    className="text-sm text-blue-600 hover:underline"
    onClick={() => {
      if (typeof props.onNavigate === 'function') props.onNavigate('hooks');
    }}
  >
    Manage in Hook Builder →
  </button>
</div>
```

If the component doesn't currently accept an `onNavigate` prop, check how other parts of the settings editor navigate between views. Worst case, the link can be a plain text reminder: "Open Hooks from the sidebar".

Keep the existing "Disable All Hooks" switch — it lives in a separate section around line 620 and should not be touched.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: Clean build.

- [ ] **Step 3: Verify settings editor still loads**

Start UI, navigate to Claude Settings. Confirm:
- The old hooks textarea is gone
- "Disable All Hooks" switch still works (unchanged location)
- The "Manage in Hook Builder →" link is visible
- No console errors

- [ ] **Step 4: Commit**

```bash
git add ui/src/components/ClaudeSettingsEditor/index.jsx
git commit -m "feat(CC-11): replace hooks textarea with Hook Builder link"
```

---

### Task 11: Golden flow integration test

**Files:**
- Create: `test/hooks-golden.test.js`

- [ ] **Step 1: Write the golden flow test**

This is an integration test against the real backend routes and real filesystem — no mocks. Per the project's testing rules.

```js
const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const hookCatalog = require('../lib/hook-catalog');
const routes = require('../ui/routes/hooks');

describe('Hooks golden flow', () => {
  let tempHome;
  let tempProject;
  let originalHome;
  let manager;

  before(() => {
    tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'hooks-golden-home-'));
    tempProject = fs.mkdtempSync(path.join(os.tmpdir(), 'hooks-golden-project-'));
    originalHome = process.env.HOME;
    process.env.HOME = tempHome;
    hookCatalog.clearCache();
    manager = {
      getGlobalSettingsPath: () => path.join(tempHome, '.claude', 'settings.json'),
      getProjectSettingsPath: (dir) => path.join(dir, '.claude', 'settings.json'),
      hookValidate: (ev, entry) => hookCatalog.validateHook(ev, entry),
      hookCatalogLoad: () => hookCatalog.loadCatalog(),
    };
  });

  after(() => {
    process.env.HOME = originalHome;
    fs.rmSync(tempHome, { recursive: true, force: true });
    fs.rmSync(tempProject, { recursive: true, force: true });
  });

  it('full lifecycle: add → save → read → edit → save → delete → save', () => {
    // Start: no hooks at project scope
    let res = routes.getHooks(manager, 'project', tempProject);
    assert.deepStrictEqual(res.hooks, {});

    // Add a PreToolUse command hook
    res = routes.saveHooks(manager, 'project', tempProject, {
      hooks: {
        PreToolUse: [
          { matcher: 'Bash', hooks: [{ type: 'command', command: '/bin/echo', timeout: 30 }] }
        ]
      }
    });
    assert.strictEqual(res.success, true);

    // Verify on disk
    const saved = JSON.parse(fs.readFileSync(path.join(tempProject, '.claude', 'settings.json'), 'utf8'));
    assert.strictEqual(saved.hooks.PreToolUse[0].matcher, 'Bash');
    assert.strictEqual(saved.hooks.PreToolUse[0].hooks[0].command, '/bin/echo');

    // Read back
    res = routes.getHooks(manager, 'project', tempProject);
    assert.strictEqual(res.hooks.PreToolUse[0].matcher, 'Bash');

    // Edit — change timeout
    const edited = { ...res.hooks };
    edited.PreToolUse[0].hooks[0].timeout = 120;
    res = routes.saveHooks(manager, 'project', tempProject, { hooks: edited });
    assert.strictEqual(res.success, true);
    const reread = JSON.parse(fs.readFileSync(path.join(tempProject, '.claude', 'settings.json'), 'utf8'));
    assert.strictEqual(reread.hooks.PreToolUse[0].hooks[0].timeout, 120);

    // Delete — clear hooks
    res = routes.saveHooks(manager, 'project', tempProject, { hooks: {} });
    assert.strictEqual(res.success, true);
    const afterDelete = JSON.parse(fs.readFileSync(path.join(tempProject, '.claude', 'settings.json'), 'utf8'));
    assert.strictEqual(afterDelete.hooks, undefined);
  });

  it('rejects incompatible handler type with clear error', () => {
    const res = routes.saveHooks(manager, 'project', tempProject, {
      hooks: { SessionEnd: [{ matcher: '*', hooks: [{ type: 'prompt', prompt: 'hi' }] }] }
    });
    assert.ok(res.error);
    assert.ok(res.errors.some(e => e.includes('compatible')));
  });

  it('preserves other settings fields across saves', () => {
    const settingsPath = path.join(tempProject, '.claude', 'settings.json');
    fs.writeFileSync(settingsPath, JSON.stringify({ model: 'claude-opus-4-6', permissions: { allow: ['Bash'] } }));

    routes.saveHooks(manager, 'project', tempProject, {
      hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: '/bin/echo' }] }] }
    });
    const merged = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    assert.strictEqual(merged.model, 'claude-opus-4-6');
    assert.deepStrictEqual(merged.permissions.allow, ['Bash']);
    assert.ok(merged.hooks.PreToolUse);
  });
});
```

- [ ] **Step 2: Run tests**

Run: `node --test test/hooks-golden.test.js`
Expected: All pass.

- [ ] **Step 3: Run full test suite**

Run: `npm test`
Expected: All pass.

- [ ] **Step 4: Commit**

```bash
git add test/hooks-golden.test.js
git commit -m "test(CC-11): add golden flow integration tests for Hook Builder"
```

---

### Task 12: Expand event catalog to full 30 events

**Files:**
- Modify: `shared/hooks/events.json`

- [ ] **Step 1: Research the full event list**

The roadmap specifies 30 hook events. The seed list in Task 1 has 9 common ones. To complete the catalog:

1. Check the installed Claude Code's source or docs for the full hook event list. On the current machine, run: `which claude` then inspect the Claude Code distribution. Claude Code's hook event names are also documented at the Claude Code docs site.
2. Add each missing event as an entry in `shared/hooks/events.json` following the shape of the existing entries.

Common additional events to check for (not exhaustive): `PostCompact`, `UserPromptFilter`, `PermissionRequest`, `PermissionGrant`, `PermissionDeny`, `ToolError`, `FileRead`, `FileWrite`, `FileDelete`, `GitCommit`, `GitPush`, `AgentStart`, `AgentEnd`, `ModelChange`, `ThinkingStart`, `ThinkingEnd`, `CompactionStart`, `CompactionEnd`, `ErrorOccurred`, `RateLimitHit`, `TokenBudgetExceeded`.

Each event needs:
- `name` — exact event name from Claude Code
- `group` — lifecycle phase key (e.g., `tool-use`, `session`, `prompt`, `lifecycle`, `permission`, `file-io`, `agent`, `error`)
- `groupLabel` — human-readable group label
- `description` — one-sentence explanation of when it fires
- `matcherHint` — guidance on the matcher format
- `samplePayload` — representative JSON payload (used by Phase 3 dry-run)
- `compatibleHandlers` — array of handler types that make sense for this event

**If you cannot verify 30 events from Claude Code's docs/source, do not invent events.** Land what you can verify and note the deficit in the commit message. The catalog is data-driven so additional events can be added later without code changes.

- [ ] **Step 2: Validate the JSON parses**

```bash
node -e "const fs = require('fs'); const events = JSON.parse(fs.readFileSync('shared/hooks/events.json', 'utf8')); console.log('Events:', events.length);"
```

- [ ] **Step 3: Update the first-pass test count**

In `test/hook-catalog.test.js`, the assertion `events.length >= 9` was a seed floor. Update to reflect the actual number landed (e.g., `>= 30` if you got there, else `>= <N>`).

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: All pass.

- [ ] **Step 5: Verify in UI**

Run: `npm run build && npm start`
Navigate to Hooks view, confirm all events appear grouped correctly.

- [ ] **Step 6: Commit**

```bash
git add shared/hooks/events.json test/hook-catalog.test.js
git commit -m "feat(CC-11): expand hook event catalog to verified Claude Code events"
```

---

### Task 13: Phase 1 wrap — CHANGELOG and ROADMAP

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `ROADMAP.md`

- [ ] **Step 1: Update CHANGELOG.md**

Add a top entry describing Phase 1:

```markdown
## [Unreleased]

### Added
- **CC-11 Hook Builder (Phase 1):** New top-level Hooks view with event-first navigation, registry-driven catalog (30 events + 4 handler types), scope toggle (Global / active project), auto-import of existing hooks, and inline + save-time validation. Replaces the raw JSON textarea in the Claude Settings Editor.
```

- [ ] **Step 2: Update ROADMAP.md**

Find the CC-11 section (around line 268). Change `**Status:** PLANNED` to `**Status:** PARTIAL (Phase 1 complete)`. Under the "Required Items" list, mark items 1 and 2 as `COMPLETE` and keep items 3-5 as `PLANNED`.

- [ ] **Step 3: Run full test suite and build**

Run: `npm test && npm run build`
Expected: All pass, clean build.

- [ ] **Step 4: Commit**

```bash
git add CHANGELOG.md ROADMAP.md
git commit -m "docs(CC-11): mark Phase 1 complete; update CHANGELOG and ROADMAP"
```

---

## PHASE 2 — Conditional `if` + pre-built library

### Task 14: Add `if` field to handler editor

**Files:**
- Modify: `ui/src/views/Hooks/HandlerEditor/index.jsx`
- Modify: `shared/hooks/handlers.json`

- [ ] **Step 1: Add `if` field to all handler schemas**

Open `shared/hooks/handlers.json`. Add to each of the 4 handler schemas (as an additional field at the end of `fields`):

```json
{ "name": "if", "type": "textarea", "label": "Conditional (if)", "placeholder": "e.g. tool_name == \"Bash\" and tool_input.command starts_with \"rm\"" }
```

The `if` field is optional, so `required` is not set. It uses the textarea type so the existing FieldRenderer handles it automatically.

- [ ] **Step 2: Extend validation to check `if` syntax**

In `lib/hook-catalog.js`, add a lightweight validator for permission-rule syntax. For Phase 2, accept any non-empty string and defer deep validation to Claude Code at runtime. Add to `validateField()` a special case:

```js
if (field.name === 'if' && value && typeof value === 'string') {
  // Phase 2: minimal check — balanced quotes and parens
  const quotes = (value.match(/"/g) || []).length;
  if (quotes % 2 !== 0) errors.push(`Field "if" has unbalanced quotes`);
  let depth = 0;
  for (const ch of value) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (depth < 0) { errors.push(`Field "if" has unbalanced parentheses`); break; }
  }
  if (depth > 0) errors.push(`Field "if" has unbalanced parentheses`);
}
```

- [ ] **Step 3: Add catalog tests for `if` validation**

Add to `test/hook-catalog.test.js`, in the `validateHook` describe block:

```js
it('passes with valid if expression', () => {
  const errors = validateHook('PreToolUse', {
    matcher: 'Bash',
    hooks: [{ type: 'command', command: '/bin/echo', if: 'tool_name == "Bash"' }]
  });
  assert.deepStrictEqual(errors, []);
});

it('flags unbalanced quotes in if', () => {
  const errors = validateHook('PreToolUse', {
    matcher: 'Bash',
    hooks: [{ type: 'command', command: '/bin/echo', if: 'tool_name == "Bash' }]
  });
  assert.ok(errors.some(e => e.includes('unbalanced quotes')));
});
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: All pass.

- [ ] **Step 5: Build and verify UI**

Run: `npm run build && npm start`
Navigate to Hooks, add a hook, confirm the "Conditional (if)" field appears under handler fields.

- [ ] **Step 6: Commit**

```bash
git add shared/hooks/handlers.json lib/hook-catalog.js test/hook-catalog.test.js
git commit -m "feat(CC-11): add conditional if field to handler editors with balance check"
```

---

### Task 15: Library data file

**Files:**
- Create: `shared/hooks/library.json`

- [ ] **Step 1: Populate library with the 8 existing hook scripts**

The project's `hooks/` directory contains 8 `.sh` scripts. Create `shared/hooks/library.json`:

```json
[
  {
    "id": "workstream-inject",
    "name": "Workstream Inject",
    "description": "Auto-injects active workstream context into every session. Reads CODER_WORKSTREAM env var and pastes workstream description as system context.",
    "event": "SessionStart",
    "matcher": "*",
    "handler": { "type": "command", "command": "~/.coder-config/hooks/workstream-inject.sh" },
    "source": "hooks/workstream-inject.sh"
  },
  {
    "id": "activity-track",
    "name": "Activity Tracking",
    "description": "Tracks per-project activity on session start. Enables workstream suggestions based on co-activity patterns.",
    "event": "SessionStart",
    "matcher": "*",
    "handler": { "type": "command", "command": "~/.coder-config/hooks/activity-track.sh" },
    "source": "hooks/activity-track.sh"
  },
  {
    "id": "session-start",
    "name": "Session Start Banner",
    "description": "Prints a banner with active project, workstream, and config status at the start of every session.",
    "event": "SessionStart",
    "matcher": "*",
    "handler": { "type": "command", "command": "~/.coder-config/hooks/session-start.sh" },
    "source": "hooks/session-start.sh"
  },
  {
    "id": "session-end",
    "name": "Session End Persist",
    "description": "Persists session context to a resumable doc at session end.",
    "event": "SessionEnd",
    "matcher": "*",
    "handler": { "type": "command", "command": "~/.coder-config/hooks/session-end.sh" },
    "source": "hooks/session-end.sh"
  },
  {
    "id": "ralph-loop-preprompt",
    "name": "Ralph Loop Pre-prompt",
    "description": "Injects active Ralph Loop context before every prompt. Required for autonomous loop continuation.",
    "event": "UserPromptSubmit",
    "matcher": "*",
    "handler": { "type": "command", "command": "~/.coder-config/hooks/ralph-loop-preprompt.sh" },
    "source": "hooks/ralph-loop-preprompt.sh"
  },
  {
    "id": "ralph-loop-stop",
    "name": "Ralph Loop Stop",
    "description": "Triggers next Ralph Loop iteration when Claude stops responding during an active loop.",
    "event": "Stop",
    "matcher": "*",
    "handler": { "type": "command", "command": "~/.coder-config/hooks/ralph-loop-stop.sh" },
    "source": "hooks/ralph-loop-stop.sh"
  },
  {
    "id": "codex-workstream",
    "name": "Codex Workstream Inject",
    "description": "Workstream inject for Codex CLI (different payload format than Claude Code).",
    "event": "SessionStart",
    "matcher": "*",
    "handler": { "type": "command", "command": "~/.coder-config/hooks/codex-workstream.sh" },
    "source": "hooks/codex-workstream.sh"
  },
  {
    "id": "gemini-workstream",
    "name": "Gemini Workstream Inject",
    "description": "Workstream inject for Gemini CLI.",
    "event": "SessionStart",
    "matcher": "*",
    "handler": { "type": "command", "command": "~/.coder-config/hooks/gemini-workstream.sh" },
    "source": "hooks/gemini-workstream.sh"
  }
]
```

- [ ] **Step 2: Verify loading**

Restart the server (the catalog is cached). In the browser, open devtools and run `fetch('/api/hooks/catalog').then(r => r.json()).then(c => console.log(c.library.length))`. Expected: 8.

- [ ] **Step 3: Commit**

```bash
git add shared/hooks/library.json
git commit -m "feat(CC-11): add pre-built hook library with existing coder-config scripts"
```

---

### Task 16: Library browser + install action

**Files:**
- Create: `ui/src/views/Hooks/LibraryBrowser.jsx`
- Modify: `ui/src/views/Hooks/index.jsx`
- Modify: `ui/routes/hooks.js`
- Modify: `ui/server.cjs`
- Modify: `ui/src/lib/api.js`
- Create: `test/hooks-install.test.js`

- [ ] **Step 1: Add install backend function**

In `ui/routes/hooks.js`, add after `getCatalog`:

```js
/**
 * POST /api/hooks/install-library
 * Body: { id, scope, projectDir }
 */
function installLibraryEntry(manager, body) {
  const { id, scope, projectDir } = body || {};
  if (!id) return { error: 'id is required' };

  const catalog = manager.hookCatalogLoad();
  const entry = (catalog.library || []).find(e => e.id === id);
  if (!entry) return { error: `Library entry "${id}" not found` };

  // Copy source script to ~/.coder-config/hooks/ if needed
  const sourceRel = entry.source;
  if (sourceRel) {
    const srcPath = path.join(__dirname, '..', '..', sourceRel);
    const destDir = path.join(process.env.HOME, '.coder-config', 'hooks');
    fs.mkdirSync(destDir, { recursive: true });
    const destPath = path.join(destDir, path.basename(sourceRel));
    if (fs.existsSync(srcPath) && !fs.existsSync(destPath)) {
      fs.copyFileSync(srcPath, destPath);
      fs.chmodSync(destPath, 0o755);
    }
  }

  // Append to settings.json hooks
  const settingsPath = resolveSettingsPath(manager, scope, projectDir);
  if (!settingsPath) return { error: 'Invalid scope' };

  const settings = fs.existsSync(settingsPath) ? readSettings(settingsPath) : {};
  const hooks = settings.hooks || {};
  hooks[entry.event] = hooks[entry.event] || [];
  hooks[entry.event].push({
    matcher: entry.matcher,
    hooks: [entry.handler]
  });
  settings.hooks = hooks;
  writeSettings(settingsPath, settings);

  return { success: true, scopePath: settingsPath };
}

module.exports = { getHooks, saveHooks, getCatalog, installLibraryEntry };
```

- [ ] **Step 2: Register the endpoint in server.cjs**

Add to the switch in `handleAPI()`:

```js
case '/api/hooks/install-library':
  if (req.method === 'POST') return this.json(res, routes.hooks.installLibraryEntry(this.manager, body));
  break;
```

- [ ] **Step 3: Add API client method**

In `ui/src/lib/api.js`:

```js
async installHookLibraryEntry(id, scope, projectDir) {
  return request('/hooks/install-library', { method: 'POST', body: { id, scope, projectDir } });
},
```

- [ ] **Step 4: Write installation test**

Create `test/hooks-install.test.js`:

```js
const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const hookCatalog = require('../lib/hook-catalog');
const routes = require('../ui/routes/hooks');

describe('Library install', () => {
  let tempHome;
  let originalHome;
  let manager;

  before(() => {
    tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'hooks-install-'));
    originalHome = process.env.HOME;
    process.env.HOME = tempHome;
    hookCatalog.clearCache();
    manager = {
      getGlobalSettingsPath: () => path.join(tempHome, '.claude', 'settings.json'),
      getProjectSettingsPath: (dir) => path.join(dir, '.claude', 'settings.json'),
      hookValidate: (ev, entry) => hookCatalog.validateHook(ev, entry),
      hookCatalogLoad: () => hookCatalog.loadCatalog(),
    };
  });

  after(() => {
    process.env.HOME = originalHome;
    fs.rmSync(tempHome, { recursive: true, force: true });
  });

  beforeEach(() => {
    const claude = path.join(tempHome, '.claude');
    const coder = path.join(tempHome, '.coder-config');
    if (fs.existsSync(claude)) fs.rmSync(claude, { recursive: true, force: true });
    if (fs.existsSync(coder)) fs.rmSync(coder, { recursive: true, force: true });
  });

  it('installs library entry: copies script and appends hook', () => {
    const res = routes.installLibraryEntry(manager, { id: 'session-start', scope: 'global' });
    assert.strictEqual(res.success, true);

    // Script copied
    const scriptPath = path.join(tempHome, '.coder-config', 'hooks', 'session-start.sh');
    assert.ok(fs.existsSync(scriptPath), 'script copied');

    // Hook appended
    const settings = JSON.parse(fs.readFileSync(path.join(tempHome, '.claude', 'settings.json'), 'utf8'));
    assert.ok(settings.hooks.SessionStart);
    assert.strictEqual(settings.hooks.SessionStart[0].matcher, '*');
    assert.ok(settings.hooks.SessionStart[0].hooks[0].command.includes('session-start.sh'));
  });

  it('returns error for unknown id', () => {
    const res = routes.installLibraryEntry(manager, { id: 'nonexistent', scope: 'global' });
    assert.ok(res.error);
  });

  it('appends to existing event entries without overwriting', () => {
    // Pre-seed with a different SessionStart hook
    fs.mkdirSync(path.join(tempHome, '.claude'), { recursive: true });
    fs.writeFileSync(path.join(tempHome, '.claude', 'settings.json'), JSON.stringify({
      hooks: { SessionStart: [{ matcher: 'custom', hooks: [{ type: 'command', command: '/custom.sh' }] }] }
    }));
    routes.installLibraryEntry(manager, { id: 'session-start', scope: 'global' });
    const settings = JSON.parse(fs.readFileSync(path.join(tempHome, '.claude', 'settings.json'), 'utf8'));
    assert.strictEqual(settings.hooks.SessionStart.length, 2);
    assert.strictEqual(settings.hooks.SessionStart[0].matcher, 'custom');
  });
});
```

- [ ] **Step 5: Run tests**

Run: `node --test test/hooks-install.test.js`
Expected: All pass.

- [ ] **Step 6: Create LibraryBrowser.jsx**

```jsx
// ui/src/views/Hooks/LibraryBrowser.jsx
import React, { useState } from 'react';
import { Button } from '../../components/ui/button';
import { api } from '../../lib/api';

export function LibraryBrowser({ catalog, scope, projectDir, currentHooks, onInstalled, onClose }) {
  const [installing, setInstalling] = useState(null);
  const [error, setError] = useState(null);
  const [confirmEntry, setConfirmEntry] = useState(null);

  const performInstall = async (entry) => {
    setInstalling(entry.id);
    setError(null);
    try {
      const res = await api.installHookLibraryEntry(entry.id, scope, scope === 'project' ? projectDir : null);
      if (res.error) setError(res.error);
      else {
        setConfirmEntry(null);
        onInstalled();
      }
    } finally {
      setInstalling(null);
    }
  };

  // Diff preview for the pending confirmation
  const renderDiff = (entry) => {
    const existing = (currentHooks[entry.event] || []).length;
    const scriptDest = entry.handler.command;
    return (
      <div className="space-y-3 text-sm">
        <div className="border rounded p-3">
          <div className="text-xs uppercase text-slate-500 mb-1">Hook append</div>
          <div>Event <code>{entry.event}</code>: {existing} hook(s) → {existing + 1} hook(s)</div>
          <pre className="mt-2 text-xs bg-slate-100 dark:bg-slate-800 p-2 rounded">
{`{
  "matcher": "${entry.matcher}",
  "hooks": [${JSON.stringify(entry.handler, null, 2)}]
}`}
          </pre>
        </div>
        <div className="border rounded p-3">
          <div className="text-xs uppercase text-slate-500 mb-1">Script copy</div>
          <div>Source: <code>{entry.source}</code></div>
          <div>Destination: <code>{scriptDest}</code> (skipped if already exists)</div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-900 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {confirmEntry ? `Confirm install — ${confirmEntry.name}` : 'Hook Library'}
          </h2>
          <button onClick={onClose} className="text-slate-500">✕</button>
        </div>

        {error && <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}

        {confirmEntry ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Review what will change, then confirm:</p>
            {renderDiff(confirmEntry)}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setConfirmEntry(null)}>Back</Button>
              <Button
                disabled={installing === confirmEntry.id}
                onClick={() => performInstall(confirmEntry)}
              >
                {installing === confirmEntry.id ? 'Installing…' : 'Confirm install'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {(catalog.library || []).map(entry => (
              <div key={entry.id} className="border rounded p-3 flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-medium">{entry.name}</h3>
                  <p className="text-sm text-slate-500 mt-1">{entry.description}</p>
                  <p className="text-xs text-slate-400 mt-2">Event: {entry.event} • Matcher: {entry.matcher}</p>
                </div>
                <Button size="sm" onClick={() => setConfirmEntry(entry)}>
                  Install
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Wire LibraryBrowser into Hooks view**

In `ui/src/views/Hooks/index.jsx`, add state and a button:

```jsx
const [showLibrary, setShowLibrary] = useState(false);
// ... inside render, near ScopeBar: add a button in EventSidebar or in the header
```

Update ScopeBar to include a "Library" button, or add it to EventSidebar at the top. A minimal approach: add an "Install from library" button in `EmptyState.jsx` and a button in `HookList.jsx` header.

In Hooks/index.jsx, after the close of the main flex div but before the outer return close, render the modal:

```jsx
{showLibrary && (
  <LibraryBrowser
    catalog={catalog}
    scope={scope}
    projectDir={projectDir}
    currentHooks={hooks}
    onClose={() => setShowLibrary(false)}
    onInstalled={() => {
      setShowLibrary(false);
      reload();
    }}
  />
)}
```

Expose `reload` from `useHooks` in the destructure: `const { ..., reload } = useHooks(scope, ...);`.

- [ ] **Step 8: Build and verify**

Run: `npm run build && npm start`
Test: open Hooks, click "Install from library" (or similar trigger), install a library entry, verify hook appears under the correct event.

- [ ] **Step 9: Run full tests**

Run: `npm test`
Expected: All pass.

- [ ] **Step 10: Commit**

```bash
git add ui/routes/hooks.js ui/server.cjs ui/src/lib/api.js ui/src/views/Hooks/LibraryBrowser.jsx ui/src/views/Hooks/index.jsx ui/src/views/Hooks/EmptyState.jsx test/hooks-install.test.js
git commit -m "feat(CC-11): add library browser with one-click install"
```

---

### Task 17: Phase 2 wrap — CHANGELOG and ROADMAP

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `ROADMAP.md`

- [ ] **Step 1: Update CHANGELOG.md**

Under the unreleased section or in a new release note:

```markdown
### Added
- **CC-11 Hook Builder (Phase 2):** Conditional `if` field editor for all handler types. Pre-built hook library with one-click install of 8 coder-config hook scripts (workstream inject, activity track, session start/end, Ralph Loop integration, multi-tool workstream variants).
```

- [ ] **Step 2: Update ROADMAP.md**

Update CC-11 Required Items: mark items 3 (conditional `if`) and 5 (pre-built library) as `COMPLETE`. Status stays `PARTIAL` until Phase 3 lands.

- [ ] **Step 3: Run tests and build**

Run: `npm test && npm run build`

- [ ] **Step 4: Commit**

```bash
git add CHANGELOG.md ROADMAP.md
git commit -m "docs(CC-11): mark Phase 2 complete"
```

---

## PHASE 3 — Dry-run testing

### Task 18: Dry-run backend

**Files:**
- Create: `lib/hook-dryrun.js`
- Create: `test/hook-dryrun.test.js`
- Modify: `ui/routes/hooks.js`
- Modify: `ui/server.cjs`
- Modify: `config-loader.js`

- [ ] **Step 1: Write failing tests for dry-run**

Create `test/hook-dryrun.test.js`:

```js
const { describe, it } = require('node:test');
const assert = require('node:assert');
const { dryRun } = require('../lib/hook-dryrun');

describe('hook-dryrun', () => {
  describe('command handler', () => {
    it('executes echo and captures stdout', async () => {
      const result = await dryRun(
        { type: 'command', command: '/bin/echo hello', timeout: 5 },
        { tool_name: 'Bash' }
      );
      assert.strictEqual(result.mode, 'executed');
      assert.strictEqual(result.exitCode, 0);
      assert.ok(result.stdout.includes('hello'));
    });

    it('reports non-zero exit code', async () => {
      const result = await dryRun(
        { type: 'command', command: '/bin/false', timeout: 5 },
        {}
      );
      assert.strictEqual(result.mode, 'executed');
      assert.notStrictEqual(result.exitCode, 0);
    });

    it('times out', async () => {
      const result = await dryRun(
        { type: 'command', command: 'sleep 10', timeout: 1 },
        {}
      );
      assert.strictEqual(result.mode, 'executed');
      assert.ok(result.timedOut);
    });
  });

  describe('prompt handler', () => {
    it('returns preview by default', async () => {
      const result = await dryRun(
        { type: 'prompt', prompt: 'Evaluate: ${tool_name}', model: 'claude-haiku-4-5-20251001' },
        { tool_name: 'Bash' }
      );
      assert.strictEqual(result.mode, 'preview');
      assert.ok(result.resolvedPrompt.includes('Bash'));
    });
  });

  describe('agent handler', () => {
    it('returns preview by default', async () => {
      const result = await dryRun(
        { type: 'agent', subagent: 'general-purpose', prompt: 'Do ${task}' },
        { task: 'something' }
      );
      assert.strictEqual(result.mode, 'preview');
      assert.ok(result.resolvedPrompt.includes('something'));
    });
  });
});
```

- [ ] **Step 2: Implement lib/hook-dryrun.js**

```js
/**
 * Hook dry-run executor.
 * - command/http: real execution with timeout, capture stdout/stderr/exit
 * - prompt/agent: preview-only by default (resolve payload substitutions)
 */

const { spawn } = require('child_process');

/**
 * Replace ${path.to.value} references in a string with values from payload.
 * Supports nested access: ${tool_input.command}
 */
function substitute(template, payload) {
  if (typeof template !== 'string') return template;
  return template.replace(/\$\{([^}]+)\}/g, (_, pathExpr) => {
    const parts = pathExpr.split('.');
    let v = payload;
    for (const p of parts) {
      if (v == null) return '';
      v = v[p];
    }
    return v == null ? '' : String(v);
  });
}

function substituteAll(obj, payload) {
  if (typeof obj === 'string') return substitute(obj, payload);
  if (Array.isArray(obj)) return obj.map(o => substituteAll(o, payload));
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) out[k] = substituteAll(v, payload);
    return out;
  }
  return obj;
}

async function runCommand(handler, payload) {
  return new Promise((resolve) => {
    const cmd = substitute(handler.command, payload);
    const shell = handler.shell || '/bin/bash';
    const timeoutMs = (handler.timeout || 60) * 1000;

    const child = spawn(shell, ['-c', cmd], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);

    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });

    // Pass payload as JSON on stdin
    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();

    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({
        mode: 'executed',
        exitCode: code,
        stdout,
        stderr,
        timedOut,
        command: cmd,
      });
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({
        mode: 'executed',
        exitCode: -1,
        stdout: '',
        stderr: err.message,
        timedOut: false,
        command: cmd,
      });
    });
  });
}

async function runHttp(handler, payload) {
  const url = substitute(handler.url, payload);
  const method = handler.method || 'POST';
  const headers = substituteAll(handler.headers || {}, payload);
  const body = handler.body ? substitute(handler.body, payload) : undefined;
  const timeoutMs = (handler.timeout || 30) * 1000;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method,
      headers,
      body: method !== 'GET' ? body : undefined,
      signal: controller.signal,
    });
    const text = await res.text();
    return {
      mode: 'executed',
      status: res.status,
      headers: Object.fromEntries(res.headers.entries()),
      body: text,
      url,
    };
  } catch (err) {
    return {
      mode: 'executed',
      status: 0,
      error: err.name === 'AbortError' ? 'Request timed out' : err.message,
      url,
    };
  } finally {
    clearTimeout(timer);
  }
}

function previewPrompt(handler, payload) {
  return {
    mode: 'preview',
    resolvedPrompt: substitute(handler.prompt || '', payload),
    model: handler.model || null,
  };
}

function previewAgent(handler, payload) {
  return {
    mode: 'preview',
    subagent: handler.subagent,
    tools: handler.tools || [],
    resolvedPrompt: substitute(handler.prompt || '', payload),
  };
}

/**
 * Dry-run a handler against a sample payload.
 * opts.actuallyRun=true forces real execution for prompt/agent types.
 */
async function dryRun(handler, payload, opts = {}) {
  switch (handler.type) {
    case 'command': return runCommand(handler, payload);
    case 'http': return runHttp(handler, payload);
    case 'prompt':
      if (opts.actuallyRun) {
        return { mode: 'executed', error: 'Real prompt execution is not implemented in Phase 3 (requires LLM client wiring).' };
      }
      return previewPrompt(handler, payload);
    case 'agent':
      if (opts.actuallyRun) {
        return { mode: 'executed', error: 'Real agent execution is not implemented in Phase 3.' };
      }
      return previewAgent(handler, payload);
    default:
      return { mode: 'error', error: `Unknown handler type: ${handler.type}` };
  }
}

module.exports = { dryRun, substitute };
```

- [ ] **Step 3: Run dry-run tests**

Run: `node --test test/hook-dryrun.test.js`
Expected: All pass.

- [ ] **Step 4: Add dry-run endpoint to ui/routes/hooks.js**

Add to the top of `ui/routes/hooks.js`:

```js
const { dryRun } = require('../../lib/hook-dryrun');
```

Add a function:

```js
/**
 * POST /api/hooks/dry-run
 * Body: { handler, payload, actuallyRun? }
 */
async function dryRunHook(_manager, body) {
  const { handler, payload, actuallyRun } = body || {};
  if (!handler || !handler.type) return { error: 'handler with type is required' };
  try {
    const result = await dryRun(handler, payload || {}, { actuallyRun: !!actuallyRun });
    return result;
  } catch (err) {
    return { error: err.message };
  }
}
```

Update module.exports:

```js
module.exports = { getHooks, saveHooks, getCatalog, installLibraryEntry, dryRunHook };
```

- [ ] **Step 5: Register dry-run endpoint in server.cjs**

```js
case '/api/hooks/dry-run':
  if (req.method === 'POST') {
    return routes.hooks.dryRunHook(this.manager, body).then(result => this.json(res, result));
  }
  break;
```

(If the server's dispatch doesn't natively support async returns, follow the same async handling pattern used elsewhere in server.cjs. Check how the loops or router routes handle async.)

- [ ] **Step 6: Add API client method**

In `ui/src/lib/api.js`:

```js
async dryRunHook(handler, payload, actuallyRun = false) {
  return request('/hooks/dry-run', { method: 'POST', body: { handler, payload, actuallyRun } });
},
```

- [ ] **Step 7: Run tests**

Run: `npm test`
Expected: All pass.

- [ ] **Step 8: Commit**

```bash
git add lib/hook-dryrun.js test/hook-dryrun.test.js ui/routes/hooks.js ui/server.cjs ui/src/lib/api.js
git commit -m "feat(CC-11): add hook dry-run backend with real exec for command/http, preview for prompt/agent"
```

---

### Task 19: Dry-run UI

**Files:**
- Create: `ui/src/views/Hooks/DryRunPanel.jsx`
- Modify: `ui/src/views/Hooks/HookList.jsx`

- [ ] **Step 1: Create DryRunPanel.jsx**

```jsx
import React, { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { api } from '../../lib/api';

export function DryRunPanel({ event, entry, onClose }) {
  const [payload, setPayload] = useState(JSON.stringify(event.samplePayload || {}, null, 2));
  const [selectedHandlerIdx, setSelectedHandlerIdx] = useState(0);
  const [results, setResults] = useState(null);
  const [running, setRunning] = useState(false);
  const [actuallyRun, setActuallyRun] = useState(false);

  const run = async () => {
    setRunning(true);
    try {
      const parsed = JSON.parse(payload);
      const handler = entry.hooks[selectedHandlerIdx];
      const result = await api.dryRunHook(handler, parsed, actuallyRun);
      setResults(result);
    } catch (err) {
      setResults({ error: err.message });
    } finally {
      setRunning(false);
    }
  };

  const isPreviewOnly = ['prompt', 'agent'].includes(entry.hooks[selectedHandlerIdx]?.type);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-900 rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Dry-run — {event.name}</h2>
          <button onClick={onClose} className="text-slate-500">✕</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Handler</label>
            <select
              className="w-full border rounded p-2 text-sm"
              value={selectedHandlerIdx}
              onChange={e => setSelectedHandlerIdx(Number(e.target.value))}
            >
              {entry.hooks.map((h, i) => (
                <option key={i} value={i}>#{i + 1}: {h.type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Sample payload (JSON)</label>
            <Textarea
              value={payload}
              onChange={e => setPayload(e.target.value)}
              className="font-mono text-sm min-h-[120px]"
            />
          </div>

          {isPreviewOnly && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={actuallyRun} onChange={e => setActuallyRun(e.target.checked)} />
              Actually run (billable — LLM/agent call)
            </label>
          )}

          <Button disabled={running} onClick={run}>
            {running ? 'Running…' : 'Run'}
          </Button>

          {results && (
            <div className="border rounded p-3 bg-slate-50 dark:bg-slate-800">
              <div className="text-xs uppercase text-slate-500 mb-2">
                {results.mode === 'preview' ? 'Preview (not executed)' : results.mode === 'executed' ? 'Executed' : 'Error'}
              </div>
              <pre className="text-xs font-mono whitespace-pre-wrap">
                {JSON.stringify(results, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire dry-run button into HookList**

In `ui/src/views/Hooks/HookList.jsx`, import DryRunPanel and add state:

```jsx
import { DryRunPanel } from './DryRunPanel';
// ... inside HookList:
const [dryRunEntry, setDryRunEntry] = useState(null);
```

Add a "Dry-run" button next to the "Remove entry" button inside the `entries.map` render:

```jsx
<button
  className="absolute top-2 right-20 text-xs text-blue-500"
  onClick={() => setDryRunEntry(entry)}
>
  Dry-run
</button>
```

At the end of the component (before the final `</div>`), render the panel:

```jsx
{dryRunEntry && (
  <DryRunPanel
    event={event}
    entry={dryRunEntry}
    onClose={() => setDryRunEntry(null)}
  />
)}
```

- [ ] **Step 3: Build and verify**

Run: `npm run build && npm start`
Test:
1. Navigate to Hooks → PreToolUse → add command hook with command `/bin/echo hello`
2. Click Dry-run
3. Click Run → verify stdout appears
4. Switch handler type to prompt → verify preview-only mode shows without running
5. Toggle "Actually run" → verify it's a no-op for Phase 3 scope

- [ ] **Step 4: Run full tests**

Run: `npm test`
Expected: All pass.

- [ ] **Step 5: Commit**

```bash
git add ui/src/views/Hooks/DryRunPanel.jsx ui/src/views/Hooks/HookList.jsx
git commit -m "feat(CC-11): add dry-run panel with sample payload editor"
```

---

### Task 20: Phase 3 wrap — CHANGELOG and ROADMAP

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `ROADMAP.md`

- [ ] **Step 1: Update CHANGELOG.md**

```markdown
### Added
- **CC-11 Hook Builder (Phase 3):** Dry-run testing. Real execution for command (subprocess + stdin payload) and http (fetch) handlers with stdout/exit/timeout capture. Preview-only for prompt and agent handlers (shows resolved payload substitutions); opt-in "Actually run" flag reserved for future real execution.
```

- [ ] **Step 2: Update ROADMAP.md**

Change CC-11 status from `PARTIAL` to `COMPLETE`. Mark all 5 required items as `COMPLETE`.

- [ ] **Step 3: Full verification**

Run: `npm test && npm run build`
Expected: All pass, clean build.

Run: `npm start`, navigate to Hooks, exercise a full golden flow:
- Add command hook, save, verify in `~/.claude/settings.json`
- Add http hook, dry-run against sample payload
- Install a library entry, verify script in `~/.coder-config/hooks/`
- Toggle scope, verify project `settings.json` is separate
- Reload the page, verify hooks are still there

- [ ] **Step 4: Commit**

```bash
git add CHANGELOG.md ROADMAP.md
git commit -m "docs(CC-11): mark CC-11 Hook Builder complete (all phases)"
```

---

## Notes for the Implementer

- **Frequent commits.** Each step that changes code ends with a commit. Don't batch commits.
- **TDD.** Tests before implementation for every backend module. UI components don't have unit tests in this codebase — verify manually in the browser per the user's "verify UI before done" rule.
- **No mocks for I/O.** Every backend test uses real temp directories, real file I/O. See `test/router.test.js` for the pattern.
- **Version hooks.** The project has pre-commit/pre-push hooks that auto-bump the patch version and push to CI. Don't manually edit `package.json` version fields — let the hooks run (user rule: `no-manual-version-bump.md`).
- **No `npm ci`, no `package-lock.json` commits.** Use `npm run build`. Project rule.
- **Co-author lines.** Do NOT add `Co-Authored-By` to commits. Project rule.
- **File size.** The `ui/src/views/Hooks/` subfolder keeps each component focused. If any single file grows past ~400 lines during implementation, split it further.
- **Cache clearing in tests.** `lib/hook-catalog.js` caches after first load. Tests must call `clearCache()` in setup to isolate between tests when catalog data could have been modified. (Implemented in Task 2.)
- **`.superpowers/` gitignore.** If `.superpowers/` is not in `.gitignore`, add it before the first commit — the brainstorming visual companion writes files there.
