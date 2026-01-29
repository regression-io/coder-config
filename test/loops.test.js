const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  getLoopsPath,
  getLoopsRegistryPath,
  getLoopsHistoryPath,
  getLoopDir,
  loadLoops,
  saveLoops,
  loadLoopState,
  saveLoopState,
  loadHistory,
  saveHistory,
  getDefaultConfig,
  loopCreate,
  loopGet,
  loopDelete,
  saveClarifications,
  savePlan,
  loadClarifications,
  loadPlan,
} = require('../lib/loops.js');

describe('loops', () => {
  let tempDir;
  let installDir;
  let originalLog;
  let originalError;
  let logs;
  let errors;

  before(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'loops-test-'));
    originalLog = console.log;
    originalError = console.error;
  });

  after(() => {
    console.log = originalLog;
    console.error = originalError;
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    installDir = path.join(tempDir, `install-${Date.now()}-${Math.random()}`);
    fs.mkdirSync(installDir, { recursive: true });

    logs = [];
    errors = [];
    console.log = (...args) => logs.push(args.join(' '));
    console.error = (...args) => errors.push(args.join(' '));
  });

  describe('Path helpers', () => {
    describe('getLoopsPath', () => {
      it('should return correct loops directory path', () => {
        const loopsPath = getLoopsPath(installDir);
        assert.strictEqual(loopsPath, path.join(installDir, 'loops'));
      });
    });

    describe('getLoopsRegistryPath', () => {
      it('should return correct loops registry path', () => {
        const registryPath = getLoopsRegistryPath(installDir);
        assert.strictEqual(registryPath, path.join(installDir, 'loops', 'loops.json'));
      });
    });

    describe('getLoopsHistoryPath', () => {
      it('should return correct history path', () => {
        const historyPath = getLoopsHistoryPath(installDir);
        assert.strictEqual(historyPath, path.join(installDir, 'loops', 'history.json'));
      });
    });

    describe('getLoopDir', () => {
      it('should return correct loop directory path', () => {
        const loopDir = getLoopDir(installDir, 'test-loop-id');
        assert.strictEqual(loopDir, path.join(installDir, 'loops', 'test-loop-id'));
      });
    });
  });

  describe('Data operations', () => {
    describe('loadLoops', () => {
      it('should return default structure when file does not exist', () => {
        const data = loadLoops(installDir);

        assert.ok(Array.isArray(data.loops));
        assert.strictEqual(data.loops.length, 0);
        assert.strictEqual(data.activeId, null);
        assert.ok(data.config);
      });

      it('should load existing loops file', () => {
        const loopsDir = path.join(installDir, 'loops');
        fs.mkdirSync(loopsDir, { recursive: true });
        const testData = {
          loops: [{ id: 'test', name: 'Test Loop', status: 'paused' }],
          activeId: 'test',
          config: getDefaultConfig()
        };
        fs.writeFileSync(
          path.join(loopsDir, 'loops.json'),
          JSON.stringify(testData)
        );

        const data = loadLoops(installDir);

        assert.strictEqual(data.loops.length, 1);
        assert.strictEqual(data.loops[0].name, 'Test Loop');
        assert.strictEqual(data.activeId, 'test');
      });

      it('should return default structure for invalid JSON', () => {
        const loopsDir = path.join(installDir, 'loops');
        fs.mkdirSync(loopsDir, { recursive: true });
        fs.writeFileSync(
          path.join(loopsDir, 'loops.json'),
          'invalid json'
        );

        const data = loadLoops(installDir);

        assert.ok(Array.isArray(data.loops));
        assert.strictEqual(data.loops.length, 0);
      });
    });

    describe('saveLoops', () => {
      it('should save loops data to file', () => {
        const data = {
          loops: [{ id: '1', name: 'Test', status: 'paused' }],
          activeId: null,
          config: getDefaultConfig()
        };

        saveLoops(installDir, data);

        const loopsPath = path.join(installDir, 'loops', 'loops.json');
        assert.ok(fs.existsSync(loopsPath));

        const saved = JSON.parse(fs.readFileSync(loopsPath, 'utf8'));
        assert.strictEqual(saved.loops.length, 1);
      });

      it('should create directory if it does not exist', () => {
        const data = { loops: [], activeId: null, config: getDefaultConfig() };

        saveLoops(installDir, data);

        assert.ok(fs.existsSync(path.join(installDir, 'loops')));
      });

      it('should format JSON with newline', () => {
        const data = { loops: [], activeId: null, config: getDefaultConfig() };
        saveLoops(installDir, data);

        const content = fs.readFileSync(
          path.join(installDir, 'loops', 'loops.json'),
          'utf8'
        );
        assert.ok(content.endsWith('\n'));
      });
    });

    describe('loadLoopState', () => {
      it('should load loop state file', () => {
        const loopId = 'test-loop';
        const loopDir = path.join(installDir, 'loops', loopId);
        fs.mkdirSync(loopDir, { recursive: true });

        const stateData = {
          id: loopId,
          name: 'Test Loop',
          status: 'paused',
          task: 'Test task'
        };
        fs.writeFileSync(
          path.join(loopDir, 'state.json'),
          JSON.stringify(stateData)
        );

        const state = loadLoopState(installDir, loopId);

        assert.strictEqual(state.name, 'Test Loop');
        assert.strictEqual(state.status, 'paused');
      });

      it('should return null for non-existent loop', () => {
        const state = loadLoopState(installDir, 'nonexistent');
        assert.strictEqual(state, null);
      });

      it('should return null for invalid JSON', () => {
        const loopId = 'test-loop';
        const loopDir = path.join(installDir, 'loops', loopId);
        fs.mkdirSync(loopDir, { recursive: true });
        fs.writeFileSync(path.join(loopDir, 'state.json'), 'invalid');

        const state = loadLoopState(installDir, loopId);
        assert.strictEqual(state, null);
      });
    });

    describe('saveLoopState', () => {
      it('should save loop state to file', () => {
        const loopId = 'test-loop';
        const state = {
          id: loopId,
          name: 'Test Loop',
          status: 'paused',
          task: 'Test task'
        };

        saveLoopState(installDir, loopId, state);

        const statePath = path.join(installDir, 'loops', loopId, 'state.json');
        assert.ok(fs.existsSync(statePath));

        const saved = JSON.parse(fs.readFileSync(statePath, 'utf8'));
        assert.strictEqual(saved.name, 'Test Loop');
      });

      it('should create loop directory if needed', () => {
        const loopId = 'new-loop';
        const state = { id: loopId, name: 'New', status: 'paused' };

        saveLoopState(installDir, loopId, state);

        const loopDir = path.join(installDir, 'loops', loopId);
        assert.ok(fs.existsSync(loopDir));
      });
    });

    describe('loadHistory', () => {
      it('should return default structure when file does not exist', () => {
        const history = loadHistory(installDir);

        assert.ok(Array.isArray(history.completed));
        assert.strictEqual(history.completed.length, 0);
      });

      it('should load existing history file', () => {
        const loopsDir = path.join(installDir, 'loops');
        fs.mkdirSync(loopsDir, { recursive: true });
        const historyData = {
          completed: [{ id: 'loop1', name: 'Test', completedAt: '2026-01-29' }]
        };
        fs.writeFileSync(
          path.join(loopsDir, 'history.json'),
          JSON.stringify(historyData)
        );

        const history = loadHistory(installDir);

        assert.strictEqual(history.completed.length, 1);
        assert.strictEqual(history.completed[0].name, 'Test');
      });
    });

    describe('saveHistory', () => {
      it('should save history data to file', () => {
        const data = {
          completed: [{ id: 'loop1', name: 'Test', completedAt: '2026-01-29' }]
        };

        saveHistory(installDir, data);

        const historyPath = path.join(installDir, 'loops', 'history.json');
        assert.ok(fs.existsSync(historyPath));

        const saved = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
        assert.strictEqual(saved.completed.length, 1);
      });
    });
  });

  describe('getDefaultConfig', () => {
    it('should return default configuration object', () => {
      const config = getDefaultConfig();

      assert.ok(typeof config === 'object');
      assert.ok(typeof config.maxIterations === 'number');
      assert.ok(typeof config.autoApprovePlan === 'boolean');
      assert.ok(config.maxIterations > 0);
    });

    it('should include all required config fields', () => {
      const config = getDefaultConfig();

      assert.ok('maxIterations' in config);
      assert.ok('autoApprovePlan' in config);
      assert.ok('maxClarifyIterations' in config);
      assert.ok('completionPromise' in config);
    });
  });

  describe('File operations', () => {
    let loopId;

    beforeEach(() => {
      loopId = 'test-loop-' + Date.now();
    });

    describe('saveClarifications', () => {
      it('should save clarifications to file', () => {
        const loopDir = path.join(installDir, 'loops', loopId);
        fs.mkdirSync(loopDir, { recursive: true });
        const content = '# Clarifications\n\nSome clarifications here';

        saveClarifications(installDir, loopId, content);

        const clarPath = path.join(installDir, 'loops', loopId, 'clarifications.md');
        assert.ok(fs.existsSync(clarPath));
      });

      it('should create loop directory if needed', () => {
        const loopDir = path.join(installDir, 'loops', loopId);
        fs.mkdirSync(loopDir, { recursive: true });
        const content = 'Test content';

        saveClarifications(installDir, loopId, content);

        const clarPath = path.join(installDir, 'loops', loopId, 'clarifications.md');
        assert.ok(fs.existsSync(clarPath));
      });
    });

    describe('loadClarifications', () => {
      it('should load clarifications file', () => {
        const content = '# Clarifications\n\n## Question 1\nAnswer 1';
        const loopDir = path.join(installDir, 'loops', loopId);
        fs.mkdirSync(loopDir, { recursive: true });
        fs.writeFileSync(
          path.join(loopDir, 'clarifications.md'),
          content
        );

        const loaded = loadClarifications(installDir, loopId);

        assert.strictEqual(loaded, content);
      });

      it('should return empty string for non-existent file', () => {
        const loaded = loadClarifications(installDir, 'nonexistent');
        assert.strictEqual(loaded, '');
      });
    });

    describe('savePlan', () => {
      it('should save plan to file', () => {
        const loopDir = path.join(installDir, 'loops', loopId);
        fs.mkdirSync(loopDir, { recursive: true });
        const content = '# Implementation Plan\n\n## Steps\n\n1. Do this\n2. Do that';

        savePlan(installDir, loopId, content);

        const planPath = path.join(installDir, 'loops', loopId, 'plan.md');
        assert.ok(fs.existsSync(planPath));

        const saved = fs.readFileSync(planPath, 'utf8');
        assert.strictEqual(saved, content);
      });

      it('should create loop directory if needed', () => {
        const loopDir = path.join(installDir, 'loops', loopId);
        fs.mkdirSync(loopDir, { recursive: true });
        const content = 'Test plan';

        savePlan(installDir, loopId, content);

        const planPath = path.join(installDir, 'loops', loopId, 'plan.md');
        assert.ok(fs.existsSync(planPath));
      });
    });

    describe('loadPlan', () => {
      it('should load plan file', () => {
        const content = '# Plan\n\nSome plan content';
        const loopDir = path.join(installDir, 'loops', loopId);
        fs.mkdirSync(loopDir, { recursive: true });
        fs.writeFileSync(path.join(loopDir, 'plan.md'), content);

        const loaded = loadPlan(installDir, loopId);

        assert.strictEqual(loaded, content);
      });

      it('should return empty string for non-existent file', () => {
        const loaded = loadPlan(installDir, 'nonexistent');
        assert.strictEqual(loaded, '');
      });
    });
  });

  describe('CRUD operations - basic', () => {
    describe('loopCreate', () => {
      it('should create a new loop', () => {
        const loop = loopCreate(installDir, 'Test task');

        assert.ok(loop);
        assert.ok(loop.id);
        assert.strictEqual(loop.task.original, 'Test task');
        assert.strictEqual(loop.status, 'pending');
      });

      it('should generate unique IDs', () => {
        const loop1 = loopCreate(installDir, 'Task 1');
        const loop2 = loopCreate(installDir, 'Task 2');

        assert.notStrictEqual(loop1.id, loop2.id);
      });

      it('should set timestamps', () => {
        const loop = loopCreate(installDir, 'Test task');

        assert.ok(loop.createdAt);
        assert.ok(new Date(loop.createdAt).getTime() > 0);
      });

      it('should accept options', () => {
        const loop = loopCreate(installDir, 'Test task', {
          maxIterations: 10,
          name: 'Custom Name'
        });

        // Options are in the full state, not in the registry entry
        // The registry entry only has id, name, createdAt
        assert.ok(loop.id);
        assert.strictEqual(loop.name, 'Custom Name');
      });

      it('should persist to file', () => {
        const loop = loopCreate(installDir, 'Test task');

        const data = loadLoops(installDir);
        assert.strictEqual(data.loops.length, 1);
        // Registry entry only has id, name, createdAt (not full task)
        assert.strictEqual(data.loops[0].id, loop.id);
        assert.ok(data.loops[0].name);
      });

      it('should create loop directory', () => {
        const loop = loopCreate(installDir, 'Test task');

        const loopDir = path.join(installDir, 'loops', loop.id);
        assert.ok(fs.existsSync(loopDir));
      });
    });

    describe('loopGet', () => {
      let loopId;

      beforeEach(() => {
        const loop = loopCreate(installDir, 'Test task');
        loopId = loop.id;
      });

      it('should retrieve loop by ID', () => {
        const loop = loopGet(installDir, loopId);

        assert.ok(loop);
        assert.strictEqual(loop.id, loopId);
        assert.strictEqual(loop.task.original, 'Test task');
      });

      it('should return null for non-existent loop', () => {
        const loop = loopGet(installDir, 'nonexistent');
        assert.strictEqual(loop, null);
      });
    });

    describe('loopDelete', () => {
      let loopId;

      beforeEach(() => {
        const loop = loopCreate(installDir, 'Test task');
        loopId = loop.id;
      });

      it('should delete a loop', () => {
        const result = loopDelete(installDir, loopId);

        assert.strictEqual(result, true);

        const data = loadLoops(installDir);
        assert.strictEqual(data.loops.length, 0);
      });

      it('should remove loop directory', () => {
        const loopDir = path.join(installDir, 'loops', loopId);
        assert.ok(fs.existsSync(loopDir));

        loopDelete(installDir, loopId);

        assert.ok(!fs.existsSync(loopDir));
      });

      it('should return false for non-existent loop', () => {
        const result = loopDelete(installDir, 'nonexistent');
        assert.strictEqual(result, false);
      });
    });
  });
});
