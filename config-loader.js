#!/usr/bin/env node

/**
 * Claude Code Configuration Loader
 *
 * Uses standard JSON format throughout - no custom YAML.
 * Copy/paste MCP configs from anywhere.
 *
 * Files:
 *   ~/.claude-config/mcp-registry.json   - All available MCPs (copy/paste friendly)
 *   project/.claude/mcps.json            - Which MCPs this project uses
 *   project/.claude/rules/*.md           - Project rules
 *   project/.claude/commands/*.md        - Project commands
 *   project/.mcp.json                    - Generated output for Claude Code
 */

const fs = require('fs');
const path = require('path');

// Import from modular lib
const { VERSION, TOOL_PATHS } = require('./lib/constants');
const { loadJson, saveJson, loadEnvFile, interpolate, resolveEnvVars, copyDirRecursive } = require('./lib/utils');
const { findProjectRoot, findAllConfigs, mergeConfigs, getConfigPath, collectFilesFromHierarchy, findAllConfigsForTool } = require('./lib/config');
const { apply, applyForAntigravity, applyForGemini, detectInstalledTools, applyForTools } = require('./lib/apply');
const { list, add, remove } = require('./lib/mcps');
const { registryList, registryAdd, registryRemove } = require('./lib/registry');
const { init, show } = require('./lib/init');
const { memoryList, memoryInit, memoryAdd, memorySearch } = require('./lib/memory');
const { envList, envSet, envUnset } = require('./lib/env');
const { getProjectsRegistryPath, loadProjectsRegistry, saveProjectsRegistry, projectList, projectAdd, projectRemove } = require('./lib/projects');
const { getWorkstreamsPath, loadWorkstreams, saveWorkstreams, workstreamList, workstreamCreate, workstreamUpdate, workstreamDelete, workstreamUse, workstreamActive, workstreamAddProject, workstreamRemoveProject, workstreamInject, workstreamDetect, workstreamGet, getActiveWorkstream, countWorkstreamsForProject, workstreamInstallHook, workstreamInstallHookGemini, workstreamInstallHookCodex, workstreamDeactivate, workstreamCheckPath } = require('./lib/workstreams');
const { getActivityPath, getDefaultActivity, loadActivity, saveActivity, detectProjectRoot, activityLog, activitySummary, generateWorkstreamName, activitySuggestWorkstreams, activityClear } = require('./lib/activity');
const { runCli } = require('./lib/cli');

class ClaudeConfigManager {
  constructor() {
    this.installDir = process.env.CLAUDE_CONFIG_HOME || path.join(process.env.HOME || '', '.claude-config');

    // Look for registry in multiple places
    const possiblePaths = [
      path.join(__dirname, 'shared', 'mcp-registry.json'),
      path.join(__dirname, 'mcp-registry.json'),
      path.join(this.installDir, 'shared', 'mcp-registry.json')
    ];
    this.registryPath = possiblePaths.find(p => fs.existsSync(p)) || possiblePaths[0];
  }

  // Utils
  loadJson(filePath) { return loadJson(filePath); }
  saveJson(filePath, data) { return saveJson(filePath, data); }
  loadEnvFile(envPath) { return loadEnvFile(envPath); }
  interpolate(obj, env) { return interpolate(obj, env); }
  resolveEnvVars(obj, env) { return resolveEnvVars(obj, env); }
  copyDirRecursive(src, dest) { return copyDirRecursive(src, dest); }

  // Config
  findProjectRoot(startDir) { return findProjectRoot(startDir); }
  findAllConfigs(startDir) { return findAllConfigs(startDir); }
  mergeConfigs(configs) { return mergeConfigs(configs); }
  getConfigPath(projectDir) { return getConfigPath(this.installDir, projectDir); }
  collectFilesFromHierarchy(configLocations, subdir) { return collectFilesFromHierarchy(configLocations, subdir); }
  findAllConfigsForTool(toolId, startDir) { return findAllConfigsForTool(toolId, startDir); }

  getAllRules(startDir = process.cwd()) {
    const configLocations = findAllConfigs(startDir);
    return collectFilesFromHierarchy(configLocations, 'rules');
  }

