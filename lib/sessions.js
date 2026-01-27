/**
 * Session persistence management
 * Saves and restores Claude Code session context
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const SESSION_DIR = path.join(os.homedir(), '.coder-config', 'sessions');
const LAST_SESSION_FILE = path.join(SESSION_DIR, 'last-session.json');
const FLUSHED_CONTEXT_FILE = path.join(SESSION_DIR, 'flushed-context.md');
const LAST_FLUSHED_FILE = path.join(SESSION_DIR, 'last-flushed-context.md');

/**
 * Ensure session directory exists
 */
function ensureSessionDir() {
  if (!fs.existsSync(SESSION_DIR)) {
    fs.mkdirSync(SESSION_DIR, { recursive: true });
  }
}

/**
 * Get session status
 */
function getSessionStatus() {
  ensureSessionDir();

  const status = {
    hasSavedContext: false,
    lastSession: null,
    contextAge: null,
  };

  // Check for flushed context
  if (fs.existsSync(LAST_FLUSHED_FILE)) {
    status.hasSavedContext = true;
    const stat = fs.statSync(LAST_FLUSHED_FILE);
    status.contextAge = Math.floor((Date.now() - stat.mtimeMs) / 1000 / 60); // minutes
  } else if (fs.existsSync(FLUSHED_CONTEXT_FILE)) {
    status.hasSavedContext = true;
    const stat = fs.statSync(FLUSHED_CONTEXT_FILE);
    status.contextAge = Math.floor((Date.now() - stat.mtimeMs) / 1000 / 60);
  }

  // Check for last session metadata
  if (fs.existsSync(LAST_SESSION_FILE)) {
    try {
      status.lastSession = JSON.parse(fs.readFileSync(LAST_SESSION_FILE, 'utf8'));
    } catch (e) {
      // Ignore parse errors
    }
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
    if (status.contextAge !== null) {
      if (status.contextAge < 60) {
        console.log(`  Context age: ${status.contextAge} minutes`);
      } else if (status.contextAge < 1440) {
        console.log(`  Context age: ${Math.floor(status.contextAge / 60)} hours`);
      } else {
        console.log(`  Context age: ${Math.floor(status.contextAge / 1440)} days`);
      }
    }
  } else {
    console.log('  Saved context: None');
  }

  if (status.lastSession) {
    console.log(`\n  Last session:`);
    console.log(`    ID: ${status.lastSession.session_id || 'unknown'}`);
    console.log(`    CWD: ${status.lastSession.cwd || 'unknown'}`);
    console.log(`    Ended: ${status.lastSession.timestamp || 'unknown'}`);
    console.log(`    Reason: ${status.lastSession.reason || 'unknown'}`);
  }

  console.log(`\n  Storage: ${SESSION_DIR}`);

  if (!status.hasSavedContext) {
    console.log('\nTo save context, use /flush in Claude Code or:');
    console.log('  coder-config session flush');
  }
}

/**
 * Print instructions for manual flush
 * (Actual flush happens in Claude Code via /flush command)
 */
function flushContext() {
  console.log('Session context flush\n');
  console.log('To save session context, use the /flush command in Claude Code.');
  console.log('This tells Claude to write a summary to:');
  console.log(`  ${FLUSHED_CONTEXT_FILE}\n`);
  console.log('The context will be automatically restored on the next session start');
  console.log('(if session hooks are installed).\n');
  console.log('Install hooks with:');
  console.log('  coder-config session install-hooks');
}

/**
 * Clear saved session context
 */
