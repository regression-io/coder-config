/**
 * MCP Registry management commands
 */

const { loadJson, saveJson } = require('./utils');

/**
 * List MCPs in global registry
 */
function registryList(registryPath) {
  const registry = loadJson(registryPath);
  const mcps = registry?.mcpServers || {};
  const names = Object.keys(mcps);

  if (names.length === 0) {
    console.log('\nNo MCPs in global registry.');
    console.log('Add one with: coder-config registry add <name> \'{"command":"..."}\'');
    return [];
  }

  console.log('\n📦 Global MCP Registry:\n');
  for (const name of names.sort()) {
    const mcp = mcps[name];
    const cmd = mcp.command || 'unknown';
    console.log(`  ${name}`);
    console.log(`    command: ${cmd}`);
  }
  console.log('');
  return names;
}

/**
 * Add MCP to global registry
 */
function registryAdd(registryPath, name, configJson) {
  if (!name || !configJson) {
    console.error('Usage: coder-config registry add <name> \'{"command":"...","args":[...]}\'');
    return false;
  }

  let mcpConfig;
  try {
    mcpConfig = JSON.parse(configJson);
  } catch (e) {
    console.error('Invalid JSON:', e.message);
    return false;
  }

  const registry = loadJson(registryPath) || { mcpServers: {} };
  registry.mcpServers[name] = mcpConfig;
  saveJson(registryPath, registry);

  console.log(`✓ Added "${name}" to registry`);
  return true;
}

/**
 * Remove MCP from global registry
 */
function registryRemove(registryPath, name) {
  if (!name) {
    console.error('Usage: coder-config registry remove <name>');
    return false;
  }

  const registry = loadJson(registryPath);
  if (!registry?.mcpServers?.[name]) {
    console.error(`"${name}" not found in registry`);
    return false;
  }

  delete registry.mcpServers[name];
  saveJson(registryPath, registry);

  console.log(`✓ Removed "${name}" from registry`);
  return true;
}

module.exports = {
  registryList,
  registryAdd,
  registryRemove,
};
