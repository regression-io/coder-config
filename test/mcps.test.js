const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { add, remove } = require('../lib/mcps.js');
const { saveJson } = require('../lib/utils.js');

describe('mcps', () => {
  let tempDir;
  let projectDir;
  let registryPath;
  let originalCwd;
  let originalLog;
  let originalError;
  let logs;
  let errors;

  before(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcps-test-'));
    projectDir = path.join(tempDir, 'project');
    registryPath = path.join(tempDir, 'registry.json');

    // Create project structure
    fs.mkdirSync(path.join(projectDir, '.claude'), { recursive: true });

    // Create mock registry
    const registry = {
      mcpServers: {
        github: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-github'] },
        filesystem: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem'] },
        postgres: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-postgres'] },
      }
    };
    saveJson(registryPath, registry);

    // Save original cwd and console methods
    originalCwd = process.cwd();
    originalLog = console.log;
    originalError = console.error;
  });

  after(() => {
    process.chdir(originalCwd);
    console.log = originalLog;
    console.error = originalError;
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    // Reset logs and errors
    logs = [];
    errors = [];
    console.log = (...args) => logs.push(args.join(' '));
    console.error = (...args) => errors.push(args.join(' '));

    // Change to project directory
    process.chdir(projectDir);

    // Reset project config
    const configPath = path.join(projectDir, '.claude', 'mcps.json');
    saveJson(configPath, { include: [] });
  });

  describe('add', () => {
    it('should add a single MCP to project', () => {
      const result = add(registryPath, tempDir, ['github']);

      assert.strictEqual(result, true);
      assert.ok(logs.some(log => log.includes('✓ Added: github')));

      const config = JSON.parse(
        fs.readFileSync(path.join(projectDir, '.claude', 'mcps.json'), 'utf8')
      );
      assert.ok(config.include.includes('github'));
    });

    it('should add multiple MCPs at once', () => {
      const result = add(registryPath, tempDir, ['github', 'filesystem']);

      assert.strictEqual(result, true);
      assert.ok(logs.some(log => log.includes('✓ Added: github, filesystem')));

      const config = JSON.parse(
        fs.readFileSync(path.join(projectDir, '.claude', 'mcps.json'), 'utf8')
      );
      assert.ok(config.include.includes('github'));
      assert.ok(config.include.includes('filesystem'));
    });

    it('should handle MCP that does not exist in registry', () => {
      const result = add(registryPath, tempDir, ['nonexistent']);

      assert.strictEqual(result, false);
      assert.ok(logs.some(log => log.includes('Not in registry: nonexistent')));
    });

    it('should handle MCP that is already included', () => {
      // Add github first
      add(registryPath, tempDir, ['github']);

      // Try to add again
      const result = add(registryPath, tempDir, ['github']);

      assert.strictEqual(result, false);
      assert.ok(logs.some(log => log.includes('Already included: github')));
    });

    it('should handle mixed valid, invalid, and duplicate MCPs', () => {
      // Add github first
      add(registryPath, tempDir, ['github']);

      // Try to add mix
      logs = [];
      const result = add(registryPath, tempDir, ['github', 'filesystem', 'invalid']);

      assert.strictEqual(result, true); // filesystem was added
      assert.ok(logs.some(log => log.includes('✓ Added: filesystem')));
      assert.ok(logs.some(log => log.includes('Already included: github')));
      assert.ok(logs.some(log => log.includes('Not in registry: invalid')));
    });

    it('should return false when no MCPs provided', () => {
      const result = add(registryPath, tempDir, []);

      assert.strictEqual(result, false);
      assert.ok(errors.some(err => err.includes('Usage:')));
    });

    it('should return false when no config file exists', () => {
      // Remove config
      fs.unlinkSync(path.join(projectDir, '.claude', 'mcps.json'));

      const result = add(registryPath, tempDir, ['github']);

      assert.strictEqual(result, false);
      assert.ok(errors.some(err => err.includes('No .claude/mcps.json found')));
    });

    it('should initialize include array if missing', () => {
      // Create config without include array
      saveJson(path.join(projectDir, '.claude', 'mcps.json'), {});

      const result = add(registryPath, tempDir, ['github']);

      assert.strictEqual(result, true);
      const config = JSON.parse(
        fs.readFileSync(path.join(projectDir, '.claude', 'mcps.json'), 'utf8')
      );
      assert.ok(Array.isArray(config.include));
      assert.ok(config.include.includes('github'));
    });
  });

  describe('remove', () => {
    beforeEach(() => {
      // Pre-populate config with some MCPs
      const configPath = path.join(projectDir, '.claude', 'mcps.json');
      saveJson(configPath, { include: ['github', 'filesystem', 'postgres'] });
    });

    it('should remove a single MCP from project', () => {
      const result = remove(tempDir, ['github']);

      assert.strictEqual(result, true);
      assert.ok(logs.some(log => log.includes('✓ Removed: github')));

      const config = JSON.parse(
        fs.readFileSync(path.join(projectDir, '.claude', 'mcps.json'), 'utf8')
      );
      assert.ok(!config.include.includes('github'));
      assert.ok(config.include.includes('filesystem'));
      assert.ok(config.include.includes('postgres'));
    });

    it('should remove multiple MCPs at once', () => {
      const result = remove(tempDir, ['github', 'filesystem']);

      assert.strictEqual(result, true);
      assert.ok(logs.some(log => log.includes('✓ Removed: github, filesystem')));

      const config = JSON.parse(
        fs.readFileSync(path.join(projectDir, '.claude', 'mcps.json'), 'utf8')
      );
      assert.ok(!config.include.includes('github'));
      assert.ok(!config.include.includes('filesystem'));
      assert.ok(config.include.includes('postgres'));
    });

    it('should handle MCP that is not in project', () => {
      const result = remove(tempDir, ['nonexistent']);

      assert.strictEqual(result, false);
      assert.ok(logs.some(log => log.includes('Not in project: nonexistent')));
    });

    it('should handle mixed valid and invalid MCPs', () => {
      const result = remove(tempDir, ['github', 'nonexistent']);

      assert.strictEqual(result, true); // github was removed
      assert.ok(logs.some(log => log.includes('✓ Removed: github')));
      assert.ok(logs.some(log => log.includes('Not in project: nonexistent')));

      const config = JSON.parse(
        fs.readFileSync(path.join(projectDir, '.claude', 'mcps.json'), 'utf8')
      );
      assert.ok(!config.include.includes('github'));
    });

    it('should return false when no MCPs provided', () => {
      const result = remove(tempDir, []);

      assert.strictEqual(result, false);
      assert.ok(errors.some(err => err.includes('Usage:')));
    });

    it('should return false when no config file exists', () => {
      // Remove config
      fs.unlinkSync(path.join(projectDir, '.claude', 'mcps.json'));

      const result = remove(tempDir, ['github']);

      assert.strictEqual(result, false);
      assert.ok(errors.some(err => err.includes('No .claude/mcps.json found')));
    });

    it('should handle config without include array', () => {
      // Create config without include array
      saveJson(path.join(projectDir, '.claude', 'mcps.json'), {});

      const result = remove(tempDir, ['github']);

      assert.strictEqual(result, false);
      assert.ok(logs.some(log => log.includes('Not in project: github')));
    });
  });

  describe('Integration tests', () => {
    it('should handle rapid add/remove cycles', () => {
      const mcps = ['github', 'filesystem', 'postgres'];

      // Add all
      for (let i = 0; i < 10; i++) {
        add(registryPath, tempDir, mcps);
        remove(tempDir, [mcps[i % mcps.length]]);
      }

      const config = JSON.parse(
        fs.readFileSync(path.join(projectDir, '.claude', 'mcps.json'), 'utf8')
      );

      // At least one MCP should remain
      assert.ok(config.include.length >= 1);
    });

    it('should handle adding all registry MCPs', () => {
      const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
      const allMcps = Object.keys(registry.mcpServers);

      const result = add(registryPath, tempDir, allMcps);

      assert.strictEqual(result, true);
      const config = JSON.parse(
        fs.readFileSync(path.join(projectDir, '.claude', 'mcps.json'), 'utf8')
      );
      assert.strictEqual(config.include.length, allMcps.length);
    });

    it('should handle removing all MCPs', () => {
      // Add all first
      add(registryPath, tempDir, ['github', 'filesystem', 'postgres']);

      // Remove all
      const result = remove(tempDir, ['github', 'filesystem', 'postgres']);

      assert.strictEqual(result, true);
      const config = JSON.parse(
        fs.readFileSync(path.join(projectDir, '.claude', 'mcps.json'), 'utf8')
      );
      assert.strictEqual(config.include.length, 0);
    });

    it('should preserve custom mcpServers when adding/removing', () => {
      // Add custom MCP server
      const configPath = path.join(projectDir, '.claude', 'mcps.json');
      saveJson(configPath, {
        include: [],
        mcpServers: {
          custom: { command: 'node', args: ['server.js'] }
        }
      });

      // Add from registry
      add(registryPath, tempDir, ['github']);

      // Remove from registry
      remove(tempDir, ['github']);

      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

      // Custom MCP should still be there
      assert.ok(config.mcpServers);
      assert.ok(config.mcpServers.custom);
    });

    it('should handle complex add/remove workflow', () => {
      // Step 1: Add github and filesystem
      add(registryPath, tempDir, ['github', 'filesystem']);

      // Step 2: Remove github
      remove(tempDir, ['github']);

      // Step 3: Add postgres
      add(registryPath, tempDir, ['postgres']);

      // Step 4: Try to add github again
      add(registryPath, tempDir, ['github']);

      const config = JSON.parse(
        fs.readFileSync(path.join(projectDir, '.claude', 'mcps.json'), 'utf8')
      );

      // Should have filesystem, postgres, and github
      assert.ok(config.include.includes('filesystem'));
      assert.ok(config.include.includes('postgres'));
      assert.ok(config.include.includes('github'));
      assert.strictEqual(config.include.length, 3);
    });

    it('should handle adding MCPs with registry not found', () => {
      const badRegistry = path.join(tempDir, 'nonexistent-registry.json');

      const result = add(badRegistry, tempDir, ['github']);

      assert.strictEqual(result, false);
    });

    it('should handle corrupted registry', () => {
      // Create corrupted registry
      const badRegistry = path.join(tempDir, 'bad-registry.json');
      fs.writeFileSync(badRegistry, '{invalid json');

      const result = add(badRegistry, tempDir, ['github']);

      assert.strictEqual(result, false);
    });

    it('should handle MCP names with special characters', () => {
      // Add special MCP to registry
      const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
      registry.mcpServers['my-special-mcp'] = { command: 'node' };
      registry.mcpServers['mcp_with_underscores'] = { command: 'node' };
      registry.mcpServers['mcp.with.dots'] = { command: 'node' };
      saveJson(registryPath, registry);

      const result = add(registryPath, tempDir, [
        'my-special-mcp',
        'mcp_with_underscores',
        'mcp.with.dots'
      ]);

      assert.strictEqual(result, true);
      const config = JSON.parse(
        fs.readFileSync(path.join(projectDir, '.claude', 'mcps.json'), 'utf8')
      );
      assert.ok(config.include.includes('my-special-mcp'));
      assert.ok(config.include.includes('mcp_with_underscores'));
      assert.ok(config.include.includes('mcp.with.dots'));
    });

    it('should handle very long MCP names', () => {
      const longName = 'a'.repeat(200);
      const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
      registry.mcpServers[longName] = { command: 'node' };
      saveJson(registryPath, registry);

      const result = add(registryPath, tempDir, [longName]);

      assert.strictEqual(result, true);
      const config = JSON.parse(
        fs.readFileSync(path.join(projectDir, '.claude', 'mcps.json'), 'utf8')
      );
      assert.ok(config.include.includes(longName));
    });

    it('should handle concurrent add/remove operations', () => {
      // Simulate concurrent operations
      for (let i = 0; i < 20; i++) {
        if (i % 2 === 0) {
          add(registryPath, tempDir, ['github']);
        } else {
          remove(tempDir, ['github']);
        }
      }

      const config = JSON.parse(
        fs.readFileSync(path.join(projectDir, '.claude', 'mcps.json'), 'utf8')
      );

      // Config should still be valid
      assert.ok(Array.isArray(config.include));
    });

    it('should maintain include array order', () => {
      add(registryPath, tempDir, ['github']);
      add(registryPath, tempDir, ['filesystem']);
      add(registryPath, tempDir, ['postgres']);

      const config = JSON.parse(
        fs.readFileSync(path.join(projectDir, '.claude', 'mcps.json'), 'utf8')
      );

      const idx1 = config.include.indexOf('github');
      const idx2 = config.include.indexOf('filesystem');
      const idx3 = config.include.indexOf('postgres');

      // Should be in order of addition
      assert.ok(idx1 < idx2);
      assert.ok(idx2 < idx3);
    });

    it('should handle large registry with many MCPs', () => {
      // Create registry with 100 MCPs
      const registry = { mcpServers: {} };
      for (let i = 0; i < 100; i++) {
        registry.mcpServers[`mcp${i}`] = { command: 'node' };
      }
      const largeRegistry = path.join(tempDir, 'large-registry.json');
      saveJson(largeRegistry, registry);

      // Add first 50
      const mcpsToAdd = [];
      for (let i = 0; i < 50; i++) {
        mcpsToAdd.push(`mcp${i}`);
      }

      const result = add(largeRegistry, tempDir, mcpsToAdd);

      assert.strictEqual(result, true);
      const config = JSON.parse(
        fs.readFileSync(path.join(projectDir, '.claude', 'mcps.json'), 'utf8')
      );
      assert.strictEqual(config.include.length, 50);
    });

    it('should handle empty registry', () => {
      const emptyRegistry = path.join(tempDir, 'empty-registry.json');
      saveJson(emptyRegistry, { mcpServers: {} });

      const result = add(emptyRegistry, tempDir, ['github']);

      assert.strictEqual(result, false);
      assert.ok(logs.some(log => log.includes('Not in registry: github')));
    });

    it('should preserve other config fields', () => {
      // Add extra config fields
      const configPath = path.join(projectDir, '.claude', 'mcps.json');
      saveJson(configPath, {
        include: [],
        env: { API_KEY: 'secret' },
        permissions: { allowedCommands: ['git'] }
      });

      add(registryPath, tempDir, ['github']);

      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

      // Extra fields should be preserved
      assert.ok(config.env);
      assert.strictEqual(config.env.API_KEY, 'secret');
      assert.ok(config.permissions);
      assert.ok(config.permissions.allowedCommands);
    });
  });
});
