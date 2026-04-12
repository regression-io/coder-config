/**
 * Claude Code Router (CCR) configuration management
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CCR_DIR_NAME = '.claude-code-router';
const CONFIG_FILE = 'config.json';
const PRESET_DIR_NAME = 'coder-config-presets';
const CCR_PORT = 3456;

/**
 * Get path to CCR config file
 */
function getConfigPath() {
  const homeDir = process.env.HOME || '';
  return path.join(homeDir, CCR_DIR_NAME, CONFIG_FILE);
}

/**
 * Read and parse CCR config, return {} if missing or invalid
 */
function getConfig() {
  const configPath = getConfigPath();
  try {
    if (!fs.existsSync(configPath)) return {};
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch {
    return {};
  }
}

/**
 * Write config JSON, creating directory if needed
 */
function saveConfig(config) {
  const configPath = getConfigPath();
  const dir = path.dirname(configPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
}

/**
 * Return Providers array from config, or []
 */
function listProviders() {
  const config = getConfig();
  return Array.isArray(config.Providers) ? config.Providers : [];
}

/**
 * Add or replace a provider by name
 */
function addProvider(name, providerConfig) {
  const config = getConfig();
  if (!Array.isArray(config.Providers)) {
    config.Providers = [];
  }
  // Remove existing provider with same name
  config.Providers = config.Providers.filter(p => p.name !== name);
  config.Providers.push({ name, ...providerConfig });
  saveConfig(config);
}

/**
 * Remove a provider by name
 */
function removeProvider(name) {
  const config = getConfig();
  if (!Array.isArray(config.Providers)) return;
  config.Providers = config.Providers.filter(p => p.name !== name);
  saveConfig(config);
}

/**
 * Return Router rules object or {}
 */
function getRouterRules() {
  const config = getConfig();
  return config.Router || {};
}

/**
 * Set a single router rule (task -> providerModel string)
 */
function setRouterRule(task, providerModel) {
  const config = getConfig();
  if (!config.Router) {
    config.Router = {};
  }
  config.Router[task] = providerModel;
  saveConfig(config);
}

/**
 * Return environment variables needed to activate CCR proxy
 */
function getActivationEnv() {
  const config = getConfig();
  return {
    ANTHROPIC_BASE_URL: `http://127.0.0.1:${CCR_PORT}`,
    ANTHROPIC_AUTH_TOKEN: config.APIKEY || '',
    NO_PROXY: '127.0.0.1',
    DISABLE_TELEMETRY: '1',
    DISABLE_COST_WARNINGS: '1',
  };
}

/**
 * Check CCR installation and running status
 */
function getStatus() {
  let installed = false;
  try {
    execSync('which ccr', { stdio: 'pipe' });
    installed = true;
  } catch {
    // not installed
  }

  let running = false;
  try {
    execSync(`lsof -i :${CCR_PORT}`, { stdio: 'pipe' });
    running = true;
  } catch {
    // not running
  }

  const configExists = fs.existsSync(getConfigPath());

  return { installed, running, configExists };
}

/**
 * Get presets directory path
 */
function getPresetsDir() {
  const homeDir = process.env.HOME || '';
  return path.join(homeDir, CCR_DIR_NAME, PRESET_DIR_NAME);
}

/**
 * List saved presets (names without .json extension)
 */
function listPresets() {
  const presetsDir = getPresetsDir();
  if (!fs.existsSync(presetsDir)) return [];
  return fs.readdirSync(presetsDir)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace(/\.json$/, ''));
}

/**
 * Snapshot current config to a named preset
 */
function savePreset(name) {
  const config = getConfig();
  const presetsDir = getPresetsDir();
  fs.mkdirSync(presetsDir, { recursive: true });
  fs.writeFileSync(path.join(presetsDir, `${name}.json`), JSON.stringify(config, null, 2) + '\n');
}

/**
 * Restore config from a named preset
 */
function loadPreset(name) {
  const presetPath = path.join(getPresetsDir(), `${name}.json`);
  if (!fs.existsSync(presetPath)) {
    throw new Error(`Preset "${name}" not found`);
  }
  const config = JSON.parse(fs.readFileSync(presetPath, 'utf8'));
  saveConfig(config);
}

module.exports = {
  getConfigPath,
  getConfig,
  saveConfig,
  listProviders,
  addProvider,
  removeProvider,
  getRouterRules,
  setRouterRule,
  getActivationEnv,
  getStatus,
  listPresets,
  savePreset,
  loadPreset,
};
