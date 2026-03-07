export const BLOCK_DEFS = [
  { id: 'model',         label: 'Model Name',          preview: 'claude-opus-4-6' },
  { id: 'context-bar',   label: 'Context Bar',          preview: '●●●●○○○○○○  37%', hasStyle: true },
  { id: 'ctx-pct',       label: 'Context %',            preview: '37% ctx' },
  { id: 'ctx-tokens',    label: 'Token Counts',         preview: '74.4K/200.0K' },
  { id: 'ctx-remaining', label: 'Context Remaining',    preview: '63% ctx left' },
  { id: 'lines-changed', label: 'Lines Changed',        preview: '+146 -13' },
  { id: 'git-branch',    label: 'Git Branch',           preview: 'main' },
  { id: 'duration',      label: 'Duration',             preview: '5h 32m' },
  { id: 'cost',          label: 'Cost (API equiv.)',     preview: '$0.142' },
];

export const DEFAULT_VISUAL_CONFIG = {
  prefix: '* ',
  separator: '  |  ',
  blocks: [
    { id: 'model',         enabled: true },
    { id: 'context-bar',   enabled: true, style: 'dots' },
    { id: 'ctx-pct',       enabled: false },
    { id: 'ctx-tokens',    enabled: false },
    { id: 'ctx-remaining', enabled: false },
    { id: 'lines-changed', enabled: false },
    { id: 'git-branch',    enabled: false },
    { id: 'duration',      enabled: false },
    { id: 'cost',          enabled: false },
  ],
};

export function configToPreview(config) {
  const { prefix = '* ', separator = '  |  ', blocks = [] } = config;
  const parts = [];
  for (const block of blocks.filter(b => b.enabled)) {
    switch (block.id) {
      case 'model':         parts.push('claude-opus-4-6'); break;
      case 'context-bar': {
        const f = block.style === 'blocks' ? '█' : '●';
        const e = block.style === 'blocks' ? '░' : '○';
        parts.push(`ctx ${f.repeat(4)}${e.repeat(6)}  37%`);
        break;
      }
      case 'ctx-pct':       parts.push('37% ctx'); break;
      case 'ctx-tokens':    parts.push('74.4K/200.0K'); break;
      case 'ctx-remaining': parts.push('63% ctx left'); break;
      case 'lines-changed': parts.push('+146 -13'); break;
      case 'git-branch':    parts.push('main'); break;
      case 'duration':      parts.push('5h 32m'); break;
      case 'cost':          parts.push('$0.142'); break;
    }
  }
  return parts.length ? prefix + parts.join(separator) : '(empty)';
}

export function configToScript(config) {
  const { prefix = '* ', separator = '  |  ', blocks = [] } = config;
  const enabled = blocks.filter(b => b.enabled);

  const lines = [
    '#!/bin/bash',
    `# CONFIG: ${JSON.stringify(config)}`,
    'input=$(cat)',
  ];

  const has = id => enabled.some(b => b.id === id);

  if (has('model'))
    lines.push(`MODEL=$(echo "$input" | jq -r '.model.display_name // "?"')`);
  if (has('context-bar') || has('ctx-pct') || has('ctx-remaining'))
    lines.push(`PCT=$(echo "$input" | jq -r '.context_window.used_percentage // 0' | cut -d. -f1)`);
  if (has('ctx-remaining'))
    lines.push(`REM=$(echo "$input" | jq -r '.context_window.remaining_percentage // 0' | cut -d. -f1)`);
  if (has('ctx-tokens')) {
    lines.push(`CTX_USED=$(echo "$input" | jq -r '((.context_window.current_usage.input_tokens // 0) + (.context_window.current_usage.cache_creation_input_tokens // 0) + (.context_window.current_usage.cache_read_input_tokens // 0))')`);
    lines.push(`CTX_MAX=$(echo "$input" | jq -r '.context_window.context_window_size // 200000')`);
    lines.push(`CTX_K=$(awk "BEGIN {printf \\"%.1fK\\", $CTX_USED/1000}")`);
    lines.push(`MAX_K=$(awk "BEGIN {printf \\"%.1fK\\", $CTX_MAX/1000}")`);
  }
  if (has('lines-changed')) {
    lines.push(`LINES_ADD=$(echo "$input" | jq -r '.cost.total_lines_added // 0')`);
    lines.push(`LINES_REM=$(echo "$input" | jq -r '.cost.total_lines_removed // 0')`);
  }
  if (has('duration')) {
    lines.push(`DUR_MS=$(echo "$input" | jq -r '.cost.total_duration_ms // 0')`);
    lines.push(`HOURS=$((DUR_MS / 3600000)); MINS=$(((DUR_MS % 3600000) / 60000)); SECS=$(((DUR_MS % 60000) / 1000))`);
  }
  if (has('cost')) {
    lines.push(`COST=$(echo "$input" | jq -r '.cost.total_cost_usd // 0')`);
    lines.push(`COST_FMT=$(printf '$%.3f' $COST)`);
  }
  if (has('git-branch'))
    lines.push(`BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '')`);

  const barBlock = enabled.find(b => b.id === 'context-bar');
  if (barBlock) {
    const f = barBlock.style === 'blocks' ? '█' : '●';
    const e = barBlock.style === 'blocks' ? '░' : '○';
    lines.push(`FILLED=$((PCT / 10)); EMPTY=$((10 - FILLED))`);
    lines.push(`BAR=""; [ "$FILLED" -gt 0 ] && BAR="$BAR$(printf '${f}%.0s' $(seq 1 $FILLED))"`);
    lines.push(`        [ "$EMPTY" -gt 0 ]  && BAR="$BAR$(printf '${e}%.0s' $(seq 1 $EMPTY))"`);

  }

  let first = true;
  for (const block of enabled) {
    const out = (frag, cond) => {
      if (first) {
        lines.push(`OUT="${prefix}${frag}"`);
        first = false;
      } else if (cond) {
        lines.push(`${cond} && OUT="$OUT${separator}${frag}"`);
      } else {
        lines.push(`OUT="$OUT${separator}${frag}"`);
      }
    };

    switch (block.id) {
      case 'model':         out('$MODEL'); break;
      case 'context-bar':   out('ctx $BAR  $PCT%'); break;
      case 'ctx-pct':       out('$PCT% ctx'); break;
      case 'ctx-tokens':    out('$CTX_K/$MAX_K'); break;
      case 'ctx-remaining': out('$REM% ctx left'); break;
      case 'lines-changed': out('+$LINES_ADD -$LINES_REM', '[ "$LINES_ADD" != "0" ] || [ "$LINES_REM" != "0" ]'); break;
      case 'git-branch':    out('$BRANCH', '[ -n "$BRANCH" ]'); break;
      case 'duration':
        if (first) {
          lines.push(`[ "$HOURS" -gt 0 ] && OUT="${prefix}\${HOURS}h \${MINS}m" || OUT="${prefix}\${MINS}m \${SECS}s"`);
          first = false;
        } else {
          lines.push(`[ "$HOURS" -gt 0 ] && OUT="$OUT${separator}\${HOURS}h \${MINS}m" || OUT="$OUT${separator}\${MINS}m \${SECS}s"`);
        }
        break;
      case 'cost': out('$COST_FMT'); break;
    }
  }

  if (first) lines.push(`OUT=""`);
  lines.push(`echo "$OUT"`);

  return lines.join('\n') + '\n';
}

export function parseConfig(script) {
  const match = script?.match(/^# CONFIG: (.+)$/m);
  if (!match) return null;
  try { return JSON.parse(match[1]); } catch { return null; }
}
