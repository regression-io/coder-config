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
      const data = JSON.parse(fs.readFileSync(wsPath, 'utf8'));

      // Auto-repair corrupted workstreams (v0.45.9 bug where name became an object)
      let needsSave = false;
      if (data.workstreams) {
        data.workstreams = data.workstreams.map(ws => {
          if (ws.name && typeof ws.name === 'object' && ws.name.name) {
            // Extract the real values from the nested object
            const fixed = {
              ...ws,
              name: ws.name.name,
              projects: ws.name.projects?.length ? ws.name.projects : ws.projects,
              rules: ws.name.rules || ws.rules,
            };
            needsSave = true;
            console.log(`[Workstreams] Auto-repaired corrupted workstream: ${fixed.name}`);
            return fixed;
          }
          return ws;
        });
      }

      // Save repaired data
      if (needsSave) {
        const dir = path.dirname(wsPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(wsPath, JSON.stringify(data, null, 2) + '\n');
      }

      return data;
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
  const detected = workstreamDetect(installDir, process.cwd());
  for (const ws of data.workstreams) {
    const active = detected && ws.id === detected.id ? '● ' : '○ ';
    const badges = [];
    if (ws.sandbox === true) badges.push('[sandbox]');
    if (ws.autoActivate === true) badges.push('[auto]');
    const badgeStr = badges.length > 0 ? ' ' + badges.join(' ') : '';
    console.log(`${active}${ws.name}${badgeStr}`);
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
  saveWorkstreams(installDir, data);
  console.log(`✓ Deleted workstream: ${removed.name}`);
  return true;
}

/**
 * Set active workstream
 */
function workstreamUse(installDir, idOrName, evalMode = false) {
  const data = loadWorkstreams(installDir);

  // Show current workstream
  if (!idOrName) {
    const envWs = process.env.CODER_WORKSTREAM;
    if (envWs) {
      const ws = data.workstreams.find(
        w => w.id === envWs || w.name.toLowerCase() === envWs.toLowerCase()
      );
      console.log(`Active workstream: ${ws ? ws.name : envWs} (via CODER_WORKSTREAM)`);
      return ws || null;
    }

    const detected = workstreamDetect(installDir, process.cwd());
    if (detected) {
      console.log(`Auto-detected workstream: ${detected.name}`);
      console.log(`  (based on current directory)`);
    } else {
      console.log('No workstream detected for current directory');
    }
    return detected || null;
  }

  // Find workstream
  const ws = data.workstreams.find(
    w => w.id === idOrName || w.name.toLowerCase() === idOrName.toLowerCase()
  );

  if (!ws) {
    console.error(`Workstream not found: ${idOrName}`);
    return null;
  }

  // Output for eval mode: eval "$(coder-config workstream use name --eval)"
  if (evalMode) {
    // Output export command and a user-friendly message to stderr
    console.log(`export CODER_WORKSTREAM="${ws.name}"`);
    console.log(`echo "📂 Workstream: ${ws.name}"`);
    return ws;
  }

  // Normal mode: check if cws function exists and give appropriate instructions
  const cwsInstalled = workstreamCdHookStatus().installed;
  if (cwsInstalled) {
    console.log(`Use the cws function to activate workstreams:`);
    console.log(`  cws ${ws.name}`);
    console.log('');
    console.log(`Or if calling directly:`);
    console.log(`  eval "$(coder-config workstream use ${ws.name} --eval)"`);
  } else {
    console.log(`To activate workstream "${ws.name}", install the cd hook first:`);
    console.log(`  coder-config workstream install-cd-hook`);
    console.log('');
    console.log(`Then use: cws ${ws.name}`);
    console.log('');
    console.log(`Or manually: export CODER_WORKSTREAM="${ws.name}"`);
  }
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
function getActiveWorkstream(installDir, autoDetect = true) {
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

  // Auto-detect from current directory
  if (autoDetect) {
    return workstreamDetect(installDir, process.cwd());
  }

  return null;
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

  // Generate settings.local.json with additionalDirectories for sandbox scope
  applySandboxIfEnabled(active, process.cwd());

  return output;
}

/**
 * Detect workstream from current directory.
 * Only matches when cwd is INSIDE a workstream project (not the reverse).
 * When multiple match, prefer the most specific (longest) path match.
 */
function workstreamDetect(installDir, dir = process.cwd()) {
  const data = loadWorkstreams(installDir);
  const absDir = path.resolve(dir.replace(/^~/, process.env.HOME || ''));

  // Only match when cwd is inside a project directory (absDir starts with project path).
  // The reverse (project inside cwd) caused false matches when cwd was a parent like ~/reg/my.
  const matches = data.workstreams.filter(ws =>
    ws.projects.some(p => absDir === p || absDir.startsWith(p + path.sep))
  );

  if (matches.length === 0) {
    return null;
  }

  if (matches.length === 1) {
    return matches[0];
  }

  // When multiple match, prefer the workstream with the most specific (longest) matching project path
  const scored = matches.map(ws => {
    const bestMatch = ws.projects
      .filter(p => absDir === p || absDir.startsWith(p + path.sep))
      .reduce((longest, p) => p.length > longest.length ? p : longest, '');
    return { ws, score: bestMatch.length };
  });
  scored.sort((a, b) => b.score - a.score);

  // If there's a clear winner by specificity, use it
  if (scored[0].score > scored[1].score) {
    return scored[0].ws;
  }

  // Tiebreaker: check lastUsedByProject
  if (data.lastUsedByProject && data.lastUsedByProject[absDir]) {
    const lastUsed = matches.find(ws => ws.id === data.lastUsedByProject[absDir]);
    if (lastUsed) return lastUsed;
  }

  // Final fallback: most recently updated
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
 * Apply sandbox settings if the workstream has sandbox enabled.
 * Shared logic used by both workstreamInject() and apply().
 * @param {object} active - Active workstream object
 * @param {string} dir - Target project directory (absolute)
 * @returns {boolean} Whether sandbox settings were written
 */
function applySandboxIfEnabled(active, dir) {
  if (!active || active.sandbox !== true || !active.projects || active.projects.length === 0) {
    return false;
  }

  const resolvedDir = path.resolve(dir);
  const otherProjects = active.projects.filter(p => {
    const resolved = path.resolve(p);
    return resolved !== resolvedDir && !resolvedDir.startsWith(resolved + path.sep);
  });

  if (otherProjects.length > 0) {
    writeWorkstreamSandboxSettings(resolvedDir, otherProjects);
    return true;
  }
  return false;
}

/**
 * Write additionalDirectories to .claude/settings.local.json for sandbox scope
 */
function writeWorkstreamSandboxSettings(dir, additionalDirectories) {
  const claudeDir = path.join(dir, '.claude');
  const settingsLocalPath = path.join(claudeDir, 'settings.local.json');

  let existing = {};
  if (fs.existsSync(settingsLocalPath)) {
    try { existing = JSON.parse(fs.readFileSync(settingsLocalPath, 'utf8')); } catch {}
  }

  const permissions = existing.permissions || {};
  permissions.additionalDirectories = additionalDirectories;

  if (!fs.existsSync(claudeDir)) {
    fs.mkdirSync(claudeDir, { recursive: true });
  }
  fs.writeFileSync(settingsLocalPath, JSON.stringify({ ...existing, permissions }, null, 2) + '\n');
}

/**
 * Remove additionalDirectories from .claude/settings.local.json
 */
function removeWorkstreamSandboxSettings(dir) {
  const settingsLocalPath = path.join(dir, '.claude', 'settings.local.json');
  if (!fs.existsSync(settingsLocalPath)) return;

  let existing = {};
  try { existing = JSON.parse(fs.readFileSync(settingsLocalPath, 'utf8')); } catch { return; }

  if (existing.permissions && existing.permissions.additionalDirectories) {
    delete existing.permissions.additionalDirectories;
    // Clean up empty permissions object
    if (Object.keys(existing.permissions).length === 0) {
      delete existing.permissions;
    }
    // If nothing left, remove the file
    if (Object.keys(existing).length === 0) {
      fs.unlinkSync(settingsLocalPath);
    } else {
      fs.writeFileSync(settingsLocalPath, JSON.stringify(existing, null, 2) + '\n');
    }
  }
}

/**
 * Deactivate workstream (output shell command to unset env var)
 */
function workstreamDeactivate(installDir) {
  // Clean up sandbox settings from all workstream project directories
  if (installDir) {
    const active = getActiveWorkstream(installDir);
    if (active && active.projects) {
      for (const p of active.projects) {
        removeWorkstreamSandboxSettings(path.resolve(p));
      }
    }
  }
  // Also clean CWD in case it's not a listed project
  removeWorkstreamSandboxSettings(process.cwd());

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
 * Supported AI tools for context generation
 */
const AI_TOOLS = {
  claude: {
    name: 'Claude',
    binary: 'claude',
    buildArgs: (prompt) => ['-p', prompt],
    candidates: (os) => [
      path.join(os.homedir(), '.local', 'bin', 'claude'),
      '/usr/local/bin/claude',
      '/opt/homebrew/bin/claude',
      path.join(os.homedir(), '.npm-global', 'bin', 'claude'),
    ],
  },
  gemini: {
    name: 'Gemini',
    binary: 'gemini',
    buildArgs: (prompt) => ['-p', prompt],
    candidates: (os) => [
      path.join(os.homedir(), '.local', 'bin', 'gemini'),
      '/usr/local/bin/gemini',
      '/opt/homebrew/bin/gemini',
      path.join(os.homedir(), '.npm-global', 'bin', 'gemini'),
    ],
  },
  codex: {
    name: 'Codex',
    binary: 'codex',
    buildArgs: (prompt) => ['exec', prompt],
    candidates: (os) => [
      path.join(os.homedir(), '.local', 'bin', 'codex'),
      '/usr/local/bin/codex',
      '/opt/homebrew/bin/codex',
      path.join(os.homedir(), '.npm-global', 'bin', 'codex'),
    ],
  },
  ollama: {
    name: 'Ollama',
    binary: 'ollama',
    // Model must be specified in options
    buildArgs: (prompt, options) => ['run', options.model || 'llama3.2', prompt],
    candidates: (os) => [
      path.join(os.homedir(), '.local', 'bin', 'ollama'),
      '/usr/local/bin/ollama',
      '/opt/homebrew/bin/ollama',
    ],
  },
  aider: {
    name: 'Aider',
    binary: 'aider',
    buildArgs: (prompt) => ['--message', prompt, '--yes', '--no-git'],
    candidates: (os) => [
      path.join(os.homedir(), '.local', 'bin', 'aider'),
      '/usr/local/bin/aider',
      '/opt/homebrew/bin/aider',
      path.join(os.homedir(), '.local', 'pipx', 'venvs', 'aider-chat', 'bin', 'aider'),
    ],
  },
};

/**
 * Find the binary path for an AI tool
 */
function findAIBinary(toolId) {
  const { execFileSync } = require('child_process');
  const os = require('os');

  const tool = AI_TOOLS[toolId];
  if (!tool) {
    throw new Error(`Unknown AI tool: ${toolId}`);
  }

  // Check candidate paths
  for (const p of tool.candidates(os)) {
    if (fs.existsSync(p)) return p;
  }

  // Try which command
  try {
    const resolved = execFileSync('which', [tool.binary], { encoding: 'utf8' }).trim();
    if (resolved && fs.existsSync(resolved)) return resolved;
  } catch (e) {}

  // Fall back to bare binary name (let shell resolve it)
  return tool.binary;
}

/**
 * Get list of available AI tools (ones that are installed)
 */
function getAvailableAITools() {
  const available = [];
  for (const [id, tool] of Object.entries(AI_TOOLS)) {
    try {
      const binaryPath = findAIBinary(id);
      if (fs.existsSync(binaryPath)) {
        available.push({ id, name: tool.name, path: binaryPath });
      }
    } catch (e) {
      // Tool not available
    }
  }
  return available;
}

/**
 * Generate rules/context from project repositories using an AI tool
 * Supports: claude, gemini, codex, ollama, aider
 * @param {string[]} projects - Array of project paths
 * @param {string} toolId - AI tool to use (default: 'claude')
 * @param {object} options - Tool-specific options (e.g., { model: 'llama3.2' } for ollama)
 */
/**
 * Read key project files and return their content for AI analysis
 * Since spawned AI processes can't read files, we read them ourselves
 */
function gatherProjectContent(projectPath) {
  const keyFiles = [
    'CLAUDE.md', 'GEMINI.md', 'README.md',
    'package.json', 'pyproject.toml', 'Cargo.toml', 'go.mod',
    '.claude/rules', '.gemini/rules'
  ];

  const content = [];
  const projectName = path.basename(projectPath);

  for (const file of keyFiles) {
    const filePath = path.join(projectPath, file);
    try {
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        // Read all .md files in rules directory
        const rules = fs.readdirSync(filePath)
          .filter(f => f.endsWith('.md'))
          .slice(0, 5); // Limit to 5 rules
        for (const rule of rules) {
          const ruleContent = fs.readFileSync(path.join(filePath, rule), 'utf8');
          if (ruleContent.length < 2000) {
            content.push(`### ${projectName}/${file}/${rule}\n${ruleContent}`);
          }
        }
      } else if (stat.isFile()) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        // Limit file size to avoid huge prompts
        if (fileContent.length < 5000) {
          content.push(`### ${projectName}/${file}\n${fileContent}`);
        } else if (file === 'package.json' || file === 'pyproject.toml') {
          // For package files, extract key info even if large
          content.push(`### ${projectName}/${file}\n${fileContent.slice(0, 2000)}...`);
        }
      }
    } catch (e) {
      // File doesn't exist or can't be read, skip
    }
  }

  return content;
}

async function generateRulesWithAI(projects, toolId = 'claude', options = {}) {
  if (!projects || projects.length === 0) {
    return '';
  }

  const { execFileSync } = require('child_process');

  const tool = AI_TOOLS[toolId];
  if (!tool) {
    console.error(`Unknown AI tool: ${toolId}. Available: ${Object.keys(AI_TOOLS).join(', ')}`);
    return generateRulesFromRepos(projects);
  }

  // Expand projects to include discovered sub-projects
  const allProjects = [];
  const seen = new Set();

  for (const projectPath of projects) {
    const absPath = path.resolve(projectPath.replace(/^~/, process.env.HOME || ''));
    if (!seen.has(absPath)) {
      seen.add(absPath);
      allProjects.push(absPath);
    }

    // Discover sub-projects
    const subProjects = discoverSubProjects(absPath);
    for (const subPath of subProjects) {
      if (!seen.has(subPath)) {
        seen.add(subPath);
        allProjects.push(subPath);
      }
    }
  }

  // Gather content from project files (since spawned AI can't read files)
  const projectContents = [];
  for (const projectPath of allProjects) {
    const content = gatherProjectContent(projectPath);
    if (content.length > 0) {
      projectContents.push(`## ${path.basename(projectPath)} (${projectPath})\n\n${content.join('\n\n')}`);
    } else {
      projectContents.push(`## ${path.basename(projectPath)} (${projectPath})\n\n(No key files found)`);
    }
  }

  const prompt = `Based on the following project files, generate concise workstream context rules for an AI coding assistant. Focus on:
1. What each project does (brief description)
2. Key technologies and frameworks used
3. How the projects relate to each other (if multiple)
4. Any important conventions or patterns to follow

---
${projectContents.join('\n\n---\n\n')}
---

Output markdown suitable for injecting into an AI assistant's context. Keep it concise (under 500 words). Do not include code blocks or examples - just descriptions and guidelines.`;

  try {
    console.log(`Generating context with ${tool.name}...`);

    if (toolId === 'claude') {
      const { query } = require('@anthropic-ai/claude-agent-sdk');
      let result = '';
      for await (const msg of query({
        prompt,
        options: { cwd: allProjects[0], maxTurns: 1 }
      })) {
        if (msg.type === 'result' && msg.subtype === 'success') result = msg.result;
      }
      return result.trim();
    }

    const { execFileSync } = require('child_process');
    const binaryPath = findAIBinary(toolId);
    const args = tool.buildArgs(prompt, options);
    const result = execFileSync(binaryPath, args, {
      cwd: allProjects[0],
      encoding: 'utf8',
      timeout: 120000,
      maxBuffer: 1024 * 1024 * 5,
    });
    return result.trim();
  } catch (error) {
    console.error(`${tool.name} generation failed:`, error.message);
    return generateRulesFromRepos(projects);
  }
}

/**
 * Generate rules/context from project repositories using Claude Code
 * @deprecated Use generateRulesWithAI(projects, 'claude') instead
 */
async function generateRulesWithClaude(projects) {
  return generateRulesWithAI(projects, 'claude');
}

/**
 * Discover sub-projects within a directory
 * Looks for directories containing project markers (package.json, pyproject.toml, etc.)
 * Returns array of absolute paths to discovered sub-projects
 */
function discoverSubProjects(rootPath, maxDepth = 2) {
  const subProjects = [];
  const skipDirs = new Set([
    'node_modules', '.git', '__pycache__', '.venv', 'venv', 'env',
    'dist', 'build', '.next', '.nuxt', 'target', 'vendor', '.tox',
    'coverage', '.pytest_cache', '.mypy_cache', '.ruff_cache'
  ]);
  const projectMarkers = [
    'package.json', 'pyproject.toml', 'Cargo.toml', 'go.mod',
    'CLAUDE.md', 'setup.py', 'pom.xml', 'build.gradle'
  ];

  function scan(dir, depth) {
    if (depth > maxDepth) return;

    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (e) {
      return; // Can't read directory
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (skipDirs.has(entry.name)) continue;
      if (entry.name.startsWith('.')) continue;

      const subPath = path.join(dir, entry.name);

      // Check if this subdirectory is a project
      const hasMarker = projectMarkers.some(marker =>
        fs.existsSync(path.join(subPath, marker))
      );

      if (hasMarker) {
        subProjects.push(subPath);
      }

      // Continue scanning deeper
      scan(subPath, depth + 1);
    }
  }

  scan(rootPath, 0);
  return subProjects;
}

/**
 * Generate rules/context from project repositories
 * Reads README.md, package.json, CLAUDE.md, etc. to create a summary
 * Automatically discovers sub-projects within each project directory
 */
function generateRulesFromRepos(projects) {
  if (!projects || projects.length === 0) {
    return '';
  }

  // Expand projects to include discovered sub-projects
  const allProjects = [];
  const seen = new Set();

  for (const projectPath of projects) {
    const absPath = path.resolve(projectPath.replace(/^~/, process.env.HOME || ''));
    if (!seen.has(absPath)) {
      seen.add(absPath);
      allProjects.push(absPath);
    }

    // Discover sub-projects
    const subProjects = discoverSubProjects(absPath);
    for (const subPath of subProjects) {
      if (!seen.has(subPath)) {
        seen.add(subPath);
        allProjects.push(subPath);
      }
    }
  }

  const lines = [];
  lines.push('# Workstream Context');
  lines.push('');
  lines.push('## Repositories');
  lines.push('');

  for (const absPath of allProjects) {
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
 * Set sandbox mode for a workstream
 * When true: generates additionalDirectories in settings.local.json for OS-level enforcement
 * When false (default): only injects advisory LLM rules (softer, LLM can override if important)
 */
function workstreamSetSandbox(installDir, idOrName, value) {
  const data = loadWorkstreams(installDir);
  const ws = data.workstreams.find(
    w => w.id === idOrName || w.name.toLowerCase() === idOrName.toLowerCase()
  );

  if (!ws) {
    console.error(`Workstream not found: ${idOrName}`);
    return null;
  }

  if (value === 'on' || value === true || value === 'true') {
    ws.sandbox = true;
    console.log(`✓ Sandbox enabled for ${ws.name} (OS-level directory enforcement)`);
  } else if (value === 'off' || value === false || value === 'false') {
    ws.sandbox = false;
    console.log(`✓ Sandbox disabled for ${ws.name} (advisory LLM rules only)`);
  } else {
    console.error(`Invalid value: ${value}. Use "on" or "off".`);
    return null;
  }

  ws.updatedAt = new Date().toISOString();
  saveWorkstreams(installDir, data);
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

  const hookMarker = '# coder-config workstream hooks';
  const oldHookMarker = '# coder-config workstream cd hook';
  const endMarker = '# end coder-config workstream hooks';
  const oldEndMarker = '# end coder-config workstream cd hook';

  const hookCode = `
${hookMarker}
# Wrap coder-config to handle 'workstream use' specially (sets env in current shell)
coder-config() {
  if [ "$1" = "workstream" ] && [ "$2" = "use" ] && [ -n "$3" ]; then
    # workstream use <name> - activate in current shell
    shift 2  # remove 'workstream use'
    eval "$(command coder-config workstream use "$@" --eval)"
  else
    # All other commands - pass through
    command coder-config "$@"
  fi
}

# Auto-activate workstream on cd
_coder_workstream_cd() {
  builtin cd "$@" || return $?
  local result count current
  result=$(command coder-config workstream check-folder "$PWD" --json 2>/dev/null)
  [ -z "$result" ] && return 0
  count=$(echo "$result" | grep -o '"count":[0-9]*' | cut -d: -f2)
  current=$(echo "$result" | grep -o '"current":true' || echo "")
  [ -n "$current" ] && return 0
  [ "$count" = "0" ] && return 0
  if [ "$count" = "1" ]; then
    local name id
    name=$(echo "$result" | grep -o '"name":"[^"]*"' | head -1 | cut -d'"' -f4)
    id=$(echo "$result" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    export CODER_WORKSTREAM="$id"
    echo "📂 Workstream: $name"
  elif [ "$count" -gt 1 ]; then
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
      [ -n "$id" ] && export CODER_WORKSTREAM="$id" && echo "📂 Workstream: $name"
    fi
  fi
}
# Only alias cd in interactive shells (avoid breaking scripts/Claude Code)
[[ $- == *i* ]] && alias cd='_coder_workstream_cd'
# Pass through cd completions to the wrapper function (zsh only)
[[ -n "$ZSH_VERSION" ]] && compdef _cd _coder_workstream_cd
${endMarker}
`;

  let content = '';
  if (fs.existsSync(rcFile)) {
    content = fs.readFileSync(rcFile, 'utf8');
  }

  // Remove old hook block if present (either old or new marker)
  if (content.includes(oldHookMarker) || content.includes(hookMarker)) {
    const startMarker = content.includes(hookMarker) ? hookMarker : oldHookMarker;
    const endMark = content.includes(endMarker) ? endMarker : oldEndMarker;
    const startIdx = content.indexOf(startMarker);
    const endIdx = content.indexOf(endMark);
    if (startIdx !== -1 && endIdx !== -1) {
      // Remove the block including any leading newline
      let removeStart = startIdx;
      if (startIdx > 0 && content[startIdx - 1] === '\n') {
        removeStart = startIdx - 1;
      }
      content = content.slice(0, removeStart) + content.slice(endIdx + endMark.length);
    }
  }

  // Append new hook
  fs.writeFileSync(rcFile, content + hookCode);
  console.log(`✓ Installed workstream hooks`);
  console.log(`  Location: ${rcFile}`);
  console.log('');
  console.log('Restart your shell or run:');
  console.log(`  source ${rcFile}`);
  console.log('');
  console.log('Now you can use:');
  console.log('  coder-config workstream use <name>   # activates in current shell');

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

  let content = fs.readFileSync(rcFile, 'utf8');

  // Support both old and new marker names
  const markers = [
    { start: '# coder-config workstream hooks', end: '# end coder-config workstream hooks' },
    { start: '# coder-config workstream cd hook', end: '# end coder-config workstream cd hook' },
  ];

  let found = false;
  for (const { start, end } of markers) {
    if (content.includes(start)) {
      const startIdx = content.indexOf(start);
      const endIdx = content.indexOf(end);
      if (startIdx !== -1 && endIdx !== -1) {
        let removeStart = startIdx;
        if (startIdx > 0 && content[startIdx - 1] === '\n') {
          removeStart = startIdx - 1;
        }
        content = content.slice(0, removeStart) + content.slice(endIdx + end.length);
        found = true;
      }
    }
  }

  if (!found) {
    console.log('Workstream hooks not installed');
    return false;
  }

  fs.writeFileSync(rcFile, content);

  console.log(`✓ Uninstalled workstream hooks from ${rcFile}`);
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
  // Check for both old and new markers
  const installed = content.includes('# coder-config workstream hooks') ||
                    content.includes('# coder-config workstream cd hook');

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
  discoverSubProjects,
  generateRulesFromRepos,
  generateRulesWithClaude,
  generateRulesWithAI,
  getAvailableAITools,
  findAIBinary,
  AI_TOOLS,
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
  applySandboxIfEnabled,
  workstreamSetSandbox,
};
