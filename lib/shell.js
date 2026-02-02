/**
 * Shell integration management
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Marker comments for identifying our integration
const MARKER_START = '# >>> coder-config shell integration >>>';
const MARKER_END = '# <<< coder-config shell integration <<<';

/**
 * Get the path to the shell config file
 */
function getShellConfigPath() {
  const shell = process.env.SHELL || '/bin/zsh';
  const shellName = path.basename(shell);

  if (shellName === 'zsh') {
    return path.join(os.homedir(), '.zshrc');
  } else if (shellName === 'bash') {
    // Check for .bash_profile first (macOS), then .bashrc
    const bashProfile = path.join(os.homedir(), '.bash_profile');
    if (fs.existsSync(bashProfile)) {
      return bashProfile;
    }
    return path.join(os.homedir(), '.bashrc');
  }

  // Default to zshrc
  return path.join(os.homedir(), '.zshrc');
}

/**
 * Get the path to the shell integration script
 */
function getShellScriptPath() {
  // Check if installed globally via npm
  const globalPath = path.join(__dirname, '..', 'shell', 'coder-config.zsh');
  if (fs.existsSync(globalPath)) {
    return globalPath;
  }

  // Check in node_modules
  try {
    const pkgPath = require.resolve('coder-config/shell/coder-config.zsh');
    return pkgPath;
  } catch {
    // Not found in node_modules
  }

  return globalPath;
}

/**
 * Check if shell integration is installed
 */
function shellStatus() {
  const rcPath = getShellConfigPath();
  const scriptPath = getShellScriptPath();
  const shell = path.basename(process.env.SHELL || '/bin/zsh');

  const result = {
    shell,
    rcFile: rcPath,
    scriptPath,
    installed: false,
    scriptExists: fs.existsSync(scriptPath)
  };

  if (!fs.existsSync(rcPath)) {
    return result;
  }

  const content = fs.readFileSync(rcPath, 'utf8');
  result.installed = content.includes(MARKER_START) ||
                     content.includes('coder-config.zsh') ||
                     content.includes('source') && content.includes('coder-config');

  return result;
}

/**
 * Install shell integration
 */
function shellInstall() {
  const status = shellStatus();

  if (!status.scriptExists) {
    console.error('Error: Shell integration script not found at:');
    console.error(`  ${status.scriptPath}`);
    console.error('');
    console.error('Try reinstalling coder-config:');
    console.error('  npm install -g coder-config');
    return false;
  }

  if (status.installed) {
    console.log('Shell integration is already installed.');
    console.log(`  RC file: ${status.rcFile}`);
    console.log('');
    console.log('To apply changes, run:');
    console.log(`  source ${status.rcFile}`);
    return true;
  }

  // Build the integration block
  const integrationBlock = `
${MARKER_START}
# Shell integration for coder-config (Claude Code, Gemini CLI, Codex CLI)
# Provides: completions, auto-apply on cd, workstream management
source "${status.scriptPath}"
${MARKER_END}
`;

  // Read existing content or create empty
  let content = '';
  if (fs.existsSync(status.rcFile)) {
    content = fs.readFileSync(status.rcFile, 'utf8');
  }

  // Append integration block
  content = content.trimEnd() + '\n' + integrationBlock;

  fs.writeFileSync(status.rcFile, content);

  console.log('✓ Shell integration installed');
  console.log('');
  console.log(`  RC file: ${status.rcFile}`);
  console.log(`  Script:  ${status.scriptPath}`);
  console.log('');
  console.log('Features enabled:');
  console.log('  • Tab completions for all commands');
  console.log('  • Auto-apply config on cd into projects');
  console.log('  • Workstream session management');
  console.log('');
  console.log('To apply now, run:');
  console.log(`  source ${status.rcFile}`);
  console.log('');
  console.log('Or restart your terminal.');

  return true;
}

/**
 * Uninstall shell integration
 */
function shellUninstall() {
  const status = shellStatus();

  if (!status.installed) {
    console.log('Shell integration is not installed.');
    return true;
  }

  if (!fs.existsSync(status.rcFile)) {
    console.log('RC file not found:', status.rcFile);
    return false;
  }

  let content = fs.readFileSync(status.rcFile, 'utf8');

  // Remove the integration block (with markers)
  const markerRegex = new RegExp(
    `\\n?${MARKER_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${MARKER_END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\n?`,
    'g'
  );
  content = content.replace(markerRegex, '\n');

  // Also remove any standalone source lines for coder-config.zsh
  content = content.replace(/\n?.*source.*coder-config\.zsh.*\n?/g, '\n');

  // Clean up multiple blank lines
  content = content.replace(/\n{3,}/g, '\n\n');

  fs.writeFileSync(status.rcFile, content);

  console.log('✓ Shell integration removed');
  console.log('');
  console.log(`  RC file: ${status.rcFile}`);
  console.log('');
  console.log('To apply, restart your terminal or run:');
  console.log(`  source ${status.rcFile}`);

  return true;
}

/**
 * Print shell status
 */
function printShellStatus() {
  const status = shellStatus();

  console.log(`Shell: ${status.shell}`);
  console.log(`RC file: ${status.rcFile}`);
  console.log(`Script: ${status.scriptPath}`);
  console.log(`Script exists: ${status.scriptExists ? 'yes' : 'no'}`);
  console.log(`Installed: ${status.installed ? 'yes' : 'no'}`);

  if (!status.installed) {
    console.log('');
    console.log('To install, run:');
    console.log('  coder-config shell install');
  }
}

module.exports = {
  shellStatus,
  shellInstall,
  shellUninstall,
  printShellStatus,
  getShellConfigPath,
  getShellScriptPath,
};
