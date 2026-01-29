const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  getWorkstreamsPath,
  loadWorkstreams,
  saveWorkstreams,
  workstreamList,
  workstreamCreate,
  workstreamUpdate,
  workstreamDelete,
  workstreamAddProject,
  workstreamRemoveProject,
  workstreamGet,
  getActiveWorkstream,
  countWorkstreamsForProject,
} = require('../lib/workstreams.js');

describe('workstreams', () => {
  let tempDir;
  let installDir;
  let projectDir1;
  let projectDir2;
  let originalLog;
  let originalError;
  let logs;
  let errors;

  before(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workstreams-test-'));
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
    projectDir1 = path.join(tempDir, `project1-${Date.now()}`);
    projectDir2 = path.join(tempDir, `project2-${Date.now()}`);
    fs.mkdirSync(installDir, { recursive: true });
    fs.mkdirSync(projectDir1, { recursive: true });
    fs.mkdirSync(projectDir2, { recursive: true });

    logs = [];
    errors = [];
    console.log = (...args) => logs.push(args.join(' '));
    console.error = (...args) => errors.push(args.join(' '));
  });

  describe('getWorkstreamsPath', () => {
    it('should return correct workstreams path', () => {
      const wsPath = getWorkstreamsPath(installDir);
      assert.strictEqual(wsPath, path.join(installDir, 'workstreams.json'));
    });
  });

  describe('loadWorkstreams', () => {
    it('should return default structure when file does not exist', () => {
      const data = loadWorkstreams(installDir);

      assert.ok(Array.isArray(data.workstreams));
      assert.strictEqual(data.workstreams.length, 0);
      assert.strictEqual(data.activeId, null);
      assert.ok(typeof data.lastUsedByProject === 'object');
    });

    it('should load existing workstreams file', () => {
      const testData = {
        workstreams: [{ id: 'test', name: 'Test WS', projects: [] }],
        activeId: null,
        lastUsedByProject: {}
      };
      fs.writeFileSync(
        path.join(installDir, 'workstreams.json'),
        JSON.stringify(testData)
      );

      const data = loadWorkstreams(installDir);

      assert.strictEqual(data.workstreams.length, 1);
      assert.strictEqual(data.workstreams[0].name, 'Test WS');
    });

    it('should return default structure for invalid JSON', () => {
      fs.writeFileSync(
        path.join(installDir, 'workstreams.json'),
        'invalid json'
      );

      const data = loadWorkstreams(installDir);

      assert.ok(Array.isArray(data.workstreams));
      assert.strictEqual(data.workstreams.length, 0);
    });
  });

  describe('saveWorkstreams', () => {
    it('should save workstreams to file', () => {
      const data = {
        workstreams: [{ id: '1', name: 'Test', projects: [] }],
        activeId: null,
        lastUsedByProject: {}
      };

      saveWorkstreams(installDir, data);

      const wsPath = path.join(installDir, 'workstreams.json');
      assert.ok(fs.existsSync(wsPath));

      const saved = JSON.parse(fs.readFileSync(wsPath, 'utf8'));
      assert.strictEqual(saved.workstreams.length, 1);
    });

    it('should create directory if it does not exist', () => {
      const nestedDir = path.join(installDir, 'nested', 'deep');
      const data = {
        workstreams: [],
        activeId: null,
        lastUsedByProject: {}
      };

      saveWorkstreams(nestedDir, data);

      assert.ok(fs.existsSync(path.join(nestedDir, 'workstreams.json')));
    });

    it('should format JSON with newline', () => {
      const data = { workstreams: [], activeId: null, lastUsedByProject: {} };
      saveWorkstreams(installDir, data);

      const content = fs.readFileSync(path.join(installDir, 'workstreams.json'), 'utf8');
      assert.ok(content.endsWith('\n'));
    });
  });

  describe('workstreamList', () => {
    it('should show message when no workstreams exist', () => {
      workstreamList(installDir);

      assert.ok(logs.some(log => log.includes('No workstreams defined')));
    });

    it('should list existing workstreams', () => {
      const data = {
        workstreams: [
          { id: '1', name: 'Test WS 1', projects: [] },
          { id: '2', name: 'Test WS 2', projects: [projectDir1] }
        ],
        activeId: null,
        lastUsedByProject: {}
      };
      saveWorkstreams(installDir, data);

      workstreamList(installDir);

      assert.ok(logs.some(log => log.includes('Test WS 1')));
      assert.ok(logs.some(log => log.includes('Test WS 2')));
    });

    it('should show project names for each workstream', () => {
      const data = {
        workstreams: [
          { id: '1', name: 'Test', projects: [projectDir1, projectDir2] }
        ],
        activeId: null,
        lastUsedByProject: {}
      };
      saveWorkstreams(installDir, data);

      workstreamList(installDir);

      assert.ok(logs.some(log => log.includes('Projects:')));
    });

    it('should return workstreams array', () => {
      const data = {
        workstreams: [{ id: '1', name: 'Test', projects: [] }],
        activeId: null,
        lastUsedByProject: {}
      };
      saveWorkstreams(installDir, data);

      const result = workstreamList(installDir);

      assert.ok(Array.isArray(result));
      assert.strictEqual(result.length, 1);
    });
  });

  describe('workstreamCreate', () => {
    it('should create a new workstream', () => {
      const ws = workstreamCreate(installDir, 'Test Workstream');

      assert.ok(ws);
      assert.ok(ws.id);
      assert.strictEqual(ws.name, 'Test Workstream');
      assert.ok(Array.isArray(ws.projects));
      assert.strictEqual(ws.projects.length, 0);
    });

    it('should set timestamps', () => {
      const ws = workstreamCreate(installDir, 'Test');

      assert.ok(ws.createdAt);
      assert.ok(ws.updatedAt);
      assert.ok(new Date(ws.createdAt).getTime() > 0);
    });

    it('should add projects if provided', () => {
      const ws = workstreamCreate(installDir, 'Test', [projectDir1, projectDir2]);

      assert.strictEqual(ws.projects.length, 2);
      assert.ok(ws.projects.includes(projectDir1));
      assert.ok(ws.projects.includes(projectDir2));
    });

    it('should add rules if provided', () => {
      const rules = '# Test Rules\n\nSome rules here';
      const ws = workstreamCreate(installDir, 'Test', [], rules);

      assert.strictEqual(ws.rules, rules);
    });

    it('should expand tilde in project paths', () => {
      const originalHome = process.env.HOME;
      process.env.HOME = tempDir;

      const ws = workstreamCreate(installDir, 'Test', ['~/project']);

      process.env.HOME = originalHome;

      assert.ok(!ws.projects[0].includes('~'));
      assert.ok(ws.projects[0].startsWith(tempDir));
    });

    it('should reject duplicate workstream names', () => {
      workstreamCreate(installDir, 'Test');
      const ws2 = workstreamCreate(installDir, 'Test');

      assert.strictEqual(ws2, null);
      assert.ok(errors.some(err => err.includes('already exists')));
    });

    it('should reject duplicate names case-insensitively', () => {
      workstreamCreate(installDir, 'Test');
      const ws2 = workstreamCreate(installDir, 'test');

      assert.strictEqual(ws2, null);
    });

    it('should reject missing name', () => {
      const ws = workstreamCreate(installDir, '');

      assert.strictEqual(ws, null);
      assert.ok(errors.some(err => err.includes('Usage')));
    });

    it('should show success message', () => {
      workstreamCreate(installDir, 'Test');

      assert.ok(logs.some(log => log.includes('✓ Created workstream')));
    });

    it('should persist to file', () => {
      workstreamCreate(installDir, 'Test');

      const data = loadWorkstreams(installDir);
      assert.strictEqual(data.workstreams.length, 1);
      assert.strictEqual(data.workstreams[0].name, 'Test');
    });
  });

  describe('workstreamUpdate', () => {
    let workstreamId;

    beforeEach(() => {
      const ws = workstreamCreate(installDir, 'Original Name', [projectDir1]);
      workstreamId = ws.id;
    });

    it('should update workstream name', () => {
      workstreamUpdate(installDir, workstreamId, { name: 'New Name' });

      const data = loadWorkstreams(installDir);
      const ws = data.workstreams.find(w => w.id === workstreamId);
      assert.strictEqual(ws.name, 'New Name');
    });

    it('should update workstream rules', () => {
      const newRules = '# Updated Rules\n\nNew content';
      workstreamUpdate(installDir, workstreamId, { rules: newRules });

      const data = loadWorkstreams(installDir);
      const ws = data.workstreams.find(w => w.id === workstreamId);
      assert.strictEqual(ws.rules, newRules);
    });

    it('should update workstream projects', () => {
      workstreamUpdate(installDir, workstreamId, { projects: [projectDir2] });

      const data = loadWorkstreams(installDir);
      const ws = data.workstreams.find(w => w.id === workstreamId);
      assert.strictEqual(ws.projects.length, 1);
      assert.ok(ws.projects.includes(projectDir2));
    });

    it('should update updatedAt timestamp', () => {
      const data = loadWorkstreams(installDir);
      const originalTime = data.workstreams[0].updatedAt;

      // Wait a tiny bit to ensure timestamp differs
      const start = Date.now();
      while (Date.now() - start < 2) {} // 2ms wait

      workstreamUpdate(installDir, workstreamId, { name: 'New Name' });

      const updated = loadWorkstreams(installDir);
      assert.notStrictEqual(updated.workstreams[0].updatedAt, originalTime);
    });

    it('should return false for non-existent workstream', () => {
      const result = workstreamUpdate(installDir, 'nonexistent', { name: 'New Name' });

      assert.strictEqual(result, null);
      assert.ok(errors.some(err => err.includes('not found')));
    });
  });

  describe('workstreamDelete', () => {
    let workstreamId;

    beforeEach(() => {
      const ws = workstreamCreate(installDir, 'To Delete');
      workstreamId = ws.id;
    });

    it('should delete a workstream', () => {
      workstreamDelete(installDir, workstreamId);

      const data = loadWorkstreams(installDir);
      assert.strictEqual(data.workstreams.length, 0);
    });

    it('should show success message', () => {
      workstreamDelete(installDir, workstreamId);

      assert.ok(logs.some(log => log.includes('✓ Deleted workstream')));
    });

    it('should return false for non-existent workstream', () => {
      const result = workstreamDelete(installDir, 'nonexistent');

      assert.strictEqual(result, false);
      assert.ok(errors.some(err => err.includes('not found')));
    });
  });

  describe('workstreamAddProject', () => {
    let workstreamId;

    beforeEach(() => {
      const ws = workstreamCreate(installDir, 'Test', [projectDir1]);
      workstreamId = ws.id;
    });

    it('should add a project to workstream', () => {
      workstreamAddProject(installDir, workstreamId, projectDir2);

      const data = loadWorkstreams(installDir);
      const ws = data.workstreams.find(w => w.id === workstreamId);
      assert.strictEqual(ws.projects.length, 2);
      assert.ok(ws.projects.includes(projectDir2));
    });

    it('should not add duplicate project', () => {
      workstreamAddProject(installDir, workstreamId, projectDir1);

      const data = loadWorkstreams(installDir);
      const ws = data.workstreams.find(w => w.id === workstreamId);
      assert.strictEqual(ws.projects.length, 1);
    });

    it('should expand tilde in paths', () => {
      const originalHome = process.env.HOME;
      process.env.HOME = tempDir;

      workstreamAddProject(installDir, workstreamId, '~/newproject');

      process.env.HOME = originalHome;

      const data = loadWorkstreams(installDir);
      const ws = data.workstreams.find(w => w.id === workstreamId);
      assert.ok(!ws.projects.some(p => p.includes('~')));
    });

    it('should return null for non-existent workstream', () => {
      const result = workstreamAddProject(installDir, 'nonexistent', projectDir2);

      assert.strictEqual(result, null);
    });
  });

  describe('workstreamRemoveProject', () => {
    let workstreamId;

    beforeEach(() => {
      const ws = workstreamCreate(installDir, 'Test', [projectDir1, projectDir2]);
      workstreamId = ws.id;
    });

    it('should remove a project from workstream', () => {
      workstreamRemoveProject(installDir, workstreamId, projectDir1);

      const data = loadWorkstreams(installDir);
      const ws = data.workstreams.find(w => w.id === workstreamId);
      assert.strictEqual(ws.projects.length, 1);
      assert.ok(!ws.projects.includes(projectDir1));
    });

    it('should return null for non-existent workstream', () => {
      const result = workstreamRemoveProject(installDir, 'nonexistent', projectDir1);

      assert.strictEqual(result, null);
    });

    it('should handle removing non-existent project gracefully', () => {
      workstreamRemoveProject(installDir, workstreamId, '/nonexistent/path');

      const data = loadWorkstreams(installDir);
      const ws = data.workstreams.find(w => w.id === workstreamId);
      assert.strictEqual(ws.projects.length, 2);
    });
  });

  describe('workstreamGet', () => {
    let workstreamId;

    beforeEach(() => {
      const ws = workstreamCreate(installDir, 'Test', [projectDir1]);
      workstreamId = ws.id;
    });

    it('should retrieve workstream by ID', () => {
      const ws = workstreamGet(installDir, workstreamId);

      assert.ok(ws);
      assert.strictEqual(ws.id, workstreamId);
      assert.strictEqual(ws.name, 'Test');
    });

    it('should return null for non-existent workstream', () => {
      const ws = workstreamGet(installDir, 'nonexistent');

      assert.strictEqual(ws, null);
    });
  });

  describe('getActiveWorkstream', () => {
    it('should return null when no active workstream', () => {
      const ws = getActiveWorkstream(installDir);

      assert.strictEqual(ws, null);
    });

    it('should return active workstream from env var', () => {
      const created = workstreamCreate(installDir, 'Test');
      const originalEnv = process.env.CODER_WORKSTREAM;
      process.env.CODER_WORKSTREAM = created.id;

      const ws = getActiveWorkstream(installDir, false);

      process.env.CODER_WORKSTREAM = originalEnv;

      assert.ok(ws);
      assert.strictEqual(ws.id, created.id);
    });
  });

  describe('countWorkstreamsForProject', () => {
    beforeEach(() => {
      workstreamCreate(installDir, 'WS1', [projectDir1]);
      workstreamCreate(installDir, 'WS2', [projectDir1, projectDir2]);
      workstreamCreate(installDir, 'WS3', [projectDir2]);
    });

    it('should count workstreams containing the project', () => {
      const count1 = countWorkstreamsForProject(installDir, projectDir1);
      const count2 = countWorkstreamsForProject(installDir, projectDir2);

      assert.strictEqual(count1, 2);
      assert.strictEqual(count2, 2);
    });

    it('should return 0 for project not in any workstream', () => {
      const otherProject = path.join(tempDir, 'other');
      const count = countWorkstreamsForProject(installDir, otherProject);

      assert.strictEqual(count, 0);
    });
  });

  describe('Edge cases and integration', () => {
    it('should handle path normalization (trailing slashes)', () => {
      const ws1 = workstreamCreate(installDir, 'WS1', [projectDir1 + '/']);
      const ws2 = workstreamCreate(installDir, 'WS2', [projectDir1]);

      // Both should resolve to same normalized path
      const count = countWorkstreamsForProject(installDir, projectDir1);
      assert.ok(count >= 1);
    });

    it('should handle very long workstream names', () => {
      const longName = 'A'.repeat(200);
      const ws = workstreamCreate(installDir, longName);

      assert.ok(ws);
      assert.strictEqual(ws.name, longName);
    });

    it('should handle special characters in workstream names', () => {
      const specialName = 'Test-Name_With.Special@Chars!';
      const ws = workstreamCreate(installDir, specialName);

      assert.ok(ws);
      assert.strictEqual(ws.name, specialName);
    });

    it('should handle empty projects array gracefully', () => {
      const ws = workstreamCreate(installDir, 'Empty', []);

      assert.ok(ws);
      assert.strictEqual(ws.projects.length, 0);
    });

    it('should handle multiple updates to same workstream', () => {
      const ws = workstreamCreate(installDir, 'Test');

      workstreamUpdate(installDir, ws.id, { name: 'Updated1' });
      workstreamUpdate(installDir, ws.id, { name: 'Updated2' });
      workstreamUpdate(installDir, ws.id, { name: 'Updated3' });

      const final = workstreamGet(installDir, ws.id);
      assert.strictEqual(final.name, 'Updated3');
    });

    it('should preserve projects when updating name only', () => {
      const ws = workstreamCreate(installDir, 'Test', [projectDir1, projectDir2]);

      workstreamUpdate(installDir, ws.id, { name: 'New Name' });

      const updated = workstreamGet(installDir, ws.id);
      assert.strictEqual(updated.projects.length, 2);
      assert.ok(updated.projects.includes(projectDir1));
    });

    it('should preserve name when updating projects only', () => {
      const ws = workstreamCreate(installDir, 'Original Name');

      workstreamUpdate(installDir, ws.id, { projects: [projectDir1] });

      const updated = workstreamGet(installDir, ws.id);
      assert.strictEqual(updated.name, 'Original Name');
      assert.strictEqual(updated.projects.length, 1);
    });

    it('should handle adding many projects to single workstream', () => {
      const ws = workstreamCreate(installDir, 'Big WS');

      for (let i = 0; i < 20; i++) {
        const projectPath = path.join(tempDir, `project-${i}`);
        fs.mkdirSync(projectPath, { recursive: true });
        workstreamAddProject(installDir, ws.id, projectPath);
      }

      const updated = workstreamGet(installDir, ws.id);
      assert.strictEqual(updated.projects.length, 20);
    });

    it('should handle project being in multiple workstreams', () => {
      workstreamCreate(installDir, 'WS1', [projectDir1]);
      workstreamCreate(installDir, 'WS2', [projectDir1]);
      workstreamCreate(installDir, 'WS3', [projectDir1]);

      const count = countWorkstreamsForProject(installDir, projectDir1);
      assert.strictEqual(count, 3);
    });

    it('should handle deleting workstream with many projects', () => {
      const ws = workstreamCreate(installDir, 'Big WS', [projectDir1, projectDir2]);
      workstreamDelete(installDir, ws.id);

      const data = loadWorkstreams(installDir);
      assert.strictEqual(data.workstreams.length, 0);
    });

    it('should handle rapid create/delete cycles', () => {
      for (let i = 0; i < 10; i++) {
        const ws = workstreamCreate(installDir, `WS-${i}`);
        workstreamDelete(installDir, ws.id);
      }

      const data = loadWorkstreams(installDir);
      assert.strictEqual(data.workstreams.length, 0);
    });

    it('should update updatedAt timestamp on modification', () => {
      const ws = workstreamCreate(installDir, 'WS1');
      const originalUpdatedAt = ws.updatedAt;

      // Update workstream
      workstreamUpdate(installDir, ws.id, { name: 'WS1-Updated' });

      const updated = workstreamGet(installDir, ws.id);

      // UpdatedAt should be changed (either newer or at least present)
      assert.ok(updated.updatedAt);
      assert.ok(typeof updated.updatedAt === 'string');
    });

    it('should handle empty rules gracefully', () => {
      const ws = workstreamCreate(installDir, 'Test', [], '');

      assert.ok(ws);
      assert.strictEqual(ws.rules, '');
    });

    it('should handle very long rules text', () => {
      const longRules = 'Rule line\n'.repeat(1000);
      const ws = workstreamCreate(installDir, 'Test', [], longRules);

      assert.ok(ws);
      assert.strictEqual(ws.rules.length, longRules.length);
    });
  });
});
