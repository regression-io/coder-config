# CC-9: Claude Code Router Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add CCR proxy configuration, lifecycle management, and Web UI to coder-config.

**Architecture:** New `lib/router.js` module for config management, new `ui/routes/router.js` for API, new `ui/src/views/RouterView.jsx` for Web UI. Wired through `config-loader.js` and `lib/cli.js` following existing patterns.

**Tech Stack:** Node.js (CommonJS), React + Vite, TailwindCSS, shadcn/ui components

**Spec:** `docs/superpowers/specs/2026-04-12-claude-code-router-design.md`

---

### Task 1: Core module — lib/router.js

**Files:**
- Create: `lib/router.js`
- Create: `test/router.test.js`

- [ ] **Step 1: Write failing tests for config read/write**

```js
// test/router.test.js
const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  getConfig, saveConfig, getConfigPath,
  listProviders, addProvider, removeProvider,
  getRouterRules, setRouterRule,
  getActivationEnv, getStatus,
  listPresets, savePreset, loadPreset,
} = require('../lib/router');

describe('router', () => {
  let tempDir;
  let originalHome;
  let logs, errors;
  let originalLog, originalError;

  before(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'router-test-'));
    originalHome = process.env.HOME;
    process.env.HOME = tempDir;
    originalLog = console.log;
    originalError = console.error;
  });

  after(() => {
    process.env.HOME = originalHome;
    console.log = originalLog;
    console.error = originalError;
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    logs = [];
    errors = [];
    console.log = (...args) => logs.push(args.join(' '));
    console.error = (...args) => errors.push(args.join(' '));
    // Clean CCR config dir between tests
    const ccrDir = path.join(tempDir, '.claude-code-router');
    if (fs.existsSync(ccrDir)) fs.rmSync(ccrDir, { recursive: true, force: true });
  });

  describe('getConfigPath', () => {
    it('should return ~/.claude-code-router/config.json', () => {
      const p = getConfigPath();
      assert.strictEqual(p, path.join(tempDir, '.claude-code-router', 'config.json'));
    });
  });

  describe('getConfig / saveConfig', () => {
    it('should return empty config when file does not exist', () => {
      const config = getConfig();
      assert.deepStrictEqual(config, {});
    });

    it('should read existing config', () => {
      const ccrDir = path.join(tempDir, '.claude-code-router');
      fs.mkdirSync(ccrDir, { recursive: true });
      fs.writeFileSync(path.join(ccrDir, 'config.json'), JSON.stringify({
        Router: { default: 'openrouter,claude-sonnet-4' },
        Providers: [{ name: 'openrouter', api_base_url: 'https://openrouter.ai/api/v1/chat/completions' }]
      }));
      const config = getConfig();
      assert.strictEqual(config.Router.default, 'openrouter,claude-sonnet-4');
      assert.strictEqual(config.Providers.length, 1);
    });

    it('should preserve unknown fields on save', () => {
      const ccrDir = path.join(tempDir, '.claude-code-router');
      fs.mkdirSync(ccrDir, { recursive: true });
      fs.writeFileSync(path.join(ccrDir, 'config.json'), JSON.stringify({
        APIKEY: 'secret',
        CUSTOM_ROUTER_PATH: './my-router.js',
        LOG: true,
        Providers: [],
        Router: {}
      }));
      const config = getConfig();
      config.Router.default = 'test,model';
      saveConfig(config);
      const reread = JSON.parse(fs.readFileSync(path.join(ccrDir, 'config.json'), 'utf8'));
      assert.strictEqual(reread.APIKEY, 'secret');
      assert.strictEqual(reread.CUSTOM_ROUTER_PATH, './my-router.js');
      assert.strictEqual(reread.LOG, true);
      assert.strictEqual(reread.Router.default, 'test,model');
    });
  });

  describe('listProviders / addProvider / removeProvider', () => {
    it('should return empty array when no providers', () => {
      assert.deepStrictEqual(listProviders(), []);
    });

    it('should add a provider', () => {
      addProvider('openrouter', {
        api_base_url: 'https://openrouter.ai/api/v1/chat/completions',
        api_key: '$OPENROUTER_KEY',
        models: ['claude-sonnet-4']
      });
      const providers = listProviders();
      assert.strictEqual(providers.length, 1);
      assert.strictEqual(providers[0].name, 'openrouter');
      assert.deepStrictEqual(providers[0].models, ['claude-sonnet-4']);
    });

    it('should remove a provider', () => {
      addProvider('test', { api_base_url: 'http://localhost', models: [] });
      assert.strictEqual(listProviders().length, 1);
      removeProvider('test');
      assert.strictEqual(listProviders().length, 0);
    });

    it('should not fail removing nonexistent provider', () => {
      removeProvider('nonexistent');
      assert.strictEqual(listProviders().length, 0);
    });
  });

  describe('getRouterRules / setRouterRule', () => {
    it('should return empty rules when no config', () => {
      const rules = getRouterRules();
      assert.deepStrictEqual(rules, {});
    });

    it('should set a rule', () => {
      setRouterRule('default', 'openrouter,claude-sonnet-4');
      const rules = getRouterRules();
      assert.strictEqual(rules.default, 'openrouter,claude-sonnet-4');
    });

    it('should set multiple rules', () => {
      setRouterRule('default', 'openrouter,claude-sonnet-4');
      setRouterRule('background', 'openrouter,deepseek-chat');
      const rules = getRouterRules();
      assert.strictEqual(rules.default, 'openrouter,claude-sonnet-4');
      assert.strictEqual(rules.background, 'openrouter,deepseek-chat');
    });
  });

  describe('getActivationEnv', () => {
    it('should return activation env vars', () => {
      const ccrDir = path.join(tempDir, '.claude-code-router');
      fs.mkdirSync(ccrDir, { recursive: true });
      fs.writeFileSync(path.join(ccrDir, 'config.json'), JSON.stringify({
        APIKEY: 'mykey'
      }));
      const env = getActivationEnv();
      assert.strictEqual(env.ANTHROPIC_BASE_URL, 'http://127.0.0.1:3456');
      assert.strictEqual(env.ANTHROPIC_AUTH_TOKEN, 'mykey');
      assert.strictEqual(env.NO_PROXY, '127.0.0.1');
      assert.strictEqual(env.DISABLE_TELEMETRY, '1');
      assert.strictEqual(env.DISABLE_COST_WARNINGS, '1');
    });

    it('should use default port when no config', () => {
      const env = getActivationEnv();
      assert.ok(env.ANTHROPIC_BASE_URL.includes('3456'));
    });
  });

  describe('presets', () => {
    it('should return empty list when no presets', () => {
      assert.deepStrictEqual(listPresets(), []);
    });

    it('should save and load a preset', () => {
      addProvider('test', { api_base_url: 'http://localhost', models: ['m1'] });
      setRouterRule('default', 'test,m1');
      savePreset('my-preset');

      const presets = listPresets();
      assert.strictEqual(presets.length, 1);
      assert.strictEqual(presets[0].name, 'my-preset');

      // Clear config and load preset
      saveConfig({ Providers: [], Router: {} });
      loadPreset('my-preset');
      const rules = getRouterRules();
      assert.strictEqual(rules.default, 'test,m1');
      assert.strictEqual(listProviders().length, 1);
    });
  });

  describe('getStatus', () => {
    it('should report not installed when ccr not found', () => {
      const status = getStatus();
      assert.strictEqual(status.installed, false);
      assert.strictEqual(status.running, false);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/router.test.js`
