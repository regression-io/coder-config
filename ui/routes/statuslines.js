/**
 * Statuslines Routes - Library of Claude Code statusCommand presets
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Preset statusline library.
 * Each preset's `command` is set as `statusCommand` in ~/.claude/settings.json.
 * Empty command string = remove statusCommand (use Claude Code built-in).
 */
const PRESETS = [
  {
    id: 'default',
    name: 'Claude Code Default',
    description: 'Built-in statusline from Claude Code (model, context, git, cost)',
    preview: '* opus-4-6  |  ctx ●●●●○○○○○○ 74.4K/200.0K  |  +146 -13  |  main  |  5h 7%  |  7d 11% • 6d left',
    command: '',
    category: 'Built-in',
  },
  {
    id: 'git-branch',
    name: 'Git Branch',
    description: 'Shows current branch and dirty file count',
    preview: ' main  2 changed',
    command: "branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null) && dirty=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ') && echo \"${branch}  ${dirty} changed\"",
    category: 'Git',
  },
  {
    id: 'git-extended',
    name: 'Git Extended',
    description: 'Branch, staged/unstaged counts, and last commit message',
    preview: ' main  +3 ~1  "fix: auth bug"',
    command: "branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?') && staged=$(git diff --cached --name-only 2>/dev/null | wc -l | tr -d ' ') && unstaged=$(git diff --name-only 2>/dev/null | wc -l | tr -d ' ') && msg=$(git log -1 --pretty=%s 2>/dev/null | cut -c1-40) && echo \" ${branch}  +${staged} ~${unstaged}  \\\"${msg}\\\"\"",
    category: 'Git',
  },
  {
    id: 'git-sync',
    name: 'Git Sync Status',
    description: 'Branch with ahead/behind counts relative to remote',
    preview: ' main ↑2 ↓0',
    command: "branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?') && ahead=$(git rev-list --count @{u}..HEAD 2>/dev/null || echo 0) && behind=$(git rev-list --count HEAD..@{u} 2>/dev/null || echo 0) && echo \" ${branch} ↑${ahead} ↓${behind}\"",
    category: 'Git',
  },
  {
    id: 'project-context',
    name: 'Project Context',
    description: 'Repo name, branch, and uncommitted file count',
    preview: 'coder-config  main  3 pending',
    command: "repo=$(basename $(git rev-parse --show-toplevel 2>/dev/null) 2>/dev/null || basename $PWD) && branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '') && count=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ') && echo \"${repo}  ${branch}  ${count} pending\"",
    category: 'Git',
  },
  {
    id: 'clock',
    name: 'Clock',
    description: 'Current time (HH:MM)',
    preview: ' 14:32',
    command: "date +'  %H:%M'",
    category: 'System',
  },
  {
    id: 'datetime',
    name: 'Date & Time',
    description: 'Full date and time',
    preview: ' Mon Mar 04  14:32',
    command: "date +'  %a %b %d  %H:%M'",
    category: 'System',
  },
  {
    id: 'system-load',
    name: 'System Load',
    description: 'CPU load average and memory usage',
    preview: ' load 1.2  mem 8.4G/16G',
    command: "load=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | tr -d ',') && mem=$(vm_stat 2>/dev/null | awk '/Pages free/{free=$3} /Pages active/{active=$3} /Pages inactive/{inact=$3} END{total=(free+active+inact)*4096/1073741824; used=active*4096/1073741824; printf \"%.1fG/%.1fG\", used, total}' 2>/dev/null || echo '?') && echo \" load ${load}  mem ${mem}\"",
    category: 'System',
  },
  {
    id: 'git-clock',
    name: 'Git + Clock',
    description: 'Branch and current time',
    preview: ' main   14:32',
    command: "branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '') && echo \" ${branch}   $(date +'%H:%M')\"",
    category: 'Combo',
  },
  {
    id: 'git-project-clock',
    name: 'Git + Project + Clock',
    description: 'Repo name, branch with diff stats, and time',
    preview: 'coder-config  main +3 ~1   14:32',
    command: "repo=$(basename $(git rev-parse --show-toplevel 2>/dev/null) 2>/dev/null || basename $PWD) && branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '') && added=$(git diff --stat HEAD 2>/dev/null | grep -E '^.*\\+' | tail -1 | grep -o '[0-9]* insertion' | grep -o '[0-9]*' || echo 0) && deleted=$(git diff --stat HEAD 2>/dev/null | grep -E 'deletion' | tail -1 | grep -o '[0-9]* deletion' | grep -o '[0-9]*' || echo 0) && echo \"${repo}  ${branch} +${added} ~${deleted}   $(date +'%H:%M')\"",
    category: 'Combo',
  },
  {
    id: 'minimal-branch',
    name: 'Minimal',
    description: 'Just the git branch, nothing else',
    preview: 'main',
    command: "git rev-parse --abbrev-ref HEAD 2>/dev/null || echo ''",
    category: 'Minimal',
  },
  {
    id: 'custom',
    name: 'Custom',
    description: 'Write your own shell command',
    preview: '(your output here)',
    command: null, // null = user-defined
    category: 'Custom',
  },
];

/**
 * Returns the full preset library
 */
function getStatuslinePresets() {
  return { presets: PRESETS };
}

/**
 * Reads current statusCommand from ~/.claude/settings.json
 */
function getCurrentStatusline() {
  const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');

  try {
    if (!fs.existsSync(settingsPath)) {
      return { command: '', presetId: 'default' };
    }
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    const command = settings.statusCommand || '';
    const matched = PRESETS.find(p => p.command !== null && p.command === command);
    return {
      command,
      presetId: matched ? matched.id : (command ? 'custom' : 'default'),
    };
  } catch (e) {
    return { command: '', presetId: 'default', error: e.message };
  }
}

/**
 * Saves statusCommand to ~/.claude/settings.json.
 * Pass command='' to remove (revert to Claude Code built-in).
 */
function setStatusline(body) {
  const { command } = body;
  const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');

  try {
    const claudeDir = path.dirname(settingsPath);
    if (!fs.existsSync(claudeDir)) {
      fs.mkdirSync(claudeDir, { recursive: true });
    }

    let settings = {};
    if (fs.existsSync(settingsPath)) {
      try {
        settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      } catch (e) {
        settings = {};
      }
    }

    if (command === '' || command == null) {
      delete settings.statusCommand;
    } else {
      settings.statusCommand = command;
    }

    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf8');

    const matched = PRESETS.find(p => p.command !== null && p.command === (command || ''));
    return {
      success: true,
      command: command || '',
      presetId: matched ? matched.id : (command ? 'custom' : 'default'),
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

module.exports = {
  getStatuslinePresets,
  getCurrentStatusline,
  setStatusline,
};
