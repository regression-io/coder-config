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
    console.log('Create one with: claude-config workstream create "Name"\n');
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
    console.error('Usage: claude-config workstream create "Name"');
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
  const envWorkstream = process.env.CLAUDE_WORKSTREAM;
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

  if (!silent) {
    console.log(output);
  }

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
# Installed by claude-config

# Check for active workstream via env var or file
if [ -n "$CLAUDE_WORKSTREAM" ] || claude-config workstream active >/dev/null 2>&1; then
  claude-config workstream inject --silent
fi
`;

  // Check if hook already exists
  if (fs.existsSync(hookPath)) {
    const existing = fs.readFileSync(hookPath, 'utf8');
    if (existing.includes('claude-config workstream inject')) {
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
  console.log('  export CLAUDE_WORKSTREAM=<name-or-id>');
  console.log('\nOr use the global active workstream:');
  console.log('  claude-config workstream use <name>');

  return true;
}

/**
 * Deactivate workstream (output shell command to unset env var)
 */
function workstreamDeactivate() {
  console.log('To deactivate the workstream for this session, run:');
  console.log('  unset CLAUDE_WORKSTREAM');
  console.log('\nOr to clear the global active workstream:');
  console.log('  claude-config workstream use --clear');
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
  workstreamDeactivate,
  workstreamCheckPath,
};
