/**
 * Sessions Routes - Session persistence management
 * Context stored in project-local .claude/session-context.md
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Get session status for a project
 */
function getSessionStatus(projectDir) {
  const contextFile = path.join(projectDir, '.claude', 'session-context.md');

  const status = {
    hasSavedContext: false,
    contextPath: contextFile,
    contextAge: null,
    contextPreview: null,
    hooksInstalled: false,
    flushCommandInstalled: false,
  };

  if (fs.existsSync(contextFile)) {
    status.hasSavedContext = true;
    const stat = fs.statSync(contextFile);
    status.contextAge = Math.floor((Date.now() - stat.mtimeMs) / 1000 / 60);

    try {
      const content = fs.readFileSync(contextFile, 'utf8');
      status.contextPreview = content.substring(0, 500);
      if (content.length > 500) status.contextPreview += '...';
    } catch (e) {
      // Ignore read errors
    }
  }

  // Check if hooks and permissions are installed
  const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');
  status.permissionInstalled = false;
  if (fs.existsSync(settingsPath)) {
    try {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      const hooks = settings.hooks || {};
      const sessionStartHooks = Array.isArray(hooks.SessionStart) ? hooks.SessionStart : [];
      status.hooksInstalled = sessionStartHooks.some(h =>
        typeof h === 'object' && h.command && h.command.includes('session-start')
      );

      // Check for write permission
      const permissions = settings.permissions || {};
      const allow = permissions.allow || [];
      status.permissionInstalled = allow.includes('Write(**/.claude/session-context.md)');
    } catch (e) {
      // Ignore errors
    }
  }

  // Check if /flush command is installed
  const flushCommandPath = path.join(os.homedir(), '.claude', 'commands', 'flush.md');
  status.flushCommandInstalled = fs.existsSync(flushCommandPath);

  return status;
}

/**
 * Get full context content
 */
function getContextContent(projectDir) {
  const contextFile = path.join(projectDir, '.claude', 'session-context.md');
  if (fs.existsSync(contextFile)) {
    return { content: fs.readFileSync(contextFile, 'utf8'), path: contextFile };
  }
  return { content: null, path: null };
}

/**
 * Clear session context
 */
function clearContext(projectDir) {
  const contextFile = path.join(projectDir, '.claude', 'session-context.md');
  if (fs.existsSync(contextFile)) {
    fs.unlinkSync(contextFile);
    return { success: true, cleared: true };
  }
  return { success: true, cleared: false };
}

/**
 * Install session hooks and permissions
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
      return { success: false, error: 'Error reading settings.json: ' + e.message };
    }
  }

  if (!settings.hooks) {
    settings.hooks = {};
  }

  const hooksSrcDir = path.join(__dirname, '..', '..', 'hooks');
  const sessionStartHook = path.join(hooksSrcDir, 'session-start.sh');

  if (!fs.existsSync(sessionStartHook)) {
    return { success: false, error: 'Session hook not found', expectedPath: sessionStartHook };
  }

  try {
    fs.chmodSync(sessionStartHook, '755');
  } catch (e) {
    // Continue
  }

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
    return { success: true, message: 'Session hook and permissions installed' };
  } catch (e) {
    return { success: false, error: 'Error writing settings.json: ' + e.message };
  }
}

/**
 * Install /flush command
 */
function installFlushCommand() {
  const claudeDir = path.join(os.homedir(), '.claude');
  const commandsDir = path.join(claudeDir, 'commands');
  const destFile = path.join(commandsDir, 'flush.md');
  const templateFile = path.join(__dirname, '..', '..', 'templates', 'commands', 'flush.md');

  if (!fs.existsSync(templateFile)) {
    return { success: false, error: 'Flush command template not found' };
  }

  if (!fs.existsSync(commandsDir)) {
    fs.mkdirSync(commandsDir, { recursive: true });
  }

  if (fs.existsSync(destFile)) {
    const existing = fs.readFileSync(destFile, 'utf8');
    const template = fs.readFileSync(templateFile, 'utf8');
    if (existing === template) {
      return { success: true, message: '/flush already installed', alreadyInstalled: true };
    }
  }

  fs.copyFileSync(templateFile, destFile);
  return { success: true, message: '/flush command installed' };
}

/**
 * Install everything
 */
function installAll() {
  const hooksResult = installHooks();
  const commandResult = installFlushCommand();
  return {
    success: hooksResult.success && commandResult.success,
    hooks: hooksResult,
    command: commandResult
  };
}

module.exports = {
  getSessionStatus,
  getContextContent,
  clearContext,
  installHooks,
  installFlushCommand,
  installAll,
};
