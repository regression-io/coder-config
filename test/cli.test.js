const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { runCli, printHelp } = require('../lib/cli.js');

describe('cli', () => {
  let tempDir;
  let originalHome;
  let originalLog;
  let originalError;
  let originalArgv;
  let logs;
  let errors;

  before(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-test-'));
    originalHome = process.env.HOME;
    originalLog = console.log;
    originalError = console.error;
    originalArgv = process.argv;
  });

  after(() => {
    process.env.HOME = originalHome;
    console.log = originalLog;
    console.error = originalError;
    process.argv = originalArgv;
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    process.env.HOME = tempDir;
    logs = [];
    errors = [];
    console.log = (...args) => logs.push(args.join(' '));
    console.error = (...args) => errors.push(args.join(' '));
    process.argv = ['node', 'cli.js'];
  });

  describe('printHelp', () => {
    it('should print help text', () => {
      printHelp();

      assert.ok(logs.some(log => log.includes('coder-config')));
      assert.ok(logs.some(log => log.includes('Usage:')));
    });

    it('should list available commands', () => {
      printHelp();

      // Check for key commands
      assert.ok(logs.some(log => log.includes('init')));
      assert.ok(logs.some(log => log.includes('apply')));
      assert.ok(logs.some(log => log.includes('mcps')));
      assert.ok(logs.some(log => log.includes('memory')));
      assert.ok(logs.some(log => log.includes('workstream')));
    });

    it('should include version information', () => {
      printHelp();

      assert.ok(logs.some(log => log.includes('version') || log.includes('Version')));
    });

    it('should include examples', () => {
      printHelp();

      assert.ok(logs.some(log => log.includes('Example') || log.includes('example')));
    });
  });

  describe('runCli - help and version', () => {
    it('should show help with no arguments', () => {
      const mockManager = {};
      process.argv = ['node', 'cli.js'];

      runCli(mockManager);

      assert.ok(logs.some(log => log.includes('Usage:')));
    });

    it('should show help with --help flag', () => {
      const mockManager = {};
      process.argv = ['node', 'cli.js', '--help'];

      runCli(mockManager);

      assert.ok(logs.some(log => log.includes('Usage:')));
    });

    it('should show help with -h flag', () => {
      const mockManager = {};
      process.argv = ['node', 'cli.js', '-h'];

      runCli(mockManager);

      assert.ok(logs.some(log => log.includes('Usage:')));
    });

    it('should show help with help command', () => {
      const mockManager = {};
      process.argv = ['node', 'cli.js', 'help'];

      runCli(mockManager);

      assert.ok(logs.some(log => log.includes('Usage:')));
    });

    it('should show version with --version flag', () => {
      const mockManager = {};
      process.argv = ['node', 'cli.js', '--version'];

      runCli(mockManager);

      assert.ok(logs.some(log => /\d+\.\d+\.\d+/.test(log)));
    });

    it('should show version with -v flag', () => {
      const mockManager = {};
      process.argv = ['node', 'cli.js', '-v'];

      runCli(mockManager);

      assert.ok(logs.some(log => /\d+\.\d+\.\d+/.test(log)));
    });
  });

  describe('runCli - command routing', () => {
    it('should call init command', () => {
      let initCalled = false;
      const mockManager = {
        init: (dir) => { initCalled = true; }
      };
      process.argv = ['node', 'cli.js', 'init'];

      runCli(mockManager);

      assert.strictEqual(initCalled, true);
    });

    it('should call apply command', () => {
      let applyCalled = false;
      const mockManager = {
        apply: (dir) => { applyCalled = true; }
      };
      process.argv = ['node', 'cli.js', 'apply'];

      runCli(mockManager);

      assert.strictEqual(applyCalled, true);
    });

    it('should call show command', () => {
      let showCalled = false;
      const mockManager = {
        show: (tool) => { showCalled = true; }
      };
      process.argv = ['node', 'cli.js', 'show'];

      runCli(mockManager);

      assert.strictEqual(showCalled, true);
    });

    it('should call list command', () => {
      let listCalled = false;
      const mockManager = {
        list: () => { listCalled = true; }
      };
      process.argv = ['node', 'cli.js', 'list'];

      runCli(mockManager);

      assert.strictEqual(listCalled, true);
    });

    it('should call mcps as alias for list', () => {
      let listCalled = false;
      const mockManager = {
        list: () => { listCalled = true; }
      };
      process.argv = ['node', 'cli.js', 'mcps'];

      runCli(mockManager);

      assert.strictEqual(listCalled, true);
    });

    it('should call add command with arguments', () => {
      let addArgs = null;
      const mockManager = {
        add: (args) => { addArgs = args; }
      };
      process.argv = ['node', 'cli.js', 'add', 'github', 'filesystem'];

      runCli(mockManager);

      assert.ok(Array.isArray(addArgs));
      assert.strictEqual(addArgs[0], 'github');
      assert.strictEqual(addArgs[1], 'filesystem');
    });

    it('should call remove command', () => {
      let removeArgs = null;
      const mockManager = {
        remove: (args) => { removeArgs = args; }
      };
      process.argv = ['node', 'cli.js', 'remove', 'github'];

      runCli(mockManager);

      assert.ok(Array.isArray(removeArgs));
      assert.strictEqual(removeArgs[0], 'github');
    });

    it('should call rm as alias for remove', () => {
      let removeCalled = false;
      const mockManager = {
        remove: () => { removeCalled = true; }
      };
      process.argv = ['node', 'cli.js', 'rm', 'github'];

      runCli(mockManager);

      assert.strictEqual(removeCalled, true);
    });

    it('should handle unknown commands', () => {
      const mockManager = {};
      process.argv = ['node', 'cli.js', 'unknowncommand'];

      runCli(mockManager);

      assert.ok(errors.some(err => err.includes('Unknown command')) ||
                logs.some(log => log.includes('Usage:')));
    });
  });

  describe('runCli - registry commands', () => {
    it('should call registryList with no subcommand', () => {
      let registryListCalled = false;
      const mockManager = {
        registryList: () => { registryListCalled = true; }
      };
      process.argv = ['node', 'cli.js', 'registry'];

      runCli(mockManager);

      assert.strictEqual(registryListCalled, true);
    });

    it('should call registryAdd with add subcommand', () => {
      let name = null, config = null;
      const mockManager = {
        registryAdd: (n, c) => { name = n; config = c; }
      };
      process.argv = ['node', 'cli.js', 'registry', 'add', 'test-mcp', '{"command":"test"}'];

      runCli(mockManager);

      assert.strictEqual(name, 'test-mcp');
      assert.strictEqual(config, '{"command":"test"}');
    });

    it('should call registryRemove with remove subcommand', () => {
      let removedName = null;
      const mockManager = {
        registryRemove: (name) => { removedName = name; }
      };
      process.argv = ['node', 'cli.js', 'registry', 'remove', 'test-mcp'];

      runCli(mockManager);

      assert.strictEqual(removedName, 'test-mcp');
    });

    it('should call registryRemove with rm subcommand', () => {
      let removedName = null;
      const mockManager = {
        registryRemove: (name) => { removedName = name; }
      };
      process.argv = ['node', 'cli.js', 'registry', 'rm', 'test-mcp'];

      runCli(mockManager);

      assert.strictEqual(removedName, 'test-mcp');
    });
  });

  describe('runCli - memory commands', () => {
    it('should call memoryInit', () => {
      let initCalled = false;
      const mockManager = {
        memoryInit: (dir) => { initCalled = true; }
      };
      process.argv = ['node', 'cli.js', 'memory', 'init'];

      runCli(mockManager);

      assert.strictEqual(initCalled, true);
    });

    it('should call memoryAdd', () => {
      let type = null, content = null;
      const mockManager = {
        memoryAdd: (t, c) => { type = t; content = c; }
      };
      process.argv = ['node', 'cli.js', 'memory', 'add', 'preference', 'Test content'];

      runCli(mockManager);

      assert.strictEqual(type, 'preference');
      assert.strictEqual(content, 'Test content');
    });

    it('should call memorySearch', () => {
      let query = null;
      const mockManager = {
        memorySearch: (q) => { query = q; }
      };
      process.argv = ['node', 'cli.js', 'memory', 'search', 'test query'];

      runCli(mockManager);

      assert.strictEqual(query, 'test query');
    });

    it('should call memoryShow with no subcommand', () => {
      let showCalled = false;
      const mockManager = {
        memoryShow: () => { showCalled = true; }
      };
      process.argv = ['node', 'cli.js', 'memory'];

      runCli(mockManager);

      assert.strictEqual(showCalled, true);
    });
  });
});
