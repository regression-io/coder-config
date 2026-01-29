/**
 * Loops Routes (Ralph Loop)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Get all loops
 */
function getLoops(manager) {
  if (!manager) return { error: 'Manager not available' };
  const data = manager.loadLoops();

  // Enrich with state data
  const loops = (data.loops || []).map(loop => {
    const state = manager.loadLoopState(loop.id);
    return state || loop;
  });

  return {
    loops,
    activeId: data.activeId,
    config: data.config || {}
  };
}

/**
 * Get active loop
 */
function getActiveLoop(manager) {
  if (!manager) return { error: 'Manager not available' };
  const active = manager.getActiveLoop();
  return { loop: active };
}

/**
 * Get a specific loop by ID
 */
function getLoop(manager, id) {
  if (!manager) return { error: 'Manager not available' };
  const loop = manager.loopGet(id);
  if (!loop) {
    return { error: 'Loop not found' };
  }

  // Also load clarifications and plan
  const clarifications = manager.loadClarifications(loop.id);
  const plan = manager.loadPlan(loop.id);

  return {
    loop,
    clarifications,
    plan
  };
}

/**
 * Create a new loop
 */
function createLoop(manager, body) {
  if (!manager) return { error: 'Manager not available' };
  const { task, name, workstreamId, projectPath, maxIterations, completionPromise } = body;

  if (!task) {
    return { error: 'Task description is required' };
  }

  const loop = manager.loopCreate(task, {
    name,
    workstreamId,
    projectPath,
    maxIterations: maxIterations || undefined,
    completionPromise: completionPromise || undefined
  });

  if (!loop) {
    return { error: 'Failed to create loop' };
  }

  return { success: true, loop };
}

/**
 * Update a loop
 */
function updateLoop(manager, id, updates) {
  if (!manager) return { error: 'Manager not available' };
  const loop = manager.loopUpdate(id, updates);
  if (!loop) {
    return { error: 'Loop not found' };
  }
  return { success: true, loop };
}

/**
 * Delete a loop
 */
function deleteLoop(manager, id) {
  if (!manager) return { error: 'Manager not available' };
  const success = manager.loopDelete(id);
  if (!success) {
    return { error: 'Loop not found' };
  }
  return { success: true };
}

/**
 * Start a loop
 */
function startLoop(manager, id) {
  if (!manager) return { error: 'Manager not available' };
  const loop = manager.loopStart(id);
  if (!loop) {
    return { error: 'Loop not found or cannot be started' };
  }
  return { success: true, loop };
}

/**
 * Pause a loop
 */
function pauseLoop(manager, id) {
  if (!manager) return { error: 'Manager not available' };
  const loop = manager.loopPause(id);
  if (!loop) {
    return { error: 'Loop not found' };
  }
  return { success: true, loop };
}

/**
 * Resume a loop
 */
function resumeLoop(manager, id) {
  if (!manager) return { error: 'Manager not available' };
  const loop = manager.loopResume(id);
  if (!loop) {
    return { error: 'Loop not found or cannot be resumed' };
  }
  return { success: true, loop };
}

/**
 * Cancel a loop
 */
function cancelLoop(manager, id) {
  if (!manager) return { error: 'Manager not available' };
  const loop = manager.loopCancel(id);
  if (!loop) {
    return { error: 'Loop not found' };
  }
  return { success: true, loop };
}

/**
 * Approve plan (phase 2)
 */
function approveLoop(manager, id) {
  if (!manager) return { error: 'Manager not available' };
  const loop = manager.loopApprove(id);
  if (!loop) {
    return { error: 'Loop not found or not in plan phase' };
  }
  return { success: true, loop };
}

/**
 * Mark loop as complete
 */
function completeLoop(manager, id) {
  if (!manager) return { error: 'Manager not available' };
  const loop = manager.loopComplete(id);
  if (!loop) {
    return { error: 'Loop not found' };
  }
  return { success: true, loop };
}

/**
 * Get loop history
 */
function getLoopHistory(manager) {
  if (!manager) return { error: 'Manager not available' };
  const history = manager.loadHistory();
  return { completed: history.completed || [] };
}

/**
 * Get/update loop configuration
 */
function getLoopConfig(manager) {
  if (!manager) return { error: 'Manager not available' };
  const data = manager.loadLoops();
  return { config: data.config || {} };
}

function updateLoopConfig(manager, updates) {
  if (!manager) return { error: 'Manager not available' };
  const config = manager.loopConfig(updates);
  return { success: true, config };
}

/**
 * Save clarifications to a loop
 */
