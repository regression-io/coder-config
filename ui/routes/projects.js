/**
 * Projects Registry Routes
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

/**
 * Get all registered projects with status info
 */
function getProjects(manager, projectDir) {
  if (!manager) {
    return { projects: [], activeProjectId: null, error: 'Manager not available' };
  }

  const registry = manager.loadProjectsRegistry();

  const projects = registry.projects.map(p => ({
    ...p,
    exists: fs.existsSync(p.path),
    hasClaudeConfig: fs.existsSync(path.join(p.path, '.claude')),
    isActive: p.id === registry.activeProjectId
  }));

  projects.sort((a, b) => {
    if (a.isActive) return -1;
    if (b.isActive) return 1;
    if (a.lastOpened && b.lastOpened) {
      return new Date(b.lastOpened) - new Date(a.lastOpened);
    }
    return 0;
  });

  return {
    projects,
    activeProjectId: registry.activeProjectId,
    currentDir: projectDir
  };
}

/**
 * Get active project details
 */
function getActiveProject(manager, projectDir, getHierarchy, getSubprojects) {
  if (!manager) return { error: 'Manager not available' };

  const registry = manager.loadProjectsRegistry();
  const activeProject = registry.projects.find(p => p.id === registry.activeProjectId);

  return {
    project: activeProject || null,
    dir: projectDir,
    hierarchy: getHierarchy(),
    subprojects: getSubprojects()
  };
}

/**
 * Add a project to the registry
 * @param {boolean} runClaudeInit - If true, run `claude /init` to create CLAUDE.md
 */
function addProject(manager, projectPath, name, setProjectDir, runClaudeInit = false) {
  if (!manager) return { error: 'Manager not available' };

  const absPath = path.resolve(projectPath.replace(/^~/, os.homedir()));

  if (!fs.existsSync(absPath)) {
    return { error: 'Path not found', path: absPath };
  }

  const registry = manager.loadProjectsRegistry();

  if (registry.projects.some(p => p.path === absPath)) {
    return { error: 'Project already registered', path: absPath };
  }

  const claudeDir = path.join(absPath, '.claude');
  const claudeMd = path.join(absPath, 'CLAUDE.md');
  const mcpsFile = path.join(claudeDir, 'mcps.json');
  let claudeInitRan = false;
  let claudeInitError = null;

  // Run claude /init if requested and CLAUDE.md doesn't exist
  if (runClaudeInit && !fs.existsSync(claudeMd)) {
    try {
      execFileSync('claude', ['-p', '/init'], {
        cwd: absPath,
        stdio: 'pipe',
        timeout: 30000
      });
      claudeInitRan = true;
    } catch (err) {
      // Claude Code not installed or init failed
      claudeInitError = err.message;
    }
  }

  // Ensure .claude/mcps.json exists (for claude-config to work)
  if (!fs.existsSync(claudeDir)) {
    fs.mkdirSync(claudeDir, { recursive: true });
  }
  if (!fs.existsSync(mcpsFile)) {
    fs.writeFileSync(mcpsFile, JSON.stringify({ mcpServers: {} }, null, 2));
  }

  const project = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
    name: name || path.basename(absPath),
    path: absPath,
    addedAt: new Date().toISOString(),
    lastOpened: null
  };

  registry.projects.push(project);

  if (!registry.activeProjectId) {
    registry.activeProjectId = project.id;
    setProjectDir(absPath);
  }

  manager.saveProjectsRegistry(registry);

  return {
    success: true,
    project,
    claudeInitRan,
    claudeInitError
  };
}

/**
 * Remove a project from the registry
 */
function removeProject(manager, projectId, setProjectDir) {
  if (!manager) return { error: 'Manager not available' };

  const registry = manager.loadProjectsRegistry();
  const idx = registry.projects.findIndex(p => p.id === projectId);

  if (idx === -1) {
    return { error: 'Project not found' };
  }

  const removed = registry.projects.splice(idx, 1)[0];

  if (registry.activeProjectId === projectId) {
    registry.activeProjectId = registry.projects[0]?.id || null;
    if (registry.projects[0]) {
      setProjectDir(registry.projects[0].path);
    }
  }

  manager.saveProjectsRegistry(registry);

  return { success: true, removed };
}

/**
 * Set active project and switch server context
 */
function setActiveProject(manager, projectId, setProjectDir, getHierarchy, getSubprojects) {
  if (!manager) return { error: 'Manager not available' };

  const registry = manager.loadProjectsRegistry();
  const project = registry.projects.find(p => p.id === projectId);

  if (!project) {
    return { error: 'Project not found' };
  }

  if (!fs.existsSync(project.path)) {
    return { error: 'Project path no longer exists', path: project.path };
  }

  registry.activeProjectId = projectId;
  project.lastOpened = new Date().toISOString();
  manager.saveProjectsRegistry(registry);

  setProjectDir(project.path);

  return {
    success: true,
    project,
    dir: project.path,
    hierarchy: getHierarchy(),
    subprojects: getSubprojects()
  };
}

module.exports = {
  getProjects,
  getActiveProject,
  addProject,
  removeProject,
  setActiveProject,
};
