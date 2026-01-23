/**
 * Configs Routes
 */

const fs = require('fs');
const path = require('path');

/**
 * Get all configs in hierarchy
 */
function getConfigs(manager, projectDir) {
  const configs = manager.findAllConfigs(projectDir);
  return configs.map(c => ({
    dir: c.dir,
    label: c.dir === process.env.HOME ? '~' : path.relative(projectDir, c.dir) || '.',
    config: manager.loadJson(c.configPath) || { include: [], mcpServers: {} }
  }));
}

/**
 * Get inherited MCPs for a specific config level
 * Returns MCPs that are enabled by parent configs but not by this level
 */
function getInheritedMcps(manager, projectDir, configDir) {
  // Use configDir (the directory being edited) to find the hierarchy,
  // not projectDir (the UI's active project)
  const configs = manager.findAllConfigs(configDir);
  const homeDir = process.env.HOME || '';

  // Find the index of the current config in the hierarchy
  const currentIndex = configs.findIndex(c => c.dir === configDir);
  if (currentIndex === -1) {
    return { inherited: [], sources: {} };
  }

  // Get only parent configs (everything before current index)
  const parentConfigs = configs.slice(0, currentIndex);
  if (parentConfigs.length === 0) {
    return { inherited: [], sources: {} };
  }

  // Load all parent configs
  const loadedParents = parentConfigs.map(c => ({
    ...c,
    config: manager.loadJson(c.configPath) || { include: [], mcpServers: {} },
    label: c.dir === homeDir ? '~' : path.basename(c.dir)
  }));

  // Load current config to see what's already local
  const currentConfig = manager.loadJson(configs[currentIndex].configPath) || { include: [], exclude: [], mcpServers: {} };
  const localIncludes = new Set(currentConfig.include || []);
  const localExcludes = new Set(currentConfig.exclude || []);
  const localMcpServers = new Set(Object.keys(currentConfig.mcpServers || {}));

  // Collect inherited MCPs with their sources
  const inherited = [];
  const sources = {};

  for (const parent of loadedParents) {
    const parentIncludes = parent.config.include || [];
    for (const mcp of parentIncludes) {
      // Only show as inherited if not locally included/excluded
      if (!localIncludes.has(mcp) && !sources[mcp]) {
        sources[mcp] = parent.label;
        inherited.push({
          name: mcp,
          source: parent.label,
          sourceDir: parent.dir,
          isExcluded: localExcludes.has(mcp)
        });
      }
    }

    // Also check inline mcpServers from parents
    const parentMcpServers = parent.config.mcpServers || {};
    for (const [name, config] of Object.entries(parentMcpServers)) {
      if (!name.startsWith('_') && !localMcpServers.has(name) && !sources[name]) {
        sources[name] = parent.label;
        inherited.push({
          name,
          source: parent.label,
          sourceDir: parent.dir,
          isInline: true,
          config,
          isExcluded: localExcludes.has(name)
        });
      }
    }
  }

  return { inherited, sources };
}

/**
 * Update a config
 */
function updateConfig(body, manager, applyConfig) {
  const { dir, config } = body;
  const configPath = path.join(dir, '.claude', 'mcps.json');

  // Ensure directory exists
  const claudeDir = path.join(dir, '.claude');
  if (!fs.existsSync(claudeDir)) {
    fs.mkdirSync(claudeDir, { recursive: true });
  }

  manager.saveJson(configPath, config);

  // Auto-apply: Generate .mcp.json immediately after save
  const applyResult = applyConfig(dir);

  return {
    success: true,
    path: configPath,
    applied: applyResult.success,
    tools: applyResult.tools
  };
}

/**
 * Apply config to generate .mcp.json
 */
function applyConfig(dir, projectDir, uiConfig, manager) {
  const targetDir = dir || projectDir;
  const enabledTools = uiConfig.enabledTools || ['claude'];

  // Use multi-tool apply
  const results = manager.applyForTools(targetDir, enabledTools);

  // Build response with details for each tool
  const toolResults = {};
  let anySuccess = false;

  for (const [tool, success] of Object.entries(results)) {
    toolResults[tool] = success;
    if (success) anySuccess = true;
  }

  return {
    success: anySuccess,
    tools: toolResults,
    enabledTools
  };
}

