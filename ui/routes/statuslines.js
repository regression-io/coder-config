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
echo "* $MODEL  $PCT% ctx"
`,

  'context-bar': `#!/bin/bash
# Context Bar: model with dot-gauge context usage
input=$(cat)
MODEL=$(echo "$input" | jq -r '.model.display_name // "?"')
PCT=$(echo "$input" | jq -r '.context_window.used_percentage // 0' | cut -d. -f1)
FILLED=$((PCT / 10)); EMPTY=$((10 - FILLED))
BAR=""; [ "$FILLED" -gt 0 ] && BAR="$BAR$(printf '●%.0s' $(seq 1 $FILLED))"
        [ "$EMPTY" -gt 0 ]  && BAR="$BAR$(printf '○%.0s' $(seq 1 $EMPTY))"
echo "* $MODEL  ctx $BAR  $PCT%"
`,

  'git-context': `#!/bin/bash
# Git + Context: model, context bar, git branch, lines changed
input=$(cat)
MODEL=$(echo "$input" | jq -r '.model.display_name // "?"')
PCT=$(echo "$input" | jq -r '.context_window.used_percentage // 0' | cut -d. -f1)
LINES_ADD=$(echo "$input" | jq -r '.cost.total_lines_added // 0')
LINES_REM=$(echo "$input" | jq -r '.cost.total_lines_removed // 0')
FILLED=$((PCT / 10)); EMPTY=$((10 - FILLED))
BAR=""; [ "$FILLED" -gt 0 ] && BAR="$BAR$(printf '●%.0s' $(seq 1 $FILLED))"
        [ "$EMPTY" -gt 0 ]  && BAR="$BAR$(printf '○%.0s' $(seq 1 $EMPTY))"
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '')
OUT="* $MODEL  |  ctx $BAR  $PCT%"
[ -n "$BRANCH" ] && OUT="$OUT  |  $BRANCH"
[ "$LINES_ADD" != "0" ] || [ "$LINES_REM" != "0" ] && OUT="$OUT  |  +$LINES_ADD -$LINES_REM"
echo "$OUT"
`,

  full: `#!/bin/bash
# Full: model, context bar, 5H/7D rate-limit bars, lines, branch, cost, workstream
input=$(cat)
MODEL=$(echo "$input" | jq -r '.model.display_name // "?"')
MODEL_SHORT=$(echo "$MODEL" | cut -c1-12)
[ "\${#MODEL}" -gt 12 ] && MODEL_SHORT="\${MODEL_SHORT}…"
PCT=$(echo "$input" | jq -r '.context_window.used_percentage // 0' | cut -d. -f1)
CTX_USED=$(echo "$input" | jq -r '((.context_window.current_usage.input_tokens // 0) + (.context_window.current_usage.cache_creation_input_tokens // 0) + (.context_window.current_usage.cache_read_input_tokens // 0))')
CTX_MAX=$(echo "$input" | jq -r '.context_window.context_window_size // 200000')
LINES_ADD=$(echo "$input" | jq -r '.cost.total_lines_added // 0')
LINES_REM=$(echo "$input" | jq -r '.cost.total_lines_removed // 0')
COST=$(echo "$input" | jq -r '.cost.total_cost_usd // 0')
RL_5H_PCT=$(echo "$input" | jq -r '.rate_limits.five_hour.used_percentage // empty' | cut -d. -f1)
RL_5H_RESET=$(echo "$input" | jq -r '.rate_limits.five_hour.resets_at // empty')
RL_7D_PCT=$(echo "$input" | jq -r '.rate_limits.seven_day.used_percentage // empty' | cut -d. -f1)

GREEN='\\033[32m'; YELLOW='\\033[33m'; RED='\\033[31m'
CYAN='\\033[36m'; DIM='\\033[2m'; RESET='\\033[0m'
[ "$PCT" -ge 90 ] && BAR_COLOR="$RED" || { [ "$PCT" -ge 70 ] && BAR_COLOR="$YELLOW" || BAR_COLOR="$GREEN"; }

