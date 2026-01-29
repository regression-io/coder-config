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
 * Check if loop hooks are installed and registered in Claude Code settings
 */
function getLoopHookStatus() {
  const claudeSettingsPath = path.join(os.homedir(), '.claude', 'settings.json');
  const claudeHooksDir = path.join(os.homedir(), '.claude', 'hooks');
  const stopHookPath = path.join(claudeHooksDir, 'ralph-loop-stop.sh');
  const prepromptHookPath = path.join(claudeHooksDir, 'ralph-loop-preprompt.sh');

  // Check if hook files exist
  const stopHookFileExists = fs.existsSync(stopHookPath);
  const prepromptHookFileExists = fs.existsSync(prepromptHookPath);

  // Check if hooks are registered in settings.json
  let stopHookRegistered = false;
  let prepromptHookRegistered = false;

  if (fs.existsSync(claudeSettingsPath)) {
    try {
      const settings = JSON.parse(fs.readFileSync(claudeSettingsPath, 'utf8'));
      const hooks = settings.hooks || {};

      // Check Stop hook registration
      if (hooks.Stop) {
        stopHookRegistered = hooks.Stop.some(entry =>
          entry.hooks?.some(h => h.command?.includes('ralph-loop-stop.sh'))
        );
      }

      // Check PreToolUse hook registration
      if (hooks.PreToolUse) {
        prepromptHookRegistered = hooks.PreToolUse.some(entry =>
          entry.hooks?.some(h => h.command?.includes('ralph-loop-preprompt.sh'))
        );
      }
    } catch (e) {
      // Ignore parse errors
    }
  }

  const status = {
    stopHook: {
      path: stopHookPath,
      exists: stopHookFileExists,
      registered: stopHookRegistered
    },
    prepromptHook: {
      path: prepromptHookPath,
      exists: prepromptHookFileExists,
      registered: prepromptHookRegistered
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
 * Install loop hooks into Claude Code's settings.json
 * Registers Stop hook that increments iteration count after each response
 */
function installLoopHooks(manager) {
  const claudeSettingsPath = path.join(os.homedir(), '.claude', 'settings.json');
  const claudeHooksDir = path.join(os.homedir(), '.claude', 'hooks');

  // Ensure hooks directory exists
  if (!fs.existsSync(claudeHooksDir)) {
    fs.mkdirSync(claudeHooksDir, { recursive: true });
  }

  // Copy the stop hook script to ~/.claude/hooks/
  const stopHookSource = path.join(__dirname, '..', '..', 'hooks', 'ralph-loop-stop.sh');
  const stopHookDest = path.join(claudeHooksDir, 'ralph-loop-stop.sh');

  // Also copy preprompt hook
  const prepromptHookSource = path.join(__dirname, '..', '..', 'hooks', 'ralph-loop-preprompt.sh');
  const prepromptHookDest = path.join(claudeHooksDir, 'ralph-loop-preprompt.sh');

  try {
    // Copy hook scripts
    if (fs.existsSync(stopHookSource)) {
      fs.copyFileSync(stopHookSource, stopHookDest);
      fs.chmodSync(stopHookDest, '755');
    }
    if (fs.existsSync(prepromptHookSource)) {
      fs.copyFileSync(prepromptHookSource, prepromptHookDest);
      fs.chmodSync(prepromptHookDest, '755');
    }

    // Load existing settings
    let settings = {};
    if (fs.existsSync(claudeSettingsPath)) {
      settings = JSON.parse(fs.readFileSync(claudeSettingsPath, 'utf8'));
    }

    // Initialize hooks if needed
    if (!settings.hooks) {
      settings.hooks = {};
    }

    // Add Stop hook for iteration tracking
    const stopHookEntry = {
      hooks: [{
        type: 'command',
        command: stopHookDest
      }]
    };

    // Check if Stop hook already exists
    if (!settings.hooks.Stop) {
      settings.hooks.Stop = [stopHookEntry];
    } else {
      // Check if our hook is already registered
      const hookExists = settings.hooks.Stop.some(entry =>
        entry.hooks?.some(h => h.command?.includes('ralph-loop-stop.sh'))
      );
      if (!hookExists) {
        settings.hooks.Stop.push(stopHookEntry);
      }
    }

    // Add PreToolUse hook for context injection (optional)
    const prepromptHookEntry = {
      hooks: [{
        type: 'command',
        command: prepromptHookDest
      }]
    };

    if (!settings.hooks.PreToolUse) {
      settings.hooks.PreToolUse = [prepromptHookEntry];
    } else {
      const hookExists = settings.hooks.PreToolUse.some(entry =>
        entry.hooks?.some(h => h.command?.includes('ralph-loop-preprompt.sh'))
      );
      if (!hookExists) {
        settings.hooks.PreToolUse.push(prepromptHookEntry);
      }
    }

    // Save updated settings
    fs.writeFileSync(claudeSettingsPath, JSON.stringify(settings, null, 2) + '\n');

    return {
      success: true,
      message: 'Loop hooks installed successfully',
      stopHook: stopHookDest,
      prepromptHook: prepromptHookDest,
      note: 'Stop hook will increment iteration count after each Claude response when CODER_LOOP_ID is set'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      suggestion: 'Try manually copying hooks to ~/.claude/hooks/ and adding to ~/.claude/settings.json'
    };
  }
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