Expected: FAIL — `Cannot find module '../lib/router'`

- [ ] **Step 3: Implement lib/router.js**

```js
// lib/router.js
/**
 * Claude Code Router (CCR) configuration management
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const net = require('net');

const DEFAULT_PORT = 3456;

function getConfigPath() {
  return path.join(os.homedir(), '.claude-code-router', 'config.json');
}

function getPresetsDir() {
  return path.join(os.homedir(), '.claude-code-router', 'coder-config-presets');
}

function getConfig() {
  const configPath = getConfigPath();
  if (!fs.existsSync(configPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (e) {
    return {};
  }
}

function saveConfig(config) {
  const configPath = getConfigPath();
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
}

function listProviders() {
  const config = getConfig();
  return config.Providers || [];
}

function addProvider(name, providerConfig) {
  const config = getConfig();
  if (!config.Providers) config.Providers = [];
  // Remove existing provider with same name
  config.Providers = config.Providers.filter(p => p.name !== name);
  config.Providers.push({ name, ...providerConfig });
  saveConfig(config);
}

function removeProvider(name) {
  const config = getConfig();
  if (!config.Providers) return;
  config.Providers = config.Providers.filter(p => p.name !== name);
  saveConfig(config);
}

function getRouterRules() {
  const config = getConfig();
  return config.Router || {};
}

function setRouterRule(task, providerModel) {
  const config = getConfig();
  if (!config.Router) config.Router = {};
  config.Router[task] = providerModel;
  saveConfig(config);
}

function getActivationEnv() {
  const config = getConfig();
  const port = DEFAULT_PORT; // CCR port is CLI arg, not in config
  return {
    ANTHROPIC_BASE_URL: `http://127.0.0.1:${port}`,
    ANTHROPIC_AUTH_TOKEN: config.APIKEY || '',
    NO_PROXY: '127.0.0.1',
    DISABLE_TELEMETRY: '1',
    DISABLE_COST_WARNINGS: '1',
  };
}

