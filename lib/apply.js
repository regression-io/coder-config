/**
 * Apply commands for generating tool configs
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { TOOL_PATHS } = require('./constants');
const { loadJson, saveJson, loadEnvFile, interpolate, resolveEnvVars } = require('./utils');
const { findProjectRoot, findAllConfigs, mergeConfigs, findAllConfigsForTool } = require('./config');
const { getActiveWorkstream, applySandboxIfEnabled } = require('./workstreams');

/**
 * Generate .mcp.json for a project (with hierarchical config merging)
 */
function apply(registryPath, projectDir = null, installDir = null) {
  const dir = projectDir || findProjectRoot() || process.cwd();

  const registry = loadJson(registryPath);
  if (!registry) {
    console.error('Error: Could not load MCP registry from', registryPath);
    return false;
  }

  const configLocations = findAllConfigs(dir);

  if (configLocations.length === 0) {
    console.error(`No .claude/mcps.json found in ${dir} or parent directories`);
    console.error('Run: coder-config init');
    return false;
  }

  const loadedConfigs = configLocations.map(loc => {
    const rawConfig = loadJson(loc.configPath);

    // Handle ~/.claude.json format (global MCPs under mcpServers key)
    if (loc.isGlobalClaudeJson && rawConfig) {
      return {
        ...loc,
        config: {
          include: [],
          mcpServers: rawConfig.mcpServers || {}
        }
      };
    }

    return {
      ...loc,
      config: rawConfig
    };
  });

  // Filter out empty configs and show hierarchy
  const activeConfigs = loadedConfigs.filter(c => c.config);
  if (activeConfigs.length > 1) {
    console.log('📚 Config hierarchy (merged):');
    for (const { dir: d, configPath, isGlobalClaudeJson } of activeConfigs) {
      const relPath = d === process.env.HOME ? '~' : path.relative(process.cwd(), d) || '.';
      if (isGlobalClaudeJson) {
        console.log(`  • ~/.claude.json (global MCPs)`);
      } else {
        console.log(`  • ${relPath}/.claude/mcps.json`);
      }
    }
    console.log('');
  }

  const mergedConfig = mergeConfigs(loadedConfigs);

  const globalEnvPath = path.join(path.dirname(registryPath), '.env');
  let env = loadEnvFile(globalEnvPath);

  for (const { dir: d } of loadedConfigs) {
    const envPath = path.join(d, '.claude', '.env');
    env = { ...env, ...loadEnvFile(envPath) };
  }

  const output = { mcpServers: {} };

  if (mergedConfig.include && Array.isArray(mergedConfig.include)) {
    for (const name of mergedConfig.include) {
      if (registry.mcpServers && registry.mcpServers[name]) {
        output.mcpServers[name] = interpolate(registry.mcpServers[name], env);
      } else {
        console.warn(`Warning: MCP "${name}" not found in registry`);
      }
    }
  }

  if (mergedConfig.mcpServers) {
    for (const [name, config] of Object.entries(mergedConfig.mcpServers)) {
      if (name.startsWith('_')) continue;
      output.mcpServers[name] = interpolate(config, env);
    }
  }

  const outputPath = path.join(dir, '.mcp.json');
  saveJson(outputPath, output);

  const count = Object.keys(output.mcpServers).length;
  console.log(`✓ Generated ${outputPath}`);
  console.log(`  └─ ${count} MCP(s): ${Object.keys(output.mcpServers).join(', ')}`);

  // Generate settings.local.json with additionalDirectories for workstream sandbox scope
  if (installDir) {
    const active = getActiveWorkstream(installDir);
    if (applySandboxIfEnabled(active, dir)) {
      const resolvedDir = path.resolve(dir);
      const count = active.projects.filter(p =>
        path.resolve(p) !== resolvedDir && !resolvedDir.startsWith(path.resolve(p) + path.sep)
      ).length;
      console.log(`✓ Generated .claude/settings.local.json (sandbox scope)`);
      console.log(`  └─ ${count} additional director${count === 1 ? 'y' : 'ies'}`);
    }
  }

  // Generate settings.json with enabledPlugins if any are configured
  if (mergedConfig.enabledPlugins && Object.keys(mergedConfig.enabledPlugins).length > 0) {
    const settingsPath = path.join(dir, '.claude', 'settings.json');
    let existingSettings = {};

    // Load existing settings if present
    if (fs.existsSync(settingsPath)) {
      try {
        existingSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      } catch (e) {
        existingSettings = {};
      }
    }

    // Merge enabledPlugins into settings
    const settingsOutput = {
      ...existingSettings,
      enabledPlugins: mergedConfig.enabledPlugins
    };

    saveJson(settingsPath, settingsOutput);

    const pluginCount = Object.entries(mergedConfig.enabledPlugins)
      .filter(([_, enabled]) => enabled).length;
    console.log(`✓ Generated ${settingsPath}`);
    console.log(`  └─ ${pluginCount} plugin(s) enabled`);
  }

  return true;
}

/**
 * Generate MCP config for Antigravity
 */