function saveClarifications(manager, id, content) {
  if (!manager) return { error: 'Manager not available' };
  const loop = manager.loopGet(id);
  if (!loop) {
    return { error: 'Loop not found' };
  }
  manager.saveClarifications(id, content);
  return { success: true };
}

/**
 * Save plan to a loop
 */
function savePlan(manager, id, content) {
  if (!manager) return { error: 'Manager not available' };
  const loop = manager.loopGet(id);
  if (!loop) {
    return { error: 'Loop not found' };
  }
  manager.savePlan(id, content);
  return { success: true };
}

/**
 * Record an iteration
 */
function recordIteration(manager, id, iteration) {
  if (!manager) return { error: 'Manager not available' };
  const loop = manager.recordIteration(id, iteration);
  if (!loop) {
    return { error: 'Loop not found' };
  }
  return { success: true, loop };
}

/**
 * Check if loop hooks are installed (official ralph-loop plugin)
 */
function getLoopHookStatus() {
  // Check for official ralph-loop plugin
  const pluginsDir = path.join(os.homedir(), '.claude', 'plugins', 'marketplaces');
  const officialPluginPath = path.join(pluginsDir, 'claude-plugins-official', 'plugins', 'ralph-loop');
  const stopHookPath = path.join(officialPluginPath, 'hooks', 'stop-hook.sh');

  // Also check custom hooks dir for backwards compatibility
  const customHooksDir = path.join(os.homedir(), '.claude', 'hooks');
  const customStopHookPath = path.join(customHooksDir, 'ralph-loop-stop.sh');
  const customPrepromptHookPath = path.join(customHooksDir, 'ralph-loop-preprompt.sh');

  const officialPluginExists = fs.existsSync(officialPluginPath);
  const officialHookExists = fs.existsSync(stopHookPath);

  const status = {
    // Official plugin is preferred
    usingOfficialPlugin: officialPluginExists,
    officialPlugin: {
      path: officialPluginPath,
      exists: officialPluginExists
    },
    stopHook: {
      path: officialHookExists ? stopHookPath : customStopHookPath,
      exists: officialHookExists || fs.existsSync(customStopHookPath)
    },
    prepromptHook: {
      // Official plugin doesn't need preprompt hook
      path: customPrepromptHookPath,
      exists: officialPluginExists || fs.existsSync(customPrepromptHookPath)
    }
  };

  return status;
}

/**
 * Check if ralph-loop plugin is installed at user scope
 * Returns { installed: boolean, scope: string|null }
 */
function getRalphLoopPluginStatus() {
  const installedPluginsPath = path.join(os.homedir(), '.claude', 'plugins', 'installed_plugins.json');

  if (!fs.existsSync(installedPluginsPath)) {
    return { installed: false, scope: null, needsInstall: true };
  }

  try {
    const data = JSON.parse(fs.readFileSync(installedPluginsPath, 'utf8'));
    const plugins = data.plugins || {};
    const ralphLoop = plugins['ralph-loop@claude-plugins-official'];

    if (!ralphLoop || ralphLoop.length === 0) {
      return { installed: false, scope: null, needsInstall: true };
    }

    // Check if any installation is at user scope
    const userScopeInstall = ralphLoop.find(p => p.scope === 'user');
    if (userScopeInstall) {
      // Fix plugin structure in case it's using old commands/ format
      fixRalphLoopPluginStructure();
      return { installed: true, scope: 'user', needsInstall: false };
    }

    // Plugin is installed but only at project scope
    return {
      installed: true,
      scope: 'project',
      projectPath: ralphLoop[0].projectPath,
      needsInstall: true,
      message: 'Plugin is installed for a specific project only. Install at user scope for global access.'
    };
  } catch (e) {
    return { installed: false, scope: null, needsInstall: true, error: e.message };
  }
}

/**
 * Install ralph-loop plugin at user scope via CLI
 * Uses execFileSync with fixed args (no shell injection risk)
 */