FILLED=$((PCT / 10)); EMPTY=$((10 - FILLED))
BAR=""; [ "$FILLED" -gt 0 ] && BAR="$BAR$(printf '●%.0s' $(seq 1 $FILLED))"
        [ "$EMPTY" -gt 0 ]  && BAR="$BAR$(printf '○%.0s' $(seq 1 $EMPTY))"

make_block_bar() {
    local pct=\$1 color=\$2 width=8
    [ -z "\$pct" ] && pct=0
    local filled=\$((pct * width / 100))
    [ "\$filled" -gt "\$width" ] && filled=\$width
    [ "\$filled" -eq 0 ] && [ "\$pct" -gt 0 ] && filled=1
    local empty=\$((width - filled))
    local out=""
    [ "\$filled" -gt 0 ] && out="\${color}\$(printf '▰%.0s' \$(seq 1 \$filled))\${RESET}"
    [ "\$empty"  -gt 0 ] && out="\$out\${DIM}\$(printf '▰%.0s' \$(seq 1 \$empty))\${RESET}"
    printf '%s' "\$out"
}
time_until_hm() {
    local resets=\$1
    local now; now=\$(date +%s)
    local diff=\$((resets - now))
    [ "\$diff" -lt 0 ] && diff=0
    local h=\$((diff / 3600))
    local m=\$(((diff % 3600) / 60))
    printf '%dH %dM' "\$h" "\$m"
}
rl_color() {
    local pct=\$1
    [ -z "\$pct" ] && { printf '%s' "$GREEN"; return; }
    if [ "\$pct" -ge 90 ]; then printf '%s' "$RED"
    elif [ "\$pct" -ge 70 ]; then printf '%s' "$YELLOW"
    else printf '%s' "$GREEN"; fi
}

fmt_tokens() {
    local n=\$1
    if [ "\$n" -ge 1000000 ]; then
        awk "BEGIN {v=\$n/1000000; if (v == int(v)) printf \\"%dM\\", v; else printf \\"%.1fM\\", v}"
    else
        local k=\$(( (n + 500) / 1000 ))
        if [ "\$k" -ge 1000 ]; then
            awk "BEGIN {v=\$k/1000; if (v == int(v)) printf \\"%dM\\", v; else printf \\"%.1fM\\", v}"
        else
            printf '%dK' "\$k"
        fi
    fi
}
CTX_K=$(fmt_tokens $CTX_USED)
MAX_K=$(fmt_tokens $CTX_MAX)
COST_FMT=$(printf '$%.3f' $COST)
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '')

WS_TAG=""
if [ -n "$CODER_WORKSTREAM" ]; then
  case "$CODER_WORKSTREAM_COLOR" in
    red)    WS_COLOR='\\033[38;5;203m' ;;
    orange) WS_COLOR='\\033[38;5;208m' ;;
    yellow) WS_COLOR='\\033[38;5;221m' ;;
    green)  WS_COLOR='\\033[38;5;120m' ;;
    cyan)   WS_COLOR='\\033[38;5;87m'  ;;
    blue)   WS_COLOR='\\033[38;5;111m' ;;
    purple) WS_COLOR='\\033[38;5;177m' ;;
    pink)   WS_COLOR='\\033[38;5;213m' ;;
    gray)   WS_COLOR='\\033[38;5;245m' ;;
    *)      WS_COLOR="$CYAN" ;;
  esac
  WS_TAG=" | \${WS_COLOR}◆ \${CODER_WORKSTREAM}\${RESET}"
fi

OUT="\${CYAN}\${MODEL_SHORT}\${RESET} \${BAR_COLOR}\${BAR}\${RESET} \${DIM}\${CTX_K}/\${MAX_K}\${RESET} (\${PCT}%)"

if [ -n "$RL_5H_PCT" ]; then
    C5=$(rl_color "$RL_5H_PCT")
    B5=$(make_block_bar "$RL_5H_PCT" "$C5")
    OUT="$OUT | \${DIM}5H:\${RESET} \${B5} \${RL_5H_PCT}%"
    [ -n "$RL_5H_RESET" ] && OUT="$OUT \${DIM}$(time_until_hm "$RL_5H_RESET")\${RESET}"
