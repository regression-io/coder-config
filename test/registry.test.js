const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  registryList,
  registryAdd,
  registryRemove,
} = require('../lib/registry.js');
const { saveJson } = require('../lib/utils.js');

describe('registry', () => {
  let tempDir;
  let registryPath;
  let originalLog;
  let originalError;
  let logs;
  let errors;

  before(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'registry-test-'));
    originalLog = console.log;
    originalError = console.error;
  });

  after(() => {
    console.log = originalLog;
    console.error = originalError;
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    registryPath = path.join(tempDir, `registry-${Date.now()}-${Math.random()}.json`);
    logs = [];
    errors = [];
    console.log = (...args) => logs.push(args.join(' '));
    console.error = (...args) => errors.push(args.join(' '));
  });

  describe('registryList', () => {
    it('should list MCPs in registry', () => {
      saveJson(registryPath, {
        mcpServers: {
          github: { command: 'npx', args: ['-y', '@mcp/server-github'] },
          filesystem: { command: 'node', args: ['./server.js'] }
        }
      });

      const names = registryList(registryPath);

      assert.ok(logs.some(log => log.includes('github')));
      assert.ok(logs.some(log => log.includes('filesystem')));
      assert.ok(Array.isArray(names));
      assert.ok(names.includes('github'));
      assert.ok(names.includes('filesystem'));
    });

    it('should show command for each MCP', () => {
      saveJson(registryPath, {
        mcpServers: {
          github: { command: 'npx' },
          custom: { command: 'node' }
        }
      });

      registryList(registryPath);

      assert.ok(logs.some(log => log.includes('command: npx')));
      assert.ok(logs.some(log => log.includes('command: node')));
    });

    it('should sort MCPs alphabetically', () => {
      saveJson(registryPath, {
        mcpServers: {
          zebra: { command: 'z' },
          apple: { command: 'a' },
          middle: { command: 'm' }
        }
      });

      const names = registryList(registryPath);

      assert.deepStrictEqual(names, ['apple', 'middle', 'zebra']);
    });

    it('should handle empty registry', () => {
      saveJson(registryPath, { mcpServers: {} });

      const names = registryList(registryPath);

      assert.ok(logs.some(log => log.includes('No MCPs in global registry')));
      assert.deepStrictEqual(names, []);
    });

    it('should handle missing mcpServers field', () => {
      saveJson(registryPath, {});

      const names = registryList(registryPath);

      assert.ok(logs.some(log => log.includes('No MCPs')));
      assert.deepStrictEqual(names, []);
    });

    it('should handle non-existent registry file', () => {
      const nonExistentPath = path.join(tempDir, 'nonexistent.json');

      const names = registryList(nonExistentPath);

      assert.ok(logs.some(log => log.includes('No MCPs')));
      assert.deepStrictEqual(names, []);
    });

    it('should show usage hint when empty', () => {
      saveJson(registryPath, { mcpServers: {} });

      registryList(registryPath);

      assert.ok(logs.some(log => log.includes('coder-config registry add')));
    });
  });

  describe('registryAdd', () => {
    beforeEach(() => {
      saveJson(registryPath, { mcpServers: {} });
    });

    it('should add MCP to registry', () => {
      const config = JSON.stringify({ command: 'npx', args: ['-y', '@mcp/server-github'] });
      const result = registryAdd(registryPath, 'github', config);

      assert.strictEqual(result, true);

      const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
      assert.ok(registry.mcpServers.github);
      assert.strictEqual(registry.mcpServers.github.command, 'npx');
    });

    it('should parse JSON config correctly', () => {
      const config = JSON.stringify({
        command: 'node',
        args: ['server.js'],
        env: { PORT: '3000' }
      });

      registryAdd(registryPath, 'custom', config);

      const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
      assert.strictEqual(registry.mcpServers.custom.command, 'node');
      assert.deepStrictEqual(registry.mcpServers.custom.args, ['server.js']);
      assert.deepStrictEqual(registry.mcpServers.custom.env, { PORT: '3000' });
    });

    it('should create registry if it does not exist', () => {
      const newRegistryPath = path.join(tempDir, 'new-registry.json');
      const config = JSON.stringify({ command: 'test' });

      registryAdd(newRegistryPath, 'test-mcp', config);

      assert.ok(fs.existsSync(newRegistryPath));
      const registry = JSON.parse(fs.readFileSync(newRegistryPath, 'utf8'));
      assert.ok(registry.mcpServers['test-mcp']);
    });

    it('should overwrite existing MCP with same name', () => {
      const config1 = JSON.stringify({ command: 'old' });
      const config2 = JSON.stringify({ command: 'new' });

      registryAdd(registryPath, 'test', config1);
      registryAdd(registryPath, 'test', config2);

      const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
      assert.strictEqual(registry.mcpServers.test.command, 'new');
    });

    it('should preserve other MCPs when adding', () => {
      const config1 = JSON.stringify({ command: 'cmd1' });
      const config2 = JSON.stringify({ command: 'cmd2' });

      registryAdd(registryPath, 'mcp1', config1);
      registryAdd(registryPath, 'mcp2', config2);

      const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
      assert.ok(registry.mcpServers.mcp1);
      assert.ok(registry.mcpServers.mcp2);
    });

    it('should show success message', () => {
      const config = JSON.stringify({ command: 'test' });
      registryAdd(registryPath, 'test-mcp', config);

      assert.ok(logs.some(log => log.includes('✓ Added "test-mcp"')));
    });

    it('should show error when name not provided', () => {
      const result = registryAdd(registryPath, null, '{}');

      assert.strictEqual(result, false);
      assert.ok(errors.some(err => err.includes('Usage:')));
    });

    it('should show error when config not provided', () => {
      const result = registryAdd(registryPath, 'test', null);

      assert.strictEqual(result, false);
      assert.ok(errors.some(err => err.includes('Usage:')));
    });

    it('should show error for invalid JSON', () => {
      const result = registryAdd(registryPath, 'test', 'not valid json');

      assert.strictEqual(result, false);
      assert.ok(errors.some(err => err.includes('Invalid JSON')));
    });

    it('should handle complex JSON structures', () => {
      const config = JSON.stringify({
        command: 'docker',
        args: ['run', '-p', '3000:3000'],
        env: {
          NODE_ENV: 'production',
          DATABASE_URL: 'postgres://localhost'
        }
      });

      const result = registryAdd(registryPath, 'docker-mcp', config);

      assert.strictEqual(result, true);
      const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
      assert.deepStrictEqual(registry.mcpServers['docker-mcp'].args, ['run', '-p', '3000:3000']);
    });
  });

  describe('registryRemove', () => {
    beforeEach(() => {
      saveJson(registryPath, {
        mcpServers: {
          github: { command: 'npx' },
          filesystem: { command: 'node' },
          postgres: { command: 'docker' }
        }
      });
    });

    it('should remove MCP from registry', () => {
      const result = registryRemove(registryPath, 'github');

      assert.strictEqual(result, true);

      const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
      assert.ok(!registry.mcpServers.github);
      assert.ok(registry.mcpServers.filesystem);
      assert.ok(registry.mcpServers.postgres);
    });

    it('should preserve other MCPs when removing', () => {
      registryRemove(registryPath, 'filesystem');

      const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
      assert.ok(registry.mcpServers.github);
      assert.ok(!registry.mcpServers.filesystem);
      assert.ok(registry.mcpServers.postgres);
    });

    it('should show success message', () => {
      registryRemove(registryPath, 'github');

      assert.ok(logs.some(log => log.includes('✓ Removed "github"')));
    });

    it('should show error when name not provided', () => {
      const result = registryRemove(registryPath, null);

      assert.strictEqual(result, false);
      assert.ok(errors.some(err => err.includes('Usage:')));
    });

    it('should show error when MCP not found', () => {
      const result = registryRemove(registryPath, 'nonexistent');

      assert.strictEqual(result, false);
      assert.ok(errors.some(err => err.includes('not found in registry')));
    });

    it('should handle registry with no mcpServers field', () => {
      saveJson(registryPath, {});

      const result = registryRemove(registryPath, 'test');

      assert.strictEqual(result, false);
      assert.ok(errors.some(err => err.includes('not found')));
    });

    it('should handle non-existent registry file', () => {
      const nonExistentPath = path.join(tempDir, 'nonexistent.json');

      const result = registryRemove(nonExistentPath, 'test');

      assert.strictEqual(result, false);
    });
  });

  describe('registry integration', () => {
    beforeEach(() => {
      saveJson(registryPath, { mcpServers: {} });
    });

    it('should add, list, and remove MCPs', () => {
      // Add
      const config = JSON.stringify({ command: 'test' });
      registryAdd(registryPath, 'test-mcp', config);

      // List
      const names = registryList(registryPath);
      assert.ok(names.includes('test-mcp'));

      // Remove
      registryRemove(registryPath, 'test-mcp');

      // List again
      const namesAfter = registryList(registryPath);
      assert.ok(!namesAfter.includes('test-mcp'));
    });

    it('should handle multiple add and remove operations', () => {
      const configs = ['cmd1', 'cmd2', 'cmd3'].map(cmd =>
        JSON.stringify({ command: cmd })
      );

      registryAdd(registryPath, 'mcp1', configs[0]);
      registryAdd(registryPath, 'mcp2', configs[1]);
      registryAdd(registryPath, 'mcp3', configs[2]);

      let names = registryList(registryPath);
      assert.strictEqual(names.length, 3);

      registryRemove(registryPath, 'mcp2');

      names = registryList(registryPath);
      assert.strictEqual(names.length, 2);
      assert.ok(!names.includes('mcp2'));
    });
  });
});
