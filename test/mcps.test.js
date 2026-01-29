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
});