fi
if [ -n "$RL_7D_PCT" ]; then
    C7=$(rl_color "$RL_7D_PCT")
    B7=$(make_block_bar "$RL_7D_PCT" "$C7")
    OUT="$OUT | \${DIM}7D:\${RESET} \${B7} \${RL_7D_PCT}%"
fi

[ "$LINES_ADD" != "0" ] || [ "$LINES_REM" != "0" ] && OUT="$OUT | \${GREEN}+\${LINES_ADD}\${RESET} \${RED}-\${LINES_REM}\${RESET}"
[ -n "$BRANCH" ] && OUT="$OUT | \${CYAN}\${BRANCH}\${RESET}"
OUT="$OUT | \${YELLOW}\${COST_FMT}\${RESET}\${WS_TAG}"
echo -e "$OUT"
`,

  classic: `#!/bin/bash
# Classic: model, colored context bar, token counts, lines, branch, duration, cost, workstream
input=$(cat)
MODEL=$(echo "$input" | jq -r '.model.display_name // "?"')
PCT=$(echo "$input" | jq -r '.context_window.used_percentage // 0' | cut -d. -f1)
REM=$(echo "$input" | jq -r '.context_window.remaining_percentage // 0' | cut -d. -f1)
CTX_USED=$(echo "$input" | jq -r '((.context_window.current_usage.input_tokens // 0) + (.context_window.current_usage.cache_creation_input_tokens // 0) + (.context_window.current_usage.cache_read_input_tokens // 0))')
CTX_MAX=$(echo "$input" | jq -r '.context_window.context_window_size // 200000')
LINES_ADD=$(echo "$input" | jq -r '.cost.total_lines_added // 0')
LINES_REM=$(echo "$input" | jq -r '.cost.total_lines_removed // 0')
DUR_MS=$(echo "$input" | jq -r '.cost.total_duration_ms // 0')
COST=$(echo "$input" | jq -r '.cost.total_cost_usd // 0')

GREEN='\\033[32m'; YELLOW='\\033[33m'; RED='\\033[31m'
CYAN='\\033[36m'; DIM='\\033[2m'; RESET='\\033[0m'
[ "$PCT" -ge 90 ] && BAR_COLOR="$RED" || { [ "$PCT" -ge 70 ] && BAR_COLOR="$YELLOW" || BAR_COLOR="$GREEN"; }

FILLED=$((PCT / 10)); EMPTY=$((10 - FILLED))
BAR=""; [ "$FILLED" -gt 0 ] && BAR="$BAR$(printf '●%.0s' $(seq 1 $FILLED))"
        [ "$EMPTY" -gt 0 ]  && BAR="$BAR$(printf '○%.0s' $(seq 1 $EMPTY))"

CTX_K=$(awk "BEGIN {printf \\"%.1fK\\", $CTX_USED/1000}")
MAX_K=$(awk "BEGIN {printf \\"%.1fK\\", $CTX_MAX/1000}")
HOURS=$((DUR_MS / 3600000)); MINS=$(((DUR_MS % 3600000) / 60000))
COST_FMT=$(printf '$%.3f' $COST)
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '')

WS_TAG=""
if [ -n "$CODER_WORKSTREAM" ]; then
  case "$CODER_WORKSTREAM_COLOR" in
    red)    WS_COLOR='\\033[38;5;203m' ;;
    orange) WS_COLOR='\\033[38;5;208m' ;;
    yellow) WS_COLOR='\\033[38;5;221m' ;;
    green)  WS_COLOR='\\033[38;5;120m' ;;
    cyan)   WS_COLOR='\\033[38;5;87m'  ;;
    blue)   WS_COLOR='\\033[38;5;111m' ;;
    purple) WS_COLOR='\\033[38;5;177m' ;;
    pink)   WS_COLOR='\\033[38;5;213m' ;;
    gray)   WS_COLOR='\\033[38;5;245m' ;;
    *)      WS_COLOR="$CYAN" ;;
  esac
  WS_TAG=" | \${WS_COLOR}◆ \${CODER_WORKSTREAM}\${RESET}"
fi