function getStatus() {
  const result = { installed: false, running: false, configExists: false, version: null };

  // Check if ccr is installed
  try {
    const out = execSync('which ccr', { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
    result.installed = !!out;
  } catch {
    result.installed = false;
  }

  // Check config exists
  result.configExists = fs.existsSync(getConfigPath());

  // Check if proxy is running (quick TCP connect test)
  // This is synchronous for simplicity — uses a short timeout
  try {
    execSync(`lsof -i :${DEFAULT_PORT} -sTCP:LISTEN -t 2>/dev/null`, { stdio: ['pipe', 'pipe', 'pipe'] });
    result.running = true;
  } catch {
    result.running = false;
  }

  return result;
}

function listPresets() {
  const presetsDir = getPresetsDir();
  if (!fs.existsSync(presetsDir)) return [];
  return fs.readdirSync(presetsDir)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      const filePath = path.join(presetsDir, f);
      const stat = fs.statSync(filePath);
      return {
        name: f.replace('.json', ''),
        path: filePath,
        created: stat.birthtime,
        modified: stat.mtime,
      };
    })
    .sort((a, b) => b.modified - a.modified);
}

function savePreset(name) {
  const config = getConfig();
  const presetsDir = getPresetsDir();
  if (!fs.existsSync(presetsDir)) {
    fs.mkdirSync(presetsDir, { recursive: true });
  }
  const presetPath = path.join(presetsDir, `${name}.json`);
  fs.writeFileSync(presetPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
}

function loadPreset(name) {
  const presetsDir = getPresetsDir();
  const presetPath = path.join(presetsDir, `${name}.json`);
  if (!fs.existsSync(presetPath)) {
    console.error(`Preset "${name}" not found`);
    return false;
  }
  try {
    const preset = JSON.parse(fs.readFileSync(presetPath, 'utf8'));
    saveConfig(preset);
    return true;
  } catch (e) {
    console.error(`Error loading preset: ${e.message}`);
    return false;
  }
}

module.exports = {
  getConfigPath, getConfig, saveConfig,
  listProviders, addProvider, removeProvider,
  getRouterRules, setRouterRule,
  getActivationEnv, getStatus,
  listPresets, savePreset, loadPreset,
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/router.test.js`
Expected: All pass

- [ ] **Step 5: Commit**

```bash
git add lib/router.js test/router.test.js
git commit -m "feat(CC-9): add lib/router.js with CCR config management and tests"
```

---

### Task 2: Config-loader integration and CLI commands

**Files:**
- Modify: `config-loader.js`
- Modify: `lib/cli.js`

- [ ] **Step 1: Wire router module into config-loader.js**

Add import at the top of `config-loader.js` (after the shell import on line 37):

```js
const { getConfig: routerGetConfig, saveConfig: routerSaveConfig, listProviders: routerListProviders, addProvider: routerAddProvider, removeProvider: routerRemoveProvider, getRouterRules, setRouterRule, getActivationEnv: routerGetActivationEnv, getStatus: routerGetStatus, listPresets: routerListPresets, savePreset: routerSavePreset, loadPreset: routerLoadPreset } = require('./lib/router');
```

Add methods to the `ClaudeConfigManager` class (in the constructor or prototype — follow existing pattern of direct assignment in constructor):

```js
// Router (CCR)
this.routerGetConfig = routerGetConfig;
this.routerSaveConfig = routerSaveConfig;
this.routerListProviders = routerListProviders;
this.routerAddProvider = routerAddProvider;
this.routerRemoveProvider = routerRemoveProvider;
this.routerGetRules = getRouterRules;
this.routerSetRule = setRouterRule;
this.routerGetActivationEnv = routerGetActivationEnv;
this.routerGetStatus = routerGetStatus;
this.routerListPresets = routerListPresets;
this.routerSavePreset = routerSavePreset;
this.routerLoadPreset = routerLoadPreset;
```

- [ ] **Step 2: Add CLI router commands to lib/cli.js**

Add new case in the `runCli` switch statement (after the `shell` case):

```js
case 'router':
  if (args[1] === 'status') {
    const status = manager.routerGetStatus();
    console.log('Claude Code Router Status\n');
    console.log(`  Installed: ${status.installed ? 'Yes' : 'No'}`);
    console.log(`  Config: ${status.configExists ? 'Found' : 'Not found'}`);
    console.log(`  Proxy: ${status.running ? 'Running' : 'Stopped'}`);
    if (!status.installed) {
      console.log('\n  Install: npm install -g claude-code-router');
    }
  } else if (args[1] === 'list') {
    const providers = manager.routerListProviders();
    const rules = manager.routerGetRules();
    console.log('Claude Code Router Configuration\n');
    console.log('Providers:');
    if (providers.length === 0) {
      console.log('  (none configured)');
    } else {
      for (const p of providers) {
        console.log(`  • ${p.name} - ${p.api_base_url} (${(p.models || []).length} models)`);
      }
    }
    console.log('\nRouting Rules:');
    for (const [task, target] of Object.entries(rules)) {
      if (task === 'longContextThreshold') continue;
      console.log(`  ${task}: ${target}`);
    }
  } else if (args[1] === 'add-provider') {
    const name = args[2];
    const urlIdx = args.indexOf('--url');
    const keyIdx = args.indexOf('--key');
    if (!name || urlIdx === -1) {
      console.error('Usage: coder-config router add-provider <name> --url <url> [--key <key>] [--models <m1,m2>]');
      break;
    }
    const config = { api_base_url: args[urlIdx + 1] };
    if (keyIdx !== -1) config.api_key = args[keyIdx + 1];
    const modelsIdx = args.indexOf('--models');
    if (modelsIdx !== -1) config.models = args[modelsIdx + 1].split(',');
    manager.routerAddProvider(name, config);
    console.log(`Added provider: ${name}`);
  } else if (args[1] === 'remove-provider') {
    manager.routerRemoveProvider(args[2]);
    console.log(`Removed provider: ${args[2]}`);
  } else if (args[1] === 'set-rule') {
    if (!args[2] || !args[3]) {
      console.error('Usage: coder-config router set-rule <task> <provider,model>');
      break;
    }
    manager.routerSetRule(args[2], args[3]);
    console.log(`Set ${args[2]} → ${args[3]}`);
  } else if (args[1] === 'preset') {
    if (args[2] === 'list') {
      const presets = manager.routerListPresets();
      if (presets.length === 0) {
        console.log('No saved presets');
      } else {
        for (const p of presets) {
          console.log(`  ${p.name} (${p.modified.toISOString().slice(0, 10)})`);
        }
      }
    } else if (args[2] === 'save' && args[3]) {
      manager.routerSavePreset(args[3]);
      console.log(`Saved preset: ${args[3]}`);
    } else if (args[2] === 'load' && args[3]) {
      manager.routerLoadPreset(args[3]);
      console.log(`Loaded preset: ${args[3]}`);
    } else {
      console.log('Usage: coder-config router preset [list|save <name>|load <name>]');
    }
  } else if (args[1] === 'start') {
    try {
      const { execSync } = require('child_process');
      execSync('ccr code', { stdio: 'inherit' });
    } catch (e) {
      console.error('Failed to start CCR. Is it installed? npm install -g claude-code-router');
    }
  } else if (args[1] === 'stop') {
    try {
      const { execSync } = require('child_process');
      execSync('ccr stop', { stdio: 'inherit' });
    } catch (e) {
      console.error('Failed to stop CCR.');
    }
  } else if (args[1] === 'activate') {
    const env = manager.routerGetActivationEnv();
    for (const [k, v] of Object.entries(env)) {
      console.log(`export ${k}="${v}"`);
    }
  } else {
    console.log('Usage: coder-config router <command>');
    console.log('');
    console.log('Commands:');
    console.log('  status              Show CCR installation and proxy status');
    console.log('  list                List providers and routing rules');
    console.log('  add-provider        Add a provider');
    console.log('  remove-provider     Remove a provider');
    console.log('  set-rule            Set a routing rule');
    console.log('  preset              Manage presets');
    console.log('  start               Start CCR proxy');
    console.log('  stop                Stop CCR proxy');
    console.log('  activate            Print activation env vars');
  }
  break;
```

- [ ] **Step 3: Run all tests**

Run: `npm test`
Expected: All 608+ tests pass

- [ ] **Step 4: Commit**

```bash
git add config-loader.js lib/cli.js
git commit -m "feat(CC-9): wire router into config-loader and add CLI commands"
```

---

### Task 3: API routes — ui/routes/router.js

**Files:**
- Create: `ui/routes/router.js`
- Modify: `ui/server.cjs`

- [ ] **Step 1: Create ui/routes/router.js**

```js
// ui/routes/router.js
/**
 * Router Routes (Claude Code Router)
 */

const { execSync } = require('child_process');

function getStatus(manager) {
  return manager.routerGetStatus();
}

function getConfig(manager) {
  return manager.routerGetConfig();
}

function saveConfig(manager, body) {
  try {
    manager.routerSaveConfig(body);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function getProviders(manager) {
  return { providers: manager.routerListProviders() };
}

function addProvider(manager, body) {
  const { name, config } = body;
  if (!name) return { error: 'Name is required' };
  if (!config) return { error: 'Config is required' };
  manager.routerAddProvider(name, config);
  return { success: true, name };
}

function removeProvider(manager, name) {
  if (!name) return { error: 'Name is required' };
  manager.routerRemoveProvider(name);
  return { success: true, name };
}

function getRules(manager) {
  return { rules: manager.routerGetRules() };
}

function setRule(manager, body) {
  const { task, providerModel } = body;
  if (!task || !providerModel) return { error: 'task and providerModel are required' };
  manager.routerSetRule(task, providerModel);
  return { success: true, task, providerModel };
}

function getPresets(manager) {
  return { presets: manager.routerListPresets() };
}

function savePreset(manager, body) {
  const { name } = body;
  if (!name) return { error: 'Name is required' };
  manager.routerSavePreset(name);
  return { success: true, name };
}

function loadPreset(manager, body) {
  const { name } = body;
  if (!name) return { error: 'Name is required' };
  const result = manager.routerLoadPreset(name);
  return { success: result, name };
}

function startProxy() {
  try {
    execSync('ccr code', { stdio: 'pipe', timeout: 5000 });
    return { success: true };
  } catch (e) {
    return { success: false, error: 'Failed to start CCR. Is it installed?' };
  }
}

function stopProxy() {
  try {
    execSync('ccr stop', { stdio: 'pipe', timeout: 5000 });
    return { success: true };
  } catch (e) {
    return { success: false, error: 'Failed to stop CCR.' };
  }
}

module.exports = {
  getStatus, getConfig, saveConfig,
  getProviders, addProvider, removeProvider,
  getRules, setRule,
  getPresets, savePreset, loadPreset,
  startProxy, stopProxy,
};
```

- [ ] **Step 2: Register routes in ui/server.cjs**

Add `router: require('./routes/router')` to the routes imports at the top (around line 30 where other routes are required).

Add route cases in `handleAPI()` (after the loops section, around line 900):

```js
// Router (Claude Code Router)
case '/api/router/status':
  return this.json(res, routes.router.getStatus(this.manager));

case '/api/router/config':
  if (req.method === 'GET') return this.json(res, routes.router.getConfig(this.manager));
  if (req.method === 'PUT') return this.json(res, routes.router.saveConfig(this.manager, body));
  break;

case '/api/router/providers':
  if (req.method === 'GET') return this.json(res, routes.router.getProviders(this.manager));
  if (req.method === 'POST') return this.json(res, routes.router.addProvider(this.manager, body));
  if (req.method === 'DELETE') return this.json(res, routes.router.removeProvider(this.manager, query.name));
  break;

case '/api/router/rules':
  if (req.method === 'GET') return this.json(res, routes.router.getRules(this.manager));
  if (req.method === 'PUT') return this.json(res, routes.router.setRule(this.manager, body));
  break;

case '/api/router/presets':
  if (req.method === 'GET') return this.json(res, routes.router.getPresets(this.manager));
  if (req.method === 'POST') return this.json(res, routes.router.savePreset(this.manager, body));
  break;

case '/api/router/preset-load':
  if (req.method === 'POST') return this.json(res, routes.router.loadPreset(this.manager, body));
  break;

case '/api/router/start':
  if (req.method === 'POST') return this.json(res, routes.router.startProxy());
  break;

case '/api/router/stop':
  if (req.method === 'POST') return this.json(res, routes.router.stopProxy());
  break;
```

- [ ] **Step 3: Run all tests**

Run: `npm test`
Expected: All pass

- [ ] **Step 4: Commit**

```bash
git add ui/routes/router.js ui/server.cjs
git commit -m "feat(CC-9): add router API routes and server registration"
```

---

### Task 4: API client — ui/src/lib/api.js

**Files:**
- Modify: `ui/src/lib/api.js`

- [ ] **Step 1: Add router API methods**

Add after the existing `getInstructionHierarchy` method:

```js
// Router (Claude Code Router)
async getRouterStatus() {
  return request('/router/status');
},

async getRouterConfig() {
  return request('/router/config');
},

async saveRouterConfig(config) {
  return request('/router/config', { method: 'PUT', body: config });
},

async getRouterProviders() {
  return request('/router/providers');
},

async addRouterProvider(name, config) {
  return request('/router/providers', { method: 'POST', body: { name, config } });
},

async removeRouterProvider(name) {
  return request(`/router/providers?name=${encodeURIComponent(name)}`, { method: 'DELETE' });
},

async getRouterRules() {
  return request('/router/rules');
},

async setRouterRule(task, providerModel) {
  return request('/router/rules', { method: 'PUT', body: { task, providerModel } });
},

async getRouterPresets() {
  return request('/router/presets');
},

async saveRouterPreset(name) {
  return request('/router/presets', { method: 'POST', body: { name } });
},

async loadRouterPreset(name) {
  return request('/router/preset-load', { method: 'POST', body: { name } });
},

async startRouter() {
  return request('/router/start', { method: 'POST' });
},

async stopRouter() {
  return request('/router/stop', { method: 'POST' });
},
```

- [ ] **Step 2: Commit**

```bash
git add ui/src/lib/api.js
git commit -m "feat(CC-9): add router API client methods"
```

---

### Task 5: Web UI — RouterView.jsx

**Files:**
- Create: `ui/src/views/RouterView.jsx`
- Modify: `ui/src/views/index.js`
- Modify: `ui/src/pages/Dashboard.jsx`

- [ ] **Step 1: Create RouterView.jsx**

Create `ui/src/views/RouterView.jsx` with:
- Status bar (installed/running/start/stop/copy activation)
- Routing rules grid (6 task types with dropdowns)
- Providers list (collapsible, add/remove)
- Presets section (collapsed, save/load)

This is a large component. Follow the pattern of `ui/src/views/LoopsView.jsx` for structure (state management, API calls, toast notifications). Use shadcn/ui components: Card, Badge, Button, Select, Input, Collapsible, Dialog, Switch.

Key state:
```js
const [status, setStatus] = useState(null);
const [config, setConfig] = useState(null);
const [presets, setPresets] = useState([]);
const [loading, setLoading] = useState(true);
```

Key API calls on mount:
```js
useEffect(() => {
  Promise.all([
    api.getRouterStatus(),
    api.getRouterConfig(),
    api.getRouterPresets(),
  ]).then(([s, c, p]) => {
    setStatus(s);
    setConfig(c);
    setPresets(p.presets || []);
    setLoading(false);
  });
}, []);
```

The routing rules section should show 6 cards for: `default`, `background`, `think`, `longContext`, `webSearch`, `image`. Each has a Select dropdown populated from all `provider,model` combinations across all providers.

- [ ] **Step 2: Register in views/index.js**

Add export:
```js
export { default as RouterView } from './RouterView';
```

- [ ] **Step 3: Add sidebar entry in Dashboard.jsx**

Add to navItems array (in the Developer section, after loops):
```js
{ id: 'router', label: 'Code Router', icon: GitBranch, section: 'Developer' },
```

Add import for `RouterView` from views/index.js.

Add case in the view renderer switch:
```js
case 'router':
  return <RouterView />;
```

- [ ] **Step 4: Build and verify**

Run: `npm run build`
Expected: Clean build

- [ ] **Step 5: Commit**

```bash
git add ui/src/views/RouterView.jsx ui/src/views/index.js ui/src/pages/Dashboard.jsx
git commit -m "feat(CC-9): add Router Web UI view with status, rules, providers, presets"
```

---

### Task 6: Build, test, update docs

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `ROADMAP.md`

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: All pass (608+ tests including new router tests)

- [ ] **Step 2: Build UI**

Run: `npm run build`
Expected: Clean build

- [ ] **Step 3: Start server and verify UI**

Run: `npm start` then open `http://127.0.0.1:3333`
Navigate to Developer > Code Router
Verify: Status bar shows, rules grid renders, providers section works

- [ ] **Step 4: Update CHANGELOG.md**

Add under `[Unreleased]`:
```markdown
### Added

- **Claude Code Router integration (CC-9)** — Manage CCR proxy configuration and lifecycle
  - `lib/router.js` — CCR config read/write, provider CRUD, routing rules, presets, status detection
  - CLI: `coder-config router status/list/add-provider/remove-provider/set-rule/preset/start/stop/activate`
  - Web UI: Router view in Developer section with status bar, routing rules grid, provider management, presets
  - API: 13 endpoints under `/api/router/*`
  - Tests: `test/router.test.js` with full coverage
```

- [ ] **Step 5: Update ROADMAP.md**

Change CC-9 status from `PLANNED` to `COMPLETE` and mark all items.

- [ ] **Step 6: Commit and push**

```bash
git add -A
git commit -m "feat(CC-9): complete Claude Code Router integration"
```