function clearContext() {
  ensureSessionDir();

  let cleared = false;

  if (fs.existsSync(FLUSHED_CONTEXT_FILE)) {
    fs.unlinkSync(FLUSHED_CONTEXT_FILE);
    cleared = true;
  }

  if (fs.existsSync(LAST_FLUSHED_FILE)) {
    fs.unlinkSync(LAST_FLUSHED_FILE);
    cleared = true;
  }

  if (fs.existsSync(LAST_SESSION_FILE)) {
    fs.unlinkSync(LAST_SESSION_FILE);
    cleared = true;
  }

  if (cleared) {
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

  // Ensure .claude directory exists
  if (!fs.existsSync(claudeDir)) {
    fs.mkdirSync(claudeDir, { recursive: true });
  }

  // Load existing settings
  let settings = {};
  if (fs.existsSync(settingsFile)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
    } catch (e) {
      console.error('Error reading settings.json:', e.message);
      return;
    }
  }

  // Initialize hooks if needed
  if (!settings.hooks) {
    settings.hooks = {};
  }

  // Find coder-config hooks directory
  const hooksSrcDir = path.join(__dirname, '..', 'hooks');
  const sessionStartHook = path.join(hooksSrcDir, 'session-start.sh');
  const sessionEndHook = path.join(hooksSrcDir, 'session-end.sh');

  // Verify hooks exist
  if (!fs.existsSync(sessionStartHook) || !fs.existsSync(sessionEndHook)) {
    console.error('Session hooks not found in coder-config package.');
    console.log('Expected locations:');
    console.log(`  ${sessionStartHook}`);
    console.log(`  ${sessionEndHook}`);
    return;
  }

  // Make hooks executable
  try {
    fs.chmodSync(sessionStartHook, '755');
    fs.chmodSync(sessionEndHook, '755');
  } catch (e) {
    console.warn('Could not set executable permission on hooks:', e.message);
  }

  // Add SessionStart hook
  if (!settings.hooks.SessionStart) {
    settings.hooks.SessionStart = [];
  }
  if (!Array.isArray(settings.hooks.SessionStart)) {
    settings.hooks.SessionStart = [settings.hooks.SessionStart];
  }

  // Check if our hook is already installed
  const startHookEntry = { type: 'command', command: sessionStartHook };
  const hasStartHook = settings.hooks.SessionStart.some(h =>
    typeof h === 'object' && h.command === sessionStartHook
  );
  if (!hasStartHook) {
    settings.hooks.SessionStart.push(startHookEntry);
  }

  // Add SessionEnd hook
  if (!settings.hooks.SessionEnd) {
    settings.hooks.SessionEnd = [];
  }
  if (!Array.isArray(settings.hooks.SessionEnd)) {
    settings.hooks.SessionEnd = [settings.hooks.SessionEnd];
  }

  const endHookEntry = { type: 'command', command: sessionEndHook };
  const hasEndHook = settings.hooks.SessionEnd.some(h =>
    typeof h === 'object' && h.command === sessionEndHook
  );
  if (!hasEndHook) {
    settings.hooks.SessionEnd.push(endHookEntry);
  }

  // Save settings
  try {
    fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
    console.log('Session hooks installed.\n');
    console.log('Hooks added:');
    console.log('  - SessionStart: Restores saved context');
    console.log('  - SessionEnd: Preserves flushed context\n');
    console.log('To save context before exiting, use /flush in Claude Code.');
    console.log('The saved context will be restored on the next session start.');
  } catch (e) {
    console.error('Error writing settings.json:', e.message);
  }
}

/**
 * Get flushed context content (for hooks)
 */
function getFlushedContext() {
  if (fs.existsSync(LAST_FLUSHED_FILE)) {
    return fs.readFileSync(LAST_FLUSHED_FILE, 'utf8');
  }
  if (fs.existsSync(FLUSHED_CONTEXT_FILE)) {
    return fs.readFileSync(FLUSHED_CONTEXT_FILE, 'utf8');
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

  // Find the template
  const templateFile = path.join(__dirname, '..', 'templates', 'commands', 'flush.md');

  if (!fs.existsSync(templateFile)) {
    console.error('Flush command template not found.');
    console.log(`Expected: ${templateFile}`);
    return false;
  }

  // Ensure commands directory exists
  if (!fs.existsSync(commandsDir)) {
    fs.mkdirSync(commandsDir, { recursive: true });
  }

  // Check if command already exists
  if (fs.existsSync(destFile)) {
    const existing = fs.readFileSync(destFile, 'utf8');
    const template = fs.readFileSync(templateFile, 'utf8');
    if (existing === template) {
      console.log('/flush command already installed.');
      return true;
    }
    // Backup existing
    const backupFile = path.join(commandsDir, 'flush.md.bak');
    fs.copyFileSync(destFile, backupFile);
    console.log(`Backed up existing /flush to ${backupFile}`);
  }

  // Copy template
  fs.copyFileSync(templateFile, destFile);
  console.log('/flush command installed to ~/.claude/commands/flush.md');
  return true;
}

/**
 * Install everything needed for session persistence
 */
function installAll() {
  console.log('Installing session persistence...\n');

  // Install hooks
  installHooks();

  console.log('');

  // Install command
  installFlushCommand();

  console.log('\nSession persistence setup complete!');
  console.log('Use /flush in Claude Code to save context before exiting.');
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
  SESSION_DIR,
  FLUSHED_CONTEXT_FILE,
};
