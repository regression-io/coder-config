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

  // Add SessionStart hook
  if (!settings.hooks.SessionStart) {
    settings.hooks.SessionStart = [];
  }
  if (!Array.isArray(settings.hooks.SessionStart)) {
    settings.hooks.SessionStart = [settings.hooks.SessionStart];
  }

  const hasStartHook = settings.hooks.SessionStart.some(h =>
    typeof h === 'object' && h.command === sessionStartHook
  );
  if (!hasStartHook) {
    settings.hooks.SessionStart.push({ type: 'command', command: sessionStartHook });
  }

  try {
    fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
    console.log('Session hook installed.\n');
    console.log('SessionStart hook restores context from .claude/session-context.md');
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
