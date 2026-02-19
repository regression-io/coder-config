# SDK-1: Replace Claude Subprocess Invocations with Agent SDK

**Date:** 2026-02-19
**Status:** Design

---

## Problem

coder-config invokes the Claude Code CLI as a subprocess in 3 files with 8 distinct call sites. This approach has significant problems:

- **Fragile binary discovery**: `getClaudePath()` is copy-pasted verbatim into 3 route files and probes a hardcoded list of install locations because daemon processes don't inherit full `PATH`
- **Heuristic PTY scraping**: Ralph Loop execution opens a PTY shell, types `claude --dangerously-skip-permissions`, then watches stdout for `❯` or `Claude Code` banner to detect readiness before typing the task — this is brittle
- **No structure**: Claude's output is raw stdout strings; no message types, no tool visibility, no cost tracking, no session IDs
- **Manual timeout management**: `tunePrompt()` manages its own 60s timer with `setTimeout` + `proc.kill()` + a `safeResolve` guard to prevent double-resolution
- **No session continuity**: Loops cannot resume a prior Claude session; each run starts fresh
- **Inconsistent error handling**: 8 call sites each implement their own error handling pattern

The `@anthropic-ai/claude-agent-sdk` wraps the Claude Code CLI and exposes a programmatic `query()` async iterator that returns typed `SDKMessage` objects. It uses the user's existing Claude Code auth — no separate API key required.

---

## What Gets Replaced

### ✅ Replace with Agent SDK

| Current | File:Line | New Approach |
|---------|-----------|-------------|
| `spawn(claude, ['-p', metaPrompt])` | `loops.js:501` | `query({ prompt, options: { cwd, maxTurns: 1 } })` |
| `spawn(claude, ['-p', '/init'], SSE stream)` | `projects.js:266` | `query({ prompt: '/init', options: { cwd } })` → SSE |
| `execFileSync(claude, ['-p', '/init'])` | `projects.js:111` | `query({ prompt: '/init', options: { cwd } })` |
| PTY shell → type `claude --dangerously-skip-permissions` → watch banner → type task | `terminal-server.cjs`, `LoopsView.jsx` | `query({ prompt: task, options: { permissionMode: 'bypassPermissions', cwd, env: { CODER_LOOP_ID }, maxTurns, settingSources: ['user', 'local'] } })` → SSE stream |
| `TerminalDialog` for CLAUDE.md init | `FileExplorer/index.jsx` | SSE stream from `query()` rendered in-place |

### ❌ Keep as Subprocess (SDK has no equivalent)

| Current | File | Reason |
|---------|------|--------|
| `claude plugin install/uninstall` | `plugins.js` | Agent SDK exposes no plugin management API |
| `claude plugin marketplace add/update` | `plugins.js` | Same — CLI-only |
| `pty.spawn(shell)` for general terminal | `terminal-server.cjs` | User-facing interactive shell (RegistryView, CreateMcpView) — irreplaceable |
| `which claude` existence check | `lib/apply.js` | Not an invocation; tool detection only |

### Consolidated `getClaudePath()`

The 3 duplicate copies in `loops.js`, `projects.js`, `plugins.js` collapse into **one** shared helper in `ui/routes/utils.js` — only needed for the remaining plugin subprocess calls.

---

## Architecture

### Ralph Loop Execution (Biggest Change)

**Before:**
```
LoopsView → TerminalDialog → WebSocket → terminal-server.cjs
  → pty.spawn($SHELL)
  → write "claude --dangerously-skip-permissions\r" after 500ms
  → watch stdout for "❯" or "Claude Code" banner (heuristic)
  → write task + "\r" into PTY
  → poll REST API every 3s for loop state
  → Stop hook shell script controls continuation
```

