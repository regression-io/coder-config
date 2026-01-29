const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  getProjectsRegistryPath,
  loadProjectsRegistry,
  saveProjectsRegistry,
  projectAdd,
  projectRemove,
} = require('../lib/projects.js');

describe('projects', () => {
  let tempDir;
  let installDir;
  let originalLog;
  let originalError;
  let originalHome;
  let logs;
  let errors;

  before(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'projects-test-'));
    originalLog = console.log;
    originalError = console.error;
    originalHome = process.env.HOME;
  });

  after(() => {
    console.log = originalLog;
    console.error = originalError;
    process.env.HOME = originalHome;
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

  describe('getProjectsRegistryPath', () => {
    it('should return path to projects.json', () => {
      const registryPath = getProjectsRegistryPath(installDir);

      assert.strictEqual(registryPath, path.join(installDir, 'projects.json'));
    });
  });

  describe('loadProjectsRegistry', () => {
    it('should return default structure when file does not exist', () => {
      const registry = loadProjectsRegistry(installDir);

      assert.ok(Array.isArray(registry.projects));
      assert.strictEqual(registry.projects.length, 0);
      assert.strictEqual(registry.activeProjectId, null);
    });

    it('should load existing registry', () => {
      const registryPath = getProjectsRegistryPath(installDir);
      const data = {
        projects: [{ id: '1', name: 'Test', path: '/test' }],
        activeProjectId: '1'
      };
      fs.writeFileSync(registryPath, JSON.stringify(data));

      const registry = loadProjectsRegistry(installDir);

      assert.strictEqual(registry.projects.length, 1);
      assert.strictEqual(registry.projects[0].name, 'Test');
      assert.strictEqual(registry.activeProjectId, '1');
    });

    it('should return default structure when JSON is invalid', () => {
      const registryPath = getProjectsRegistryPath(installDir);
      fs.writeFileSync(registryPath, 'invalid json');

      const registry = loadProjectsRegistry(installDir);

      assert.ok(Array.isArray(registry.projects));
      assert.strictEqual(registry.projects.length, 0);
    });
  });

  describe('saveProjectsRegistry', () => {
    it('should save registry to file', () => {
      const registry = {
        projects: [{ id: '1', name: 'Test', path: '/test' }],
        activeProjectId: '1'
      };

      saveProjectsRegistry(installDir, registry);

      const registryPath = getProjectsRegistryPath(installDir);
      assert.ok(fs.existsSync(registryPath));

      const loaded = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
      assert.strictEqual(loaded.projects[0].name, 'Test');
    });

    it('should format JSON with proper indentation', () => {
      const registry = { projects: [], activeProjectId: null };

      saveProjectsRegistry(installDir, registry);

      const registryPath = getProjectsRegistryPath(installDir);
      const content = fs.readFileSync(registryPath, 'utf8');

      assert.ok(content.includes('\n'));
    });

    it('should end file with newline', () => {
      const registry = { projects: [], activeProjectId: null };

      saveProjectsRegistry(installDir, registry);

      const registryPath = getProjectsRegistryPath(installDir);
      const content = fs.readFileSync(registryPath, 'utf8');

      assert.ok(content.endsWith('\n'));
    });
  });

  describe('projectAdd', () => {
    let testProjectPath;

    beforeEach(() => {
      testProjectPath = path.join(tempDir, `test-project-${Date.now()}`);
      fs.mkdirSync(testProjectPath, { recursive: true });
    });

    it('should add project to registry', () => {
      const result = projectAdd(installDir, testProjectPath);

      assert.strictEqual(result, true);

      const registry = loadProjectsRegistry(installDir);
      assert.strictEqual(registry.projects.length, 1);
      assert.strictEqual(registry.projects[0].path, testProjectPath);
    });

    it('should use basename as default name', () => {
      projectAdd(installDir, testProjectPath);

      const registry = loadProjectsRegistry(installDir);
      assert.strictEqual(registry.projects[0].name, path.basename(testProjectPath));
    });

    it('should use custom name when provided', () => {
      projectAdd(installDir, testProjectPath, 'Custom Name');

      const registry = loadProjectsRegistry(installDir);
      assert.strictEqual(registry.projects[0].name, 'Custom Name');
    });

    it('should generate unique ID for project', () => {
      projectAdd(installDir, testProjectPath);

      const registry = loadProjectsRegistry(installDir);
      assert.ok(registry.projects[0].id);
      assert.ok(typeof registry.projects[0].id === 'string');
      assert.ok(registry.projects[0].id.length > 0);
    });

    it('should set addedAt timestamp', () => {
      projectAdd(installDir, testProjectPath);

      const registry = loadProjectsRegistry(installDir);
      assert.ok(registry.projects[0].addedAt);
      assert.ok(new Date(registry.projects[0].addedAt).getTime() > 0);
    });

    it('should initialize lastOpened as null', () => {
      projectAdd(installDir, testProjectPath);

      const registry = loadProjectsRegistry(installDir);
      assert.strictEqual(registry.projects[0].lastOpened, null);
    });

    it('should set first project as active', () => {
      projectAdd(installDir, testProjectPath);

      const registry = loadProjectsRegistry(installDir);
      assert.strictEqual(registry.activeProjectId, registry.projects[0].id);
    });

    it('should not change active project when adding second project', () => {
      const project1 = path.join(tempDir, 'project1');
      const project2 = path.join(tempDir, 'project2');
      fs.mkdirSync(project1);
      fs.mkdirSync(project2);

      projectAdd(installDir, project1);
      const registry1 = loadProjectsRegistry(installDir);
      const firstId = registry1.activeProjectId;

      projectAdd(installDir, project2);
      const registry2 = loadProjectsRegistry(installDir);

      assert.strictEqual(registry2.activeProjectId, firstId);
    });

    it('should resolve absolute path', () => {
      const relativePath = path.relative(process.cwd(), testProjectPath);
      projectAdd(installDir, relativePath);

      const registry = loadProjectsRegistry(installDir);
      assert.strictEqual(registry.projects[0].path, testProjectPath);
    });

    it('should expand tilde in path', () => {
      process.env.HOME = tempDir;
      const homeProject = path.join(tempDir, `home-project-add-${Date.now()}`);
      fs.mkdirSync(homeProject);

      projectAdd(installDir, `~/${path.basename(homeProject)}`);

      const registry = loadProjectsRegistry(installDir);
      assert.strictEqual(registry.projects[0].path, homeProject);

      process.env.HOME = originalHome;
    });

    it('should not add duplicate paths', () => {
      projectAdd(installDir, testProjectPath);
      const result = projectAdd(installDir, testProjectPath);

      assert.strictEqual(result, false);
      assert.ok(logs.some(log => log.includes('Already registered')));

      const registry = loadProjectsRegistry(installDir);
      assert.strictEqual(registry.projects.length, 1);
    });

    it('should show error for non-existent path', () => {
      const result = projectAdd(installDir, '/nonexistent/path');

      assert.strictEqual(result, false);
      assert.ok(errors.some(err => err.includes('Path not found')));
    });

    it('should show success message', () => {
      projectAdd(installDir, testProjectPath);

      assert.ok(logs.some(log => log.includes('✓ Added project')));
    });

    it('should use cwd when no path provided', () => {
      const originalCwd = process.cwd();
      process.chdir(testProjectPath);

      projectAdd(installDir);

      process.chdir(originalCwd);

      const registry = loadProjectsRegistry(installDir);
      // Use realpath to resolve symlinks (e.g., /var -> /private/var on macOS)
      assert.strictEqual(
        fs.realpathSync(registry.projects[0].path),
        fs.realpathSync(testProjectPath)
      );
    });
  });

  describe('projectRemove', () => {
    let project1Path, project2Path, project3Path;

    beforeEach(() => {
      project1Path = path.join(tempDir, 'project1');
      project2Path = path.join(tempDir, 'project2');
      project3Path = path.join(tempDir, 'project3');

      [project1Path, project2Path, project3Path].forEach(p => {
        fs.mkdirSync(p, { recursive: true });
      });

      projectAdd(installDir, project1Path, 'Project 1');
      projectAdd(installDir, project2Path, 'Project 2');
      projectAdd(installDir, project3Path, 'Project 3');

      logs = []; // Clear setup logs
    });

    it('should remove project by name', () => {
      const result = projectRemove(installDir, 'Project 2');

      assert.strictEqual(result, true);

      const registry = loadProjectsRegistry(installDir);
      assert.strictEqual(registry.projects.length, 2);
      assert.ok(!registry.projects.some(p => p.name === 'Project 2'));
    });

    it('should remove project by path', () => {
      const result = projectRemove(installDir, project2Path);

      assert.strictEqual(result, true);

      const registry = loadProjectsRegistry(installDir);
      assert.strictEqual(registry.projects.length, 2);
      assert.ok(!registry.projects.some(p => p.path === project2Path));
    });

    it('should preserve other projects', () => {
      projectRemove(installDir, 'Project 2');

      const registry = loadProjectsRegistry(installDir);
      assert.ok(registry.projects.some(p => p.name === 'Project 1'));
      assert.ok(registry.projects.some(p => p.name === 'Project 3'));
    });

    it('should update active project if removed was active', () => {
      const registry = loadProjectsRegistry(installDir);
      const activeId = registry.activeProjectId;
      const activeName = registry.projects.find(p => p.id === activeId).name;

      projectRemove(installDir, activeName);

      const updatedRegistry = loadProjectsRegistry(installDir);
      assert.ok(updatedRegistry.activeProjectId !== activeId);
      assert.ok(updatedRegistry.activeProjectId === updatedRegistry.projects[0].id);
    });

    it('should set activeProjectId to null when removing last project', () => {
      projectRemove(installDir, 'Project 1');
      projectRemove(installDir, 'Project 2');
      projectRemove(installDir, 'Project 3');

      const registry = loadProjectsRegistry(installDir);
      assert.strictEqual(registry.activeProjectId, null);
    });

    it('should show success message', () => {
      projectRemove(installDir, 'Project 1');

      assert.ok(logs.some(log => log.includes('✓ Removed project')));
    });

    it('should show error when name/path not provided', () => {
      const result = projectRemove(installDir, null);

      assert.strictEqual(result, false);
      assert.ok(errors.some(err => err.includes('Usage:')));
    });

    it('should show error when project not found', () => {
      const result = projectRemove(installDir, 'Nonexistent Project');

      assert.strictEqual(result, false);
      assert.ok(errors.some(err => err.includes('not found')));
    });

    it('should handle tilde in path when removing', () => {
      process.env.HOME = tempDir;
      const homeProject = path.join(tempDir, `home-project-remove-${Date.now()}`);
      fs.mkdirSync(homeProject);

      projectAdd(installDir, homeProject);
      const result = projectRemove(installDir, `~/${path.basename(homeProject)}`);

      assert.strictEqual(result, true);

      process.env.HOME = originalHome;
    });
  });

  describe('projects integration', () => {
    it('should add, list, and remove projects', () => {
      const project1 = path.join(tempDir, 'int-project1');
      const project2 = path.join(tempDir, 'int-project2');

      fs.mkdirSync(project1);
      fs.mkdirSync(project2);

      // Add
      projectAdd(installDir, project1);
      projectAdd(installDir, project2);

      // Check
      let registry = loadProjectsRegistry(installDir);
      assert.strictEqual(registry.projects.length, 2);

      // Remove
      projectRemove(installDir, path.basename(project1));

      // Check again
      registry = loadProjectsRegistry(installDir);
      assert.strictEqual(registry.projects.length, 1);
      assert.strictEqual(registry.projects[0].path, project2);
    });

    it('should handle multiple operations preserving data integrity', () => {
      const projects = [];
      for (let i = 1; i <= 5; i++) {
        const p = path.join(tempDir, `multi-project${i}`);
        fs.mkdirSync(p);
        projects.push(p);
        projectAdd(installDir, p, `Project ${i}`);
      }

      let registry = loadProjectsRegistry(installDir);
      assert.strictEqual(registry.projects.length, 5);

      // Remove some
      projectRemove(installDir, 'Project 2');
      projectRemove(installDir, 'Project 4');

      registry = loadProjectsRegistry(installDir);
      assert.strictEqual(registry.projects.length, 3);

      // Verify remaining projects
      const names = registry.projects.map(p => p.name);
      assert.ok(names.includes('Project 1'));
      assert.ok(names.includes('Project 3'));
      assert.ok(names.includes('Project 5'));
      assert.ok(!names.includes('Project 2'));
      assert.ok(!names.includes('Project 4'));
    });
  });
});
