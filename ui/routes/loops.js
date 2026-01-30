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

  // Setup hooks for this project
  if (loop.projectPath) {
    setupLoopHooks(loop.projectPath);
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

  // Setup hooks for this project
  if (loop.projectPath) {
    setupLoopHooks(loop.projectPath);
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
 * Check if loop hooks are available (scripts exist)
 * Hooks are now installed per-project, not globally
 */
function getLoopHookStatus() {
  const claudeHooksDir = path.join(os.homedir(), '.claude', 'hooks');
  const stopHookPath = path.join(claudeHooksDir, 'ralph-loop-stop.sh');
  const prepromptHookPath = path.join(claudeHooksDir, 'ralph-loop-preprompt.sh');

  // Check if hook script files exist
  const stopHookFileExists = fs.existsSync(stopHookPath);
  const prepromptHookFileExists = fs.existsSync(prepromptHookPath);

  // Hooks are installed per-project now, so "registered" means scripts are available
  const status = {
    stopHook: {
      path: stopHookPath,
      exists: stopHookFileExists,
      registered: stopHookFileExists  // Scripts are ready to be used
    },
    prepromptHook: {
      path: prepromptHookPath,
      exists: prepromptHookFileExists,
      registered: prepromptHookFileExists
    },
    mode: 'per-project',
    note: 'Hooks are installed to project .claude/settings.local.json when loops start'
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
 * Tune a prompt for Ralph Loop using Claude Code
 * Rewrites the task following Ralph Wiggum principles:
 * - Clear completion signals (exact string matching)
 * - Incremental staging with verification steps
 * - Automatic verification (tests, linters, builds)
 */
async function tunePrompt(task, projectPath = null) {
  const { spawn } = require('child_process');

  const metaPrompt = `You are a prompt engineer specializing in Ralph Loop autonomous development.

Your task: Rewrite the following task description to be optimal for Ralph Loop execution.

## Ralph Loop Principles (from awesomeclaude.ai/ralph-wiggum):

1. **Clear Completion Signals**: Use exact string matching. The completion promise will be "DONE" - the loop ends when Claude outputs this exact text.

2. **Incremental Staging**: Break complex work into phases with clear checkpoints. After each phase, verify before moving to the next.

3. **Automatic Verification**: Include self-correcting patterns:
   - Run tests after changes
   - Check linter/type errors
   - Verify builds succeed
   - Confirm expected behavior

4. **Start Simple, Add Guardrails on Failure**: Begin with the core task. Only add constraints if things go wrong.

## Output Format:

Respond with ONLY the rewritten task description. No explanation, no preamble, no markdown formatting - just the improved task text that will be passed to /ralph-loop.

The rewritten task should:
- Be specific about what "done" means
- Include verification steps (test, lint, build)
- List clear acceptance criteria
- End with: "When all acceptance criteria are met and verified, output DONE."

## Original Task:

${task}

## Rewritten Task:`;

  return new Promise((resolve) => {
    const args = ['-p', metaPrompt];

    // Run from project directory if provided
    const options = {
      encoding: 'utf8',
      timeout: 60000, // 60 second timeout
      cwd: projectPath || process.cwd()
    };

    let output = '';
    let errorOutput = '';

    const proc = spawn('claude', args, options);

    proc.stdout.on('data', (data) => {
      output += data.toString();
    });

    proc.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0 && output.trim()) {
        resolve({
          success: true,
          tunedPrompt: output.trim()
        });
      } else {
        resolve({
          success: false,
          error: errorOutput || 'Failed to tune prompt',
          originalPrompt: task
        });
      }
    });

    proc.on('error', (err) => {
      resolve({
        success: false,
        error: err.message,
        originalPrompt: task
      });
    });

    // Handle timeout manually since spawn doesn't have timeout
    setTimeout(() => {
      proc.kill();
      resolve({
        success: false,
        error: 'Prompt tuning timed out',
        originalPrompt: task
      });
    }, 60000);
  });
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
 * Install loop hooks for a specific project directory
 * Creates .claude/settings.local.json with hooks (not committed to git)
 * This avoids the global trust prompt issue
 */
function installLoopHooks(manager, projectPath = null) {
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
    // Copy hook scripts to ~/.claude/hooks/
    if (fs.existsSync(stopHookSource)) {
      fs.copyFileSync(stopHookSource, stopHookDest);
      fs.chmodSync(stopHookDest, '755');
    }
    if (fs.existsSync(prepromptHookSource)) {
      fs.copyFileSync(prepromptHookSource, prepromptHookDest);
      fs.chmodSync(prepromptHookDest, '755');
    }

    // Remove hooks from global settings.json if they exist
    removeGlobalHooks();

    // If project path provided, install hooks to project's .claude/settings.local.json
    if (projectPath) {
      const projectClaudeDir = path.join(projectPath, '.claude');
      const projectSettingsLocalPath = path.join(projectClaudeDir, 'settings.local.json');

      // Ensure project .claude directory exists
      if (!fs.existsSync(projectClaudeDir)) {
        fs.mkdirSync(projectClaudeDir, { recursive: true });
      }

      // Load or create project-local settings
      let projectSettings = {};
      if (fs.existsSync(projectSettingsLocalPath)) {
        try {
          projectSettings = JSON.parse(fs.readFileSync(projectSettingsLocalPath, 'utf8'));
        } catch (e) {
          projectSettings = {};
        }
      }

      // Initialize hooks if needed
      if (!projectSettings.hooks) {
        projectSettings.hooks = {};
      }

      // Add Stop hook
      const stopHookEntry = {
        hooks: [{
          type: 'command',
          command: stopHookDest
        }]
      };

      if (!projectSettings.hooks.Stop) {
        projectSettings.hooks.Stop = [stopHookEntry];
      } else {
        const hookExists = projectSettings.hooks.Stop.some(entry =>
          entry.hooks?.some(h => h.command?.includes('ralph-loop-stop.sh'))
        );
        if (!hookExists) {
          projectSettings.hooks.Stop.push(stopHookEntry);
        }
      }

      // Save project-local settings
      fs.writeFileSync(projectSettingsLocalPath, JSON.stringify(projectSettings, null, 2) + '\n');

      return {
        success: true,
        message: 'Loop hooks installed to project',
        projectPath,
        settingsFile: projectSettingsLocalPath,
        stopHook: stopHookDest,
        note: 'Hooks installed to .claude/settings.local.json (not committed to git)'
      };
    }

    return {
      success: true,
      message: 'Hook scripts copied to ~/.claude/hooks/',
      stopHook: stopHookDest,
      prepromptHook: prepromptHookDest,
      note: 'Hooks will be installed to project directories when loops are started'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Remove ralph-loop hooks from global ~/.claude/settings.json
 */
function removeGlobalHooks() {
  const claudeSettingsPath = path.join(os.homedir(), '.claude', 'settings.json');

  if (!fs.existsSync(claudeSettingsPath)) {
    return;
  }

  try {
    const settings = JSON.parse(fs.readFileSync(claudeSettingsPath, 'utf8'));

    if (!settings.hooks) {
      return;
    }

    let modified = false;

    // Remove Stop hooks that reference ralph-loop-stop.sh
    if (settings.hooks.Stop) {
      const original = settings.hooks.Stop.length;
      settings.hooks.Stop = settings.hooks.Stop.filter(entry =>
        !entry.hooks?.some(h => h.command?.includes('ralph-loop-stop.sh'))
      );
      if (settings.hooks.Stop.length === 0) {
        delete settings.hooks.Stop;
      }
      if (settings.hooks.Stop?.length !== original) {
        modified = true;
      }
    }

    // Remove PreToolUse hooks that reference ralph-loop-preprompt.sh
    if (settings.hooks.PreToolUse) {
      const original = settings.hooks.PreToolUse.length;
      settings.hooks.PreToolUse = settings.hooks.PreToolUse.filter(entry =>
        !entry.hooks?.some(h => h.command?.includes('ralph-loop-preprompt.sh'))
      );
      if (settings.hooks.PreToolUse.length === 0) {
        delete settings.hooks.PreToolUse;
      }
      if (settings.hooks.PreToolUse?.length !== original) {
        modified = true;
      }
    }

    // Clean up empty hooks object
    if (Object.keys(settings.hooks).length === 0) {
      delete settings.hooks;
    }

    if (modified) {
      fs.writeFileSync(claudeSettingsPath, JSON.stringify(settings, null, 2) + '\n');
    }
  } catch (e) {
    // Ignore errors
  }
}

/**
 * Setup hooks for a specific loop run
 * Called when starting/resuming a loop
 */
function setupLoopHooks(projectPath) {
  if (!projectPath) {
    return { success: false, error: 'No project path provided' };
  }

  return installLoopHooks(null, projectPath);
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
  setupLoopHooks,
  removeGlobalHooks,
  getRalphLoopPluginStatus,
  installRalphLoopPlugin,
  fixRalphLoopPluginStructure,
  tunePrompt,
};
