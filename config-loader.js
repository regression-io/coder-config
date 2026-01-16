#!/usr/bin/env node

/**
 * Claude Code Configuration Loader
 *
 * Uses standard JSON format throughout - no custom YAML.
 * Copy/paste MCP configs from anywhere.
 *
 * Files:
 *   ~/.claude-config/mcp-registry.json   - All available MCPs (copy/paste friendly)
 *   ~/.claude-config/templates/          - Rule and command templates
 *   project/.claude/mcps.json            - Which MCPs this project uses
 *   project/.claude/rules/*.md           - Project rules (from templates)
 *   project/.claude/commands/*.md        - Project commands (from templates)
 *   project/.mcp.json                    - Generated output for Claude Code
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const VERSION = '0.22.13';

// Tool-specific path configurations
const TOOL_PATHS = {
  claude: {
    name: 'Claude Code',
    icon: 'sparkles',
    color: 'orange',
    globalConfig: '~/.claude/mcps.json',
    globalSettings: '~/.claude/settings.json',
    projectFolder: '.claude',
    projectRules: '.claude/rules',
    projectCommands: '.claude/commands',
    projectWorkflows: '.claude/workflows',
    projectInstructions: 'CLAUDE.md',
    outputFile: '.mcp.json',
    supportsEnvInterpolation: true,
  },
  gemini: {
    name: 'Gemini CLI',
    icon: 'terminal',
    color: 'blue',
    globalConfig: '~/.gemini/settings.json', // MCP config is merged into settings.json under mcpServers key
    globalSettings: '~/.gemini/settings.json',
    globalMcpConfig: '~/.gemini/mcps.json', // Source config for MCPs (like Claude's)
    projectFolder: '.gemini',
    projectConfig: '.gemini/mcps.json', // Project-level MCP config
    projectRules: '.gemini',
    projectCommands: '.gemini/commands', // Uses TOML format
    projectInstructions: 'GEMINI.md',
    outputFile: '~/.gemini/settings.json', // Output merged into global settings
    supportsEnvInterpolation: true, // Gemini CLI likely supports ${VAR}
    mergeIntoSettings: true, // MCP config is merged into settings.json, not standalone
  },
  antigravity: {
    name: 'Antigravity',
    icon: 'rocket',
    color: 'purple',
    globalConfig: '~/.gemini/antigravity/mcp_config.json',
    globalMcpConfig: '~/.gemini/antigravity/mcps.json', // Source config for MCPs
    globalRules: '~/.gemini/GEMINI.md',
    projectFolder: '.agent',
    projectConfig: '.agent/mcps.json', // Project-level MCP config
    projectRules: '.agent/rules',
    projectInstructions: 'GEMINI.md',
    outputFile: '~/.gemini/antigravity/mcp_config.json', // Output to global config
    supportsEnvInterpolation: false, // Must resolve to actual values
  },
};

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

    // Template directory
    const templatePaths = [
      path.join(__dirname, 'templates'),
      path.join(this.installDir, 'templates')
    ];
    this.templatesDir = templatePaths.find(p => fs.existsSync(p)) || templatePaths[0];
  }

  /**
   * Load JSON file
   */
  loadJson(filePath) {
    try {
      if (!fs.existsSync(filePath)) return null;
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
      console.error(`Error loading ${filePath}:`, error.message);
      return null;
    }
  }

  /**
   * Save JSON file
   */
  saveJson(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
  }

  /**
   * Load environment variables from .env file
   */
  loadEnvFile(envPath) {
    if (!fs.existsSync(envPath)) return {};
    const envVars = {};
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIndex = trimmed.indexOf('=');
        if (eqIndex > 0) {
          const key = trimmed.substring(0, eqIndex).trim();
          let value = trimmed.substring(eqIndex + 1).trim();
          if ((value.startsWith('"') && value.endsWith('"')) ||
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          envVars[key] = value;
        }
      }
    }
    return envVars;
  }

  /**
   * Interpolate ${VAR} in object values
   */
  interpolate(obj, env) {
    if (typeof obj === 'string') {
      return obj.replace(/\$\{([^}]+)\}/g, (match, varName) => {
        return env[varName] || process.env[varName] || match;
      });
    }
    if (Array.isArray(obj)) {
      return obj.map(v => this.interpolate(v, env));
    }
    if (obj !== null && typeof obj === 'object') {
      const result = {};
      for (const [k, v] of Object.entries(obj)) {
        result[k] = this.interpolate(v, env);
      }
      return result;
    }
    return obj;
  }

  /**
   * Find project root (has .claude/ directory)
   */
  findProjectRoot(startDir = process.cwd()) {
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
  findAllConfigs(startDir = process.cwd()) {
    const configs = [];
    let dir = path.resolve(startDir);
    const root = path.parse(dir).root;
    const homeDir = process.env.HOME || '';

    // Walk up directory tree
    while (dir !== root) {
      const configPath = path.join(dir, '.claude', 'mcps.json');
      if (fs.existsSync(configPath)) {
        configs.unshift({ dir, configPath }); // Add at beginning (root first)
      }
      dir = path.dirname(dir);
    }

    // Also check ~/.claude/mcps.json (global user config)
    const homeConfig = path.join(homeDir, '.claude', 'mcps.json');
    if (fs.existsSync(homeConfig)) {
      // Only add if not already included
      if (!configs.some(c => c.configPath === homeConfig)) {
        configs.unshift({ dir: homeDir, configPath: homeConfig });
      }
    }

    return configs;
  }

  /**
   * Merge multiple configs (later ones override earlier)
   */
  mergeConfigs(configs) {
    const merged = {
      include: [],
      mcpServers: {},
      template: null
    };

    for (const { config } of configs) {
      if (!config) continue;

      // Merge include arrays (dedupe)
      if (config.include && Array.isArray(config.include)) {
        for (const mcp of config.include) {
          if (!merged.include.includes(mcp)) {
            merged.include.push(mcp);
          }
        }
      }

      // Merge mcpServers (override)
      if (config.mcpServers) {
        Object.assign(merged.mcpServers, config.mcpServers);
      }

      // Take the most specific template
      if (config.template) {
        merged.template = config.template;
      }
    }

    return merged;
  }

  /**
   * Get project config path
   */
  getConfigPath(projectDir = null) {
    const dir = projectDir || this.findProjectRoot() || process.cwd();
    return path.join(dir, '.claude', 'mcps.json');
  }

  /**
   * Collect files (rules or commands) from all directories in hierarchy
   * Returns array of { file, source, fullPath } with child files overriding parent
   */
  collectFilesFromHierarchy(configLocations, subdir) {
    const fileMap = new Map(); // filename -> { file, source, fullPath }

    // Process from root to leaf (so child overrides parent)
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
   * Get all rules from hierarchy (for external use)
   */
  getAllRules(startDir = process.cwd()) {
    const configLocations = this.findAllConfigs(startDir);
    return this.collectFilesFromHierarchy(configLocations, 'rules');
  }

  /**
   * Get all commands from hierarchy (for external use)
   */
  getAllCommands(startDir = process.cwd()) {
    const configLocations = this.findAllConfigs(startDir);
    return this.collectFilesFromHierarchy(configLocations, 'commands');
  }

  // ===========================================================================
  // TEMPLATE SYSTEM
  // ===========================================================================

  /**
   * List available templates
   */
  listTemplates() {
    console.log('\n📋 Available Templates:\n');

    const categories = [
      { name: 'Frameworks', path: 'frameworks' },
      { name: 'Languages', path: 'languages' },
      { name: 'Composites (Monorepos)', path: 'composites' }
    ];

    for (const category of categories) {
      const categoryPath = path.join(this.templatesDir, category.path);
      if (!fs.existsSync(categoryPath)) continue;

      console.log(`  ${category.name}:`);
      const templates = fs.readdirSync(categoryPath).filter(f =>
        fs.statSync(path.join(categoryPath, f)).isDirectory()
      );

      for (const template of templates) {
        const templateJson = this.loadJson(path.join(categoryPath, template, 'template.json'));
        const desc = templateJson?.description || '';
        console.log(`    • ${category.path}/${template}${desc ? ` - ${desc}` : ''}`);
      }
      console.log('');
    }

    console.log('  Usage: claude-config init --template <template-name>');
    console.log('  Example: claude-config init --template fastapi');
    console.log('           claude-config init --template fastapi-react-ts\n');
  }

  /**
   * Find a template by name (searches all categories)
   */
  findTemplate(name) {
    // Direct path
    if (name.includes('/')) {
      const templatePath = path.join(this.templatesDir, name);
      if (fs.existsSync(path.join(templatePath, 'template.json'))) {
        return templatePath;
      }
    }

    // Check root level first (for "universal")
    const rootPath = path.join(this.templatesDir, name);
    if (fs.existsSync(path.join(rootPath, 'template.json'))) {
      return rootPath;
    }

    // Search in categories
    const categories = ['frameworks', 'languages', 'composites'];
    for (const category of categories) {
      const templatePath = path.join(this.templatesDir, category, name);
      if (fs.existsSync(path.join(templatePath, 'template.json'))) {
        return templatePath;
      }
    }

    return null;
  }

  /**
   * Resolve all templates to include (following includes chain)
   */
  resolveTemplateChain(templatePath, visited = new Set()) {
    if (visited.has(templatePath)) return [];
    visited.add(templatePath);

    const templateJson = this.loadJson(path.join(templatePath, 'template.json'));
    if (!templateJson) return [templatePath];

    const chain = [];

    // Process includes first (base templates)
    if (templateJson.includes && Array.isArray(templateJson.includes)) {
      for (const include of templateJson.includes) {
        const includePath = this.findTemplate(include);
        if (includePath) {
          chain.push(...this.resolveTemplateChain(includePath, visited));
        }
      }
    }

    // Then add this template
    chain.push(templatePath);

    return chain;
  }

  /**
   * Copy template files to project (won't overwrite existing)
   */
  copyTemplateFiles(templatePath, projectDir, options = {}) {
    const { force = false, verbose = true } = options;
    const rulesDir = path.join(templatePath, 'rules');
    const commandsDir = path.join(templatePath, 'commands');
    const projectRulesDir = path.join(projectDir, '.claude', 'rules');
    const projectCommandsDir = path.join(projectDir, '.claude', 'commands');

    let copied = 0;
    let skipped = 0;

    // Copy rules
    if (fs.existsSync(rulesDir)) {
      if (!fs.existsSync(projectRulesDir)) {
        fs.mkdirSync(projectRulesDir, { recursive: true });
      }

      for (const file of fs.readdirSync(rulesDir)) {
        if (!file.endsWith('.md')) continue;
        const src = path.join(rulesDir, file);
        const dest = path.join(projectRulesDir, file);

        if (fs.existsSync(dest) && !force) {
          skipped++;
          if (verbose) console.log(`  ⏭  rules/${file} (exists)`);
        } else {
          fs.copyFileSync(src, dest);
          copied++;
          if (verbose) console.log(`  ✓ rules/${file}`);
        }
      }
    }

    // Copy commands
    if (fs.existsSync(commandsDir)) {
      if (!fs.existsSync(projectCommandsDir)) {
        fs.mkdirSync(projectCommandsDir, { recursive: true });
      }

      for (const file of fs.readdirSync(commandsDir)) {
        if (!file.endsWith('.md')) continue;
        const src = path.join(commandsDir, file);
        const dest = path.join(projectCommandsDir, file);

        if (fs.existsSync(dest) && !force) {
          skipped++;
          if (verbose) console.log(`  ⏭  commands/${file} (exists)`);
        } else {
          fs.copyFileSync(src, dest);
          copied++;
          if (verbose) console.log(`  ✓ commands/${file}`);
        }
      }
    }

    return { copied, skipped };
  }

  // ===========================================================================
  // CORE COMMANDS
  // ===========================================================================

  /**
   * Generate .mcp.json for a project (with hierarchical config merging)
   */
  apply(projectDir = null) {
    const dir = projectDir || this.findProjectRoot() || process.cwd();

    const registry = this.loadJson(this.registryPath);
    if (!registry) {
      console.error('Error: Could not load MCP registry from', this.registryPath);
      return false;
    }

    // Find and load all configs in hierarchy
    const configLocations = this.findAllConfigs(dir);

    if (configLocations.length === 0) {
      console.error(`No .claude/mcps.json found in ${dir} or parent directories`);
      console.error('Run: claude-config init');
      return false;
    }

    // Load all configs
    const loadedConfigs = configLocations.map(loc => ({
      ...loc,
      config: this.loadJson(loc.configPath)
    }));

    // Show config hierarchy if multiple configs found
    if (loadedConfigs.length > 1) {
      console.log('📚 Config hierarchy (merged):');
      for (const { dir: d, configPath } of loadedConfigs) {
        const relPath = d === process.env.HOME ? '~' : path.relative(process.cwd(), d) || '.';
        console.log(`  • ${relPath}/.claude/mcps.json`);
      }
      console.log('');
    }

    // Merge all configs
    const mergedConfig = this.mergeConfigs(loadedConfigs);

    // Collect env vars from all levels (child overrides parent)
    const globalEnvPath = path.join(path.dirname(this.registryPath), '.env');
    let env = this.loadEnvFile(globalEnvPath);

    for (const { dir: d } of loadedConfigs) {
      const envPath = path.join(d, '.claude', '.env');
      env = { ...env, ...this.loadEnvFile(envPath) };
    }

    const output = { mcpServers: {} };

    // Add MCPs from include list
    if (mergedConfig.include && Array.isArray(mergedConfig.include)) {
      for (const name of mergedConfig.include) {
        if (registry.mcpServers && registry.mcpServers[name]) {
          output.mcpServers[name] = this.interpolate(registry.mcpServers[name], env);
        } else {
          console.warn(`Warning: MCP "${name}" not found in registry`);
        }
      }
    }

    // Add custom mcpServers (override registry)
    if (mergedConfig.mcpServers) {
      for (const [name, config] of Object.entries(mergedConfig.mcpServers)) {
        if (name.startsWith('_')) continue;
        output.mcpServers[name] = this.interpolate(config, env);
      }
    }

    const outputPath = path.join(dir, '.mcp.json');
    this.saveJson(outputPath, output);

    const count = Object.keys(output.mcpServers).length;
    console.log(`✓ Generated ${outputPath}`);
    console.log(`  └─ ${count} MCP(s): ${Object.keys(output.mcpServers).join(', ')}`);

    return true;
  }

  /**
   * Resolve ${VAR} to actual values (for tools that don't support interpolation)
   */
  resolveEnvVars(obj, env) {
    if (typeof obj === 'string') {
      return obj.replace(/\$\{([^}]+)\}/g, (match, varName) => {
        const value = env[varName] || process.env[varName];
        if (!value) {
          console.warn(`Warning: Environment variable ${varName} not set`);
          return ''; // Return empty instead of keeping ${VAR}
        }
        return value;
      });
    }
    if (Array.isArray(obj)) {
      return obj.map(v => this.resolveEnvVars(v, env));
    }
    if (obj && typeof obj === 'object') {
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.resolveEnvVars(value, env);
      }
      return result;
    }
    return obj;
  }

  /**
   * Generate MCP config for Antigravity
   */
  /**
   * Generate MCP config for Antigravity
   * Reads from .agent/mcps.json (NOT .claude/mcps.json)
   */
  applyForAntigravity(projectDir = null) {
    const dir = projectDir || this.findProjectRoot() || process.cwd();
    const paths = TOOL_PATHS.antigravity;
    const homeDir = process.env.HOME || '';

    const registry = this.loadJson(this.registryPath);
    if (!registry) {
      console.error('Error: Could not load MCP registry');
      return false;
    }

    // Find and load all configs in hierarchy (from .agent folders)
    const configLocations = this.findAllConfigsForTool('antigravity', dir);

    if (configLocations.length === 0) {
      // No Antigravity-specific config found - skip silently
      console.log(`  ℹ No .agent/mcps.json found - skipping Antigravity`);
      console.log(`    Create one with: mkdir -p .agent && echo '{"include":["filesystem"]}' > .agent/mcps.json`);
      return true; // Not an error, just no config
    }

    // Load all configs and merge
    const loadedConfigs = configLocations.map(loc => ({
      ...loc,
      config: this.loadJson(loc.configPath)
    }));
    const mergedConfig = this.mergeConfigs(loadedConfigs);

    // Collect env vars from Antigravity-specific .env files
    let env = {};

    // Global env from ~/.gemini/antigravity/.env
    const globalEnvPath = path.join(homeDir, '.gemini', 'antigravity', '.env');
    env = { ...env, ...this.loadEnvFile(globalEnvPath) };

    // Project-level env files
    for (const { dir: d } of configLocations) {
      if (d !== homeDir) {
        const envPath = path.join(d, '.agent', '.env');
        env = { ...env, ...this.loadEnvFile(envPath) };
      }
    }

    const output = { mcpServers: {} };

    // Add MCPs from include list
    if (mergedConfig.include && Array.isArray(mergedConfig.include)) {
      for (const name of mergedConfig.include) {
        if (registry.mcpServers && registry.mcpServers[name]) {
          // Resolve env vars to actual values (Antigravity doesn't support ${VAR})
          output.mcpServers[name] = this.resolveEnvVars(registry.mcpServers[name], env);
        }
      }
    }

    // Add custom mcpServers
    if (mergedConfig.mcpServers) {
      for (const [name, config] of Object.entries(mergedConfig.mcpServers)) {
        if (name.startsWith('_')) continue;
        output.mcpServers[name] = this.resolveEnvVars(config, env);
      }
    }

    // Expand ~ in output path
    const outputPath = paths.outputFile.replace(/^~/, homeDir);

    // Ensure directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    this.saveJson(outputPath, output);

    const count = Object.keys(output.mcpServers).length;
    console.log(`✓ Generated ${outputPath} (Antigravity)`);
    console.log(`  └─ ${count} MCP(s): ${Object.keys(output.mcpServers).join(', ')}`);

    return true;
  }

  /**
   * Find all MCP configs for a specific tool in hierarchy
   * Similar to findAllConfigs but uses tool-specific folder paths
   */
  findAllConfigsForTool(toolId, startDir = null) {
    const tool = TOOL_PATHS[toolId];
    if (!tool) return [];

    const dir = startDir || this.findProjectRoot() || process.cwd();
    const homeDir = process.env.HOME || '';
    const configs = [];

    // Walk up from project to find project-level configs
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

    // Check for global config
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

    // Reverse so global is first, then parent dirs, then project dir
    return configs.reverse();
  }

  /**
   * Generate MCP config for Gemini CLI
   * Gemini CLI stores MCP config inside ~/.gemini/settings.json under mcpServers key
   * Reads from .gemini/mcps.json (NOT .claude/mcps.json)
   */
  applyForGemini(projectDir = null) {
    const dir = projectDir || this.findProjectRoot() || process.cwd();
    const paths = TOOL_PATHS.gemini;
    const homeDir = process.env.HOME || '';

    const registry = this.loadJson(this.registryPath);
    if (!registry) {
      console.error('Error: Could not load MCP registry');
      return false;
    }

    // Find and load all configs in hierarchy (from .gemini folders)
    const configLocations = this.findAllConfigsForTool('gemini', dir);

    if (configLocations.length === 0) {
      // No Gemini-specific config found - skip silently or create empty
      console.log(`  ℹ No .gemini/mcps.json found - skipping Gemini CLI`);
      console.log(`    Create one with: mkdir -p .gemini && echo '{"include":["filesystem"]}' > .gemini/mcps.json`);
      return true; // Not an error, just no config
    }

    // Load all configs and merge
    const loadedConfigs = configLocations.map(loc => ({
      ...loc,
      config: this.loadJson(loc.configPath)
    }));
    const mergedConfig = this.mergeConfigs(loadedConfigs);

    // Collect env vars from Gemini-specific .env files
    let env = {};

    // Global env from ~/.gemini/.env
    const globalEnvPath = path.join(homeDir, '.gemini', '.env');
    env = { ...env, ...this.loadEnvFile(globalEnvPath) };

    // Project-level env files
    for (const { dir: d } of configLocations) {
      if (d !== homeDir) {
        const envPath = path.join(d, '.gemini', '.env');
        env = { ...env, ...this.loadEnvFile(envPath) };
      }
    }

    const mcpServers = {};

    // Add MCPs from include list
    if (mergedConfig.include && Array.isArray(mergedConfig.include)) {
      for (const name of mergedConfig.include) {
        if (registry.mcpServers && registry.mcpServers[name]) {
          // Keep ${VAR} interpolation for Gemini CLI (it supports it)
          mcpServers[name] = this.interpolate(registry.mcpServers[name], env);
        }
      }
    }

    // Add custom mcpServers
    if (mergedConfig.mcpServers) {
      for (const [name, config] of Object.entries(mergedConfig.mcpServers)) {
        if (name.startsWith('_')) continue;
        mcpServers[name] = this.interpolate(config, env);
      }
    }

    // Expand ~ in output path
    const outputPath = paths.outputFile.replace(/^~/, homeDir);

    // Ensure directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Load existing settings.json and merge (preserve other keys)
    let existingSettings = {};
    if (fs.existsSync(outputPath)) {
      try {
        existingSettings = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
      } catch (e) {
        // If corrupt, start fresh
        existingSettings = {};
      }
    }

    // Merge mcpServers into existing settings
    const output = {
      ...existingSettings,
      mcpServers
    };

    this.saveJson(outputPath, output);

    const count = Object.keys(mcpServers).length;
    console.log(`✓ Generated ${outputPath} (Gemini CLI)`);
    console.log(`  └─ ${count} MCP(s): ${Object.keys(mcpServers).join(', ')}`);

    return true;
  }

  /**
   * Detect which AI coding tools are installed
   */
  detectInstalledTools() {
    const homeDir = process.env.HOME || '';
    const results = {};

    // Check Claude Code - look for claude command or ~/.claude directory
    try {
      execSync('which claude', { stdio: 'ignore' });
      results.claude = { installed: true, method: 'command' };
    } catch {
      results.claude = {
        installed: fs.existsSync(path.join(homeDir, '.claude')),
        method: 'directory'
      };
    }

    // Check Gemini CLI - look for gemini command or ~/.gemini directory
    try {
      execSync('which gemini', { stdio: 'ignore' });
      results.gemini = { installed: true, method: 'command' };
    } catch {
      results.gemini = {
        installed: fs.existsSync(path.join(homeDir, '.gemini')),
        method: 'directory'
      };
    }

    // Check Antigravity - look for ~/.gemini/antigravity directory
    results.antigravity = {
      installed: fs.existsSync(path.join(homeDir, '.gemini', 'antigravity')),
      method: 'directory'
    };

    return results;
  }

  /**
   * Get tool paths configuration
   */
  getToolPaths() {
    return TOOL_PATHS;
  }

  /**
   * Apply config for multiple tools based on preferences
   */
  applyForTools(projectDir = null, tools = ['claude']) {
    const results = {};

    for (const tool of tools) {
      if (tool === 'claude') {
        results.claude = this.apply(projectDir);
      } else if (tool === 'gemini') {
        results.gemini = this.applyForGemini(projectDir);
      } else if (tool === 'antigravity') {
        results.antigravity = this.applyForAntigravity(projectDir);
      }
    }

    return results;
  }

  /**
   * List available MCPs
   */
  list() {
    const registry = this.loadJson(this.registryPath);
    if (!registry || !registry.mcpServers) {
      console.error('Error: Could not load MCP registry');
      return;
    }

    const dir = this.findProjectRoot();
    const projectConfig = dir ? this.loadJson(path.join(dir, '.claude', 'mcps.json')) : null;
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
   * Initialize project with template
   */
  init(projectDir = null, templateName = null) {
    const dir = projectDir || process.cwd();
    const claudeDir = path.join(dir, '.claude');
    const configPath = path.join(claudeDir, 'mcps.json');

    // Create .claude directory
    if (!fs.existsSync(claudeDir)) {
      fs.mkdirSync(claudeDir, { recursive: true });
    }

    // Determine MCPs to include
    let mcpDefaults = ['github', 'filesystem'];
    let templateChain = [];

    if (templateName) {
      const templatePath = this.findTemplate(templateName);
      if (!templatePath) {
        console.error(`Template not found: ${templateName}`);
        console.log('Run "claude-config templates" to see available templates.');
        return false;
      }

      // Resolve full template chain
      templateChain = this.resolveTemplateChain(templatePath);

      // Get MCP defaults from the main template
      const templateJson = this.loadJson(path.join(templatePath, 'template.json'));
      if (templateJson?.mcpDefaults) {
        mcpDefaults = templateJson.mcpDefaults;
      }

      console.log(`\n🎯 Using template: ${templateName}`);
      console.log(`  Includes: ${templateChain.map(p => path.basename(p)).join(' → ')}\n`);
    }

    // Create or update mcps.json
    if (!fs.existsSync(configPath)) {
      const template = {
        "include": mcpDefaults,
        "template": templateName || null,
        "mcpServers": {}
      };
      this.saveJson(configPath, template);
      console.log(`✓ Created ${configPath}`);
    } else {
      console.log(`⏭  ${configPath} already exists`);
    }

    // Copy template files
    if (templateChain.length > 0) {
      console.log('\nCopying template files:');
      let totalCopied = 0;
      let totalSkipped = 0;

      for (const tplPath of templateChain) {
        const { copied, skipped } = this.copyTemplateFiles(tplPath, dir);
        totalCopied += copied;
        totalSkipped += skipped;
      }

      console.log(`\n  Total: ${totalCopied} copied, ${totalSkipped} skipped (already exist)`);
    }

    // Create .env file
    const envPath = path.join(claudeDir, '.env');
    if (!fs.existsSync(envPath)) {
      fs.writeFileSync(envPath, `# Project secrets (gitignored)
# GITHUB_TOKEN=ghp_xxx
# DATABASE_URL=postgres://...
`);
      console.log(`✓ Created ${envPath}`);
    }

    // Update .gitignore
    const gitignorePath = path.join(dir, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      const content = fs.readFileSync(gitignorePath, 'utf8');
      if (!content.includes('.claude/.env')) {
        fs.appendFileSync(gitignorePath, '\n.claude/.env\n');
        console.log('✓ Updated .gitignore');
      }
    }

    console.log('\n✅ Project initialized!');
    console.log('Next steps:');
    console.log('  1. Edit .claude/mcps.json to customize MCPs');
    console.log('  2. Review .claude/rules/ and .claude/commands/');
    console.log('  3. Run: claude-config apply\n');

    return true;
  }

  /**
   * Apply templates to existing project (add rules/commands without overwriting)
   */
  applyTemplate(templateName, projectDir = null) {
    const dir = projectDir || this.findProjectRoot() || process.cwd();

    if (!templateName) {
      console.error('Usage: claude-config apply-template <template-name>');
      console.log('Run "claude-config templates" to see available templates.');
      return false;
    }

    const templatePath = this.findTemplate(templateName);
    if (!templatePath) {
      console.error(`Template not found: ${templateName}`);
      console.log('Run "claude-config templates" to see available templates.');
      return false;
    }

    // Resolve full template chain
    const templateChain = this.resolveTemplateChain(templatePath);

    console.log(`\n🎯 Applying template: ${templateName}`);
    console.log(`  Includes: ${templateChain.map(p => path.basename(p)).join(' → ')}\n`);

    console.log('Copying template files (won\'t overwrite existing):');
    let totalCopied = 0;
    let totalSkipped = 0;

    for (const tplPath of templateChain) {
      const { copied, skipped } = this.copyTemplateFiles(tplPath, dir);
      totalCopied += copied;
      totalSkipped += skipped;
    }

    console.log(`\n✅ Applied template: ${totalCopied} files copied, ${totalSkipped} skipped\n`);

    // Track applied template in templates.json
    this.trackAppliedTemplate(dir, templateName);

    return true;
  }

  /**
   * Track an applied template in .claude/templates.json
   * Only one template per project (templates chain internally)
   */
  trackAppliedTemplate(dir, templateName) {
    const claudeDir = path.join(dir, '.claude');
    const templatesPath = path.join(claudeDir, 'templates.json');

    // Ensure .claude directory exists
    if (!fs.existsSync(claudeDir)) {
      fs.mkdirSync(claudeDir, { recursive: true });
    }

    // Save single template (replaces any previous)
    const data = {
      template: templateName,
      appliedAt: new Date().toISOString()
    };

    fs.writeFileSync(templatesPath, JSON.stringify(data, null, 2) + '\n');
  }

  /**
   * Get applied template for a directory
   * Returns { template, appliedAt } or null
   */
  getAppliedTemplate(dir) {
    const templatesPath = path.join(dir, '.claude', 'templates.json');
    if (!fs.existsSync(templatesPath)) {
      return null;
    }
    try {
      const data = JSON.parse(fs.readFileSync(templatesPath, 'utf8'));
      if (!data.template) return null;
      return {
        template: data.template,
        appliedAt: data.appliedAt
      };
    } catch (e) {
      return null;
    }
  }

  /**
   * Show current project config (including hierarchy)
   */
  show(projectDir = null) {
    const dir = projectDir || this.findProjectRoot() || process.cwd();

    // Find all configs in hierarchy
    const configLocations = this.findAllConfigs(dir);

    if (configLocations.length === 0) {
      console.log('No .claude/mcps.json found in current directory or parents');
      return;
    }

    console.log(`\n📁 Project: ${dir}`);

    // Show each config in hierarchy
    if (configLocations.length > 1) {
      console.log('\n📚 Config Hierarchy (root → leaf):');
    }

    for (const { dir: d, configPath } of configLocations) {
      const config = this.loadJson(configPath);
      const relPath = d === process.env.HOME ? '~' : path.relative(process.cwd(), d) || '.';

      console.log(`\n📄 ${relPath}/.claude/mcps.json:`);
      console.log(JSON.stringify(config, null, 2));
    }

    // Show merged result
    if (configLocations.length > 1) {
      const loadedConfigs = configLocations.map(loc => ({
        ...loc,
        config: this.loadJson(loc.configPath)
      }));
      const merged = this.mergeConfigs(loadedConfigs);
      console.log('\n🔀 Merged Config (effective):');
      console.log(JSON.stringify(merged, null, 2));
    }

    // Collect rules and commands from all levels in hierarchy
    const allRules = this.collectFilesFromHierarchy(configLocations, 'rules');
    const allCommands = this.collectFilesFromHierarchy(configLocations, 'commands');

    if (allRules.length) {
      console.log(`\n📜 Rules (${allRules.length} total):`);
      for (const { file, source } of allRules) {
        const sourceLabel = source === process.env.HOME ? '~' : path.relative(process.cwd(), source) || '.';
        console.log(`  • ${file}  (${sourceLabel})`);
      }
    }

    if (allCommands.length) {
      console.log(`\n⚡ Commands (${allCommands.length} total):`);
      for (const { file, source } of allCommands) {
        const sourceLabel = source === process.env.HOME ? '~' : path.relative(process.cwd(), source) || '.';
        console.log(`  • ${file}  (${sourceLabel})`);
      }
    }
    console.log('');
  }

  // ===========================================================================
  // MCP EDIT COMMANDS
  // ===========================================================================

  /**
   * Add MCP(s) to current project
   */
  add(mcpNames) {
    if (!mcpNames || mcpNames.length === 0) {
      console.error('Usage: claude-config add <mcp-name> [mcp-name...]');
      return false;
    }

    const configPath = this.getConfigPath();
    let config = this.loadJson(configPath);

    if (!config) {
      console.error('No .claude/mcps.json found. Run: claude-config init');
      return false;
    }

    const registry = this.loadJson(this.registryPath);
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
      this.saveJson(configPath, config);
      console.log(`✓ Added: ${added.join(', ')}`);
    }
    if (alreadyExists.length) {
      console.log(`Already included: ${alreadyExists.join(', ')}`);
    }
    if (notFound.length) {
      console.log(`Not in registry: ${notFound.join(', ')}`);
      console.log('  (Use "claude-config list" to see available MCPs)');
    }

    if (added.length) {
      console.log('\nRun "claude-config apply" to regenerate .mcp.json');
    }

    return added.length > 0;
  }

  /**
   * Remove MCP(s) from current project
   */
  remove(mcpNames) {
    if (!mcpNames || mcpNames.length === 0) {
      console.error('Usage: claude-config remove <mcp-name> [mcp-name...]');
      return false;
    }

    const configPath = this.getConfigPath();
    let config = this.loadJson(configPath);

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
      this.saveJson(configPath, config);
      console.log(`✓ Removed: ${removed.join(', ')}`);
      console.log('\nRun "claude-config apply" to regenerate .mcp.json');
    }
    if (notFound.length) {
      console.log(`Not in project: ${notFound.join(', ')}`);
    }

    return removed.length > 0;
  }

  // ===========================================================================
  // REGISTRY COMMANDS
  // ===========================================================================

  /**
   * Add MCP to global registry
   */
  registryAdd(name, configJson) {
    if (!name || !configJson) {
      console.error('Usage: claude-config registry-add <name> \'{"command":"...","args":[...]}\'');
      return false;
    }

    let mcpConfig;
    try {
      mcpConfig = JSON.parse(configJson);
    } catch (e) {
      console.error('Invalid JSON:', e.message);
      return false;
    }

    const registry = this.loadJson(this.registryPath) || { mcpServers: {} };
    registry.mcpServers[name] = mcpConfig;
    this.saveJson(this.registryPath, registry);

    console.log(`✓ Added "${name}" to registry`);
    return true;
  }

  /**
   * Remove MCP from global registry
   */
  registryRemove(name) {
    if (!name) {
      console.error('Usage: claude-config registry-remove <name>');
      return false;
    }

    const registry = this.loadJson(this.registryPath);
    if (!registry?.mcpServers?.[name]) {
      console.error(`"${name}" not found in registry`);
      return false;
    }

    delete registry.mcpServers[name];
    this.saveJson(this.registryPath, registry);

    console.log(`✓ Removed "${name}" from registry`);
    return true;
  }

  // ===========================================================================
  // UPDATE COMMAND
  // ===========================================================================

  /**
   * Update claude-config from source
   */
  update(sourcePath) {
    if (!sourcePath) {
      console.error('Usage: claude-config update /path/to/claude-config');
      console.log('\nThis copies updated files from the source to your installation.');
      return false;
    }

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

    // Copy templates directory
    const srcTemplates = path.join(sourcePath, 'templates');
    const destTemplates = path.join(this.installDir, 'templates');
    if (fs.existsSync(srcTemplates)) {
      this.copyDirRecursive(srcTemplates, destTemplates);
      console.log(`✓ Updated templates/`);
      updated++;
    }

    if (updated > 0) {
      console.log(`\n✅ Updated ${updated} item(s)`);
      console.log('Restart your shell or run: source ~/.zshrc');
    } else {
      console.log('No files found to update');
    }

    return updated > 0;
  }

  /**
   * Recursively copy directory
   */
  copyDirRecursive(src, dest) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    for (const item of fs.readdirSync(src)) {
      const srcPath = path.join(src, item);
      const destPath = path.join(dest, item);

      if (fs.statSync(srcPath).isDirectory()) {
        this.copyDirRecursive(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  /**
   * Show version
   */
  version() {
    console.log(`claude-config v${VERSION}`);
    console.log(`Install: ${this.installDir}`);
    console.log(`Registry: ${this.registryPath}`);
    console.log(`Templates: ${this.templatesDir}`);
  }

  // ===========================================================================
  // MEMORY COMMANDS
  // ===========================================================================

  /**
   * Show memory status and contents
   */
  memoryList(projectDir = process.cwd()) {
    const homeDir = process.env.HOME || '';
    const globalMemoryDir = path.join(homeDir, '.claude', 'memory');
    const projectMemoryDir = path.join(projectDir, '.claude', 'memory');

    console.log('\n📝 Memory System\n');

    // Global memory
    console.log('Global (~/.claude/memory/):');
    if (fs.existsSync(globalMemoryDir)) {
      const files = ['preferences.md', 'corrections.md', 'facts.md'];
      for (const file of files) {
        const filePath = path.join(globalMemoryDir, file);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#')).length;
          console.log(`  ✓ ${file} (${lines} entries)`);
        } else {
          console.log(`  ○ ${file} (not created)`);
        }
      }
    } else {
      console.log('  Not initialized');
    }

    // Project memory
    console.log(`\nProject (${projectDir}/.claude/memory/):`);
    if (fs.existsSync(projectMemoryDir)) {
      const files = ['context.md', 'patterns.md', 'decisions.md', 'issues.md', 'history.md'];
      for (const file of files) {
        const filePath = path.join(projectMemoryDir, file);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#')).length;
          console.log(`  ✓ ${file} (${lines} entries)`);
        } else {
          console.log(`  ○ ${file} (not created)`);
        }
      }
    } else {
      console.log('  Not initialized. Run: claude-config memory init');
    }
    console.log();
  }

  /**
   * Initialize project memory
   */
  memoryInit(projectDir = process.cwd()) {
    const memoryDir = path.join(projectDir, '.claude', 'memory');

    if (fs.existsSync(memoryDir)) {
      console.log('Project memory already initialized at', memoryDir);
      return;
    }

    fs.mkdirSync(memoryDir, { recursive: true });

    const files = {
      'context.md': '# Project Context\n\n<!-- Project overview and key information -->\n',
      'patterns.md': '# Code Patterns\n\n<!-- Established patterns in this codebase -->\n',
      'decisions.md': '# Architecture Decisions\n\n<!-- Key decisions and their rationale -->\n',
      'issues.md': '# Known Issues\n\n<!-- Current issues and workarounds -->\n',
      'history.md': '# Session History\n\n<!-- Notable changes and milestones -->\n'
    };

    for (const [file, content] of Object.entries(files)) {
      fs.writeFileSync(path.join(memoryDir, file), content);
    }

    console.log(`✓ Initialized project memory at ${memoryDir}`);
    console.log('\nCreated:');
    for (const file of Object.keys(files)) {
      console.log(`  ${file}`);
    }
  }

  /**
   * Add entry to memory
   */
  memoryAdd(type, content, projectDir = process.cwd()) {
    if (!type || !content) {
      console.error('Usage: claude-config memory add <type> "<content>"');
      console.log('\nTypes:');
      console.log('  Global:  preference, correction, fact');
      console.log('  Project: context, pattern, decision, issue, history');
      return;
    }

    const homeDir = process.env.HOME || '';
    const timestamp = new Date().toISOString().split('T')[0];

    // Map type to file
    const typeMap = {
      // Global
      preference: { dir: path.join(homeDir, '.claude', 'memory'), file: 'preferences.md' },
      correction: { dir: path.join(homeDir, '.claude', 'memory'), file: 'corrections.md' },
      fact: { dir: path.join(homeDir, '.claude', 'memory'), file: 'facts.md' },
      // Project
      context: { dir: path.join(projectDir, '.claude', 'memory'), file: 'context.md' },
      pattern: { dir: path.join(projectDir, '.claude', 'memory'), file: 'patterns.md' },
      decision: { dir: path.join(projectDir, '.claude', 'memory'), file: 'decisions.md' },
      issue: { dir: path.join(projectDir, '.claude', 'memory'), file: 'issues.md' },
      history: { dir: path.join(projectDir, '.claude', 'memory'), file: 'history.md' }
    };

    const target = typeMap[type];
    if (!target) {
      console.error(`Unknown type: ${type}`);
      console.log('Valid types: preference, correction, fact, context, pattern, decision, issue, history');
      return;
    }

    // Ensure directory exists
    if (!fs.existsSync(target.dir)) {
      fs.mkdirSync(target.dir, { recursive: true });
    }

    const filePath = path.join(target.dir, target.file);

    // Create file with header if it doesn't exist
    if (!fs.existsSync(filePath)) {
      const headers = {
        'preferences.md': '# Preferences\n',
        'corrections.md': '# Corrections\n',
        'facts.md': '# Facts\n',
        'context.md': '# Project Context\n',
        'patterns.md': '# Code Patterns\n',
        'decisions.md': '# Architecture Decisions\n',
        'issues.md': '# Known Issues\n',
        'history.md': '# Session History\n'
      };
      fs.writeFileSync(filePath, headers[target.file] || '');
    }

    // Append entry
    const entry = `\n- [${timestamp}] ${content}\n`;
    fs.appendFileSync(filePath, entry);

    console.log(`✓ Added ${type} to ${target.file}`);
  }

  /**
   * Search memory files
   */
  memorySearch(query, projectDir = process.cwd()) {
    if (!query) {
      console.error('Usage: claude-config memory search <query>');
      return;
    }

    const homeDir = process.env.HOME || '';
    const searchDirs = [
      { label: 'Global', dir: path.join(homeDir, '.claude', 'memory') },
      { label: 'Project', dir: path.join(projectDir, '.claude', 'memory') }
    ];

    const results = [];
    const queryLower = query.toLowerCase();

    for (const { label, dir } of searchDirs) {
      if (!fs.existsSync(dir)) continue;

      for (const file of fs.readdirSync(dir)) {
        if (!file.endsWith('.md')) continue;
        const filePath = path.join(dir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
          if (lines[i].toLowerCase().includes(queryLower)) {
            results.push({
              location: `${label}/${file}`,
              line: i + 1,
              content: lines[i].trim()
            });
          }
        }
      }
    }

    if (results.length === 0) {
      console.log(`No matches found for "${query}"`);
      return;
    }

    console.log(`\n🔍 Found ${results.length} match(es) for "${query}":\n`);
    for (const r of results) {
      console.log(`  ${r.location}:${r.line}`);
      console.log(`    ${r.content}\n`);
    }
  }

  // ===========================================================================
  // ENV COMMANDS
  // ===========================================================================

  /**
   * List environment variables
   */
  envList(projectDir = process.cwd()) {
    const envPath = path.join(projectDir, '.claude', '.env');

    console.log(`\n🔐 Environment Variables (${projectDir}/.claude/.env)\n`);

    if (!fs.existsSync(envPath)) {
      console.log('  No .env file found.');
      console.log('  Create with: claude-config env set <KEY> <value>\n');
      return;
    }

    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'));

    if (lines.length === 0) {
      console.log('  No variables set.\n');
      return;
    }

    for (const line of lines) {
      const [key] = line.split('=');
      if (key) {
        console.log(`  ${key}=****`);
      }
    }
    console.log(`\n  Total: ${lines.length} variable(s)\n`);
  }

  /**
   * Set environment variable
   */
  envSet(key, value, projectDir = process.cwd()) {
    if (!key || value === undefined) {
      console.error('Usage: claude-config env set <KEY> <value>');
      return;
    }

    const claudeDir = path.join(projectDir, '.claude');
    const envPath = path.join(claudeDir, '.env');

    // Ensure .claude directory exists
    if (!fs.existsSync(claudeDir)) {
      fs.mkdirSync(claudeDir, { recursive: true });
    }

    // Read existing content
    let lines = [];
    if (fs.existsSync(envPath)) {
      lines = fs.readFileSync(envPath, 'utf8').split('\n');
    }

    // Update or add the variable
    const keyUpper = key.toUpperCase();
    let found = false;
    lines = lines.map(line => {
      if (line.startsWith(`${keyUpper}=`)) {
        found = true;
        return `${keyUpper}=${value}`;
      }
      return line;
    });

    if (!found) {
      lines.push(`${keyUpper}=${value}`);
    }

    // Write back
    fs.writeFileSync(envPath, lines.filter(l => l.trim()).join('\n') + '\n');

    console.log(`✓ Set ${keyUpper} in .claude/.env`);
  }

  /**
   * Unset environment variable
   */
  envUnset(key, projectDir = process.cwd()) {
    if (!key) {
      console.error('Usage: claude-config env unset <KEY>');
      return;
    }

    const envPath = path.join(projectDir, '.claude', '.env');

    if (!fs.existsSync(envPath)) {
      console.log('No .env file found.');
      return;
    }

    const keyUpper = key.toUpperCase();
    let lines = fs.readFileSync(envPath, 'utf8').split('\n');
    const originalLength = lines.length;

    lines = lines.filter(line => !line.startsWith(`${keyUpper}=`));

    if (lines.length === originalLength) {
      console.log(`Variable ${keyUpper} not found.`);
      return;
    }

    fs.writeFileSync(envPath, lines.filter(l => l.trim()).join('\n') + '\n');
    console.log(`✓ Removed ${keyUpper} from .claude/.env`);
  }

  // ===========================================================================
  // PROJECT REGISTRY (for UI project switching)
  // ===========================================================================

  /**
   * Get projects registry path
   */
  getProjectsRegistryPath() {
    return path.join(this.installDir, 'projects.json');
  }

  /**
   * Load projects registry
   */
  loadProjectsRegistry() {
    const registryPath = this.getProjectsRegistryPath();
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
  saveProjectsRegistry(registry) {
    const registryPath = this.getProjectsRegistryPath();
    fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2) + '\n');
  }

  /**
   * List registered projects
   */
  projectList() {
    const registry = this.loadProjectsRegistry();

    if (registry.projects.length === 0) {
      console.log('\nNo projects registered.');
      console.log('Add one with: claude-config project add [path]\n');
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
  projectAdd(projectPath = process.cwd(), name = null) {
    const absPath = path.resolve(projectPath.replace(/^~/, process.env.HOME || ''));

    if (!fs.existsSync(absPath)) {
      console.error(`Path not found: ${absPath}`);
      return false;
    }

    const registry = this.loadProjectsRegistry();

    // Check for duplicate
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

    // If first project, make it active
    if (!registry.activeProjectId) {
      registry.activeProjectId = project.id;
    }

    this.saveProjectsRegistry(registry);
    console.log(`✓ Added project: ${project.name}`);
    console.log(`  ${absPath}`);
    return true;
  }

  /**
   * Remove project from registry
   */
  projectRemove(nameOrPath) {
    if (!nameOrPath) {
      console.error('Usage: claude-config project remove <name|path>');
      return false;
    }

    const registry = this.loadProjectsRegistry();
    const absPath = path.resolve(nameOrPath.replace(/^~/, process.env.HOME || ''));

    const idx = registry.projects.findIndex(
      p => p.name === nameOrPath || p.path === absPath
    );

    if (idx === -1) {
      console.error(`Project not found: ${nameOrPath}`);
      return false;
    }

    const removed = registry.projects.splice(idx, 1)[0];

    // If removed active project, select first remaining
    if (registry.activeProjectId === removed.id) {
      registry.activeProjectId = registry.projects[0]?.id || null;
    }

    this.saveProjectsRegistry(registry);
    console.log(`✓ Removed project: ${removed.name}`);
    return true;
  }
}

// =============================================================================
// CLI
// =============================================================================

if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  const manager = new ClaudeConfigManager();

  // Parse --template flag for init
  const templateIndex = args.indexOf('--template');
  const templateArg = templateIndex !== -1 ? args[templateIndex + 1] : null;

  switch (command) {
    // Core
    case 'init':
      if (templateArg) {
        // Remove --template and its value from args for path detection
        const filteredArgs = args.filter((_, i) => i !== templateIndex && i !== templateIndex + 1);
        manager.init(filteredArgs[1], templateArg);
      } else {
        manager.init(args[1]);
      }
      break;
    case 'apply':
      manager.apply(args[1]);
      break;
    case 'apply-template':
      manager.applyTemplate(args[1], args[2]);
      break;
    case 'show':
      manager.show(args[1]);
      break;
    case 'list':
    case 'mcps':
      manager.list();
      break;
    case 'templates':
      manager.listTemplates();
      break;

    // Edit MCPs
    case 'add':
      manager.add(args.slice(1));
      break;
    case 'remove':
    case 'rm':
      manager.remove(args.slice(1));
      break;

    // Registry management
    case 'registry-add':
      manager.registryAdd(args[1], args[2]);
      break;
    case 'registry-remove':
    case 'registry-rm':
      manager.registryRemove(args[1]);
      break;

    // Memory
    case 'memory':
      if (args[1] === 'init') {
        manager.memoryInit(args[2]);
      } else if (args[1] === 'add') {
        manager.memoryAdd(args[2], args.slice(3).join(' '));
      } else if (args[1] === 'search') {
        manager.memorySearch(args.slice(2).join(' '));
      } else {
        manager.memoryList();
      }
      break;

    // Environment
    case 'env':
      if (args[1] === 'set') {
        manager.envSet(args[2], args[3]);
      } else if (args[1] === 'unset') {
        manager.envUnset(args[2]);
      } else {
        manager.envList();
      }
      break;

    // Project registry (for UI)
    case 'project':
    case 'projects':
      if (args[1] === 'add') {
        const nameIdx = args.indexOf('--name');
        const name = nameIdx !== -1 ? args[nameIdx + 1] : null;
        const projectPath = args[2] && !args[2].startsWith('--') ? args[2] : process.cwd();
        manager.projectAdd(projectPath, name);
      } else if (args[1] === 'remove' || args[1] === 'rm') {
        manager.projectRemove(args[2]);
      } else {
        manager.projectList();
      }
      break;

    // Maintenance
    case 'update':
      manager.update(args[1]);
      break;
    case 'ui': {
      const UIServer = require('./ui/server.cjs');
      const port = parseInt(args.find(a => a.startsWith('--port='))?.split('=')[1] || '3333');
      const uiDir = args.find(a => !a.startsWith('--') && a !== 'ui') || process.cwd();
      const uiServer = new UIServer(port, uiDir, manager);
      uiServer.start();
      break;
    }
    case 'version':
    case '-v':
    case '--version':
      manager.version();
      break;

    default:
      console.log(`
claude-config v${VERSION}

Usage:
  claude-config <command> [args]

Project Commands:
  init [--template <name>]     Initialize project (optionally with template)
  apply                        Generate .mcp.json from config
  apply-template <name>        Add template rules/commands to existing project
  show                         Show current project config
  list                         List available MCPs (✓ = active)
  templates                    List available templates
  add <mcp> [mcp...]           Add MCP(s) to project
  remove <mcp> [mcp...]        Remove MCP(s) from project

Memory Commands:
  memory                       Show memory status
  memory init                  Initialize project memory
  memory add <type> <content>  Add entry (types: preference, correction, fact,
                               context, pattern, decision, issue, history)
  memory search <query>        Search all memory files

Environment Commands:
  env                          List environment variables
  env set <KEY> <value>        Set variable in .claude/.env
  env unset <KEY>              Remove variable

Project Commands (for UI):
  project                      List registered projects
  project add [path]           Add project (defaults to cwd)
  project add [path] --name X  Add with custom display name
  project remove <name|path>   Remove project from registry

Registry Commands:
  registry-add <name> '<json>'   Add MCP to global registry
  registry-remove <name>         Remove MCP from registry

Maintenance:
  ui [--port=3333]             Open web UI
  version                      Show version info

Examples:
  claude-config init --template fastapi
  claude-config add postgres github
  claude-config memory add preference "Use TypeScript for new files"
  claude-config env set GITHUB_TOKEN ghp_xxx
  claude-config apply
`);
  }
}

module.exports = ClaudeConfigManager;