async function installRalphLoopPlugin() {
  const { execFileSync } = require('child_process');

  try {
    // Run claude plugin install command with execFileSync (safer than execSync)
    // All arguments are fixed strings - no user input
    execFileSync('claude', ['plugin', 'install', 'ralph-loop@claude-plugins-official', '--scope', 'user'], {
      encoding: 'utf8',
      timeout: 30000, // 30 second timeout
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Fix the plugin structure - create skills symlink if needed
    // The official plugin uses commands/ but Claude Code expects skills/
    fixRalphLoopPluginStructure();

    return {
      success: true,
      message: 'ralph-loop plugin installed successfully at user scope'
    };
  } catch (e) {
    return {
      success: false,
      error: e.message,
      suggestion: 'Try running manually: claude plugin install ralph-loop@claude-plugins-official --scope user'
    };
  }
}

/**
 * Fix the ralph-loop plugin structure by converting commands to skills format
 * Claude Code expects skills/<name>/SKILL.md, but the plugin has commands/<name>.md
 * Also fixes frontmatter issues (hide-from-slash-command-tool -> name)
 */
function fixRalphLoopPluginStructure() {
  const pluginCacheDir = path.join(os.homedir(), '.claude', 'plugins', 'cache', 'claude-plugins-official', 'ralph-loop');

  if (!fs.existsSync(pluginCacheDir)) {
    return;
  }

  // Find all version directories
  const versions = fs.readdirSync(pluginCacheDir).filter(f => {
    const fullPath = path.join(pluginCacheDir, f);
    return fs.statSync(fullPath).isDirectory();
  });

  for (const version of versions) {
    const versionDir = path.join(pluginCacheDir, version);
    const commandsDir = path.join(versionDir, 'commands');
    const skillsDir = path.join(versionDir, 'skills');

    if (!fs.existsSync(commandsDir)) {
      continue;
    }

    // Remove old symlink if it exists
    if (fs.existsSync(skillsDir) && fs.lstatSync(skillsDir).isSymbolicLink()) {
      fs.unlinkSync(skillsDir);
    }

    // Create skills directory if it doesn't exist
    if (!fs.existsSync(skillsDir)) {
      fs.mkdirSync(skillsDir, { recursive: true });
    }

    // Convert each command to skill format
    // commands/ralph-loop.md -> skills/ralph-loop/SKILL.md
    const commands = fs.readdirSync(commandsDir).filter(f => f.endsWith('.md'));
    for (const cmdFile of commands) {
      const skillName = cmdFile.replace('.md', '');
      const skillDir = path.join(skillsDir, skillName);
      const skillFile = path.join(skillDir, 'SKILL.md');

      // Create skill directory
      if (!fs.existsSync(skillDir)) {
        fs.mkdirSync(skillDir, { recursive: true });
      }

      // Read command file content
      const cmdPath = path.join(commandsDir, cmdFile);
      let content = fs.readFileSync(cmdPath, 'utf8');

      // Fix frontmatter: replace hide-from-slash-command-tool with name
      content = content.replace(
        /hide-from-slash-command-tool:\s*["']true["']/g,
        `name: ${skillName}`
      );

      // Write skill file (always overwrite to ensure fix is applied)
      fs.writeFileSync(skillFile, content, 'utf8');
    }
  }
}

/**
 * Install loop hooks (or verify official plugin is installed)
 */
function installLoopHooks(manager) {
  const pluginsDir = path.join(os.homedir(), '.claude', 'plugins', 'marketplaces');
  const officialPluginPath = path.join(pluginsDir, 'claude-plugins-official', 'plugins', 'ralph-loop');

  // Check if official plugin is already installed
  if (fs.existsSync(officialPluginPath)) {
    return {
      success: true,
      message: 'Official ralph-loop plugin is already installed',
      usingOfficialPlugin: true,
      pluginPath: officialPluginPath,
      note: 'Loops use the /ralph-loop command from the official claude-plugins-official marketplace'
    };
  }

  // Suggest installing the official plugin
  return {
    success: false,
    error: 'Official ralph-loop plugin not found',
    suggestion: 'Install the claude-plugins-official marketplace to get the ralph-loop plugin:\n' +
      '  1. Add marketplace: coder-config marketplace add https://github.com/anthropics/claude-plugins-official\n' +
      '  2. Or manually clone: git clone https://github.com/anthropics/claude-plugins-official ~/.claude/plugins/marketplaces/claude-plugins-official',
    note: 'The official plugin provides /ralph-loop command with stop-hook for autonomous loops'
  };
}

module.exports = {
  getLoops,
  getActiveLoop,
  getLoop,
  createLoop,
  updateLoop,
  deleteLoop,
  startLoop,
  pauseLoop,
  resumeLoop,
  cancelLoop,
  approveLoop,
  completeLoop,
  getLoopHistory,
  getLoopConfig,
  updateLoopConfig,
  saveClarifications,
  savePlan,
  recordIteration,
  getLoopHookStatus,
  installLoopHooks,
  getRalphLoopPluginStatus,
  installRalphLoopPlugin,
  fixRalphLoopPluginStructure,
};
