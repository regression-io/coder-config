/**
 * Subprojects Routes
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Get subprojects for a directory
 */
function getSubprojectsForDir(manager, config, dir) {
  const subprojects = [];

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith('.')) continue;

      const fullPath = path.join(dir, entry.name);
      const hasGit = fs.existsSync(path.join(fullPath, '.git'));

      if (hasGit) {
        const hasClaudeDir = fs.existsSync(path.join(fullPath, '.claude'));
        const hasPackageJson = fs.existsSync(path.join(fullPath, 'package.json'));
        const hasPyproject = fs.existsSync(path.join(fullPath, 'pyproject.toml'));
        const hasCargoToml = fs.existsSync(path.join(fullPath, 'Cargo.toml'));

        const configPath = path.join(fullPath, '.claude', 'mcps.json');
        const hasConfig = fs.existsSync(configPath);
        const mcpConfig = hasConfig ? manager.loadJson(configPath) : null;

        subprojects.push({
          dir: fullPath,
          name: entry.name,
          relativePath: entry.name,
          hasConfig,
          markers: {
            claude: hasClaudeDir,
            git: hasGit,
            npm: hasPackageJson,
            python: hasPyproject,
            rust: hasCargoToml
          },
          mcpCount: mcpConfig ? (mcpConfig.include?.length || 0) + Object.keys(mcpConfig.mcpServers || {}).length : 0
        });
      }
    }
  } catch (e) {
    // Permission denied or other errors - skip
  }

  // Add manual sub-projects from config
  const manualSubprojects = config.manualSubprojects?.[dir] || [];
  for (const subDir of manualSubprojects) {
    if (subprojects.some(p => p.dir === subDir)) continue;
    if (!fs.existsSync(subDir)) continue;

    const name = path.basename(subDir);
    const hasGit = fs.existsSync(path.join(subDir, '.git'));
    const hasClaudeDir = fs.existsSync(path.join(subDir, '.claude'));
    const hasPackageJson = fs.existsSync(path.join(subDir, 'package.json'));
    const hasPyproject = fs.existsSync(path.join(subDir, 'pyproject.toml'));
    const hasCargoToml = fs.existsSync(path.join(subDir, 'Cargo.toml'));

    const configPath = path.join(subDir, '.claude', 'mcps.json');
    const hasConfig = fs.existsSync(configPath);
    const mcpConfig = hasConfig ? manager.loadJson(configPath) : null;

    let relativePath = path.relative(dir, subDir);
    if (relativePath.startsWith('..')) {
      relativePath = subDir.replace(os.homedir(), '~');
    }

    subprojects.push({
      dir: subDir,
      name,
      relativePath,
      hasConfig,
      isManual: true,
      markers: {
        claude: hasClaudeDir,
        git: hasGit,
        npm: hasPackageJson,
        python: hasPyproject,
        rust: hasCargoToml
      },
      mcpCount: mcpConfig ? (mcpConfig.include?.length || 0) + Object.keys(mcpConfig.mcpServers || {}).length : 0
    });
  }

  // Filter out hidden sub-projects
  const hiddenList = config.hiddenSubprojects?.[dir] || [];
  return subprojects.filter(sub => !hiddenList.includes(sub.dir));
}

/**
 * Add a manual sub-project
 */
function addManualSubproject(config, saveConfig, projectDir, subprojectDir) {
  const resolvedProject = path.resolve(projectDir.replace(/^~/, os.homedir()));
  const resolvedSubproject = path.resolve(subprojectDir.replace(/^~/, os.homedir()));

  if (!fs.existsSync(resolvedSubproject)) {
    return { success: false, error: 'Directory not found' };
  }

  if (!config.manualSubprojects) {
    config.manualSubprojects = {};
  }
  if (!config.manualSubprojects[resolvedProject]) {
    config.manualSubprojects[resolvedProject] = [];
  }

  if (!config.manualSubprojects[resolvedProject].includes(resolvedSubproject)) {
    config.manualSubprojects[resolvedProject].push(resolvedSubproject);
    saveConfig(config);
  }

  return { success: true, resolvedPath: resolvedSubproject };
}

/**
 * Remove a manual sub-project
 */
function removeManualSubproject(config, saveConfig, projectDir, subprojectDir) {
  const resolvedProject = path.resolve(projectDir.replace(/^~/, os.homedir()));
  const resolvedSubproject = path.resolve(subprojectDir.replace(/^~/, os.homedir()));

  if (config.manualSubprojects?.[resolvedProject]) {
    config.manualSubprojects[resolvedProject] =
      config.manualSubprojects[resolvedProject].filter(d => d !== resolvedSubproject);

    if (config.manualSubprojects[resolvedProject].length === 0) {
      delete config.manualSubprojects[resolvedProject];
    }
    saveConfig(config);
  }

  return { success: true };
}

/**
 * Hide a sub-project
 */
function hideSubproject(config, saveConfig, projectDir, subprojectDir) {
  const resolvedProject = path.resolve(projectDir.replace(/^~/, os.homedir()));
  const resolvedSubproject = path.resolve(subprojectDir.replace(/^~/, os.homedir()));

  if (!config.hiddenSubprojects) {
    config.hiddenSubprojects = {};
  }
  if (!config.hiddenSubprojects[resolvedProject]) {
    config.hiddenSubprojects[resolvedProject] = [];
  }

  if (!config.hiddenSubprojects[resolvedProject].includes(resolvedSubproject)) {
    config.hiddenSubprojects[resolvedProject].push(resolvedSubproject);
    saveConfig(config);
  }

  return { success: true };
}

/**
 * Unhide a sub-project
 */
function unhideSubproject(config, saveConfig, projectDir, subprojectDir) {
  const resolvedProject = path.resolve(projectDir.replace(/^~/, os.homedir()));
  const resolvedSubproject = path.resolve(subprojectDir.replace(/^~/, os.homedir()));

  if (config.hiddenSubprojects?.[resolvedProject]) {
    config.hiddenSubprojects[resolvedProject] =
      config.hiddenSubprojects[resolvedProject].filter(d => d !== resolvedSubproject);

    if (config.hiddenSubprojects[resolvedProject].length === 0) {
      delete config.hiddenSubprojects[resolvedProject];
    }
    saveConfig(config);
  }

  return { success: true };
}

/**
 * Get hidden subprojects
 */
function getHiddenSubprojects(config, projectDir) {
  const resolvedProject = path.resolve(projectDir.replace(/^~/, os.homedir()));
  const hiddenList = config.hiddenSubprojects?.[resolvedProject] || [];

  return hiddenList.map(dir => ({
    dir,
    name: path.basename(dir),
    exists: fs.existsSync(dir)
  }));
}

module.exports = {
  getSubprojectsForDir,
  addManualSubproject,
  removeManualSubproject,
  hideSubproject,
  unhideSubproject,
  getHiddenSubprojects,
};
