/**
 * Workstreams feature
 */

const fs = require('fs');
const path = require('path');

/**
 * Get workstreams file path
 */
function getWorkstreamsPath(installDir) {
  return path.join(installDir, 'workstreams.json');
}

/**
 * Load workstreams
 */
function loadWorkstreams(installDir) {
  const wsPath = getWorkstreamsPath(installDir);
  if (fs.existsSync(wsPath)) {
    try {
      return JSON.parse(fs.readFileSync(wsPath, 'utf8'));
    } catch (e) {
      return { workstreams: [], activeId: null, lastUsedByProject: {} };
    }
  }
  return { workstreams: [], activeId: null, lastUsedByProject: {} };
}

/**
 * Save workstreams
 */
function saveWorkstreams(installDir, data) {
  const wsPath = getWorkstreamsPath(installDir);
  const dir = path.dirname(wsPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(wsPath, JSON.stringify(data, null, 2) + '\n');
}

/**
 * List all workstreams
 */
function workstreamList(installDir) {
  const data = loadWorkstreams(installDir);

  if (data.workstreams.length === 0) {
    console.log('\nNo workstreams defined.');
    console.log('Create one with: coder-config workstream create "Name"\n');
    return data.workstreams;
  }

  console.log('\n📋 Workstreams:\n');
  for (const ws of data.workstreams) {
    const active = ws.id === data.activeId ? '● ' : '○ ';
    console.log(`${active}${ws.name}`);
    if (ws.projects && ws.projects.length > 0) {
      console.log(`    Projects: ${ws.projects.map(p => path.basename(p)).join(', ')}`);
    }
    if (ws.rules) {
      const preview = ws.rules.substring(0, 60).replace(/\n/g, ' ');
      console.log(`    Rules: ${preview}${ws.rules.length > 60 ? '...' : ''}`);
    }
  }
  console.log('');
  return data.workstreams;
}

/**
 * Create a new workstream
 */
function workstreamCreate(installDir, name, projects = [], rules = '') {
  if (!name) {
    console.error('Usage: coder-config workstream create "Name"');
    return null;
  }

  const data = loadWorkstreams(installDir);

  if (data.workstreams.some(ws => ws.name.toLowerCase() === name.toLowerCase())) {
    console.error(`Workstream "${name}" already exists`);
    return null;
  }

  const workstream = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
    name,
    projects: projects.map(p => path.resolve(p.replace(/^~/, process.env.HOME || ''))),
    rules: rules || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  data.workstreams.push(workstream);

  if (!data.activeId) {
    data.activeId = workstream.id;
  }

  saveWorkstreams(installDir, data);
  console.log(`✓ Created workstream: ${name}`);
  return workstream;
}

/**
 * Update a workstream
 */
function workstreamUpdate(installDir, idOrName, updates) {
  const data = loadWorkstreams(installDir);
  const ws = data.workstreams.find(
    w => w.id === idOrName || w.name.toLowerCase() === idOrName.toLowerCase()
  );

  if (!ws) {
    console.error(`Workstream not found: ${idOrName}`);
    return null;
  }

  if (updates.name !== undefined) ws.name = updates.name;
  if (updates.projects !== undefined) {
    ws.projects = updates.projects.map(p =>
      path.resolve(p.replace(/^~/, process.env.HOME || ''))
    );
  }
  if (updates.rules !== undefined) ws.rules = updates.rules;
  ws.updatedAt = new Date().toISOString();

  saveWorkstreams(installDir, data);
  console.log(`✓ Updated workstream: ${ws.name}`);
  return ws;
}

/**
 * Delete a workstream
 */
function workstreamDelete(installDir, idOrName) {
  const data = loadWorkstreams(installDir);
  const idx = data.workstreams.findIndex(
    w => w.id === idOrName || w.name.toLowerCase() === idOrName.toLowerCase()
  );

  if (idx === -1) {
    console.error(`Workstream not found: ${idOrName}`);
    return false;
  }

  const removed = data.workstreams.splice(idx, 1)[0];

  if (data.activeId === removed.id) {
    data.activeId = data.workstreams[0]?.id || null;
  }

  saveWorkstreams(installDir, data);
  console.log(`✓ Deleted workstream: ${removed.name}`);
  return true;
}

/**
 * Set active workstream
 */
function workstreamUse(installDir, idOrName) {
  const data = loadWorkstreams(installDir);

  if (!idOrName) {
    const active = data.workstreams.find(w => w.id === data.activeId);
    if (active) {
      console.log(`Active workstream: ${active.name}`);
    } else {
      console.log('No active workstream');
    }
    return active || null;
  }

  const ws = data.workstreams.find(
    w => w.id === idOrName || w.name.toLowerCase() === idOrName.toLowerCase()
  );

  if (!ws) {
    console.error(`Workstream not found: ${idOrName}`);
    return null;
  }

  data.activeId = ws.id;
  saveWorkstreams(installDir, data);
  console.log(`✓ Switched to workstream: ${ws.name}`);
  return ws;
}

/**
 * Get active workstream (uses env var or file-based activeId)
 */
function workstreamActive(installDir) {
  return getActiveWorkstream(installDir);
}

/**
 * Add project to workstream
 */
function workstreamAddProject(installDir, idOrName, projectPath) {
  const data = loadWorkstreams(installDir);
  const ws = data.workstreams.find(
    w => w.id === idOrName || w.name.toLowerCase() === idOrName.toLowerCase()
  );

  if (!ws) {
    console.error(`Workstream not found: ${idOrName}`);
    return null;
  }

  const absPath = path.resolve(projectPath.replace(/^~/, process.env.HOME || ''));

  if (!ws.projects.includes(absPath)) {
    ws.projects.push(absPath);
    ws.updatedAt = new Date().toISOString();
    saveWorkstreams(installDir, data);
    console.log(`✓ Added ${path.basename(absPath)} to ${ws.name}`);
  } else {
    console.log(`Project already in workstream: ${path.basename(absPath)}`);
  }

  return ws;
}

/**
 * Remove project from workstream
 */
function workstreamRemoveProject(installDir, idOrName, projectPath) {
  const data = loadWorkstreams(installDir);
  const ws = data.workstreams.find(
    w => w.id === idOrName || w.name.toLowerCase() === idOrName.toLowerCase()
  );

  if (!ws) {
    console.error(`Workstream not found: ${idOrName}`);
    return null;
  }

  const absPath = path.resolve(projectPath.replace(/^~/, process.env.HOME || ''));
  const idx = ws.projects.indexOf(absPath);

  if (idx !== -1) {
    ws.projects.splice(idx, 1);
    ws.updatedAt = new Date().toISOString();
    saveWorkstreams(installDir, data);
    console.log(`✓ Removed ${path.basename(absPath)} from ${ws.name}`);
  } else {
    console.log(`Project not in workstream: ${path.basename(absPath)}`);
  }

  return ws;
}

/**
 * Get active workstream - checks env var first, then falls back to file
 */
function getActiveWorkstream(installDir) {
  const data = loadWorkstreams(installDir);

  // Check env var first (per-session activation)
  // Support both CODER_WORKSTREAM (preferred) and CLAUDE_WORKSTREAM (legacy)
  const envWorkstream = process.env.CODER_WORKSTREAM || process.env.CLAUDE_WORKSTREAM;
  if (envWorkstream) {
    const ws = data.workstreams.find(
      w => w.id === envWorkstream || w.name.toLowerCase() === envWorkstream.toLowerCase()
    );
    if (ws) return ws;
  }

  // Fall back to file-based activeId
  return data.workstreams.find(w => w.id === data.activeId) || null;
}

/**
 * Inject active workstream context into Claude - includes restriction and context
 */
function workstreamInject(installDir, silent = false) {
  const active = getActiveWorkstream(installDir);

  if (!active) {
    if (!silent) console.log('No active workstream');
    return null;
  }

  // Build the injection output
  const lines = [];

  // Header
  lines.push(`## Active Workstream: ${active.name}`);
  lines.push('');

  // Restriction section (always include if there are projects)
  if (active.projects && active.projects.length > 0) {
    lines.push('### Restriction');
    lines.push('');
    lines.push('You are working within a scoped workstream. You may ONLY access files within these directories:');
    lines.push('');
    for (const p of active.projects) {
      const displayPath = p.replace(process.env.HOME || '', '~');
      lines.push(`- ${displayPath}`);
    }
    lines.push('');
    lines.push('**Do NOT read, write, search, or reference files outside these directories.**');
    lines.push('');
  }

  // Context section (user-defined context/rules)
  const context = active.context || active.rules || '';
  if (context.trim()) {
    lines.push('### Context');
    lines.push('');
    lines.push(context.trim());
    lines.push('');
  }

  // Repositories table
  if (active.projects && active.projects.length > 0) {
    lines.push('### Repositories in this Workstream');
    lines.push('');
    lines.push('| Repository | Path |');
    lines.push('|------------|------|');
    for (const p of active.projects) {
      const name = path.basename(p);
      const displayPath = p.replace(process.env.HOME || '', '~');
      lines.push(`| ${name} | ${displayPath} |`);
    }
    lines.push('');
  }

  const output = lines.join('\n');

  // Always output the context (for hooks), silent only suppresses "no active" message
  console.log(output);

  return output;
}

/**
 * Detect workstream from current directory
 */
function workstreamDetect(installDir, dir = process.cwd()) {
  const data = loadWorkstreams(installDir);
  const absDir = path.resolve(dir.replace(/^~/, process.env.HOME || ''));

  const matches = data.workstreams.filter(ws =>
    ws.projects.some(p => absDir.startsWith(p) || p.startsWith(absDir))
  );

  if (matches.length === 0) {
    return null;
  }

  if (matches.length === 1) {
    return matches[0];
  }

  if (data.lastUsedByProject && data.lastUsedByProject[absDir]) {
    const lastUsed = matches.find(ws => ws.id === data.lastUsedByProject[absDir]);
    if (lastUsed) return lastUsed;
  }

  return matches.sort((a, b) =>
    new Date(b.updatedAt) - new Date(a.updatedAt)
  )[0];
}

/**
 * Get workstream by ID
 */
function workstreamGet(installDir, id) {
  const data = loadWorkstreams(installDir);
  return data.workstreams.find(w => w.id === id) || null;
}

/**
 * Count how many workstreams include a given project path
 */
function countWorkstreamsForProject(installDir, projectPath) {
  const data = loadWorkstreams(installDir);
  const absPath = path.resolve(projectPath.replace(/^~/, process.env.HOME || ''));
  return data.workstreams.filter(ws =>
    ws.projects && ws.projects.includes(absPath)
  ).length;
}

/**
 * Install the pre-prompt hook for workstream injection
 */
function workstreamInstallHook() {
  const hookDir = path.join(process.env.HOME || '', '.claude', 'hooks');
  const hookPath = path.join(hookDir, 'pre-prompt.sh');

  // Ensure hooks directory exists
  if (!fs.existsSync(hookDir)) {
    fs.mkdirSync(hookDir, { recursive: true });
  }

  const hookContent = `#!/bin/bash
# Claude Code pre-prompt hook for workstream injection
# Installed by coder-config

# Check for active workstream via env var or file
if [ -n "$CODER_WORKSTREAM" ] || coder-config workstream active >/dev/null 2>&1; then
  coder-config workstream inject --silent
fi
`;

  // Check if hook already exists
  if (fs.existsSync(hookPath)) {
    const existing = fs.readFileSync(hookPath, 'utf8');
    if (existing.includes('coder-config workstream inject')) {
      console.log('✓ Workstream hook already installed');
      return true;
    }
    // Append to existing hook
    fs.appendFileSync(hookPath, '\n' + hookContent);
    console.log('✓ Appended workstream injection to existing pre-prompt hook');
  } else {
    fs.writeFileSync(hookPath, hookContent);
    fs.chmodSync(hookPath, '755');
    console.log('✓ Installed pre-prompt hook at ~/.claude/hooks/pre-prompt.sh');
  }

  console.log('\nWorkstream injection is now active. When a workstream is active,');
  console.log('Claude will see the restriction and context at the start of each prompt.');
  console.log('\nTo activate a workstream for this session:');
  console.log('  export CODER_WORKSTREAM=<name-or-id>');
  console.log('\nOr use the global active workstream:');
  console.log('  coder-config workstream use <name>');

  return true;
}

/**
 * Install the SessionStart hook for Gemini CLI workstream injection
 */
function workstreamInstallHookGemini() {
  const geminiDir = path.join(process.env.HOME || '', '.gemini');
  const settingsPath = path.join(geminiDir, 'settings.json');

  // Ensure .gemini directory exists
  if (!fs.existsSync(geminiDir)) {
    fs.mkdirSync(geminiDir, { recursive: true });
  }

  // Load existing settings or create new
  let settings = {};
  if (fs.existsSync(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    } catch (e) {
      settings = {};
    }
  }

  // Find the hook script path (relative to coder-config installation)
  const hookScriptPath = path.join(__dirname, '..', 'hooks', 'gemini-workstream.sh');

  // Check if hook already installed
  const existingHooks = settings.hooks?.SessionStart || [];
  const alreadyInstalled = existingHooks.some(h =>
    h.name === 'coder-config-workstream' || (h.command && h.command.includes('gemini-workstream'))
  );

  if (alreadyInstalled) {
    console.log('✓ Workstream hook already installed for Gemini CLI');
    return true;
  }

  // Enable hooks system if not enabled
  if (!settings.tools) settings.tools = {};
  if (!settings.hooks) settings.hooks = {};
  settings.tools.enableHooks = true;
  settings.hooks.enabled = true;

  // Add the SessionStart hook
  if (!settings.hooks.SessionStart) {
    settings.hooks.SessionStart = [];
  }

  settings.hooks.SessionStart.push({
    name: 'coder-config-workstream',
    type: 'command',
    command: hookScriptPath,
    description: 'Inject workstream context and restrictions',
    timeout: 5000
  });

  // Save settings
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
  console.log('✓ Installed SessionStart hook for Gemini CLI');
  console.log(`  Hook script: ${hookScriptPath}`);
  console.log(`  Settings: ${settingsPath}`);

  console.log('\nWorkstream injection is now active for Gemini CLI.');
  console.log('When a workstream is active, Gemini will see the restriction');
  console.log('and context at the start of each session.');
  console.log('\nTo activate a workstream for this session:');
  console.log('  export CODER_WORKSTREAM=<name-or-id>');

  return true;
}

/**
 * Install hook for Codex CLI workstream injection
 * Codex uses TOML config at ~/.codex/config.toml
 */
function workstreamInstallHookCodex() {
  const codexDir = path.join(process.env.HOME || '', '.codex');
  const configPath = path.join(codexDir, 'config.toml');

  // Ensure .codex directory exists
  if (!fs.existsSync(codexDir)) {
    fs.mkdirSync(codexDir, { recursive: true });
  }

  // Find the hook script path
  const hookScriptPath = path.join(__dirname, '..', 'hooks', 'codex-workstream.sh');

  // Make sure hook script is executable
  try {
    fs.chmodSync(hookScriptPath, '755');
  } catch (e) {
    // Ignore permission errors
  }

  // For Codex, we'll create a pre-session hook in the hooks directory
  const codexHooksDir = path.join(codexDir, 'hooks');
  if (!fs.existsSync(codexHooksDir)) {
    fs.mkdirSync(codexHooksDir, { recursive: true });
  }

  const targetHookPath = path.join(codexHooksDir, 'pre-session.sh');

  // Check if hook already exists with our content
  if (fs.existsSync(targetHookPath)) {
    const existing = fs.readFileSync(targetHookPath, 'utf8');
    if (existing.includes('coder-config workstream inject')) {
      console.log('✓ Workstream hook already installed for Codex CLI');
      return true;
    }
    // Append to existing hook
    const appendContent = `
# coder-config workstream injection
if [ -n "$CODER_WORKSTREAM" ] && command -v coder-config &> /dev/null; then
  coder-config workstream inject --silent
fi
`;
    fs.appendFileSync(targetHookPath, appendContent);
    console.log('✓ Appended workstream injection to existing Codex pre-session hook');
  } else {
    // Create new hook
    const hookContent = `#!/bin/bash
# Codex CLI pre-session hook for workstream injection
# Installed by coder-config

# Check for active workstream via env var
if [ -n "$CODER_WORKSTREAM" ] && command -v coder-config &> /dev/null; then
  coder-config workstream inject --silent
fi
`;
    fs.writeFileSync(targetHookPath, hookContent);
    fs.chmodSync(targetHookPath, '755');
    console.log('✓ Installed pre-session hook for Codex CLI');
    console.log(`  Hook location: ${targetHookPath}`);
  }

  console.log('\nWorkstream injection is now active for Codex CLI.');
  console.log('When a workstream is active, Codex will see the restriction');
  console.log('and context at the start of each session.');
  console.log('\nTo activate a workstream for this session:');
  console.log('  export CODER_WORKSTREAM=<name-or-id>');

  return true;
}

/**
 * Deactivate workstream (output shell command to unset env var)
 */
function workstreamDeactivate() {
  console.log('To deactivate the workstream for this session, run:');
  console.log('  unset CODER_WORKSTREAM');
  console.log('\nOr to clear the global active workstream:');
  console.log('  coder-config workstream use --clear');
  return true;
}

/**
 * Check if a path is within the active workstream's directories
 * Used by pre-tool-call hooks for enforcement
 * Returns true if path is valid, false otherwise
 */
function workstreamCheckPath(installDir, targetPath, silent = false) {
  const active = getActiveWorkstream(installDir);

  // No active workstream = all paths allowed
  if (!active) {
    return true;
  }

  // No projects in workstream = all paths allowed
  if (!active.projects || active.projects.length === 0) {
    return true;
  }

  // Resolve the target path
  const absPath = path.resolve(targetPath.replace(/^~/, process.env.HOME || ''));

  // Check if path is within any of the workstream's directories
  const isWithin = active.projects.some(projectPath => {
    // Path is within if it starts with the project path
    // Handle both exact match and subdirectories
    return absPath === projectPath || absPath.startsWith(projectPath + path.sep);
  });

  if (!silent) {
    if (isWithin) {
      console.log(`✓ Path is within workstream "${active.name}"`);
    } else {
      console.error(`✗ Path is outside workstream "${active.name}"`);
      console.error(`  Allowed directories:`);
      for (const p of active.projects) {
        console.error(`    - ${p.replace(process.env.HOME || '', '~')}`);
      }
    }
  }

  return isWithin;
}

/**
 * Generate rules/context from project repositories using Claude Code
 * Runs `claude -p` to analyze repos and generate smart context
 */
async function generateRulesWithClaude(projects) {
  if (!projects || projects.length === 0) {
    return '';
  }

  const { execFileSync } = require('child_process');

  const projectPaths = projects.map(p =>
    path.resolve(p.replace(/^~/, process.env.HOME || ''))
  );

  const projectList = projectPaths.map(p => `- ${p}`).join('\n');

  const prompt = `Analyze these project repositories and generate concise workstream context rules for an AI coding assistant. Focus on:
1. What each project does (brief description)
2. Key technologies and frameworks used
3. How the projects relate to each other (if multiple)
4. Any important conventions or patterns to follow

Projects:
${projectList}

Output markdown suitable for injecting into an AI assistant's context. Keep it concise (under 500 words). Do not include code blocks or examples - just descriptions and guidelines.`;

  try {
    // Run claude -p with the prompt using execFileSync (safer than exec)
    const result = execFileSync('claude', ['-p', prompt], {
      cwd: projectPaths[0],
      encoding: 'utf8',
      timeout: 60000, // 60 second timeout
      maxBuffer: 1024 * 1024, // 1MB buffer
    });

    return result.trim();
  } catch (error) {
    console.error('Claude generation failed:', error.message);
    // Fall back to simple generation
    return generateRulesFromRepos(projects);
  }
}

/**
 * Generate rules/context from project repositories
 * Reads README.md, package.json, CLAUDE.md, etc. to create a summary
 */
function generateRulesFromRepos(projects) {
  if (!projects || projects.length === 0) {
    return '';
  }

  const lines = [];
  lines.push('# Workstream Context');
  lines.push('');
  lines.push('## Repositories');
  lines.push('');

  for (const projectPath of projects) {
    const absPath = path.resolve(projectPath.replace(/^~/, process.env.HOME || ''));
    const name = path.basename(absPath);

    lines.push(`### ${name}`);
    lines.push('');

    // Check for CLAUDE.md first (most relevant for Claude context)
    const claudeMdPath = path.join(absPath, 'CLAUDE.md');
    if (fs.existsSync(claudeMdPath)) {
      try {
        const content = fs.readFileSync(claudeMdPath, 'utf8');
        // Extract first section or summary
        const firstSection = extractFirstSection(content);
        if (firstSection) {
          lines.push(firstSection.trim());
          lines.push('');
          continue; // CLAUDE.md is comprehensive, skip other files
        }
      } catch (e) {
        // Ignore read errors
      }
    }

    // Check for package.json (JavaScript/TypeScript projects)
    const packageJsonPath = path.join(absPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        if (pkg.description) {
          lines.push(`**Description:** ${pkg.description}`);
          lines.push('');
        }
        const deps = Object.keys(pkg.dependencies || {});
        const devDeps = Object.keys(pkg.devDependencies || {});
        if (deps.length > 0 || devDeps.length > 0) {
          const keyDeps = [...deps, ...devDeps].filter(d =>
            ['react', 'vue', 'angular', 'next', 'express', 'fastify', 'koa',
             'typescript', 'prisma', 'drizzle', 'mongoose', 'sequelize',
             'tailwindcss', 'vite', 'webpack', 'jest', 'vitest', 'mocha'].includes(d)
          );
          if (keyDeps.length > 0) {
            lines.push(`**Stack:** ${keyDeps.join(', ')}`);
            lines.push('');
          }
        }
      } catch (e) {
        // Ignore parse errors
      }
    }

    // Check for pyproject.toml (Python projects)
    const pyprojectPath = path.join(absPath, 'pyproject.toml');
    if (fs.existsSync(pyprojectPath)) {
      try {
        const content = fs.readFileSync(pyprojectPath, 'utf8');
        const descMatch = content.match(/description\s*=\s*"([^"]+)"/);
        if (descMatch) {
          lines.push(`**Description:** ${descMatch[1]}`);
          lines.push('');
        }
        // Detect common Python frameworks
        const frameworks = [];
        if (content.includes('fastapi')) frameworks.push('FastAPI');
        if (content.includes('django')) frameworks.push('Django');
        if (content.includes('flask')) frameworks.push('Flask');
        if (content.includes('sqlalchemy')) frameworks.push('SQLAlchemy');
        if (content.includes('pytest')) frameworks.push('pytest');
        if (frameworks.length > 0) {
          lines.push(`**Stack:** ${frameworks.join(', ')}`);
          lines.push('');
        }
      } catch (e) {
        // Ignore read errors
      }
    }

    // Check for README.md
    const readmePath = path.join(absPath, 'README.md');
    if (fs.existsSync(readmePath)) {
      try {
        const content = fs.readFileSync(readmePath, 'utf8');
        // Extract first paragraph or description
        const firstPara = extractFirstParagraph(content);
        if (firstPara && firstPara.length > 20) {
          lines.push(firstPara.trim());
          lines.push('');
        }
      } catch (e) {
        // Ignore read errors
      }
    }

    // Check for Cargo.toml (Rust projects)
    const cargoPath = path.join(absPath, 'Cargo.toml');
    if (fs.existsSync(cargoPath)) {
      try {
        const content = fs.readFileSync(cargoPath, 'utf8');
        const descMatch = content.match(/description\s*=\s*"([^"]+)"/);
        if (descMatch) {
          lines.push(`**Description:** ${descMatch[1]}`);
          lines.push('');
        }
        lines.push('**Language:** Rust');
        lines.push('');
      } catch (e) {
        // Ignore read errors
      }
    }

    // Check for go.mod (Go projects)
    const goModPath = path.join(absPath, 'go.mod');
    if (fs.existsSync(goModPath)) {
      lines.push('**Language:** Go');
      lines.push('');
    }

    // If nothing was found, just note the path
    if (lines[lines.length - 1] === '' && lines[lines.length - 2] === `### ${name}`) {
      lines.push(`*Project at ${absPath.replace(process.env.HOME || '', '~')}*`);
      lines.push('');
    }
  }

  return lines.join('\n').trim();
}