/**
 * Detect template for a directory
 */
function detectTemplate(dir, manager, getTemplates) {
  const resolvedDir = path.resolve(dir.replace(/^~/, require('os').homedir()));
  if (!fs.existsSync(resolvedDir)) {
    return { detected: false, error: 'Directory not found' };
  }

  // Detect project markers
  const markers = {
    npm: fs.existsSync(path.join(resolvedDir, 'package.json')),
    python: fs.existsSync(path.join(resolvedDir, 'pyproject.toml')) ||
            fs.existsSync(path.join(resolvedDir, 'requirements.txt')) ||
            fs.existsSync(path.join(resolvedDir, 'setup.py')),
    rust: fs.existsSync(path.join(resolvedDir, 'Cargo.toml')),
    go: fs.existsSync(path.join(resolvedDir, 'go.mod')),
    ruby: fs.existsSync(path.join(resolvedDir, 'Gemfile')),
  };

  let framework = null;
  let confidence = 'low';

  if (markers.npm) {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(resolvedDir, 'package.json'), 'utf8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };

      if (deps.react) {
        framework = deps.typescript ? 'react-ts' : 'react-js';
        confidence = 'high';
      } else if (deps.next) {
        framework = deps.typescript ? 'react-ts' : 'react-js';
        confidence = 'high';
      } else if (deps.vue) {
        framework = 'languages/javascript';
        confidence = 'medium';
      } else if (deps.express || deps.fastify || deps.koa) {
        framework = deps.typescript ? 'languages/typescript' : 'languages/javascript';
        confidence = 'medium';
      } else if (deps.typescript) {
        framework = 'languages/typescript';
        confidence = 'medium';
      } else {
        framework = 'languages/javascript';
        confidence = 'low';
      }
    } catch (e) {
      framework = 'languages/javascript';
      confidence = 'low';
    }
  } else if (markers.python) {
    const hasRequirements = fs.existsSync(path.join(resolvedDir, 'requirements.txt'));
    const hasPyproject = fs.existsSync(path.join(resolvedDir, 'pyproject.toml'));

    if (hasRequirements) {
      try {
        const reqs = fs.readFileSync(path.join(resolvedDir, 'requirements.txt'), 'utf8').toLowerCase();
        if (reqs.includes('fastapi')) {
          framework = 'fastapi';
          confidence = 'high';
        } else if (reqs.includes('django')) {
          framework = 'languages/python';
          confidence = 'medium';
        } else if (reqs.includes('flask')) {
          framework = 'languages/python';
          confidence = 'medium';
        } else if (reqs.includes('mcp')) {
          framework = 'mcp-python';
          confidence = 'high';
        }
      } catch (e) {}
    }

    if (!framework && hasPyproject) {
      try {
        const pyproject = fs.readFileSync(path.join(resolvedDir, 'pyproject.toml'), 'utf8').toLowerCase();
        if (pyproject.includes('fastapi')) {
          framework = 'fastapi';
          confidence = 'high';
        } else if (pyproject.includes('mcp')) {
          framework = 'mcp-python';
          confidence = 'high';
        }
      } catch (e) {}
    }

    if (!framework) {
      const hasMain = fs.existsSync(path.join(resolvedDir, '__main__.py')) ||
                     fs.existsSync(path.join(resolvedDir, 'cli.py')) ||
                     fs.existsSync(path.join(resolvedDir, 'main.py'));
      if (hasMain) {
        framework = 'python-cli';
        confidence = 'medium';
      } else {
        framework = 'languages/python';
        confidence = 'low';
      }
    }
  } else if (markers.rust) {
    framework = 'languages/rust';
    confidence = 'medium';
  } else if (markers.go) {
    framework = 'languages/go';
    confidence = 'medium';
  }

  if (!framework) {
    return { detected: false, reason: 'No recognizable project markers found' };
  }

  // Find matching template
  const templates = getTemplates();
  let matchedTemplate = null;

  matchedTemplate = templates.find(t =>
    t.fullName === `frameworks/${framework}` || t.name === framework
  );

  if (!matchedTemplate && framework.startsWith('languages/')) {
    matchedTemplate = templates.find(t => t.fullName === framework);
  }

  if (!matchedTemplate && framework.startsWith('languages/')) {
    matchedTemplate = templates.find(t =>
      t.includes && t.includes.includes(framework) && t.category === 'frameworks'
    );
  }

  if (!matchedTemplate) {
    return {
      detected: false,
      reason: `No template found for detected framework: ${framework}`,
      suggestedFramework: framework,
      markers
    };
  }

  return {
    detected: true,
    template: matchedTemplate,
    confidence,
    reason: `Detected ${framework} project`,
    markers
  };
}