  getAllCommands(startDir = process.cwd()) {
    const configLocations = findAllConfigs(startDir);
    return collectFilesFromHierarchy(configLocations, 'commands');
  }

  // Apply
  apply(projectDir) { return apply(this.registryPath, projectDir); }
  applyForAntigravity(projectDir) { return applyForAntigravity(this.registryPath, projectDir); }
  applyForGemini(projectDir) { return applyForGemini(this.registryPath, projectDir); }
  detectInstalledTools() { return detectInstalledTools(); }
  getToolPaths() { return TOOL_PATHS; }
  applyForTools(projectDir, tools) { return applyForTools(this.registryPath, projectDir, tools); }

  // MCPs
  list() { return list(this.registryPath); }
  add(mcpNames) { return add(this.registryPath, this.installDir, mcpNames); }
  remove(mcpNames) { return remove(this.installDir, mcpNames); }

  // Registry
  registryList() { return registryList(this.registryPath); }
  registryAdd(name, configJson) { return registryAdd(this.registryPath, name, configJson); }
  registryRemove(name) { return registryRemove(this.registryPath, name); }

  // Init
  init(projectDir) { return init(this.registryPath, projectDir); }
  show(projectDir) { return show(projectDir); }

  // Memory
  memoryList(projectDir) { return memoryList(projectDir); }
  memoryInit(projectDir) { return memoryInit(projectDir); }
  memoryAdd(type, content, projectDir) { return memoryAdd(type, content, projectDir); }
  memorySearch(query, projectDir) { return memorySearch(query, projectDir); }

  // Env
  envList(projectDir) { return envList(projectDir); }
  envSet(key, value, projectDir) { return envSet(key, value, projectDir); }
  envUnset(key, projectDir) { return envUnset(key, projectDir); }

  // Projects
  getProjectsRegistryPath() { return getProjectsRegistryPath(this.installDir); }
  loadProjectsRegistry() { return loadProjectsRegistry(this.installDir); }
  saveProjectsRegistry(registry) { return saveProjectsRegistry(this.installDir, registry); }
  projectList() { return projectList(this.installDir); }
  projectAdd(projectPath, name) { return projectAdd(this.installDir, projectPath, name); }
  projectRemove(nameOrPath) { return projectRemove(this.installDir, nameOrPath); }

  // Workstreams
  getWorkstreamsPath() { return getWorkstreamsPath(this.installDir); }
  loadWorkstreams() { return loadWorkstreams(this.installDir); }
  saveWorkstreams(data) { return saveWorkstreams(this.installDir, data); }
  workstreamList() { return workstreamList(this.installDir); }
  workstreamCreate(name, projects, rules) { return workstreamCreate(this.installDir, name, projects, rules); }
  workstreamUpdate(idOrName, updates) { return workstreamUpdate(this.installDir, idOrName, updates); }
  workstreamDelete(idOrName) { return workstreamDelete(this.installDir, idOrName); }
  workstreamUse(idOrName) { return workstreamUse(this.installDir, idOrName); }
  workstreamActive() { return workstreamActive(this.installDir); }
  workstreamAddProject(idOrName, projectPath) { return workstreamAddProject(this.installDir, idOrName, projectPath); }
  workstreamRemoveProject(idOrName, projectPath) { return workstreamRemoveProject(this.installDir, idOrName, projectPath); }
  workstreamInject(silent) { return workstreamInject(this.installDir, silent); }
  workstreamDetect(dir) { return workstreamDetect(this.installDir, dir); }
  workstreamGet(id) { return workstreamGet(this.installDir, id); }
  getActiveWorkstream() { return getActiveWorkstream(this.installDir); }
  countWorkstreamsForProject(projectPath) { return countWorkstreamsForProject(this.installDir, projectPath); }
  workstreamInstallHook() { return workstreamInstallHook(); }
  workstreamInstallHookGemini() { return workstreamInstallHookGemini(); }
  workstreamInstallHookCodex() { return workstreamInstallHookCodex(); }
  workstreamDeactivate() { return workstreamDeactivate(); }
  workstreamCheckPath(targetPath, silent) { return workstreamCheckPath(this.installDir, targetPath, silent); }

