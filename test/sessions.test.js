const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  getSessionStatus,
  showSessionStatus,
  flushContext,
  clearContext,
  installHooks,
  getFlushedContext,
  installFlushCommand,
  installAll,
} = require('../lib/sessions.js');

describe('sessions', () => {
  let tempDir;
  let projectDir;
  let homeDir;
  let originalHome;
  let originalLog;
  let originalError;
  let logs;
  let errors;

  before(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sessions-test-'));
    originalHome = process.env.HOME;
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
    projectDir = path.join(tempDir, `project-${Date.now()}-${Math.random()}`);
    homeDir = path.join(tempDir, `home-${Date.now()}-${Math.random()}`);
    fs.mkdirSync(path.join(projectDir, '.claude'), { recursive: true });
    fs.mkdirSync(homeDir, { recursive: true });
    process.env.HOME = homeDir;

    logs = [];
    errors = [];
    console.log = (...args) => logs.push(args.join(' '));
    console.error = (...args) => errors.push(args.join(' '));
  });

  describe('getSessionStatus', () => {
    it('should return status with no saved context', () => {
      const status = getSessionStatus(projectDir);

      assert.strictEqual(status.hasSavedContext, false);
      assert.strictEqual(status.contextPath, path.join(projectDir, '.claude', 'session-context.md'));
      assert.strictEqual(status.contextAge, null);
    });

    it('should detect saved context file', () => {
      const contextPath = path.join(projectDir, '.claude', 'session-context.md');
      fs.writeFileSync(contextPath, '# Test Context\n\nSome content');

      const status = getSessionStatus(projectDir);

      assert.strictEqual(status.hasSavedContext, true);
      assert.strictEqual(status.contextPath, contextPath);
      assert.ok(typeof status.contextAge === 'number');
    });

    it('should calculate context age in minutes', () => {
      const contextPath = path.join(projectDir, '.claude', 'session-context.md');
      fs.writeFileSync(contextPath, 'test');

      // Modify file timestamp to 5 minutes ago
      const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
      fs.utimesSync(contextPath, fiveMinutesAgo / 1000, fiveMinutesAgo / 1000);

      const status = getSessionStatus(projectDir);

      assert.ok(status.contextAge >= 4 && status.contextAge <= 6);
    });

    it('should use current directory when projectDir not provided', () => {
      const originalCwd = process.cwd();
      process.chdir(projectDir);

      const status = getSessionStatus();

      process.chdir(originalCwd);

      const expected = path.join(projectDir, '.claude', 'session-context.md');
      // Handle macOS symlink /var -> /private/var by resolving parent directories
      const statusDir = fs.realpathSync(path.dirname(path.dirname(status.contextPath)));
      const expectedDir = fs.realpathSync(path.dirname(path.dirname(expected)));
      assert.strictEqual(statusDir, expectedDir);
      assert.ok(status.contextPath.endsWith('.claude/session-context.md'));
    });
  });

  describe('showSessionStatus', () => {
    it('should show status when no context exists', () => {
      const originalCwd = process.cwd();
      process.chdir(projectDir);

      showSessionStatus();

      process.chdir(originalCwd);

      assert.ok(logs.some(log => log.includes('Saved context: None')));
      assert.ok(logs.some(log => log.includes('Expected at:')));
    });

    it('should show status when context exists', () => {
      const contextPath = path.join(projectDir, '.claude', 'session-context.md');
      fs.writeFileSync(contextPath, 'test');

      const originalCwd = process.cwd();
      process.chdir(projectDir);

      showSessionStatus();

      process.chdir(originalCwd);

      assert.ok(logs.some(log => log.includes('Saved context: Yes')));
      assert.ok(logs.some(log => log.includes('Location:')));
    });

    it('should show age in minutes for recent context', () => {
      const contextPath = path.join(projectDir, '.claude', 'session-context.md');
      fs.writeFileSync(contextPath, 'test');

      const originalCwd = process.cwd();
      process.chdir(projectDir);

      showSessionStatus();

      process.chdir(originalCwd);

      assert.ok(logs.some(log => log.includes('Age:') && log.includes('minutes')));
    });

    it('should show age in hours for older context', () => {
      const contextPath = path.join(projectDir, '.claude', 'session-context.md');
      fs.writeFileSync(contextPath, 'test');

      // Set to 2 hours ago
      const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
      fs.utimesSync(contextPath, twoHoursAgo / 1000, twoHoursAgo / 1000);

      const originalCwd = process.cwd();
      process.chdir(projectDir);

      showSessionStatus();

      process.chdir(originalCwd);

      assert.ok(logs.some(log => log.includes('Age:') && log.includes('hours')));
    });

    it('should show age in days for very old context', () => {
      const contextPath = path.join(projectDir, '.claude', 'session-context.md');
      fs.writeFileSync(contextPath, 'test');

      // Set to 2 days ago
      const twoDaysAgo = Date.now() - (2 * 24 * 60 * 60 * 1000);
      fs.utimesSync(contextPath, twoDaysAgo / 1000, twoDaysAgo / 1000);

      const originalCwd = process.cwd();
      process.chdir(projectDir);

      showSessionStatus();

      process.chdir(originalCwd);

      assert.ok(logs.some(log => log.includes('Age:') && log.includes('days')));
    });

    it('should show usage instructions', () => {
      const originalCwd = process.cwd();
      process.chdir(projectDir);

      showSessionStatus();

      process.chdir(originalCwd);

      assert.ok(logs.some(log => log.includes('/flush')));
    });
  });

  describe('flushContext', () => {
    it('should show flush instructions', () => {
      flushContext();

      assert.ok(logs.some(log => log.includes('Session context flush')));
      assert.ok(logs.some(log => log.includes('/flush in Claude Code')));
      assert.ok(logs.some(log => log.includes('.claude/session-context.md')));
    });
  });

  describe('clearContext', () => {
    it('should clear existing context file', () => {
      const contextPath = path.join(projectDir, '.claude', 'session-context.md');
      fs.writeFileSync(contextPath, 'test content');

      clearContext(projectDir);

      assert.ok(!fs.existsSync(contextPath));
      assert.ok(logs.some(log => log.includes('Session context cleared')));
    });

    it('should handle missing context file gracefully', () => {
      clearContext(projectDir);

      assert.ok(logs.some(log => log.includes('No session context to clear')));
    });

    it('should use current directory when projectDir not provided', () => {
      const contextPath = path.join(projectDir, '.claude', 'session-context.md');
      fs.writeFileSync(contextPath, 'test');

      const originalCwd = process.cwd();
      process.chdir(projectDir);

      clearContext();

      process.chdir(originalCwd);

      assert.ok(!fs.existsSync(contextPath));
    });
  });

  describe('getFlushedContext', () => {
    it('should return context content when file exists', () => {
      const contextPath = path.join(projectDir, '.claude', 'session-context.md');
      const content = '# Session Context\n\nSome work in progress';
      fs.writeFileSync(contextPath, content);

      const result = getFlushedContext(projectDir);

      assert.strictEqual(result, content);
    });

    it('should return null when no context exists', () => {
      const result = getFlushedContext(projectDir);

      assert.strictEqual(result, null);
    });

    it('should use current directory when projectDir not provided', () => {
      const contextPath = path.join(projectDir, '.claude', 'session-context.md');
      const content = 'test';
      fs.writeFileSync(contextPath, content);

      const originalCwd = process.cwd();
      process.chdir(projectDir);

      const result = getFlushedContext();

      process.chdir(originalCwd);

      assert.strictEqual(result, content);
    });
  });

  describe('installHooks', () => {
    beforeEach(() => {
      // Create mock hook file
      const hooksDir = path.join(__dirname, '..', 'hooks');
      const hookFile = path.join(hooksDir, 'session-start.sh');
      if (!fs.existsSync(hooksDir)) {
        fs.mkdirSync(hooksDir, { recursive: true });
      }
      if (!fs.existsSync(hookFile)) {
        fs.writeFileSync(hookFile, '#!/bin/bash\necho "test"');
      }
    });

    it('should create settings.json if it does not exist', () => {
      installHooks();

      const settingsPath = path.join(homeDir, '.claude', 'settings.json');
      assert.ok(fs.existsSync(settingsPath));
    });

    it('should add SessionStart hook', () => {
      installHooks();

      const settingsPath = path.join(homeDir, '.claude', 'settings.json');
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));

      assert.ok(settings.hooks);
      assert.ok(settings.hooks.SessionStart);
      assert.ok(Array.isArray(settings.hooks.SessionStart));
      assert.ok(settings.hooks.SessionStart.length > 0);
    });

    it('should add write permission for session context', () => {
      installHooks();

      const settingsPath = path.join(homeDir, '.claude', 'settings.json');
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));

      assert.ok(settings.permissions);
      assert.ok(settings.permissions.allow);
      assert.ok(settings.permissions.allow.includes('Write(**/.claude/session-context.md)'));
    });

    it('should not duplicate permission if already exists', () => {
      // Install once
      installHooks();

      // Install again
      installHooks();

      const settingsPath = path.join(homeDir, '.claude', 'settings.json');
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));

      const permissionCount = settings.permissions.allow.filter(
        p => p === 'Write(**/.claude/session-context.md)'
      ).length;

      assert.strictEqual(permissionCount, 1);
    });

    it('should preserve existing settings', () => {
      const settingsPath = path.join(homeDir, '.claude', 'settings.json');
      fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
      fs.writeFileSync(settingsPath, JSON.stringify({
        existingSetting: 'value',
        hooks: { SomeOtherHook: [] }
      }, null, 2));

      installHooks();

      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      assert.strictEqual(settings.existingSetting, 'value');
      assert.ok(settings.hooks.SomeOtherHook);
    });

    it('should handle invalid existing settings gracefully', () => {
      const settingsPath = path.join(homeDir, '.claude', 'settings.json');
      fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
      fs.writeFileSync(settingsPath, 'invalid json');

      installHooks();

      assert.ok(errors.some(err => err.includes('Error reading settings.json')));
    });

    it('should migrate old hook format to new format', () => {
      const settingsPath = path.join(homeDir, '.claude', 'settings.json');
      fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
      fs.writeFileSync(settingsPath, JSON.stringify({
        hooks: {
          SessionStart: [
            { type: 'command', command: '/old/hook.sh' }
          ]
        }
      }, null, 2));

      installHooks();

      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      assert.ok(Array.isArray(settings.hooks.SessionStart));
      assert.ok(settings.hooks.SessionStart[0].hooks);
      assert.ok(Array.isArray(settings.hooks.SessionStart[0].hooks));
    });

    it('should show success message', () => {
      installHooks();

      assert.ok(logs.some(log => log.includes('Session hook and permissions installed')));
      assert.ok(logs.some(log => log.includes('SessionStart hook')));
    });
  });

  describe('installFlushCommand', () => {
    beforeEach(() => {
      // Create mock template
      const templateDir = path.join(__dirname, '..', 'templates', 'commands');
      const templateFile = path.join(templateDir, 'flush.md');
      if (!fs.existsSync(templateDir)) {
        fs.mkdirSync(templateDir, { recursive: true });
      }
      if (!fs.existsSync(templateFile)) {
        fs.writeFileSync(templateFile, '# Flush Command\n\nTest template');
      }
    });

    it('should create commands directory if not exists', () => {
      installFlushCommand();

      const commandsDir = path.join(homeDir, '.claude', 'commands');
      assert.ok(fs.existsSync(commandsDir));
    });

    it('should copy flush command template', () => {
      installFlushCommand();

      const destFile = path.join(homeDir, '.claude', 'commands', 'flush.md');
      assert.ok(fs.existsSync(destFile));
    });

    it('should show success message when installed', () => {
      installFlushCommand();

      assert.ok(logs.some(log => log.includes('/flush command installed')));
    });

    it('should detect if command already installed', () => {
      installFlushCommand();
      logs = [];
      installFlushCommand();

      assert.ok(logs.some(log => log.includes('already installed')));
    });

    it('should return true on success', () => {
      const result = installFlushCommand();
      assert.strictEqual(result, true);
    });

    it('should return false when template not found', () => {
      // Remove template
      const templateFile = path.join(__dirname, '..', 'templates', 'commands', 'flush.md');
      const backup = templateFile + '.backup';
      if (fs.existsSync(templateFile)) {
        fs.renameSync(templateFile, backup);
      }

      const result = installFlushCommand();

      // Restore
      if (fs.existsSync(backup)) {
        fs.renameSync(backup, templateFile);
      }

      assert.strictEqual(result, false);
      assert.ok(errors.some(err => err.includes('template not found')));
    });
  });

  describe('installAll', () => {
    beforeEach(() => {
      // Create required files
      const hooksDir = path.join(__dirname, '..', 'hooks');
      const hookFile = path.join(hooksDir, 'session-start.sh');
      if (!fs.existsSync(hooksDir)) {
        fs.mkdirSync(hooksDir, { recursive: true });
      }
      if (!fs.existsSync(hookFile)) {
        fs.writeFileSync(hookFile, '#!/bin/bash\necho "test"');
      }

      const templateDir = path.join(__dirname, '..', 'templates', 'commands');
      const templateFile = path.join(templateDir, 'flush.md');
      if (!fs.existsSync(templateDir)) {
        fs.mkdirSync(templateDir, { recursive: true });
      }
      if (!fs.existsSync(templateFile)) {
        fs.writeFileSync(templateFile, '# Flush Command\n\nTest template');
      }
    });

    it('should install hooks and flush command', () => {
      installAll();

      const settingsPath = path.join(homeDir, '.claude', 'settings.json');
      const commandPath = path.join(homeDir, '.claude', 'commands', 'flush.md');

      assert.ok(fs.existsSync(settingsPath));
      assert.ok(fs.existsSync(commandPath));
    });

    it('should show comprehensive installation message', () => {
      installAll();

      assert.ok(logs.some(log => log.includes('Installing session persistence')));
      assert.ok(logs.some(log => log.includes('/flush in Claude Code')));
    });
  });
});