**After:**
```
LoopsView → click Start
  → POST /api/loops/:id/start-sdk
    → query({ prompt: task, options: {
        permissionMode: 'bypassPermissions',
        cwd: loop.projectPath,
        env: { CODER_LOOP_ID: loop.id, CODER_WORKSTREAM: loop.workstreamId },
        maxTurns: loop.iterations.max,
        settingSources: ['user', 'local'],  // picks up Stop/PreToolUse hooks
      }})
    → SSE stream: each SDKMessage → GET /api/loops/:id/stream
  → LoopsView renders structured message feed
  → Stop hook still fires (inherited env has CODER_LOOP_ID) → same API callback
  → session_id captured from SDKSystemMessage → stored in loop state for resume
  → Resume: query({ ..., resume: loop.sessionId })
```

**Why Stop hooks still work:** The Agent SDK runs Claude Code under the hood. When `settingSources: ['user', 'local']` is set, Claude Code reads `~/.claude/settings.json` and `.claude/settings.local.json` — where `setupLoopHooks()` already registers the Stop hook. Hook subprocess inherits env (including `CODER_LOOP_ID`) from the Claude Code process.

### Loop UI (Frontend)

Replace `TerminalDialog` with a **structured message feed**:
- `SDKAssistantMessage` → render text content
- Tool use blocks → render as collapsible tool cards (tool name + input summary)
- `SDKResultMessage` → show cost, turns, duration
- Keep the full-screen overlay aesthetic but structured, not terminal

This is better UX: tool calls are visible, cost is shown, errors have structure.

### Prompt Tuning (Simple Replacement)

```js
// Before
const proc = spawn(claudePath, ['-p', metaPrompt], { cwd });
// ... 60s manual timeout, safeResolve guard, stdout accumulation ...

// After
let result = '';
for await (const msg of query({ prompt: metaPrompt, options: { cwd, maxTurns: 1 } })) {
  if (msg.type === 'result' && msg.subtype === 'success') result = msg.result;
}
```

No manual timeout (SDK handles it), no binary discovery, structured result.

### `streamClaudeInit()` (SSE Streaming)

```js
// Before
spawn(claude, ['-p', '/init'], { env: { TERM: 'dumb' } }) → pipe stdout to SSE

// After
for await (const msg of query({ prompt: '/init', options: { cwd, settingSources: ['project'] } })) {
  if (msg.type === 'assistant') res.write(`data: ${JSON.stringify({ type: 'output', text: extractText(msg) })}\n\n`);
  if (msg.type === 'result') res.write(`data: ${JSON.stringify({ type: 'done', success: !msg.is_error })}\n\n`);
}
```

---

## Files Changed

### New/Modified (Server)
- `ui/routes/utils.js` *(new)* — shared `getClaudePath()` helper
- `ui/routes/loops.js` — replace `tunePrompt()` and add new SDK-based loop execution endpoint
- `ui/routes/projects.js` — replace both init invocations with Agent SDK `query()`
- `ui/server.cjs` — wire new SDK loop stream endpoint; terminal server still attached for general terminal
- `package.json` — add `@anthropic-ai/claude-agent-sdk`

### Modified (Frontend)
- `ui/src/views/LoopsView.jsx` — replace TerminalDialog with structured message feed; connect to SSE loop stream
- `ui/src/components/FileExplorer/index.jsx` — replace TerminalDialog for CLAUDE.md init with SSE stream viewer

### Unchanged
- `ui/terminal-server.cjs` — still needed for RegistryView, CreateMcpView
- `ui/routes/plugins.js` — all plugin calls keep subprocess; consolidate `getClaudePath()` import
- `lib/apply.js` — `which claude` check unchanged
- All hook scripts — unchanged; hook registration mechanism unchanged

---

## Open Questions

1. **Loop UI**: Full structured message feed, or keep xterm.js and pipe text content into it as terminal-like output? Structured feed is cleaner; terminal feel is familiar.

2. **Abort/pause**: `Query.interrupt()` is available for running SDK queries. When user pauses a loop, should we call `interrupt()` or let the Stop hook handle it?

3. **Loop SSE session**: The SDK `query()` runs on the server and streams to SSE. If the browser disconnects and reconnects, we need to either buffer messages server-side or use `resume: sessionId` to resume the Claude session. Which is preferable?