  // Activity
  getActivityPath() { return getActivityPath(this.installDir); }
  loadActivity() { return loadActivity(this.installDir); }
  getDefaultActivity() { return getDefaultActivity(); }
  saveActivity(data) { return saveActivity(this.installDir, data); }
  detectProjectRoot(filePath) { return detectProjectRoot(filePath); }
  activityLog(files, sessionId) { return activityLog(this.installDir, files, sessionId); }
  activitySummary() { return activitySummary(this.installDir); }
  generateWorkstreamName(projects) { return generateWorkstreamName(projects); }
  activitySuggestWorkstreams() { return activitySuggestWorkstreams(this.installDir); }
  activityClear(olderThanDays) { return activityClear(this.installDir, olderThanDays); }

  // Update - check npm for updates or update from local source
  async update(args = []) {
    const https = require('https');
    const { execSync } = require('child_process');

    // Parse args
    const checkOnly = args.includes('--check') || args.includes('-c');
    const sourcePath = args.find(a => !a.startsWith('-'));

    // If source path provided, use local update
    if (sourcePath) {
      return this._updateFromLocal(sourcePath);
    }

    // Check npm for updates
    console.log('Checking for updates...');

    const npmVersion = await this._fetchNpmVersion(https);
    if (!npmVersion) {
      console.error('Failed to check npm registry');
      return false;
    }

    const isNewer = this._isNewerVersion(npmVersion, VERSION);

    if (!isNewer) {
      console.log(`✓ You're up to date (v${VERSION})`);
      return true;
    }

    console.log(`\nUpdate available: v${VERSION} → v${npmVersion}`);

    if (checkOnly) {
      console.log('\nRun "claude-config update" to install the update.');
      return true;
    }

    // Perform npm update
    console.log('\nUpdating via npm...');
    try {
      execSync('npm install -g @regression-io/claude-config@latest', {
        stdio: 'inherit',
        timeout: 120000
      });
      console.log(`\n✅ Updated to v${npmVersion}`);
      console.log('Run "claude-config ui" to restart the UI with the new version.');
      return true;
    } catch (error) {
      console.error('Update failed:', error.message);
      console.log('\nTry manually: npm install -g @regression-io/claude-config@latest');
      return false;
    }
  }

  // Fetch latest version from npm registry
  _fetchNpmVersion(https) {
    return new Promise((resolve) => {
      const url = 'https://registry.npmjs.org/@regression-io/claude-config/latest';
      https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed.version || null);
          } catch (e) {
            resolve(null);
          }
        });
      }).on('error', () => resolve(null));
    });
  }

  // Compare semver versions
  _isNewerVersion(source, installed) {
    if (!source || !installed) return false;
    const parseVersion = (v) => v.split('.').map(n => parseInt(n, 10) || 0);
    const s = parseVersion(source);
    const i = parseVersion(installed);
    for (let j = 0; j < Math.max(s.length, i.length); j++) {
      const sv = s[j] || 0;
      const iv = i[j] || 0;
      if (sv > iv) return true;
      if (sv < iv) return false;
    }
    return false;
  }

  // Update from local source directory
  _updateFromLocal(sourcePath) {
    if (!fs.existsSync(sourcePath)) {
      console.error(`Source not found: ${sourcePath}`);
      return false;
    }

    const files = [
      'config-loader.js',
      'shared/mcp-registry.json',
      'shell/claude-config.zsh'
    ];

    let updated = 0;
    for (const file of files) {
      const src = path.join(sourcePath, file);
      const dest = path.join(this.installDir, file);

      if (fs.existsSync(src)) {
        const destDir = path.dirname(dest);
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        fs.copyFileSync(src, dest);
        console.log(`✓ Updated ${file}`);
        updated++;
      }
    }

    if (updated > 0) {
      console.log(`\n✅ Updated ${updated} item(s)`);
      console.log('Restart your shell or run: source ~/.zshrc');
    } else {
      console.log('No files found to update');
    }

    return updated > 0;
  }

  // Version
  version() {
    console.log(`claude-config v${VERSION}`);
    console.log(`Install: ${this.installDir}`);
    console.log(`Registry: ${this.registryPath}`);
  }
}

// =============================================================================
// CLI
// =============================================================================

if (require.main === module) {
  const manager = new ClaudeConfigManager();
  runCli(manager);
}

module.exports = ClaudeConfigManager;
