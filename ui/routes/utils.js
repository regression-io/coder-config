/**
 * Shared route utilities
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

/**
 * Get the full path to the claude binary.
 * Needed because daemon processes may not have full PATH.
 * Only used for plugin management commands (install, uninstall, marketplace)
 * that the Agent SDK does not expose.
 */
function getClaudePath() {
  const candidates = [
    path.join(os.homedir(), '.local', 'bin', 'claude'),
    '/usr/local/bin/claude',
    '/opt/homebrew/bin/claude',
    path.join(os.homedir(), '.npm-global', 'bin', 'claude'),
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }

  try {
    const resolved = execFileSync('which', ['claude'], { encoding: 'utf8' }).trim();
    if (resolved && fs.existsSync(resolved)) return resolved;
  } catch (e) {}

  return 'claude';
}

/**
 * Path to the bundled ralph-loop skill directory.
 * Passed to Agent SDK as plugins: [{ type: 'local', path: RALPH_LOOP_SKILL_DIR }]
 */
const RALPH_LOOP_SKILL_DIR = path.join(__dirname, '..', '..', 'skills');

module.exports = { getClaudePath, RALPH_LOOP_SKILL_DIR };
