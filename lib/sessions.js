/**
 * Session persistence management
 * Context is stored in project-local .claude/session-context.md
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Get session status for a project
 */
function getSessionStatus(projectDir = process.cwd()) {
  const contextFile = path.join(projectDir, '.claude', 'session-context.md');

  const status = {
    hasSavedContext: false,
    contextPath: contextFile,
    contextAge: null,
  };

  if (fs.existsSync(contextFile)) {
    status.hasSavedContext = true;
    const stat = fs.statSync(contextFile);
    status.contextAge = Math.floor((Date.now() - stat.mtimeMs) / 1000 / 60); // minutes
  }

  return status;
}

/**
 * Show session status
 */
function showSessionStatus() {
  const status = getSessionStatus();

  console.log('Session Persistence Status\n');

  if (status.hasSavedContext) {
    console.log(`  Saved context: Yes`);
    console.log(`  Location: ${status.contextPath}`);
    if (status.contextAge !== null) {
      if (status.contextAge < 60) {
        console.log(`  Age: ${status.contextAge} minutes`);
      } else if (status.contextAge < 1440) {
        console.log(`  Age: ${Math.floor(status.contextAge / 60)} hours`);
      } else {
        console.log(`  Age: ${Math.floor(status.contextAge / 1440)} days`);
      }
    }
  } else {
    console.log('  Saved context: None');
    console.log(`  Expected at: ${status.contextPath}`);
  }

  console.log('\nTo save context, use /flush in Claude Code.');
}

/**
 * Print instructions for flush
 */
function flushContext() {
  console.log('Session context flush\n');
  console.log('Use /flush in Claude Code to save session context.');
  console.log('Context is saved to: .claude/session-context.md');
}

/**
 * Clear saved session context
 */
function clearContext(projectDir = process.cwd()) {
  const contextFile = path.join(projectDir, '.claude', 'session-context.md');

  if (fs.existsSync(contextFile)) {
    fs.unlinkSync(contextFile);
    console.log('Session context cleared.');
  } else {
    console.log('No session context to clear.');
  }
}

/**
 * Install Claude Code hooks for session persistence
 */