/**
 * Apply template to multiple projects (batch)
 */
function applyTemplateBatch(templateId, dirs, getTemplates, applyTemplateToDir) {
  if (!templateId) {
    return { error: 'templateId is required' };
  }
  if (!dirs || !Array.isArray(dirs) || dirs.length === 0) {
    return { error: 'dirs array is required' };
  }

  const templates = getTemplates();
  const template = templates.find(t => t.id === templateId);
  if (!template) {
    return { error: 'Template not found', templateId };
  }

  const results = [];
  let successCount = 0;

  for (const dir of dirs) {
    const absDir = path.resolve(dir.replace(/^~/, require('os').homedir()));
    const claudeDir = path.join(absDir, '.claude');

    if (!fs.existsSync(claudeDir)) {
      fs.mkdirSync(claudeDir, { recursive: true });
    }

    try {
      const result = applyTemplateToDir(template, absDir);
      results.push({ dir, success: true, ...result });
      successCount++;
    } catch (error) {
      results.push({ dir, success: false, error: error.message });
    }
  }

  return {
    success: true,
    count: successCount,
    results
  };
}

/**
 * Apply a template to a single directory
 */
function applyTemplateToDir(template, absDir) {
  const claudeDir = path.join(absDir, '.claude');

  // Apply MCPs from template
  if (template.mcps && template.mcps.length > 0) {
    const mcpsPath = path.join(claudeDir, 'mcps.json');
    let currentConfig = { include: [], mcpServers: {} };

    if (fs.existsSync(mcpsPath)) {
      try {
        currentConfig = JSON.parse(fs.readFileSync(mcpsPath, 'utf-8'));
      } catch (e) {}
    }

    const include = new Set(currentConfig.include || []);
    for (const mcpName of template.mcps) {
      include.add(mcpName);
    }
    currentConfig.include = Array.from(include);

    fs.writeFileSync(mcpsPath, JSON.stringify(currentConfig, null, 2));
  }

  // Apply rules from template
  if (template.rules && template.rules.length > 0) {
    const rulesDir = path.join(claudeDir, 'rules');
    if (!fs.existsSync(rulesDir)) {
      fs.mkdirSync(rulesDir, { recursive: true });
    }

    for (const rule of template.rules) {
      const rulePath = path.join(rulesDir, rule.name);
      if (!fs.existsSync(rulePath)) {
        fs.writeFileSync(rulePath, rule.content);
      }
    }
  }

  // Apply commands from template
  if (template.commands && template.commands.length > 0) {
    const commandsDir = path.join(claudeDir, 'commands');
    if (!fs.existsSync(commandsDir)) {
      fs.mkdirSync(commandsDir, { recursive: true });
    }

    for (const command of template.commands) {
      const commandPath = path.join(commandsDir, command.name);
      if (!fs.existsSync(commandPath)) {
        fs.writeFileSync(commandPath, command.content);
      }
    }
  }

  return { applied: true };
}

module.exports = {
  getConfigs,
  getInheritedMcps,
  updateConfig,
  applyConfig,
  detectTemplate,
  applyTemplateBatch,
  applyTemplateToDir,
};