function applyForAntigravity(registryPath, projectDir = null) {
  const dir = projectDir || findProjectRoot() || process.cwd();
  const paths = TOOL_PATHS.antigravity;
  const homeDir = process.env.HOME || '';

  const registry = loadJson(registryPath);
  if (!registry) {
    console.error('Error: Could not load MCP registry');
    return false;
  }

  const configLocations = findAllConfigsForTool('antigravity', dir);

  if (configLocations.length === 0) {
    console.log(`  ℹ No .agent/mcps.json found - skipping Antigravity`);
    console.log(`    Create one with: mkdir -p .agent && echo '{"include":["filesystem"]}' > .agent/mcps.json`);
    return true;
  }

  const loadedConfigs = configLocations.map(loc => ({
    ...loc,
    config: loadJson(loc.configPath)
  }));
  const mergedConfig = mergeConfigs(loadedConfigs);

  let env = {};
  const globalEnvPath = path.join(homeDir, '.gemini', 'antigravity', '.env');
  env = { ...env, ...loadEnvFile(globalEnvPath) };

  for (const { dir: d } of configLocations) {
    if (d !== homeDir) {
      const envPath = path.join(d, '.agent', '.env');
      env = { ...env, ...loadEnvFile(envPath) };
    }
  }

  const output = { mcpServers: {} };

  if (mergedConfig.include && Array.isArray(mergedConfig.include)) {
    for (const name of mergedConfig.include) {
      if (registry.mcpServers && registry.mcpServers[name]) {
        output.mcpServers[name] = resolveEnvVars(registry.mcpServers[name], env);
      }
    }
  }

  if (mergedConfig.mcpServers) {
    for (const [name, config] of Object.entries(mergedConfig.mcpServers)) {
      if (name.startsWith('_')) continue;
      output.mcpServers[name] = resolveEnvVars(config, env);
    }
  }

  const outputPath = paths.outputFile.replace(/^~/, homeDir);
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  saveJson(outputPath, output);

  const count = Object.keys(output.mcpServers).length;
  console.log(`✓ Generated ${outputPath} (Antigravity)`);
  console.log(`  └─ ${count} MCP(s): ${Object.keys(output.mcpServers).join(', ')}`);

  return true;
}

/**
 * Generate MCP config for Gemini CLI
 */
function applyForGemini(registryPath, projectDir = null) {
  const dir = projectDir || findProjectRoot() || process.cwd();
  const paths = TOOL_PATHS.gemini;
  const homeDir = process.env.HOME || '';

  const registry = loadJson(registryPath);
  if (!registry) {
    console.error('Error: Could not load MCP registry');
    return false;
  }

  const configLocations = findAllConfigsForTool('gemini', dir);

  if (configLocations.length === 0) {
    console.log(`  ℹ No .gemini/mcps.json found - skipping Gemini CLI`);
    console.log(`    Create one with: mkdir -p .gemini && echo '{"include":["filesystem"]}' > .gemini/mcps.json`);
    return true;
  }

  const loadedConfigs = configLocations.map(loc => ({
    ...loc,
    config: loadJson(loc.configPath)
  }));
  const mergedConfig = mergeConfigs(loadedConfigs);

  let env = {};
  const globalEnvPath = path.join(homeDir, '.gemini', '.env');
  env = { ...env, ...loadEnvFile(globalEnvPath) };

  for (const { dir: d } of configLocations) {
    if (d !== homeDir) {
      const envPath = path.join(d, '.gemini', '.env');
      env = { ...env, ...loadEnvFile(envPath) };
    }
  }

  const mcpServers = {};

  if (mergedConfig.include && Array.isArray(mergedConfig.include)) {
    for (const name of mergedConfig.include) {
      if (registry.mcpServers && registry.mcpServers[name]) {
        mcpServers[name] = interpolate(registry.mcpServers[name], env);
      }
    }
  }

  if (mergedConfig.mcpServers) {
    for (const [name, config] of Object.entries(mergedConfig.mcpServers)) {
      if (name.startsWith('_')) continue;
      mcpServers[name] = interpolate(config, env);
    }
  }

  // Generate global settings (~/.gemini/settings.json)
  const globalOutputPath = paths.outputFile.replace(/^~/, homeDir);
  const globalOutputDir = path.dirname(globalOutputPath);
  if (!fs.existsSync(globalOutputDir)) {
    fs.mkdirSync(globalOutputDir, { recursive: true });
  }

  let existingSettings = {};
  if (fs.existsSync(globalOutputPath)) {
    try {
      existingSettings = JSON.parse(fs.readFileSync(globalOutputPath, 'utf8'));
    } catch (e) {
      existingSettings = {};
    }
  }

  const globalOutput = {
    ...existingSettings,
    mcpServers
  };

  saveJson(globalOutputPath, globalOutput);

  const count = Object.keys(mcpServers).length;
  console.log(`✓ Generated ${globalOutputPath} (Gemini CLI - global)`);
  console.log(`  └─ ${count} MCP(s): ${Object.keys(mcpServers).join(', ')}`);

  // Generate per-project settings (.gemini/settings.json)
  const projectOutputDir = path.join(dir, '.gemini');
  const projectOutputPath = path.join(projectOutputDir, 'settings.json');

  if (!fs.existsSync(projectOutputDir)) {
    fs.mkdirSync(projectOutputDir, { recursive: true });
  }

  // For per-project, only include mcpServers (not merge with existing)
  const projectOutput = { mcpServers };
  saveJson(projectOutputPath, projectOutput);

  console.log(`✓ Generated ${projectOutputPath} (Gemini CLI - project)`);

  return true;
}

