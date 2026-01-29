const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { init } = require('../lib/init.js');
const { saveJson } = require('../lib/utils.js');

describe('init', () => {
  let tempDir;
  let projectDir;
  let registryPath;
  let originalLog;
  let logs;

  before(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'init-test-'));
    registryPath = path.join(tempDir, 'registry.json');

    // Create mock registry
    saveJson(registryPath, {
      mcpServers: {
        github: { command: 'npx', args: ['-y', '@mcp/server-github'] },
        filesystem: { command: 'npx', args: ['-y', '@mcp/server-filesystem'] }
      }
    });

    originalLog = console.log;
  });

  after(() => {
    console.log = originalLog;
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    projectDir = path.join(tempDir, `project-${Date.now()}-${Math.random()}`);
    fs.mkdirSync(projectDir, { recursive: true });

    logs = [];
    console.log = (...args) => logs.push(args.join(' '));
  });

  describe('init', () => {
    it('should create .claude directory', () => {
      init(registryPath, projectDir);

      const claudeDir = path.join(projectDir, '.claude');
      assert.ok(fs.existsSync(claudeDir));
    });

    it('should create mcps.json with default config', () => {
      init(registryPath, projectDir);

      const configPath = path.join(projectDir, '.claude', 'mcps.json');
      assert.ok(fs.existsSync(configPath));

      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      assert.ok(Array.isArray(config.include));
      assert.ok(config.include.includes('github'));
      assert.ok(config.include.includes('filesystem'));
      assert.ok(typeof config.mcpServers === 'object');
    });

    it('should create .env file with template', () => {
      init(registryPath, projectDir);

      const envPath = path.join(projectDir, '.claude', '.env');
      assert.ok(fs.existsSync(envPath));

      const content = fs.readFileSync(envPath, 'utf8');
      assert.ok(content.includes('# Project secrets'));
      assert.ok(content.includes('GITHUB_TOKEN'));
      assert.ok(content.includes('DATABASE_URL'));
    });

    it('should not overwrite existing mcps.json', () => {
      // Create existing config
      const claudeDir = path.join(projectDir, '.claude');
      fs.mkdirSync(claudeDir, { recursive: true });
      const configPath = path.join(claudeDir, 'mcps.json');
      saveJson(configPath, { include: ['custom'], mcpServers: {} });

      init(registryPath, projectDir);

      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      assert.deepStrictEqual(config.include, ['custom']);
    });

    it('should log message when config already exists', () => {
      // Create existing config
      const claudeDir = path.join(projectDir, '.claude');
      fs.mkdirSync(claudeDir, { recursive: true });
      saveJson(path.join(claudeDir, 'mcps.json'), { include: [], mcpServers: {} });

      init(registryPath, projectDir);

      assert.ok(logs.some(log => log.includes('already exists')));
    });

    it('should update .gitignore if it exists', () => {
      // Create .gitignore
      const gitignorePath = path.join(projectDir, '.gitignore');
      fs.writeFileSync(gitignorePath, 'node_modules/\n');

      init(registryPath, projectDir);

      const content = fs.readFileSync(gitignorePath, 'utf8');
      assert.ok(content.includes('.claude/.env'));
    });

    it('should not duplicate .gitignore entry', () => {
      // Create .gitignore with entry already present
      const gitignorePath = path.join(projectDir, '.gitignore');
      fs.writeFileSync(gitignorePath, 'node_modules/\n.claude/.env\n');

      init(registryPath, projectDir);

      const content = fs.readFileSync(gitignorePath, 'utf8');
      const matches = (content.match(/\.claude\/\.env/g) || []).length;
      assert.strictEqual(matches, 1);
    });

    it('should handle missing .gitignore gracefully', () => {
      init(registryPath, projectDir);

      // Should not crash, gitignore is optional
      assert.ok(fs.existsSync(path.join(projectDir, '.claude', 'mcps.json')));
    });

    it('should show success message', () => {
      init(registryPath, projectDir);

      assert.ok(logs.some(log => log.includes('✅ Project initialized!')));
    });

    it('should show next steps', () => {
      init(registryPath, projectDir);

      assert.ok(logs.some(log => log.includes('Next steps:')));
      assert.ok(logs.some(log => log.includes('coder-config ui')));
      assert.ok(logs.some(log => log.includes('coder-config apply')));
    });

    it('should return true on success', () => {
      const result = init(registryPath, projectDir);
      assert.strictEqual(result, true);
    });

    it('should use current directory when projectDir not provided', () => {
      const originalCwd = process.cwd();
      process.chdir(projectDir);

      init(registryPath);

      process.chdir(originalCwd);

      const configPath = path.join(projectDir, '.claude', 'mcps.json');
      assert.ok(fs.existsSync(configPath));
    });

    it('should create nested directories if needed', () => {
      const nestedDir = path.join(tempDir, 'deep', 'nested', 'project');
      fs.mkdirSync(nestedDir, { recursive: true });

      init(registryPath, nestedDir);

      const claudeDir = path.join(nestedDir, '.claude');
      assert.ok(fs.existsSync(claudeDir));
    });

    it('should log config creation', () => {
      init(registryPath, projectDir);

      assert.ok(logs.some(log => log.includes('✓ Created') && log.includes('mcps.json')));
    });

    it('should log .env creation', () => {
      init(registryPath, projectDir);

      assert.ok(logs.some(log => log.includes('✓ Created') && log.includes('.env')));
    });

    it('should log .gitignore update', () => {
      const gitignorePath = path.join(projectDir, '.gitignore');
      fs.writeFileSync(gitignorePath, 'node_modules/\n');

      init(registryPath, projectDir);

      assert.ok(logs.some(log => log.includes('✓ Updated .gitignore')));
    });
  });
});
