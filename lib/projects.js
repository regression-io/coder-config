/**
 * Project registry for UI project switching
 */

const fs = require('fs');
const path = require('path');
const { loadJson, saveJson } = require('./utils');

/**
 * Get projects registry path
 */
function getProjectsRegistryPath(installDir) {
  return path.join(installDir, 'projects.json');
}

/**
 * Load projects registry
 */
function loadProjectsRegistry(installDir) {
  const registryPath = getProjectsRegistryPath(installDir);
  if (fs.existsSync(registryPath)) {
    try {
      return JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    } catch (e) {
      return { projects: [], activeProjectId: null };
    }
  }
  return { projects: [], activeProjectId: null };
}

/**
 * Save projects registry
 */
function saveProjectsRegistry(installDir, registry) {
  const registryPath = getProjectsRegistryPath(installDir);
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2) + '\n');
}

/**
 * List registered projects
 */
function projectList(installDir) {
  const registry = loadProjectsRegistry(installDir);

  if (registry.projects.length === 0) {
    console.log('\nNo projects registered.');
    console.log('Add one with: coder-config project add [path]\n');
    return;
  }

  console.log('\n📁 Registered Projects:\n');
  for (const p of registry.projects) {
    const active = p.id === registry.activeProjectId ? '→ ' : '  ';
    const exists = fs.existsSync(p.path) ? '' : ' (not found)';
    console.log(`${active}${p.name}${exists}`);
    console.log(`    ${p.path}`);
  }
  console.log('');
}

/**
 * Add project to registry
 */
function projectAdd(installDir, projectPath = process.cwd(), name = null) {
  const absPath = path.resolve(projectPath.replace(/^~/, process.env.HOME || ''));

  if (!fs.existsSync(absPath)) {
    console.error(`Path not found: ${absPath}`);
    return false;
  }

  const registry = loadProjectsRegistry(installDir);

  if (registry.projects.some(p => p.path === absPath)) {
    console.log(`Already registered: ${absPath}`);
    return false;
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
  }

  saveProjectsRegistry(installDir, registry);
  console.log(`✓ Added project: ${project.name}`);
  console.log(`  ${absPath}`);
  return true;
}

/**
 * Remove project from registry
 */
function projectRemove(installDir, nameOrPath) {
  if (!nameOrPath) {
    console.error('Usage: coder-config project remove <name|path>');
    return false;
  }

  const registry = loadProjectsRegistry(installDir);
  const absPath = path.resolve(nameOrPath.replace(/^~/, process.env.HOME || ''));

  const idx = registry.projects.findIndex(
    p => p.name === nameOrPath || p.path === absPath
  );

  if (idx === -1) {
    console.error(`Project not found: ${nameOrPath}`);
    return false;
  }

  const removed = registry.projects.splice(idx, 1)[0];

  if (registry.activeProjectId === removed.id) {
    registry.activeProjectId = registry.projects[0]?.id || null;
  }

  saveProjectsRegistry(installDir, registry);
  console.log(`✓ Removed project: ${removed.name}`);
  return true;
}

module.exports = {
  getProjectsRegistryPath,
  loadProjectsRegistry,
  saveProjectsRegistry,
  projectList,
  projectAdd,
  projectRemove,
};
