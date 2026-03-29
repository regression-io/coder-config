# Ralph Loop Heartbeat — Design Spec

**Date:** 2026-03-29
**Status:** Approved
**Inspired by:** [cstack](https://github.com/srf6413/cstack) heartbeat/supervisor pattern

## Related Documents

- `lib/loops.js` — existing loop CRUD and lifecycle
- `lib/cli.js` — CLI command router (loop subcommands at line 230)
- `ui/routes/loops.js` — Web UI API endpoints for loops
- `config-loader.js` — manager class that exposes loop methods

## Overview

A monitoring system for Ralph Loops that detects unhealthy states (failed, stale, blocked, approaching limits) and surfaces them through CLI output, macOS notifications, Slack messages, and a Web UI health banner. Inspired by cstack's heartbeat pattern — a supervisor that reads all agent state files and consolidates what needs human attention.

## 1. Core Heartbeat Module

**File:** `lib/heartbeat.js` (new)

### Condition Evaluation

The heartbeat reads all loop state files and evaluates each active loop against these conditions:

| Condition | Trigger | Severity |
|-----------|---------|----------|
| `failed` | `status === 'failed'` | `critical` |
| `stale` | `updatedAt` older than threshold (default 30 min) | `warning` |
| `iteration_limit` | Current iteration >= 80% of max | `warning` |
| `phase_gate` | `phase === 'plan'` and `status === 'running'` | `info` |
| `blocked` | `status === 'paused'` with `pauseReason` | `info` |

### Report Structure

```js
{
  timestamp: "2026-03-29T14:30:00.000Z",
  activeLoops: 3,
  alerts: [
    {
      loopId: "loop_abc123",
      name: "refactor-auth",
      type: "failed",        // condition type
      message: "Loop failed: unknown error",
      severity: "critical"   // critical | warning | info
    }
  ],
  healthy: [
    {
      loopId: "loop_def456",
      name: "build-api",
      phase: "execute",
      iteration: "12/50"
    }
  ],
  summary: "3 active loops: 1 critical, 1 warning, 1 healthy"
}
```

### Key Functions

- `heartbeat(installDir)` — evaluate all loops, return report
- `notify(installDir, report)` — dispatch notifications based on config
- `loadHeartbeatConfig(installDir)` — read heartbeat config from loops.json
- `saveLastHeartbeat(installDir, report)` — persist for deduplication

### Dependencies

Imports from `lib/loops.js`: `loadLoops`, `loadLoopState`, `getLoopsPath`

## 2. CLI Interface

New subcommand under existing `loop` command in `lib/cli.js`:

```bash
# Print heartbeat report
coder-config loop heartbeat

# Also push notifications to configured channels
coder-config loop heartbeat --notify

# Only output if alerts exist (exit code 1), silent if healthy (exit code 0)
coder-config loop heartbeat --quiet

# Machine-readable output
coder-config loop heartbeat --json

# Setup/teardown scheduled agent
coder-config loop heartbeat --schedule
coder-config loop heartbeat --unschedule
```

### Terminal Output Format

```
<heart> Loop Heartbeat -- 2026-03-29 14:30:00

RED CRITICAL
   X refactor-auth -- Failed: unknown error

YELLOW WARNING
   ! migrate-db -- Stale: no update in 45m (threshold: 30m)
   ! add-tests -- Iteration limit: 42/50 (84%)

GREEN HEALTHY
   * build-api [execute] 12/50

Summary: 4 loops -- 1 critical, 2 warnings, 1 healthy
```

### Quiet Mode

- Exit code 0 if all healthy or no active loops
- Exit code 1 if any critical/warning alerts, prints only alerts
- Designed for use by scheduled agent and cron

## 3. Notification System

### Configuration

Stored in existing `loops.json` config object:

```js
{
  maxIterations: 50,
  autoApprovePlan: false,
  maxClarifyIterations: 5,
  completionPromise: "DONE",
  heartbeat: {
    staleThresholdMinutes: 30,
    iterationLimitPercent: 80,
    cooldownMinutes: 15,
    notifications: {
      slack: { enabled: false, channel: "#dev-loops", webhookUrl: null },
      macos: { enabled: true }
    }
  }
}
```

### CLI Configuration

```bash
coder-config loop config heartbeat.staleThresholdMinutes 30
coder-config loop config heartbeat.notifications.slack.enabled true
coder-config loop config heartbeat.notifications.slack.channel "#dev-loops"
coder-config loop config heartbeat.notifications.macos.enabled true
```

### Per-Loop Override

Individual loops can override the global stale threshold:

```js
// In loop state.json
{
  // ... existing fields ...
  heartbeat: {
    staleThresholdMinutes: 60  // this loop gets more time
  }
}
```

Set via: `coder-config loop update <id> --stale-threshold 60`

### Channels

**macOS native:**
- Uses `osascript -e 'display notification "..." with title "Ralph Heartbeat"'`
- Fires for critical and warning severity only
- Works standalone from CLI

**Slack:**
- Uses Slack MCP tool (`slack_send_message`) when run via scheduled agent
- Falls back to webhook POST if a `webhookUrl` is configured
- If neither available, skips with log message

### Deduplication

- `last-heartbeat.json` stored in the loops directory
- Contains alert hashes (hash of `loopId + type`) and timestamps
- Same alert won't re-notify within `cooldownMinutes` (default: 15)
- Cleared when a loop transitions to a healthy state

## 4. Scheduled Agent

Uses Claude Cowork scheduled triggers (via the `schedule` skill).

### Behavior Per Run

1. Execute `coder-config loop heartbeat --json --quiet`
2. Exit code 0 (all healthy or no active loops) -> do nothing
3. Exit code 1 (alerts exist) -> send notifications via Slack MCP + macOS native

### Auto-Enable/Disable

- `loopStart()` in `lib/loops.js` checks if heartbeat schedule is configured
  - If configured and no active schedule -> starts it
- When last active loop completes/cancels -> heartbeat schedule pauses
- Zero token usage when nothing is running

### Interval

- Default: every 5 minutes
- Only runs when at least one loop has status `running` or `paused`

### Setup/Teardown

```bash
coder-config loop heartbeat --schedule     # create the trigger
coder-config loop heartbeat --unschedule   # remove the trigger
```

## 5. Web UI Integration

### API Endpoint

`GET /api/loops/heartbeat` in `ui/routes/loops.js` (existing file)

- Calls same `heartbeat(installDir)` function from `lib/heartbeat.js`
- Returns the full report as JSON

### UI Changes

- Health banner at top of existing Loops view (`ui/src/views/Loops.jsx` or equivalent)
- Shows summary line + any alerts with severity colors
- No new view or page — widget within existing loops page

## 6. Testing

**File:** `test/heartbeat.test.js` (new)

### Test Cases

- [ ] `heartbeat()` returns empty report when no loops exist
- [ ] `heartbeat()` returns healthy report when all loops are running normally
- [ ] Detects `failed` loops with critical severity
- [ ] Detects `stale` loops based on `updatedAt` vs threshold
- [ ] Detects `iteration_limit` when >= 80% of max iterations
- [ ] Detects `phase_gate` when in plan phase and running
- [ ] Detects `blocked` when paused with reason
- [ ] Per-loop stale threshold overrides global default
- [ ] Report summary string is accurate
- [ ] Deduplication: same alert not repeated within cooldown
- [ ] Deduplication: alert re-fires after cooldown expires
- [ ] Deduplication: cleared when loop becomes healthy
- [ ] Config: loads heartbeat config from loops.json
- [ ] Config: falls back to defaults when no heartbeat config exists
- [ ] macOS notification: constructs correct osascript command
- [ ] Quiet mode: returns exit code 0 when healthy
- [ ] Quiet mode: returns exit code 1 when alerts exist

### Test Pattern

Uses temp directories with mock `state.json` files, same approach as `test/loops.test.js`.

## 7. File Summary

| File | Status | Purpose |
|------|--------|---------|
| `lib/heartbeat.js` | new | Core evaluation, notification dispatch, dedup |
| `lib/cli.js` | existing | Add `heartbeat` subcommand under `loop` |
| `lib/loops.js` | existing | Add auto-enable hook in `loopStart()`/`loopComplete()` |
| `config-loader.js` | existing | Expose `loopHeartbeat()`, `loopHeartbeatConfig()` |
| `ui/routes/loops.js` | existing | Add `GET /api/loops/heartbeat` endpoint |
| `test/heartbeat.test.js` | new | Unit tests for heartbeat module |

## Acceptance Criteria

- [ ] `coder-config loop heartbeat` prints a formatted health report
- [ ] `--notify` flag dispatches to configured channels (macOS, Slack)
- [ ] `--quiet` flag exits silently when healthy, prints alerts when not
- [ ] `--json` flag outputs machine-readable report
- [ ] Failed, stale, iteration-limit, phase-gate, and blocked conditions detected
- [ ] Per-loop stale threshold override works
- [ ] Deduplication prevents repeat notifications within cooldown
- [ ] `--schedule` creates a recurring trigger (5 min interval)
- [ ] `--unschedule` removes the trigger
- [ ] Auto-enable on `loopStart()`, auto-disable when last loop completes
- [ ] Web UI shows health banner on Loops view
- [ ] `test/heartbeat.test.js` passes with 17+ tests
- [ ] CHANGELOG.md updated in same commit as code
