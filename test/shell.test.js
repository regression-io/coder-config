const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Create temp directory for tests
const TEST_DIR = path.join(os.tmpdir(), 'shell-test-' + Date.now());
const ORIGINAL_HOME = process.env.HOME;
const ORIGINAL_SHELL = process.env.SHELL;

// Import module
const {
  shellStatus,
  shellInstall,
  shellUninstall,
  getShellConfigPath,
  getShellScriptPath,
} = require('../lib/shell');

describe('shell', () => {
  before(() => {
    // Create test directory
    fs.mkdirSync(TEST_DIR, { recursive: true });
    // Override HOME and SHELL for tests (ensure consistent behavior across platforms)
    process.env.HOME = TEST_DIR;
    process.env.SHELL = '/bin/zsh';
  });

  after(() => {
    // Restore environment
    process.env.HOME = ORIGINAL_HOME;
    process.env.SHELL = ORIGINAL_SHELL;
    // Clean up
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  });

  describe('getShellConfigPath', () => {
    it('should return .zshrc for zsh shell', () => {
      const originalShell = process.env.SHELL;
      process.env.SHELL = '/bin/zsh';
      const result = getShellConfigPath();
      assert.strictEqual(result, path.join(TEST_DIR, '.zshrc'));
      process.env.SHELL = originalShell;
    });

    it('should return .bashrc for bash shell without .bash_profile', () => {
      const originalShell = process.env.SHELL;
      process.env.SHELL = '/bin/bash';
      const result = getShellConfigPath();
      assert.strictEqual(result, path.join(TEST_DIR, '.bashrc'));
      process.env.SHELL = originalShell;
    });

    it('should return .bash_profile for bash shell if it exists', () => {
      const originalShell = process.env.SHELL;
      process.env.SHELL = '/bin/bash';
      const bashProfile = path.join(TEST_DIR, '.bash_profile');
      fs.writeFileSync(bashProfile, '# bash profile');
      const result = getShellConfigPath();
      assert.strictEqual(result, bashProfile);
      fs.unlinkSync(bashProfile);
      process.env.SHELL = originalShell;
    });

    it('should default to .zshrc for unknown shell', () => {
      const originalShell = process.env.SHELL;
      process.env.SHELL = '/bin/fish';
      const result = getShellConfigPath();
      assert.strictEqual(result, path.join(TEST_DIR, '.zshrc'));
      process.env.SHELL = originalShell;
    });
  });

  describe('getShellScriptPath', () => {
    it('should return path to shell script', () => {
      const result = getShellScriptPath();
      assert.ok(result.endsWith('coder-config.zsh'));
    });

    it('should point to existing file', () => {
      const result = getShellScriptPath();
      assert.ok(fs.existsSync(result), `Script should exist at ${result}`);
    });
  });

  describe('shellStatus', () => {
    beforeEach(() => {
      // Clean up any existing rc file
      const rcPath = path.join(TEST_DIR, '.zshrc');
      if (fs.existsSync(rcPath)) {
        fs.unlinkSync(rcPath);
      }
    });

    it('should return not installed if no rc file exists', () => {
      const status = shellStatus();
      assert.strictEqual(status.installed, false);
      assert.strictEqual(status.shell, 'zsh');
    });

    it('should return not installed if rc file has no integration', () => {
      const rcPath = path.join(TEST_DIR, '.zshrc');
      fs.writeFileSync(rcPath, '# some other config');
      const status = shellStatus();
      assert.strictEqual(status.installed, false);
    });

    it('should detect marker-based installation', () => {
      const rcPath = path.join(TEST_DIR, '.zshrc');
      fs.writeFileSync(rcPath, `
# some config
# >>> coder-config shell integration >>>
source /path/to/coder-config.zsh
# <<< coder-config shell integration <<<
`);
      const status = shellStatus();
      assert.strictEqual(status.installed, true);
    });

    it('should detect source-based installation', () => {
      const rcPath = path.join(TEST_DIR, '.zshrc');
      fs.writeFileSync(rcPath, 'source /some/path/coder-config.zsh');
      const status = shellStatus();
      assert.strictEqual(status.installed, true);
    });
  });

  describe('shellInstall', () => {
    let originalConsoleLog;
    let logOutput;

    beforeEach(() => {
      // Capture console output
      originalConsoleLog = console.log;
      logOutput = [];
      console.log = (...args) => logOutput.push(args.join(' '));

      // Clean up any existing rc file
      const rcPath = path.join(TEST_DIR, '.zshrc');
      if (fs.existsSync(rcPath)) {
        fs.unlinkSync(rcPath);
      }
    });

    afterEach(() => {
      console.log = originalConsoleLog;
    });

    it('should create rc file if it does not exist', () => {
      const result = shellInstall();
      assert.strictEqual(result, true);

      const rcPath = path.join(TEST_DIR, '.zshrc');
      assert.ok(fs.existsSync(rcPath));

      const content = fs.readFileSync(rcPath, 'utf8');
      assert.ok(content.includes('>>> coder-config shell integration >>>'));
      assert.ok(content.includes('source'));
    });

    it('should append to existing rc file', () => {
      const rcPath = path.join(TEST_DIR, '.zshrc');
      fs.writeFileSync(rcPath, '# existing config\nexport FOO=bar');

      const result = shellInstall();
      assert.strictEqual(result, true);

      const content = fs.readFileSync(rcPath, 'utf8');
      assert.ok(content.includes('existing config'));
      assert.ok(content.includes('>>> coder-config shell integration >>>'));
    });

    it('should not duplicate if already installed', () => {
      const rcPath = path.join(TEST_DIR, '.zshrc');

      // First install
      shellInstall();
      const firstContent = fs.readFileSync(rcPath, 'utf8');

      // Second install
      logOutput = [];
      shellInstall();
      const secondContent = fs.readFileSync(rcPath, 'utf8');

      // Content should be the same
      assert.strictEqual(firstContent, secondContent);
      assert.ok(logOutput.some(l => l.includes('already installed')));
    });
  });

  describe('shellUninstall', () => {
    let originalConsoleLog;
    let logOutput;

    beforeEach(() => {
      // Capture console output
      originalConsoleLog = console.log;
      logOutput = [];
      console.log = (...args) => logOutput.push(args.join(' '));

      // Clean up any existing rc file
      const rcPath = path.join(TEST_DIR, '.zshrc');
      if (fs.existsSync(rcPath)) {
        fs.unlinkSync(rcPath);
      }
    });

    afterEach(() => {
      console.log = originalConsoleLog;
    });

    it('should handle case where not installed', () => {
      const rcPath = path.join(TEST_DIR, '.zshrc');
      fs.writeFileSync(rcPath, '# some config');

      const result = shellUninstall();
      assert.strictEqual(result, true);
      assert.ok(logOutput.some(l => l.includes('not installed')));
    });

    it('should remove marker-based integration', () => {
      const rcPath = path.join(TEST_DIR, '.zshrc');
      fs.writeFileSync(rcPath, `# some config
export FOO=bar

# >>> coder-config shell integration >>>
source /path/to/coder-config.zsh
# <<< coder-config shell integration <<<

export BAZ=qux`);

      const result = shellUninstall();
      assert.strictEqual(result, true);

      const content = fs.readFileSync(rcPath, 'utf8');
      assert.ok(!content.includes('>>> coder-config'));
      assert.ok(content.includes('FOO=bar'));
      assert.ok(content.includes('BAZ=qux'));
    });

    it('should remove standalone source lines', () => {
      const rcPath = path.join(TEST_DIR, '.zshrc');
      fs.writeFileSync(rcPath, `# some config
source /path/to/coder-config.zsh
export FOO=bar`);

      const result = shellUninstall();
      assert.strictEqual(result, true);

      const content = fs.readFileSync(rcPath, 'utf8');
      assert.ok(!content.includes('coder-config.zsh'));
      assert.ok(content.includes('FOO=bar'));
    });
  });

  describe('integration', () => {
    beforeEach(() => {
      // Clean up any existing rc file
      const rcPath = path.join(TEST_DIR, '.zshrc');
      if (fs.existsSync(rcPath)) {
        fs.unlinkSync(rcPath);
      }
    });

    it('should complete install/status/uninstall cycle', () => {
      // Initially not installed
      let status = shellStatus();
      assert.strictEqual(status.installed, false);

      // Install
      const installResult = shellInstall();
      assert.strictEqual(installResult, true);

      // Now installed
      status = shellStatus();
      assert.strictEqual(status.installed, true);

      // Uninstall
      const uninstallResult = shellUninstall();
      assert.strictEqual(uninstallResult, true);

      // Now not installed
      status = shellStatus();
      assert.strictEqual(status.installed, false);
    });
  });
});