function installHooks() {
  const claudeDir = path.join(os.homedir(), '.claude');
  const settingsFile = path.join(claudeDir, 'settings.json');

  if (!fs.existsSync(claudeDir)) {
    fs.mkdirSync(claudeDir, { recursive: true });
  }

  let settings = {};
  if (fs.existsSync(settingsFile)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
    } catch (e) {
      console.error('Error reading settings.json:', e.message);
      return;
    }
  }

  if (!settings.hooks) {
    settings.hooks = {};
  }

  const hooksSrcDir = path.join(__dirname, '..', 'hooks');
  const sessionStartHook = path.join(hooksSrcDir, 'session-start.sh');

  if (!fs.existsSync(sessionStartHook)) {
    console.error('Session hook not found:', sessionStartHook);
    return;
  }

  try {
    fs.chmodSync(sessionStartHook, '755');
  } catch (e) {
    // Continue even if chmod fails
  }

  // Clean up and migrate SessionStart hooks to new format
  if (!settings.hooks.SessionStart) {
    settings.hooks.SessionStart = [];
  }
  if (!Array.isArray(settings.hooks.SessionStart)) {
    settings.hooks.SessionStart = [settings.hooks.SessionStart];
  }

  // Filter out old format hooks and invalid entries, collect commands to migrate
  const commandsToKeep = new Set();
  settings.hooks.SessionStart = settings.hooks.SessionStart.filter(h => {
    if (typeof h !== 'object') return false;
    // Old format: { type, command } - remove but track command
    if (h.command && !h.hooks) {
      commandsToKeep.add(h.command);
      return false;
    }
    // Invalid format: { matcher: {} } object - remove matcher
    if (h.matcher && typeof h.matcher === 'object') {
      delete h.matcher;
    }
    // New format with hooks array - keep
    if (Array.isArray(h.hooks)) {
      h.hooks.forEach(hh => {
        if (hh.command) commandsToKeep.add(hh.command);
      });
      return true;
    }
    return false;
  });

  // Add our hook command if not already present
  commandsToKeep.add(sessionStartHook);

  // Consolidate all commands into a single entry
  if (settings.hooks.SessionStart.length === 0) {
    settings.hooks.SessionStart.push({
      hooks: Array.from(commandsToKeep).map(cmd => ({ type: 'command', command: cmd }))
    });
  } else {
    // Add missing commands to existing entry
    const existingCommands = new Set(
      settings.hooks.SessionStart[0].hooks.map(h => h.command)
    );
    for (const cmd of commandsToKeep) {
      if (!existingCommands.has(cmd)) {
        settings.hooks.SessionStart[0].hooks.push({ type: 'command', command: cmd });
      }
    }
  }

  // Clean up SessionEnd hooks (same migration as SessionStart)
  if (settings.hooks.SessionEnd && Array.isArray(settings.hooks.SessionEnd)) {
    const endCommandsToKeep = new Set();
    settings.hooks.SessionEnd = settings.hooks.SessionEnd.filter(h => {
      if (typeof h !== 'object') return false;
      if (h.command && !h.hooks) {
        endCommandsToKeep.add(h.command);
        return false;
      }
      if (h.matcher && typeof h.matcher === 'object') {
        delete h.matcher;
      }
      if (Array.isArray(h.hooks)) {
        h.hooks.forEach(hh => {
          if (hh.command) endCommandsToKeep.add(hh.command);
        });
        return true;
      }
      return false;
    });
    // Consolidate remaining commands
    if (endCommandsToKeep.size > 0 && settings.hooks.SessionEnd.length === 0) {
      settings.hooks.SessionEnd.push({
        hooks: Array.from(endCommandsToKeep).map(cmd => ({ type: 'command', command: cmd }))
      });
    }
  }

  // Add permission to write session context file
  if (!settings.permissions) {
    settings.permissions = {};
  }
  if (!settings.permissions.allow) {
    settings.permissions.allow = [];
  }

  const contextPermission = 'Write(**/.claude/session-context.md)';
  if (!settings.permissions.allow.includes(contextPermission)) {
    settings.permissions.allow.push(contextPermission);
  }

  try {
    fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
    console.log('Session hook and permissions installed.\n');
    console.log('SessionStart hook restores context from .claude/session-context.md');
    console.log('Write permission added for session context file.');
    console.log('Use /flush in Claude Code to save context.');
  } catch (e) {
    console.error('Error writing settings.json:', e.message);
  }
}

/**
 * Get flushed context content
 */
function getFlushedContext(projectDir = process.cwd()) {
  const contextFile = path.join(projectDir, '.claude', 'session-context.md');
  if (fs.existsSync(contextFile)) {
    return fs.readFileSync(contextFile, 'utf8');
  }
  return null;
}

/**
 * Install the /flush command to ~/.claude/commands/
 */
function installFlushCommand() {
  const claudeDir = path.join(os.homedir(), '.claude');
  const commandsDir = path.join(claudeDir, 'commands');
  const destFile = path.join(commandsDir, 'flush.md');

  const templateFile = path.join(__dirname, '..', 'templates', 'commands', 'flush.md');

  if (!fs.existsSync(templateFile)) {
    console.error('Flush command template not found.');
    return false;
  }

  if (!fs.existsSync(commandsDir)) {
    fs.mkdirSync(commandsDir, { recursive: true });
  }

  if (fs.existsSync(destFile)) {
    const existing = fs.readFileSync(destFile, 'utf8');
    const template = fs.readFileSync(templateFile, 'utf8');
    if (existing === template) {
      console.log('/flush command already installed.');
      return true;
    }
  }

  fs.copyFileSync(templateFile, destFile);
  console.log('/flush command installed.');
  return true;
}

/**
 * Install everything needed for session persistence
 */
function installAll() {
  console.log('Installing session persistence...\n');
  installHooks();
  console.log('');
  installFlushCommand();
  console.log('\nUse /flush in Claude Code to save context before exiting.');
}

module.exports = {
  getSessionStatus,
  showSessionStatus,
  flushContext,
  clearContext,
  installHooks,
  getFlushedContext,
  installFlushCommand,
  installAll,
};
