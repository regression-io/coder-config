/**
 * Router Routes (Claude Code Router)
 */

const { execSync } = require('child_process');

/**
 * Get router status (running, version, active model)
 */
function getStatus(manager) {
  if (!manager) return { error: 'Manager not available' };
  return manager.routerGetStatus();
}

/**
 * Get full router configuration
 */
function getConfig(manager) {
  if (!manager) return { error: 'Manager not available' };
  return manager.routerGetConfig();
}

/**
 * Save full router configuration
 */
function saveConfig(manager, body) {
  if (!manager) return { error: 'Manager not available' };
  try {
    manager.routerSaveConfig(body);
    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * List all configured providers
 */
function getProviders(manager) {
  if (!manager) return { error: 'Manager not available' };
  return { providers: manager.routerListProviders() };
}

/**
 * Add a provider
 */
function addProvider(manager, body) {
  if (!manager) return { error: 'Manager not available' };
  const { name, config } = body || {};
  if (!name || !config) {
    return { error: 'Provider name and config are required' };
  }
  try {
    manager.routerAddProvider(name, config);
    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * Remove a provider by name
 */
function removeProvider(manager, name) {
  if (!manager) return { error: 'Manager not available' };
  if (!name) {
    return { error: 'Provider name is required' };
  }
  try {
    manager.routerRemoveProvider(name);
    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * Get task routing rules
 */
function getRules(manager) {
  if (!manager) return { error: 'Manager not available' };
  return { rules: manager.routerGetRules() };
}

/**
 * Set a routing rule for a task
 */
function setRule(manager, body) {
  if (!manager) return { error: 'Manager not available' };
  const { task, providerModel } = body || {};
  if (!task || !providerModel) {
    return { error: 'Task and providerModel are required' };
  }
  try {
    manager.routerSetRule(task, providerModel);
    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * List saved presets
 */
function getPresets(manager) {
  if (!manager) return { error: 'Manager not available' };
  return { presets: manager.routerListPresets() };
}

/**
 * Save current config as a named preset
 */
function savePreset(manager, body) {
  if (!manager) return { error: 'Manager not available' };
  const { name } = body || {};
  if (!name) {
    return { error: 'Preset name is required' };
  }
  try {
    manager.routerSavePreset(name);
    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * Load a named preset
 */
function loadPreset(manager, body) {
  if (!manager) return { error: 'Manager not available' };
  const { name } = body || {};
  if (!name) {
    return { error: 'Preset name is required' };
  }
  try {
    manager.routerLoadPreset(name);
    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * Start the CCR proxy process
 */
function startProxy() {
  try {
    execSync('ccr code', { stdio: 'pipe', timeout: 5000 });
    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * Stop the CCR proxy process
 */
function stopProxy() {
  try {
    execSync('ccr stop', { stdio: 'pipe', timeout: 5000 });
    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
}

module.exports = {
  getStatus,
  getConfig,
  saveConfig,
  getProviders,
  addProvider,
  removeProvider,
  getRules,
  setRule,
  getPresets,
  savePreset,
  loadPreset,
  startProxy,
  stopProxy,
};