OUT="\${CYAN}*\${RESET} $MODEL | \${BAR_COLOR}\${BAR}\${RESET} \${DIM}\${CTX_K}/\${MAX_K}\${RESET} | \${REM}% left"
[ "$LINES_ADD" != "0" ] || [ "$LINES_REM" != "0" ] && OUT="$OUT | \${GREEN}+\${LINES_ADD}\${RESET} \${RED}-\${LINES_REM}\${RESET}"
[ -n "$BRANCH" ] && OUT="$OUT | \${CYAN}\${BRANCH}\${RESET}"
[ "$HOURS" -gt 0 ] && OUT="$OUT | \${HOURS}h \${MINS}m" || OUT="$OUT | \${MINS}m"
OUT="$OUT | \${YELLOW}\${COST_FMT}\${RESET}\${WS_TAG}"
echo -e "$OUT"
`,

  'cost-tracker': `#!/bin/bash
# Cost Tracker: model, session cost, duration
input=$(cat)
MODEL=$(echo "$input" | jq -r '.model.display_name // "?"')
COST=$(echo "$input" | jq -r '.cost.total_cost_usd // 0')
DUR_MS=$(echo "$input" | jq -r '.cost.total_duration_ms // 0')
COST_FMT=$(printf '$%.3f' $COST)
MINS=$((DUR_MS / 60000)); SECS=$(((DUR_MS % 60000) / 1000))
echo "* $MODEL  |  $COST_FMT  |  \${MINS}m \${SECS}s"
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
BAR=""; [ "$FILLED" -gt 0 ] && BAR="$BAR$(printf '█%.0s' $(seq 1 $FILLED))"
        [ "$EMPTY" -gt 0 ]  && BAR="$BAR$(printf '░%.0s' $(seq 1 $EMPTY))"

MINS=$((DUR_MS / 60000)); SECS=$(((DUR_MS % 60000) / 1000))
COST_FMT=$(printf '$%.3f' $COST)
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '')
[ -n "$BRANCH" ] && BRANCH_STR="  |  $BRANCH" || BRANCH_STR=""

echo -e "$CYAN* $MODEL$RESET$BRANCH_STR"
echo -e "$BAR_COLOR$BAR$RESET  $PCT%  |  $YELLOW$COST_FMT$RESET  |  \${MINS}m \${SECS}s"
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
    description: 'Model, context bar, 5H/7D rate-limit bars with reset timers, lines, branch, cost, workstream',
    preview: 'Opus 4.7 ●●●○○○○○○○ 74K/1M (37%) | 5H: ▰▰▰▰▰▰▰▰ 42% 2H 29M | 7D: ▰▰▰▰▰▰▰▰ 15% | +146 -13 | main | $0.142',
    category: 'Git',
  },
  {
    id: 'classic',
    name: 'Classic',
    description: 'Original full layout: model, context bar, token counts, lines, branch, duration, cost, workstream',
    preview: '* Opus 4.7 | ●●●●○○○○○○ 74.4K/200.0K | 63% left | +146 -13 | main | 5h 2m | $0.142 | ◆ coder-config',
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
  // Backup any existing script before overwriting (timestamped, never collides).
  if (fs.existsSync(p)) {
    const existing = fs.readFileSync(p, 'utf8');
    if (existing !== content) {
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      fs.writeFileSync(`${p}.${ts}.bak`, existing, 'utf8');
    }
  }
  fs.writeFileSync(p, content, 'utf8');
  fs.chmodSync(p, 0o755);
  // Track this exact content as a "known shipped version" so future
  // auto-migrations can tell user edits apart from old templates.
  recordShippedHash(presetId, content);
  return p;
}

// ---------------------------------------------------------------------------
// Auto-migration: refresh installed preset scripts when the bundled template
// changes between versions, but only if the on-disk script matches one of the
// previously-shipped versions (i.e. the user hasn't customized it).
// ---------------------------------------------------------------------------

const SHIPPED_HASHES_FILE = path.join(STATUSLINES_DIR, '.shipped-hashes.json');

