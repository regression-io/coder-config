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

    it('should handle rapid add/update/remove cycles', () => {
      for (let i = 0; i < 20; i++) {
        const config = JSON.stringify({ command: `cmd${i}` });
        registryAdd(registryPath, `mcp${i}`, config);

        if (i % 2 === 0) {
          // Update even numbered
          const newConfig = JSON.stringify({ command: `updated${i}` });
          registryAdd(registryPath, `mcp${i}`, newConfig);
        }

        if (i % 3 === 0) {
          // Remove every third
          registryRemove(registryPath, `mcp${i}`);
        }
      }

      const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
      const mcpCount = Object.keys(registry.mcpServers).length;

      // Should have some MCPs left (those not divisible by 3)
      assert.ok(mcpCount > 0);
      assert.ok(mcpCount < 20);
    });

    it('should handle MCP names with special characters', () => {
      const specialNames = [
        'mcp-with-dashes',
        'mcp_with_underscores',
        'mcp.with.dots',
        'mcp@version',
        'mcp:type'
      ];

      for (const name of specialNames) {
        const config = JSON.stringify({ command: 'test' });
        registryAdd(registryPath, name, config);
      }

      const names = registryList(registryPath);
      for (const name of specialNames) {
        assert.ok(names.includes(name));
      }
    });

    it('should handle very long MCP names', () => {
      const longName = 'mcp-' + 'a'.repeat(200);
      const config = JSON.stringify({ command: 'test' });

      registryAdd(registryPath, longName, config);

      const names = registryList(registryPath);
      assert.ok(names.includes(longName));
    });

    it('should handle MCP with complex nested config', () => {
      const complexConfig = JSON.stringify({
        command: 'docker',
        args: ['run', '-it', '--rm'],
        env: {
          NESTED: {
            DEEP: {
              VALUE: 'test'
            }
          },
          ARRAY: ['a', 'b', 'c']
        },
        options: {
          timeout: 5000,
          retries: 3
        }
      });

      registryAdd(registryPath, 'complex-mcp', complexConfig);

      const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
      assert.deepStrictEqual(registry.mcpServers['complex-mcp'].env.NESTED.DEEP.VALUE, 'test');
    });

    it('should handle overwriting MCP multiple times', () => {
      for (let i = 0; i < 10; i++) {
        const config = JSON.stringify({ command: `version${i}` });
        registryAdd(registryPath, 'evolving-mcp', config);
      }

      const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
      assert.strictEqual(registry.mcpServers['evolving-mcp'].command, 'version9');
    });

    it('should handle registry with many MCPs', () => {
      for (let i = 0; i < 100; i++) {
        const config = JSON.stringify({ command: `cmd${i}` });
        registryAdd(registryPath, `mcp${i}`, config);
      }

      const names = registryList(registryPath);
      assert.strictEqual(names.length, 100);
    });

    it('should handle removing all MCPs', () => {
      // Add several
      for (let i = 0; i < 5; i++) {
        const config = JSON.stringify({ command: `cmd${i}` });
        registryAdd(registryPath, `mcp${i}`, config);
      }

      // Remove all
      for (let i = 0; i < 5; i++) {
        registryRemove(registryPath, `mcp${i}`);
      }

      const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
      assert.strictEqual(Object.keys(registry.mcpServers).length, 0);
    });

    it('should handle add after corrupted registry recovery', () => {
      // Corrupt registry
      fs.writeFileSync(registryPath, '{invalid');

      // Try to add (should fail or recover)
      const config = JSON.stringify({ command: 'test' });
      const result = registryAdd(registryPath, 'new-mcp', config);

      // Either succeeded after recovery or failed gracefully
      assert.ok(typeof result === 'boolean');
    });

    it('should handle removal from middle of list', () => {
      const order = ['alpha', 'beta', 'gamma', 'delta'];

      for (const name of order) {
        const config = JSON.stringify({ command: name });
        registryAdd(registryPath, name, config);
      }

      registryRemove(registryPath, 'beta');

      const names = registryList(registryPath);

      // Beta should be gone
      assert.ok(!names.includes('beta'));

      // Others should be present
      assert.ok(names.includes('alpha'));
      assert.ok(names.includes('gamma'));
      assert.ok(names.includes('delta'));

      assert.strictEqual(names.length, 3);
    });

    it('should handle MCP config with null values', () => {
      const configWithNull = JSON.stringify({
        command: 'test',
        args: null,
        env: {
          VAR: null
        }
      });

      registryAdd(registryPath, 'null-mcp', configWithNull);

      const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
      assert.ok(registry.mcpServers['null-mcp']);
    });

    it('should handle empty MCP config object', () => {
      const emptyConfig = JSON.stringify({});

      registryAdd(registryPath, 'empty-mcp', emptyConfig);

      const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
      assert.ok(registry.mcpServers['empty-mcp']);
    });

    it('should handle concurrent-like operations', () => {
      // Simulate rapid concurrent operations
      const operations = [];

      for (let i = 0; i < 20; i++) {
        const config = JSON.stringify({ command: `cmd${i}` });
        registryAdd(registryPath, `concurrent${i}`, config);
      }

      const names = registryList(registryPath);
      assert.strictEqual(names.length, 20);

      // All should be present
      for (let i = 0; i < 20; i++) {
        assert.ok(names.includes(`concurrent${i}`));
      }
    });

    it('should handle MCP names that are JavaScript keywords', () => {
      const keywords = ['function', 'class', 'const', 'let', 'var'];

      for (const keyword of keywords) {
        const config = JSON.stringify({ command: 'test' });
        registryAdd(registryPath, keyword, config);
      }

      const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
      for (const keyword of keywords) {
        assert.ok(registry.mcpServers[keyword]);
      }
    });
  });
});