/**
 * Extract first meaningful section from markdown
 */
function extractFirstSection(content) {
  const lines = content.split('\n');
  let result = [];
  let inSection = false;
  let lineCount = 0;

  for (const line of lines) {
    // Skip initial title
    if (!inSection && line.startsWith('# ')) {
      inSection = true;
      continue;
    }
    if (inSection) {
      // Stop at next heading or after reasonable amount of content
      if (line.startsWith('## ') && lineCount > 3) break;
      if (lineCount > 15) break;
      result.push(line);
      if (line.trim()) lineCount++;
    }
  }

  return result.join('\n').trim();
}

/**
 * Extract first paragraph from README
 */
function extractFirstParagraph(content) {
  const lines = content.split('\n');
  let result = [];
  let started = false;
  let emptyLineCount = 0;

  for (const line of lines) {
    // Skip badges, titles, and empty lines at start
    if (!started) {
      if (line.startsWith('#') || line.startsWith('![') || line.startsWith('[!') || !line.trim()) {
        continue;
      }
      started = true;
    }

    if (started) {
      if (!line.trim()) {
        emptyLineCount++;
        if (emptyLineCount > 1) break;
      } else {
        emptyLineCount = 0;
        result.push(line);
        if (result.length > 5) break;
      }
    }
  }

  return result.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Get global settings path
 */
function getSettingsPath(installDir) {
  return path.join(installDir, 'settings.json');
}

/**
 * Load global settings
 */
function loadSettings(installDir) {
  const settingsPath = getSettingsPath(installDir);
  if (fs.existsSync(settingsPath)) {
    try {
      return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    } catch (e) {
      return { workstreamAutoActivate: true };
    }
  }
  return { workstreamAutoActivate: true };
}

/**
 * Save global settings
 */
function saveSettings(installDir, settings) {
  const settingsPath = getSettingsPath(installDir);
  const dir = path.dirname(settingsPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
}

/**
 * Add trigger folder to workstream
 */
function workstreamAddTrigger(installDir, idOrName, folderPath) {
  const data = loadWorkstreams(installDir);
  const ws = data.workstreams.find(
    w => w.id === idOrName || w.name.toLowerCase() === idOrName.toLowerCase()
  );

  if (!ws) {
    console.error(`Workstream not found: ${idOrName}`);
    return null;
  }

  const absPath = path.resolve(folderPath.replace(/^~/, process.env.HOME || ''));

  if (!ws.triggerFolders) {
    ws.triggerFolders = [];
  }

  if (!ws.triggerFolders.includes(absPath)) {
    ws.triggerFolders.push(absPath);
    ws.updatedAt = new Date().toISOString();
    saveWorkstreams(installDir, data);
    console.log(`✓ Added trigger folder ${path.basename(absPath)} to ${ws.name}`);
  } else {
    console.log(`Trigger folder already in workstream: ${path.basename(absPath)}`);
  }

  return ws;
}

/**
 * Remove trigger folder from workstream
 */
function workstreamRemoveTrigger(installDir, idOrName, folderPath) {
  const data = loadWorkstreams(installDir);
  const ws = data.workstreams.find(
    w => w.id === idOrName || w.name.toLowerCase() === idOrName.toLowerCase()
  );

  if (!ws) {
    console.error(`Workstream not found: ${idOrName}`);
    return null;
  }

  const absPath = path.resolve(folderPath.replace(/^~/, process.env.HOME || ''));

  if (!ws.triggerFolders) {
    ws.triggerFolders = [];
  }

  const idx = ws.triggerFolders.indexOf(absPath);

  if (idx !== -1) {
    ws.triggerFolders.splice(idx, 1);
    ws.updatedAt = new Date().toISOString();
    saveWorkstreams(installDir, data);
    console.log(`✓ Removed trigger folder ${path.basename(absPath)} from ${ws.name}`);
  } else {
    console.log(`Trigger folder not in workstream: ${path.basename(absPath)}`);
  }

  return ws;
}

/**
 * Set auto-activate for a workstream
 * value: true, false, or null (use global default)
 */
function workstreamSetAutoActivate(installDir, idOrName, value) {
  const data = loadWorkstreams(installDir);
  const ws = data.workstreams.find(
    w => w.id === idOrName || w.name.toLowerCase() === idOrName.toLowerCase()
  );

  if (!ws) {
    console.error(`Workstream not found: ${idOrName}`);
    return null;
  }

  if (value === 'on' || value === true) {
    ws.autoActivate = true;
    console.log(`✓ Auto-activate enabled for ${ws.name}`);
  } else if (value === 'off' || value === false) {
    ws.autoActivate = false;
    console.log(`✓ Auto-activate disabled for ${ws.name}`);
  } else if (value === 'default' || value === null) {
    delete ws.autoActivate;
    console.log(`✓ Auto-activate set to global default for ${ws.name}`);
  }

  ws.updatedAt = new Date().toISOString();
  saveWorkstreams(installDir, data);
  return ws;
}

/**
 * Set global auto-activate setting
 */
function setGlobalAutoActivate(installDir, value) {
  const settings = loadSettings(installDir);
  settings.workstreamAutoActivate = value === true || value === 'true' || value === 'on';
  saveSettings(installDir, settings);
  console.log(`✓ Global workstream auto-activate: ${settings.workstreamAutoActivate ? 'on' : 'off'}`);
  return settings;
}

/**
 * Check if a workstream should auto-activate based on its setting and global default
 */
function shouldAutoActivate(installDir, workstream) {
  if (workstream.autoActivate === true) return true;
  if (workstream.autoActivate === false) return false;
  // Use global default
  const settings = loadSettings(installDir);
  return settings.workstreamAutoActivate !== false;
}

/**
 * Check folder for matching workstreams
 * Returns { count, current, matches: [{id, name, autoActivate}] }
 */
function workstreamCheckFolder(installDir, folderPath = process.cwd(), jsonOutput = false) {
  const data = loadWorkstreams(installDir);
  const absPath = path.resolve(folderPath.replace(/^~/, process.env.HOME || ''));

  // Find all workstreams that match this folder
  const matches = data.workstreams.filter(ws => {
    // Check if folder is within any project
    const inProject = (ws.projects || []).some(p =>
      absPath === p || absPath.startsWith(p + path.sep) || p.startsWith(absPath + path.sep)
    );
    // Check if folder is within any trigger folder
    const inTrigger = (ws.triggerFolders || []).some(t =>
      absPath === t || absPath.startsWith(t + path.sep) || t.startsWith(absPath + path.sep)
    );
    return inProject || inTrigger;
  });

  // Filter to only those that should auto-activate
  const autoActivateMatches = matches.filter(ws => shouldAutoActivate(installDir, ws));

  // Check if current workstream is already one of the matches
  const currentWs = getActiveWorkstream(installDir);
  const currentIsMatch = currentWs && autoActivateMatches.some(m => m.id === currentWs.id);

  const result = {
    count: autoActivateMatches.length,
    current: currentIsMatch,
    matches: autoActivateMatches.map(ws => ({
      id: ws.id,
      name: ws.name,
      autoActivate: ws.autoActivate
    }))
  };

  if (jsonOutput) {
    console.log(JSON.stringify(result));
  } else {
    if (result.count === 0) {
      console.log('No matching workstreams for this folder');
    } else if (result.current) {
      console.log(`Current workstream "${currentWs.name}" matches this folder`);
    } else if (result.count === 1) {
      console.log(`Matching workstream: ${result.matches[0].name}`);
    } else {
      console.log(`${result.count} matching workstreams:`);
      result.matches.forEach((m, i) => {
        console.log(`  ${i + 1}) ${m.name}`);
      });
    }
  }

  return result;
}

/**
 * Install the cd hook for automatic workstream activation
 */
function workstreamInstallCdHook() {
  const shell = process.env.SHELL || '/bin/zsh';
  const isZsh = shell.includes('zsh');
  const rcFile = isZsh
    ? path.join(process.env.HOME || '', '.zshrc')
    : path.join(process.env.HOME || '', '.bashrc');

  const hookMarker = '# coder-config workstream cd hook';
  const hookCode = `
${hookMarker}
coder_workstream_cd() {
  # Run cd and capture error to avoid ugly function-prefixed messages
  local cd_err cd_ret
  cd_err=$(builtin cd "$@" 2>&1)
  cd_ret=$?

  if [ $cd_ret -ne 0 ]; then
    # Pass through the original error, just prefix with cd:
    echo "cd: $cd_err" >&2
    return $cd_ret
  fi

  # Check for matching workstreams
  local result
  result=$(coder-config workstream check-folder "$PWD" --json 2>/dev/null)

  [ -z "$result" ] && return 0

  local count current
  count=$(echo "$result" | grep -o '"count":[0-9]*' | cut -d: -f2)
  current=$(echo "$result" | grep -o '"current":true' || echo "")

  # Already on matching workstream
  [ -n "$current" ] && return 0

  [ "$count" = "0" ] && return 0

  if [ "$count" = "1" ]; then
    # Single match - auto-activate
    local name id
    name=$(echo "$result" | grep -o '"name":"[^"]*"' | head -1 | cut -d'"' -f4)
    id=$(echo "$result" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    export CODER_WORKSTREAM="$id"
    echo "📂 Workstream: $name"
  elif [ "$count" -gt 1 ]; then
    # Multiple matches - prompt
    echo "Multiple workstreams match this folder:"
    local i=1
    echo "$result" | grep -o '"name":"[^"]*"' | cut -d'"' -f4 | while read -r name; do
      echo "  $i) $name"
      i=$((i + 1))
    done
    echo "  0) Skip"
    ${isZsh ? 'read "choice?Choose [0-$count]: "' : 'read -p "Choose [0-$count]: " choice'}
    if [ "$choice" -gt 0 ] 2>/dev/null; then
      local id name
      id=$(echo "$result" | grep -o '"id":"[^"]*"' | sed -n "\${choice}p" | cut -d'"' -f4)
      name=$(echo "$result" | grep -o '"name":"[^"]*"' | sed -n "\${choice}p" | cut -d'"' -f4)
      if [ -n "$id" ]; then
        export CODER_WORKSTREAM="$id"
        echo "📂 Workstream: $name"
      fi
    fi
  fi
}
alias cd='coder_workstream_cd'
# end coder-config workstream cd hook
`;

  // Check if hook already installed
  if (fs.existsSync(rcFile)) {
    const content = fs.readFileSync(rcFile, 'utf8');
    if (content.includes(hookMarker)) {
      console.log('✓ Workstream cd hook already installed');
      console.log(`  Location: ${rcFile}`);
      return true;
    }
  }

  // Append hook to rc file
  fs.appendFileSync(rcFile, hookCode);
  console.log(`✓ Installed workstream cd hook`);
  console.log(`  Location: ${rcFile}`);
  console.log('');
  console.log('Restart your shell or run:');
  console.log(`  source ${rcFile}`);

  return true;
}

/**
 * Uninstall the cd hook
 */
function workstreamUninstallCdHook() {
  const shell = process.env.SHELL || '/bin/zsh';
  const isZsh = shell.includes('zsh');
  const rcFile = isZsh
    ? path.join(process.env.HOME || '', '.zshrc')
    : path.join(process.env.HOME || '', '.bashrc');

  if (!fs.existsSync(rcFile)) {
    console.log('Shell config file not found');
    return false;
  }

  const content = fs.readFileSync(rcFile, 'utf8');
  const hookMarker = '# coder-config workstream cd hook';
  const endMarker = '# end coder-config workstream cd hook';

  if (!content.includes(hookMarker)) {
    console.log('Workstream cd hook not installed');
    return false;
  }

  // Remove the hook block
  const startIdx = content.indexOf(hookMarker);
  const endIdx = content.indexOf(endMarker);

  if (startIdx === -1 || endIdx === -1) {
    console.error('Could not find hook boundaries');
    return false;
  }

  // Find the newline before the marker (to remove leading blank line)
  let removeStart = startIdx;
  if (startIdx > 0 && content[startIdx - 1] === '\n') {
    removeStart = startIdx - 1;
  }

  const newContent = content.slice(0, removeStart) + content.slice(endIdx + endMarker.length);
  fs.writeFileSync(rcFile, newContent);

  console.log(`✓ Uninstalled workstream cd hook from ${rcFile}`);
  console.log('');
  console.log('Restart your shell or run:');
  console.log(`  source ${rcFile}`);

  return true;
}

/**
 * Check if cd hook is installed
 */
function workstreamCdHookStatus() {
  const shell = process.env.SHELL || '/bin/zsh';
  const isZsh = shell.includes('zsh');
  const rcFile = isZsh
    ? path.join(process.env.HOME || '', '.zshrc')
    : path.join(process.env.HOME || '', '.bashrc');

  if (!fs.existsSync(rcFile)) {
    return { installed: false, shell: isZsh ? 'zsh' : 'bash', rcFile };
  }

  const content = fs.readFileSync(rcFile, 'utf8');
  const installed = content.includes('# coder-config workstream cd hook');

  return { installed, shell: isZsh ? 'zsh' : 'bash', rcFile };
}

module.exports = {
  getWorkstreamsPath,
  loadWorkstreams,
  saveWorkstreams,
  workstreamList,
  workstreamCreate,
  workstreamUpdate,
  workstreamDelete,
  workstreamUse,
  workstreamActive,
  workstreamAddProject,
  workstreamRemoveProject,
  workstreamInject,
  workstreamDetect,
  workstreamGet,
  getActiveWorkstream,
  countWorkstreamsForProject,
  workstreamInstallHook,
  workstreamInstallHookGemini,
  workstreamInstallHookCodex,
  workstreamDeactivate,
  workstreamCheckPath,
  generateRulesFromRepos,
  generateRulesWithClaude,
  // New folder auto-activation functions
  getSettingsPath,
  loadSettings,
  saveSettings,
  workstreamAddTrigger,
  workstreamRemoveTrigger,
  workstreamSetAutoActivate,
  setGlobalAutoActivate,
  shouldAutoActivate,
  workstreamCheckFolder,
  workstreamInstallCdHook,
  workstreamUninstallCdHook,
  workstreamCdHookStatus,
};