// Historical content hashes for each preset, seeded so users who installed a
// preset before the hash-tracking system was added still get auto-migrated.
// Append (never edit) when a preset's bundled template changes.
const LEGACY_HASHES = {
  full: [
    '0ac48c7d993dd0c6e49b1f537934e418a5e65b0838afc587bafde31cc45877da', // pre-2026-04 model+duration variant
  ],
  minimal: ['d818c74b391732f5aae948fbc9c154b6cba8e56952a1727d3dfa78602823c601'],
  'context-bar': ['643bf0f54baa70ec72d85f8800dee24712c31eae8b6b0030e597d0c1e4ed0ae0'],
  'git-context': ['b186ea21e4d14fb905f8682e5dfe7b3b2050a93b7801226002052aaa7bafd451'],
  'cost-tracker': ['83364c860744a6cf7fb5f07b061ae13a1919fc7e72f35597dd383e2de3371895'],
  multiline: ['49939b21f4691171bcfbe5c0ca252bcf9ffb772f335a14712bb9beccf67920b9'],
};

function sha256(s) {
  return require('crypto').createHash('sha256').update(s).digest('hex');
}

function loadShippedHashes() {
  if (!fs.existsSync(SHIPPED_HASHES_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(SHIPPED_HASHES_FILE, 'utf8')); } catch { return {}; }
}

function saveShippedHashes(data) {
  ensureScriptDir();
  fs.writeFileSync(SHIPPED_HASHES_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function recordShippedHash(presetId, content) {
  const data = loadShippedHashes();
  const list = data[presetId] || [];
  const h = sha256(content);
  if (!list.includes(h)) {
    list.push(h);
    data[presetId] = list;
    try { saveShippedHashes(data); } catch {}
  }
}

/**
 * Run on server startup. For each preset whose script is installed AND whose
 * settings.json points at it, refresh the file from the latest bundled template
 * if the on-disk hash matches a previously-shipped version. User-edited scripts
 * (unknown hash) are left alone.
 */
function autoMigratePresets() {
  try {
    const settings = readSettings();
    const cmd = commandPathInSettings(settings);
    if (!cmd) return;
    const presetId = matchPresetFromCommand(cmd);
    if (presetId === 'disabled' || presetId === 'custom') return;

    const latest = SCRIPTS[presetId];
    if (!latest) return;
    const p = scriptPath(presetId);
    if (!fs.existsSync(p)) return;

    const onDisk = fs.readFileSync(p, 'utf8');
    if (onDisk === latest) {
      // Already up-to-date — make sure its hash is recorded.
      recordShippedHash(presetId, latest);
      return;
    }

    const shipped = [
      ...(loadShippedHashes()[presetId] || []),
      ...(LEGACY_HASHES[presetId] || []),
    ];
    const onDiskHash = sha256(onDisk);
    if (!shipped.includes(onDiskHash)) {
      // User-edited — record latest as known but don't overwrite.
      recordShippedHash(presetId, latest);
      return;
    }

    // Safe to refresh: writeScript backs up + records new hash.
    writeScript(presetId, latest);
    console.log(`[statuslines] auto-migrated preset "${presetId}" to latest template`);
  } catch (e) {
    // Never let migration crash startup.
  }
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

/**
 * Returns the script content for a given preset id.
 * For presets that have been applied, returns the saved file content (may have edits).
 * Falls back to the built-in template.
 */
function getPresetScript(presetId) {
  if (presetId === 'disabled' || presetId === 'custom') {
    return { scriptContent: '' };
  }
  // Prefer the saved file (may have user edits)
  const saved = scriptPath(presetId);
  if (fs.existsSync(saved)) {
    return { scriptContent: fs.readFileSync(saved, 'utf8') };
  }
  // Fall back to built-in template
  return { scriptContent: SCRIPTS[presetId] || '' };
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
      // Use provided scriptContent if given (user edited the script), else fall back to built-in template
      const script = scriptContent || SCRIPTS[presetId];
      if (!script) return { success: false, error: `Unknown preset: ${presetId}` };
      cmd = writeScript(presetId, script);
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
  getPresetScript,
  setStatusline,
  autoMigratePresets,
};