/**
 * Generate MCP config for Codex CLI
 */
function applyForCodex(registryPath, projectDir = null) {
  const dir = projectDir || findProjectRoot() || process.cwd();
  const paths = TOOL_PATHS.codex;
  const homeDir = process.env.HOME || '';

  const registry = loadJson(registryPath);
  if (!registry) {
    console.error('Error: Could not load MCP registry');
    return false;
  }

  const configLocations = findAllConfigsForTool('codex', dir);

  if (configLocations.length === 0) {
    console.log(`  ℹ No .codex/mcps.json found - skipping Codex CLI`);
    console.log(`    Create one with: mkdir -p .codex && echo '{"include":["filesystem"]}' > .codex/mcps.json`);
    return true;
  }

  const loadedConfigs = configLocations.map(loc => ({
    ...loc,
    config: loadJson(loc.configPath)
  }));
  const mergedConfig = mergeConfigs(loadedConfigs);

  let env = {};
  const globalEnvPath = path.join(homeDir, '.codex', '.env');
  env = { ...env, ...loadEnvFile(globalEnvPath) };

  for (const { dir: d } of configLocations) {
    if (d !== homeDir) {
      const envPath = path.join(d, '.codex', '.env');
      env = { ...env, ...loadEnvFile(envPath) };
    }
  }

  const output = { mcpServers: {} };

  if (mergedConfig.include && Array.isArray(mergedConfig.include)) {
    for (const name of mergedConfig.include) {
      if (registry.mcpServers && registry.mcpServers[name]) {
        output.mcpServers[name] = interpolate(registry.mcpServers[name], env);
      }
    }
  }

  if (mergedConfig.mcpServers) {
    for (const [name, config] of Object.entries(mergedConfig.mcpServers)) {
      if (name.startsWith('_')) continue;
      output.mcpServers[name] = interpolate(config, env);
    }
  }

  // Generate per-project config (.codex/mcp.json)
  const projectOutputDir = path.join(dir, '.codex');
  const projectOutputPath = path.join(projectOutputDir, 'mcp.json');

  if (!fs.existsSync(projectOutputDir)) {
    fs.mkdirSync(projectOutputDir, { recursive: true });
  }

  saveJson(projectOutputPath, output);

  const count = Object.keys(output.mcpServers).length;
  console.log(`✓ Generated ${projectOutputPath} (Codex CLI)`);
  console.log(`  └─ ${count} MCP(s): ${Object.keys(output.mcpServers).join(', ')}`);

  return true;
}

/**
 * Detect which AI coding tools are installed
 * Note: Uses execSync with hardcoded command names (safe from injection)
 */
function detectInstalledTools() {
  const homeDir = process.env.HOME || '';
  const results = {};

  try {
    execSync('which claude', { stdio: 'ignore' });
    results.claude = { installed: true, method: 'command' };
  } catch {
    results.claude = {
      installed: fs.existsSync(path.join(homeDir, '.claude')),
      method: 'directory'
    };
  }

  try {
    execSync('which gemini', { stdio: 'ignore' });
    results.gemini = { installed: true, method: 'command' };
  } catch {
    results.gemini = {
      installed: fs.existsSync(path.join(homeDir, '.gemini')),
      method: 'directory'
    };
  }

  results.antigravity = {
    installed: fs.existsSync(path.join(homeDir, '.gemini', 'antigravity')),
    method: 'directory'
  };

  try {
    execSync('which codex', { stdio: 'ignore' });
    results.codex = { installed: true, method: 'command' };
  } catch {
    results.codex = {
      installed: fs.existsSync(path.join(homeDir, '.codex')),
      method: 'directory'
    };
  }

  return results;
}

/**
 * Apply config for multiple tools based on preferences
 */
function applyForTools(registryPath, projectDir = null, tools = ['claude'], installDir = null) {
  const results = {};

  for (const tool of tools) {
    if (tool === 'claude') {
      results.claude = apply(registryPath, projectDir, installDir);
    } else if (tool === 'gemini') {
      results.gemini = applyForGemini(registryPath, projectDir);
    } else if (tool === 'antigravity') {
      results.antigravity = applyForAntigravity(registryPath, projectDir);
    } else if (tool === 'codex') {
      results.codex = applyForCodex(registryPath, projectDir);
    }
  }

  return results;
}

module.exports = {
  apply,
  applyForAntigravity,
  applyForGemini,
  applyForCodex,
  detectInstalledTools,
  applyForTools,
};
