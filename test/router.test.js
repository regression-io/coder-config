const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  getConfigPath,
  getConfig,
  saveConfig,
  listProviders,
  addProvider,
  removeProvider,
  getRouterRules,
  setRouterRule,
  getActivationEnv,
  getStatus,
  listPresets,
  savePreset,
  loadPreset,
} = require('../lib/router.js');

describe('router', () => {
  let tempDir;
  let originalHome;

  before(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'router-test-'));
    originalHome = process.env.HOME;
  });

  after(() => {
    process.env.HOME = originalHome;
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    // Fresh HOME for each test
    const testHome = fs.mkdtempSync(path.join(tempDir, 'home-'));
    process.env.HOME = testHome;
  });

  describe('getConfigPath', () => {
    it('should return path under ~/.claude-code-router/', () => {
      const p = getConfigPath();
      assert.strictEqual(p, path.join(process.env.HOME, '.claude-code-router', 'config.json'));
    });
  });

  describe('getConfig', () => {
    it('should return empty object when config does not exist', () => {
      const config = getConfig();
      assert.deepStrictEqual(config, {});
    });

    it('should return parsed config when file exists', () => {
      const configDir = path.join(process.env.HOME, '.claude-code-router');
      fs.mkdirSync(configDir, { recursive: true });
      const data = { APIKEY: 'test-key', Providers: [] };
      fs.writeFileSync(path.join(configDir, 'config.json'), JSON.stringify(data));
      const config = getConfig();
      assert.deepStrictEqual(config, data);
    });

    it('should return empty object for invalid JSON', () => {
      const configDir = path.join(process.env.HOME, '.claude-code-router');
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(path.join(configDir, 'config.json'), 'not-json{');
      const config = getConfig();
      assert.deepStrictEqual(config, {});
    });
  });

  describe('saveConfig', () => {
    it('should create directory and write config', () => {
      const config = { APIKEY: 'abc', LOG: true };
      saveConfig(config);
      const written = JSON.parse(fs.readFileSync(getConfigPath(), 'utf8'));
      assert.deepStrictEqual(written, config);
    });

    it('should preserve all fields', () => {
      const config = {
        APIKEY: 'key',
        HOST: '127.0.0.1',
        LOG: false,
        Providers: [{ name: 'p1' }],
        Router: { default: 'p1,model' },
        customField: 'preserved',
      };
      saveConfig(config);
      const written = JSON.parse(fs.readFileSync(getConfigPath(), 'utf8'));
      assert.deepStrictEqual(written, config);
    });

    it('should overwrite existing config', () => {
      saveConfig({ a: 1 });
      saveConfig({ b: 2 });
      const written = JSON.parse(fs.readFileSync(getConfigPath(), 'utf8'));
      assert.deepStrictEqual(written, { b: 2 });
    });
  });

  describe('listProviders', () => {
    it('should return empty array when no config', () => {
      assert.deepStrictEqual(listProviders(), []);
    });

    it('should return empty array when no Providers key', () => {
      saveConfig({ APIKEY: 'x' });
      assert.deepStrictEqual(listProviders(), []);
    });

    it('should return providers array', () => {
      const providers = [
        { name: 'openrouter', api_base_url: 'https://example.com' },
        { name: 'local', api_base_url: 'http://localhost:8080' },
      ];
      saveConfig({ Providers: providers });
      assert.deepStrictEqual(listProviders(), providers);
    });
  });

  describe('addProvider', () => {
    it('should add provider to empty config', () => {
      const providerConfig = { api_base_url: 'https://example.com', models: ['model-a'] };
      addProvider('newprovider', providerConfig);
      const providers = listProviders();
      assert.strictEqual(providers.length, 1);
      assert.strictEqual(providers[0].name, 'newprovider');
      assert.strictEqual(providers[0].api_base_url, 'https://example.com');
    });

    it('should replace existing provider by name', () => {
      addProvider('p1', { api_base_url: 'https://old.com' });
      addProvider('p1', { api_base_url: 'https://new.com' });
      const providers = listProviders();
      assert.strictEqual(providers.length, 1);
      assert.strictEqual(providers[0].api_base_url, 'https://new.com');
    });

    it('should preserve other providers when adding', () => {
      addProvider('p1', { api_base_url: 'https://one.com' });
      addProvider('p2', { api_base_url: 'https://two.com' });
      const providers = listProviders();
      assert.strictEqual(providers.length, 2);
    });

    it('should preserve non-Providers config fields', () => {
      saveConfig({ APIKEY: 'mykey', LOG: true });
      addProvider('p1', { api_base_url: 'https://one.com' });
      const config = getConfig();
      assert.strictEqual(config.APIKEY, 'mykey');
      assert.strictEqual(config.LOG, true);
    });
  });

  describe('removeProvider', () => {
    it('should remove provider by name', () => {
      addProvider('p1', { api_base_url: 'https://one.com' });
      addProvider('p2', { api_base_url: 'https://two.com' });
      removeProvider('p1');
      const providers = listProviders();
      assert.strictEqual(providers.length, 1);
      assert.strictEqual(providers[0].name, 'p2');
    });

    it('should be no-op when provider does not exist', () => {
      addProvider('p1', { api_base_url: 'https://one.com' });
      removeProvider('nonexistent');
      assert.strictEqual(listProviders().length, 1);
    });

    it('should handle empty config gracefully', () => {
      removeProvider('anything');
      assert.deepStrictEqual(listProviders(), []);
    });
  });

  describe('getRouterRules', () => {
    it('should return empty object when no config', () => {
      assert.deepStrictEqual(getRouterRules(), {});
    });

    it('should return Router object', () => {
      const router = { default: 'p1,model-a', background: 'p2,model-b' };
      saveConfig({ Router: router });
      assert.deepStrictEqual(getRouterRules(), router);
    });
  });

  describe('setRouterRule', () => {
    it('should set a router rule on empty config', () => {
      setRouterRule('default', 'openrouter,claude-sonnet-4');
      const rules = getRouterRules();
      assert.strictEqual(rules.default, 'openrouter,claude-sonnet-4');
    });

    it('should update existing rule', () => {
      setRouterRule('default', 'p1,model-a');
      setRouterRule('default', 'p2,model-b');
      assert.strictEqual(getRouterRules().default, 'p2,model-b');
    });

    it('should preserve other rules', () => {
      setRouterRule('default', 'p1,model-a');
      setRouterRule('background', 'p2,model-b');
      const rules = getRouterRules();
      assert.strictEqual(rules.default, 'p1,model-a');
      assert.strictEqual(rules.background, 'p2,model-b');
    });

    it('should preserve non-Router config fields', () => {
      saveConfig({ APIKEY: 'key', Providers: [{ name: 'p1' }] });
      setRouterRule('think', 'p1,model');
      const config = getConfig();
      assert.strictEqual(config.APIKEY, 'key');
      assert.strictEqual(config.Providers.length, 1);
    });
  });

  describe('getActivationEnv', () => {
    it('should return env with correct base URL and defaults', () => {
      const env = getActivationEnv();
      assert.strictEqual(env.ANTHROPIC_BASE_URL, 'http://127.0.0.1:3456');
      assert.strictEqual(env.NO_PROXY, '127.0.0.1');
      assert.strictEqual(env.DISABLE_TELEMETRY, '1');
      assert.strictEqual(env.DISABLE_COST_WARNINGS, '1');
    });

    it('should use APIKEY from config for auth token', () => {
      saveConfig({ APIKEY: 'my-secret-key' });
      const env = getActivationEnv();
      assert.strictEqual(env.ANTHROPIC_AUTH_TOKEN, 'my-secret-key');
    });

    it('should return empty string for auth token when no APIKEY', () => {
      const env = getActivationEnv();
      assert.strictEqual(env.ANTHROPIC_AUTH_TOKEN, '');
    });
  });

  describe('getStatus', () => {
    it('should return status object with expected keys', () => {
      const status = getStatus();
      assert.ok('installed' in status);
      assert.ok('running' in status);
      assert.ok('configExists' in status);
    });

    it('should report installed=false when ccr not on PATH', () => {
      const status = getStatus();
      assert.strictEqual(status.installed, false);
    });

    it('should report configExists based on config file', () => {
      let status = getStatus();
      assert.strictEqual(status.configExists, false);

      saveConfig({ APIKEY: 'test' });
      status = getStatus();
      assert.strictEqual(status.configExists, true);
    });
  });

  describe('listPresets', () => {
    it('should return empty array when preset dir does not exist', () => {
      assert.deepStrictEqual(listPresets(), []);
    });

    it('should list only .json files', () => {
      const presetDir = path.join(process.env.HOME, '.claude-code-router', 'coder-config-presets');
      fs.mkdirSync(presetDir, { recursive: true });
      fs.writeFileSync(path.join(presetDir, 'default.json'), '{}');
      fs.writeFileSync(path.join(presetDir, 'fast.json'), '{}');
      fs.writeFileSync(path.join(presetDir, 'readme.txt'), 'ignore me');
      const presets = listPresets();
      assert.strictEqual(presets.length, 2);
      assert.ok(presets.includes('default'));
      assert.ok(presets.includes('fast'));
    });
  });

  describe('savePreset', () => {
    it('should snapshot current config to preset file', () => {
      const config = { APIKEY: 'key', Providers: [{ name: 'p1' }], Router: { default: 'p1,m' } };
      saveConfig(config);
      savePreset('mypreset');
      const presetDir = path.join(process.env.HOME, '.claude-code-router', 'coder-config-presets');
      const saved = JSON.parse(fs.readFileSync(path.join(presetDir, 'mypreset.json'), 'utf8'));
      assert.deepStrictEqual(saved, config);
    });

    it('should create preset dir if needed', () => {
      saveConfig({ test: true });
      savePreset('first');
      const presetDir = path.join(process.env.HOME, '.claude-code-router', 'coder-config-presets');
      assert.ok(fs.existsSync(presetDir));
    });

    it('should overwrite existing preset', () => {
      saveConfig({ v: 1 });
      savePreset('p');
      saveConfig({ v: 2 });
      savePreset('p');
      const presetDir = path.join(process.env.HOME, '.claude-code-router', 'coder-config-presets');
      const saved = JSON.parse(fs.readFileSync(path.join(presetDir, 'p.json'), 'utf8'));
      assert.deepStrictEqual(saved, { v: 2 });
    });
  });

  describe('loadPreset', () => {
    it('should restore config from preset', () => {
      const original = { APIKEY: 'preset-key', Providers: [{ name: 'or' }] };
      saveConfig(original);
      savePreset('backup');

      // Change config
      saveConfig({ APIKEY: 'changed' });
      assert.strictEqual(getConfig().APIKEY, 'changed');

      // Restore
      loadPreset('backup');
      assert.deepStrictEqual(getConfig(), original);
    });

    it('should throw or return false for missing preset', () => {
      assert.throws(() => loadPreset('nonexistent'), /not found|does not exist|ENOENT/i);
    });
  });
});
