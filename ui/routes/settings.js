/**
 * Settings Routes (Claude Code & Gemini CLI)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Get Claude Code settings from ~/.claude/settings.json
 */
function getClaudeSettings() {
  const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');

  try {
    if (!fs.existsSync(settingsPath)) {
      return {
        path: settingsPath,
        exists: false,
        settings: { permissions: { allow: [], ask: [], deny: [] } }
      };
    }

    const content = fs.readFileSync(settingsPath, 'utf8');
    const settings = JSON.parse(content);

    // Ensure permissions structure exists
    if (!settings.permissions) {
      settings.permissions = { allow: [], ask: [], deny: [] };
    }
    if (!settings.permissions.allow) settings.permissions.allow = [];
    if (!settings.permissions.ask) settings.permissions.ask = [];
    if (!settings.permissions.deny) settings.permissions.deny = [];

    return {
      path: settingsPath,
      exists: true,
      settings
    };
  } catch (e) {
    return {
      path: settingsPath,
      error: e.message
    };
  }
}

/**
 * Save Claude Code settings to ~/.claude/settings.json
 */
function saveClaudeSettings(body) {
  const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');
  const { settings, permissions } = body;

  try {
    const claudeDir = path.dirname(settingsPath);
    if (!fs.existsSync(claudeDir)) {
      fs.mkdirSync(claudeDir, { recursive: true });
    }

    let finalSettings = {};

    if (fs.existsSync(settingsPath)) {
      try {
        finalSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      } catch (e) {
        finalSettings = {};
      }
    }

    if (settings) {
      finalSettings = { ...finalSettings, ...settings };
    }
    if (permissions) {
      finalSettings.permissions = permissions;
    }

    fs.writeFileSync(settingsPath, JSON.stringify(finalSettings, null, 2) + '\n', 'utf8');

    return {
      success: true,
      path: settingsPath,
      settings: finalSettings
    };
  } catch (e) {
    return {
      success: false,
      error: e.message
    };
  }
}

/**
 * Get Gemini CLI settings from ~/.gemini/settings.json
 */
function getGeminiSettings() {
  const settingsPath = path.join(os.homedir(), '.gemini', 'settings.json');

  try {
    if (!fs.existsSync(settingsPath)) {
      return {
        path: settingsPath,
        exists: false,
        settings: {}
      };
    }

    const content = fs.readFileSync(settingsPath, 'utf8');
    const settings = JSON.parse(content);

    return {
      path: settingsPath,
      exists: true,
      settings
    };
  } catch (e) {
    return {
      path: settingsPath,
      error: e.message
    };
  }
}

/**
 * Save Gemini CLI settings to ~/.gemini/settings.json
 */
function saveGeminiSettings(body) {
  const settingsPath = path.join(os.homedir(), '.gemini', 'settings.json');

  try {
    const geminiDir = path.dirname(settingsPath);
    if (!fs.existsSync(geminiDir)) {
      fs.mkdirSync(geminiDir, { recursive: true });
    }

    let finalSettings = {};
    if (fs.existsSync(settingsPath)) {
      try {
        finalSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      } catch (e) {
        finalSettings = {};
      }
    }

    // Merge with new settings (preserves mcpServers which is managed separately)
    finalSettings = { ...finalSettings, ...body };

    fs.writeFileSync(settingsPath, JSON.stringify(finalSettings, null, 2) + '\n', 'utf8');

    return {
      success: true,
      path: settingsPath,
      settings: finalSettings
    };
  } catch (e) {
    return {
      success: false,
      error: e.message
    };
  }
}

/**
 * Get Antigravity settings from ~/.gemini/antigravity/settings.json
 */
function getAntigravitySettings() {
  const settingsPath = path.join(os.homedir(), '.gemini', 'antigravity', 'settings.json');

  try {
    if (!fs.existsSync(settingsPath)) {
      return {
        path: settingsPath,
        exists: false,
        settings: {}
      };
    }

    const content = fs.readFileSync(settingsPath, 'utf8');
    const settings = JSON.parse(content);

    return {
      path: settingsPath,
      exists: true,
      settings
    };
  } catch (e) {
    return {
      path: settingsPath,
      error: e.message
    };
  }
}

/**
 * Save Antigravity settings to ~/.gemini/antigravity/settings.json
 */
function saveAntigravitySettings(body) {
  const settingsPath = path.join(os.homedir(), '.gemini', 'antigravity', 'settings.json');

  try {
    const antigravityDir = path.dirname(settingsPath);
    if (!fs.existsSync(antigravityDir)) {
      fs.mkdirSync(antigravityDir, { recursive: true });
    }

    let finalSettings = {};
    if (fs.existsSync(settingsPath)) {
      try {
        finalSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      } catch (e) {
        finalSettings = {};
      }
    }

    // Merge with new settings
    finalSettings = { ...finalSettings, ...body };

    fs.writeFileSync(settingsPath, JSON.stringify(finalSettings, null, 2) + '\n', 'utf8');

    return {
      success: true,
      path: settingsPath,
      settings: finalSettings
    };
  } catch (e) {
    return {
      success: false,
      error: e.message
    };
  }
}

module.exports = {
  getClaudeSettings,
  saveClaudeSettings,
  getGeminiSettings,
  saveGeminiSettings,
  getAntigravitySettings,
  saveAntigravitySettings,
};
