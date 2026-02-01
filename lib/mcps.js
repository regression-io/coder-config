/**
 * MCP add/remove commands
 */

const fs = require('fs');
const path = require('path');
const { loadJson, saveJson } = require('./utils');
const { findProjectRoot } = require('./config');

/**
 * Get path to Claude's global config (~/.claude.json)
 */
function getGlobalConfigPath() {
  const homeDir = process.env.HOME || '';
  return path.join(homeDir, '.claude.json');
}

/**
 * List available MCPs
 */
function list(registryPath) {
  const registry = loadJson(registryPath);
  if (!registry || !registry.mcpServers) {
    console.error('Error: Could not load MCP registry');
    return;
  }

  const dir = findProjectRoot();
  const projectConfig = dir ? loadJson(path.join(dir, '.claude', 'mcps.json')) : null;
  const included = projectConfig?.include || [];

  console.log('\n📚 Available MCPs:\n');
  for (const name of Object.keys(registry.mcpServers)) {
    const active = included.includes(name) ? ' ✓' : '';
    console.log(`  • ${name}${active}`);
  }
  console.log(`\n  Total: ${Object.keys(registry.mcpServers).length} in registry`);
  if (included.length) {
    console.log(`  Active: ${included.join(', ')}`);
  }
  console.log('');
}

/**
 * Add MCP(s) to current project
 */
function add(registryPath, installDir, mcpNames) {
  if (!mcpNames || mcpNames.length === 0) {
    console.error('Usage: coder-config add <mcp-name> [mcp-name...]');
    return false;
  }

  const dir = findProjectRoot() || process.cwd();
  const configPath = path.join(dir, '.claude', 'mcps.json');
  let config = loadJson(configPath);

  if (!config) {
    console.error('No .claude/mcps.json found. Run: coder-config init');
    return false;
  }

  const registry = loadJson(registryPath);
  if (!config.include) config.include = [];

  const added = [];
  const notFound = [];
  const alreadyExists = [];

  for (const name of mcpNames) {
    if (config.include.includes(name)) {
      alreadyExists.push(name);
    } else if (registry?.mcpServers?.[name]) {
      config.include.push(name);
      added.push(name);
    } else {
      notFound.push(name);
    }
  }

  if (added.length) {
    saveJson(configPath, config);
    console.log(`✓ Added: ${added.join(', ')}`);
  }
  if (alreadyExists.length) {
    console.log(`Already included: ${alreadyExists.join(', ')}`);
  }
  if (notFound.length) {
    console.log(`Not in registry: ${notFound.join(', ')}`);
    console.log('  (Use "coder-config list" to see available MCPs)');
  }

  if (added.length) {
    console.log('\nRun "coder-config apply" to regenerate .mcp.json');
  }

  return added.length > 0;
}

/**
 * Remove MCP(s) from current project
 */
function remove(installDir, mcpNames) {
  if (!mcpNames || mcpNames.length === 0) {
    console.error('Usage: coder-config remove <mcp-name> [mcp-name...]');
    return false;
  }

  const dir = findProjectRoot() || process.cwd();
  const configPath = path.join(dir, '.claude', 'mcps.json');
  let config = loadJson(configPath);

  if (!config) {
    console.error('No .claude/mcps.json found');
    return false;
  }

  if (!config.include) config.include = [];

  const removed = [];
  const notFound = [];

  for (const name of mcpNames) {
    const idx = config.include.indexOf(name);
    if (idx !== -1) {
      config.include.splice(idx, 1);
      removed.push(name);
    } else {
      notFound.push(name);
    }
  }

  if (removed.length) {
    saveJson(configPath, config);
    console.log(`✓ Removed: ${removed.join(', ')}`);
    console.log('\nRun "coder-config apply" to regenerate .mcp.json');
  }
  if (notFound.length) {
    console.log(`Not in project: ${notFound.join(', ')}`);
  }

  return removed.length > 0;
}

/**
 * List global MCPs from ~/.claude.json
 */
function listGlobal() {
  const configPath = getGlobalConfigPath();
  const config = loadJson(configPath);

  if (!config || !config.mcpServers) {
    console.log('\n📚 Global MCPs (~/.claude.json): None configured\n');
    return;
  }

  const mcps = Object.keys(config.mcpServers);
  console.log('\n📚 Global MCPs (~/.claude.json):\n');
  for (const name of mcps) {
    const server = config.mcpServers[name];
    const type = server.type || 'stdio';
    console.log(`  • ${name} (${type})`);
  }
  console.log(`\n  Total: ${mcps.length} global MCP(s)\n`);
}

/**
 * Add MCP(s) to global config (~/.claude.json)
 */
function addGlobal(registryPath, mcpNames) {
  if (!mcpNames || mcpNames.length === 0) {
    console.error('Usage: coder-config global add <mcp-name> [mcp-name...]');
    return false;
  }

  const configPath = getGlobalConfigPath();
  let config = loadJson(configPath) || {};

  if (!config.mcpServers) {
    config.mcpServers = {};
  }

  const registry = loadJson(registryPath);
  const added = [];
  const notFound = [];
  const alreadyExists = [];

  for (const name of mcpNames) {
    if (config.mcpServers[name]) {
      alreadyExists.push(name);
    } else if (registry?.mcpServers?.[name]) {
      config.mcpServers[name] = registry.mcpServers[name];
      added.push(name);
    } else {
      notFound.push(name);
    }
  }

  if (added.length) {
    saveJson(configPath, config);
    console.log(`✓ Added to ~/.claude.json: ${added.join(', ')}`);
    console.log('  (Global MCPs apply to all projects)');
  }
  if (alreadyExists.length) {
    console.log(`Already in global config: ${alreadyExists.join(', ')}`);
  }
  if (notFound.length) {
    console.log(`Not in registry: ${notFound.join(', ')}`);
    console.log('  (Use "coder-config list" to see available MCPs)');
  }

  return added.length > 0;
}

/**
 * Remove MCP(s) from global config (~/.claude.json)
 */
function removeGlobal(mcpNames) {
  if (!mcpNames || mcpNames.length === 0) {
    console.error('Usage: coder-config global remove <mcp-name> [mcp-name...]');
    return false;
  }

  const configPath = getGlobalConfigPath();
  let config = loadJson(configPath);

  if (!config || !config.mcpServers) {
    console.error('No global MCPs configured in ~/.claude.json');
    return false;
  }

  const removed = [];
  const notFound = [];

  for (const name of mcpNames) {
    if (config.mcpServers[name]) {
      delete config.mcpServers[name];
      removed.push(name);
    } else {
      notFound.push(name);
    }
  }

  if (removed.length) {
    saveJson(configPath, config);
    console.log(`✓ Removed from ~/.claude.json: ${removed.join(', ')}`);
  }
  if (notFound.length) {
    console.log(`Not in global config: ${notFound.join(', ')}`);
  }

  return removed.length > 0;
}

module.exports = {
  list,
  add,
  remove,
  listGlobal,
  addGlobal,
  removeGlobal,
  getGlobalConfigPath,
};
