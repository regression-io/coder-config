/**
 * Config finding and merging utilities
 */

const fs = require('fs');
const path = require('path');
const { TOOL_PATHS } = require('./constants');
const { loadJson } = require('./utils');

/**
 * Find project root (has .claude/ directory)
 */
function findProjectRoot(startDir = process.cwd()) {
  let dir = path.resolve(startDir);
  const root = path.parse(dir).root;
  while (dir !== root) {
    if (fs.existsSync(path.join(dir, '.claude'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return null;
}

/**
 * Find ALL .claude/mcps.json configs from cwd up to root (and ~/.claude)
 * Returns array from root to leaf (so child overrides parent when merged)
 */
function findAllConfigs(startDir = process.cwd()) {
  const configs = [];
  let dir = path.resolve(startDir);
  const root = path.parse(dir).root;
  const homeDir = process.env.HOME || '';

  while (dir !== root) {
    const configPath = path.join(dir, '.claude', 'mcps.json');
    if (fs.existsSync(configPath)) {
      configs.unshift({ dir, configPath });
    }
    dir = path.dirname(dir);
  }

  const homeConfig = path.join(homeDir, '.claude', 'mcps.json');
  if (fs.existsSync(homeConfig)) {
    if (!configs.some(c => c.configPath === homeConfig)) {
      configs.unshift({ dir: homeDir, configPath: homeConfig });
    }
  }

  return configs;
}

/**
 * Merge multiple configs (later ones override earlier)
 * Supports `exclude` array to block parent-enabled MCPs
 */
function mergeConfigs(configs) {
  const merged = {
    include: [],
    exclude: [],
    mcpServers: {},
    enabledPlugins: {},
    template: null
  };

  for (const { config } of configs) {
    if (!config) continue;

    // Collect excludes first (child can exclude parent MCPs)
    if (config.exclude && Array.isArray(config.exclude)) {
      for (const mcp of config.exclude) {
        if (!merged.exclude.includes(mcp)) {
          merged.exclude.push(mcp);
        }
      }
    }

    if (config.include && Array.isArray(config.include)) {
      for (const mcp of config.include) {
        if (!merged.include.includes(mcp)) {
          merged.include.push(mcp);
        }
      }
    }

    if (config.mcpServers) {
      Object.assign(merged.mcpServers, config.mcpServers);
    }

    // Merge enabledPlugins - child overrides parent
    // false explicitly disables a parent-enabled plugin
    if (config.enabledPlugins) {
      Object.assign(merged.enabledPlugins, config.enabledPlugins);
    }

    if (config.template) {
      merged.template = config.template;
    }
  }

  // Remove excluded MCPs from the final include list
  merged.include = merged.include.filter(mcp => !merged.exclude.includes(mcp));

  return merged;
}

/**
 * Get project config path
 */
function getConfigPath(installDir, projectDir = null) {
  const dir = projectDir || findProjectRoot() || process.cwd();
  return path.join(dir, '.claude', 'mcps.json');
}

/**
 * Collect files (rules or commands) from all directories in hierarchy
 */
function collectFilesFromHierarchy(configLocations, subdir) {
  const fileMap = new Map();

  for (const { dir } of configLocations) {
    const dirPath = path.join(dir, '.claude', subdir);
    if (fs.existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.md'));
      for (const file of files) {
        fileMap.set(file, {
          file,
          source: dir,
          fullPath: path.join(dirPath, file)
        });
      }
    }
  }

  return Array.from(fileMap.values());
}

/**
 * Find all MCP configs for a specific tool in hierarchy
 */
function findAllConfigsForTool(toolId, startDir = null) {
  const tool = TOOL_PATHS[toolId];
  if (!tool) return [];

  const dir = startDir || findProjectRoot() || process.cwd();
  const homeDir = process.env.HOME || '';
  const configs = [];

  let currentDir = dir;
  const root = path.parse(currentDir).root;

  while (currentDir && currentDir !== root && currentDir !== homeDir) {
    const configPath = path.join(currentDir, tool.projectConfig || `${tool.projectFolder}/mcps.json`);
    if (fs.existsSync(configPath)) {
      configs.push({
        dir: currentDir,
        configPath,
        type: 'project'
      });
    }
    currentDir = path.dirname(currentDir);
  }

  if (tool.globalMcpConfig) {
    const globalPath = tool.globalMcpConfig.replace(/^~/, homeDir);
    if (fs.existsSync(globalPath)) {
      configs.push({
        dir: homeDir,
        configPath: globalPath,
        type: 'global'
      });
    }
  }

  return configs.reverse();
}

module.exports = {
  findProjectRoot,
  findAllConfigs,
  mergeConfigs,
  getConfigPath,
  collectFilesFromHierarchy,
  findAllConfigsForTool,
};
