/**
 * Statuslines Routes
 *
 * Claude Code's statusLine feature sends JSON session data to a script via stdin.
 * Scripts parse it with jq and print text for the status bar.
 *
 * Settings format in ~/.claude/settings.json:
 *   { "statusLine": { "type": "command", "command": "~/.claude/statuslines/<id>.sh" } }
 *
 * JSON fields available: model.display_name, context_window.used_percentage,
 *   context_window.context_window_size, context_window.current_usage.*,
 *   cost.total_cost_usd, cost.total_duration_ms, cost.total_lines_added,
 *   cost.total_lines_removed, workspace.current_dir, session_id, version
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const STATUSLINES_DIR = path.join(os.homedir(), '.claude', 'statuslines');

// ---------------------------------------------------------------------------
// Script templates
// ---------------------------------------------------------------------------

const SCRIPTS = {
  minimal: `#!/bin/bash
# Minimal: model name and context percentage
input=$(cat)
MODEL=$(echo "$input" | jq -r '.model.display_name // "?"')
PCT=$(echo "$input" | jq -r '.context_window.used_percentage // 0' | cut -d. -f1)
echo "* $MODEL  ${PCT}% ctx"
`,

  'context-bar': `#!/bin/bash
# Context Bar: model with dot-gauge context usage
input=$(cat)
MODEL=$(echo "$input" | jq -r '.model.display_name // "?"')
PCT=$(echo "$input" | jq -r '.context_window.used_percentage // 0' | cut -d. -f1)
FILLED=$((PCT / 10)); EMPTY=$((10 - FILLED))
BAR=""; for ((i=0; i<FILLED; i++)); do BAR="${BAR}●"; done
         for ((i=0; i<EMPTY;  i++)); do BAR="${BAR}○"; done
echo "* $MODEL  ctx $BAR  ${PCT}%"
`,

  'git-context': `#!/bin/bash
# Git + Context: model, context bar, git branch, lines changed
input=$(cat)
MODEL=$(echo "$input" | jq -r '.model.display_name // "?"')
PCT=$(echo "$input" | jq -r '.context_window.used_percentage // 0' | cut -d. -f1)
LINES_ADD=$(echo "$input" | jq -r '.cost.total_lines_added // 0')
LINES_REM=$(echo "$input" | jq -r '.cost.total_lines_removed // 0')
FILLED=$((PCT / 10)); EMPTY=$((10 - FILLED))
BAR=""; for ((i=0; i<FILLED; i++)); do BAR="${BAR}●"; done
         for ((i=0; i<EMPTY;  i++)); do BAR="${BAR}○"; done
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '')
OUT="* $MODEL  |  ctx $BAR  ${PCT}%"
[ -n "$BRANCH" ] && OUT="$OUT  |  $BRANCH"
[ "$LINES_ADD" != "0" ] || [ "$LINES_REM" != "0" ] && OUT="$OUT  |  +${LINES_ADD} -${LINES_REM}"
echo "$OUT"
`,

  full: `#!/bin/bash
# Full: model, context with token counts, lines changed, git branch, duration, cost
input=$(cat)
MODEL=$(echo "$input" | jq -r '.model.display_name // "?"')
PCT=$(echo "$input" | jq -r '.context_window.used_percentage // 0' | cut -d. -f1)
CTX_USED=$(echo "$input" | jq -r '((.context_window.current_usage.input_tokens // 0) + (.context_window.current_usage.cache_creation_input_tokens // 0) + (.context_window.current_usage.cache_read_input_tokens // 0))')
CTX_MAX=$(echo "$input" | jq -r '.context_window.context_window_size // 200000')
LINES_ADD=$(echo "$input" | jq -r '.cost.total_lines_added // 0')
LINES_REM=$(echo "$input" | jq -r '.cost.total_lines_removed // 0')
DUR_MS=$(echo "$input" | jq -r '.cost.total_duration_ms // 0')
COST=$(echo "$input" | jq -r '.cost.total_cost_usd // 0')

FILLED=$((PCT / 10)); EMPTY=$((10 - FILLED))
BAR=""; for ((i=0; i<FILLED; i++)); do BAR="${BAR}●"; done
         for ((i=0; i<EMPTY;  i++)); do BAR="${BAR}○"; done

CTX_K=$(awk "BEGIN {printf \\"%.1fK\\", $CTX_USED/1000}")
MAX_K=$(awk "BEGIN {printf \\"%.1fK\\", $CTX_MAX/1000}")
HOURS=$((DUR_MS / 3600000)); MINS=$(((DUR_MS % 3600000) / 60000))
COST_FMT=$(printf '\$%.3f' $COST)
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '')

OUT="* $MODEL  |  ctx $BAR  ${CTX_K}/${MAX_K}"
[ "$LINES_ADD" != "0" ] || [ "$LINES_REM" != "0" ] && OUT="$OUT  |  +${LINES_ADD} -${LINES_REM}"
[ -n "$BRANCH" ] && OUT="$OUT  |  $BRANCH"
[ "$HOURS" -gt 0 ] && OUT="$OUT  |  ${HOURS}h ${MINS}m" || OUT="$OUT  |  ${MINS}m"
OUT="$OUT  |  $COST_FMT"
echo "$OUT"
`,

  'cost-tracker': `#!/bin/bash
# Cost Tracker: model, session cost, duration
input=$(cat)
MODEL=$(echo "$input" | jq -r '.model.display_name // "?"')
COST=$(echo "$input" | jq -r '.cost.total_cost_usd // 0')
DUR_MS=$(echo "$input" | jq -r '.cost.total_duration_ms // 0')
COST_FMT=$(printf '\$%.3f' $COST)
MINS=$((DUR_MS / 60000)); SECS=$(((DUR_MS % 60000) / 1000))
echo "* $MODEL  |  $COST_FMT  |  ${MINS}m ${SECS}s"
`,

  multiline: `#!/bin/bash
# Multiline: line 1 = model + git, line 2 = color context bar + cost
input=$(cat)
MODEL=$(echo "$input" | jq -r '.model.display_name // "?"')
PCT=$(echo "$input" | jq -r '.context_window.used_percentage // 0' | cut -d. -f1)
COST=$(echo "$input" | jq -r '.cost.total_cost_usd // 0')
DUR_MS=$(echo "$input" | jq -r '.cost.total_duration_ms // 0')

GREEN='\\033[32m'; YELLOW='\\033[33m'; RED='\\033[31m'
CYAN='\\033[36m'; RESET='\\033[0m'
[ "$PCT" -ge 90 ] && BAR_COLOR="$RED" || { [ "$PCT" -ge 70 ] && BAR_COLOR="$YELLOW" || BAR_COLOR="$GREEN"; }

FILLED=$((PCT / 10)); EMPTY=$((10 - FILLED))
BAR=""; for ((i=0; i<FILLED; i++)); do BAR="${BAR}█"; done
         for ((i=0; i<EMPTY;  i++)); do BAR="${BAR}░"; done

MINS=$((DUR_MS / 60000)); SECS=$(((DUR_MS % 60000) / 1000))
COST_FMT=$(printf '\$%.3f' $COST)
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '')
[ -n "$BRANCH" ] && BRANCH_STR="  |  $BRANCH" || BRANCH_STR=""

echo -e "${CYAN}* $MODEL${RESET}${BRANCH_STR}"
echo -e "${BAR_COLOR}${BAR}${RESET}  ${PCT}%  |  ${YELLOW}${COST_FMT}${RESET}  |  ${MINS}m ${SECS}s"
`,
};

// ---------------------------------------------------------------------------
// Preset metadata (no script content here — see SCRIPTS above)
// ---------------------------------------------------------------------------

const PRESETS = [
  {
    id: 'disabled',
    name: 'Disabled',
    description: 'No status bar shown',
    preview: '',
    category: 'Built-in',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Model name and context percentage',
    preview: '* opus-4-6  37% ctx',
    category: 'Simple',
  },
  {
    id: 'context-bar',
    name: 'Context Bar',
    description: 'Model with a ●○ dot gauge showing context usage',
    preview: '* opus-4-6  ctx ●●●●○○○○○○  37%',
    category: 'Simple',
  },
  {
    id: 'git-context',
    name: 'Git + Context',
    description: 'Model, context bar, git branch, and lines changed this session',
    preview: '* opus-4-6  |  ctx ●●●●○○○○○○  37%  |  main  |  +146 -13',
    category: 'Git',
  },
  {
    id: 'full',
    name: 'Full',
    description: 'Everything: model, context with token counts, lines, branch, duration, cost',
    preview: '* opus-4-6  |  ctx ●●●●○○○○○○  74.4K/200.0K  |  +146 -13  |  main  |  5h 2m  |  $0.142',
    category: 'Git',
  },
  {
    id: 'cost-tracker',
    name: 'Cost Tracker',
    description: 'Model, total session cost, and elapsed time',
    preview: '* opus-4-6  |  $0.142  |  32m 15s',
    category: 'Cost',
  },
  {
    id: 'multiline',
    name: 'Multiline',
    description: 'Two rows: model + branch on top, color-coded context bar + cost below',
    preview: '* opus-4-6  |  main\n█████░░░░░  37%  |  $0.142  |  32m 15s',
    category: 'Cost',
  },
  {
    id: 'custom',
    name: 'Custom Script',
    description: 'Write your own bash script — receives Claude Code JSON via stdin',
    preview: null,
    category: 'Custom',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function scriptPath(presetId) {
  return path.join(STATUSLINES_DIR, `${presetId}.sh`);
}

function expandHome(p) {
  return p.replace(/^~/, os.homedir());
}

function settingsPath() {
  return path.join(os.homedir(), '.claude', 'settings.json');
}

function readSettings() {
  const p = settingsPath();
  if (!fs.existsSync(p)) return {};
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return {}; }
}

function writeSettings(settings) {
  const p = settingsPath();
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(p, JSON.stringify(settings, null, 2) + '\n', 'utf8');
}

function ensureScriptDir() {
  if (!fs.existsSync(STATUSLINES_DIR)) fs.mkdirSync(STATUSLINES_DIR, { recursive: true });
}

function writeScript(presetId, content) {
  ensureScriptDir();
  const p = scriptPath(presetId);
  fs.writeFileSync(p, content, 'utf8');
  fs.chmodSync(p, 0o755);
  return p;
}

function commandPathInSettings(settings) {
  return settings?.statusLine?.command || null;
}

function matchPresetFromCommand(cmd) {
  if (!cmd) return 'disabled';
  // Match against known script paths
  for (const preset of PRESETS) {
    if (preset.id === 'disabled' || preset.id === 'custom') continue;
    const expected = scriptPath(preset.id);
    const expectedHome = expected.replace(os.homedir(), '~');
    if (cmd === expected || cmd === expectedHome) return preset.id;
  }
  return 'custom';
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

function getStatuslinePresets() {
  return { presets: PRESETS };
}

function getCurrentStatusline() {
  const settings = readSettings();
  const cmd = commandPathInSettings(settings);
  const presetId = matchPresetFromCommand(cmd);

  // For custom, also return the current script content
  let scriptContent = '';
  if (presetId === 'custom' && cmd) {
    const resolved = expandHome(cmd);
    if (fs.existsSync(resolved)) {
      scriptContent = fs.readFileSync(resolved, 'utf8');
    }
  }

  return { command: cmd || '', presetId, scriptContent };
}

/**
 * Apply a preset or custom script.
 * body: { presetId: string, scriptContent?: string }
 */
function setStatusline(body) {
  const { presetId, scriptContent } = body;

  try {
    const settings = readSettings();

    if (presetId === 'disabled') {
      delete settings.statusLine;
      writeSettings(settings);
      return { success: true, presetId: 'disabled', command: '' };
    }

    let cmd;

    if (presetId === 'custom') {
      if (!scriptContent) return { success: false, error: 'scriptContent required for custom preset' };
      cmd = writeScript('custom', scriptContent);
    } else {
      const template = SCRIPTS[presetId];
      if (!template) return { success: false, error: `Unknown preset: ${presetId}` };
      cmd = writeScript(presetId, template);
    }

    settings.statusLine = { type: 'command', command: cmd };
    writeSettings(settings);

    return { success: true, presetId, command: cmd };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

module.exports = {
  getStatuslinePresets,
  getCurrentStatusline,
  setStatusline,
};
