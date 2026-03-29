# Ralph Loop Heartbeat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a heartbeat/supervisor system to Ralph Loops that detects unhealthy loops and surfaces alerts via CLI, macOS notifications, Slack, and Web UI.

**Architecture:** New `lib/heartbeat.js` module evaluates all loop state files against health conditions and returns a structured report. CLI consumes it via `coder-config loop heartbeat`. Notifications dispatch through macOS `osascript` and Slack webhook. Web UI gets a new API endpoint and health banner. A scheduled agent polls every 5 minutes when loops are active.

**Tech Stack:** Node.js (CommonJS), osascript (macOS notifications), Slack webhook (HTTP POST), Express (API endpoint), React (UI banner)

**Spec:** `docs/superpowers/specs/2026-03-29-loop-heartbeat-design.md`

---

## File Structure

| File | Status | Responsibility |
|------|--------|----------------|
| `lib/heartbeat.js` | new | Core evaluation engine, notification dispatch, deduplication |
| `test/heartbeat.test.js` | new | Unit tests for heartbeat module |
| `lib/cli.js` | existing | Add `heartbeat` subcommand under `loop` |
| `lib/loops.js` | existing | Add `getDefaultHeartbeatConfig()`, export it |
| `config-loader.js` | existing | Import and expose heartbeat methods on manager class |
| `ui/routes/loops.js` | existing | Add `GET /api/loops/heartbeat` endpoint |

---

### Task 1: Core Heartbeat Evaluation — Tests

**Files:**
- Create: `test/heartbeat.test.js`
- Create: `lib/heartbeat.js` (stub only — enough to import)

- [ ] **Step 1: Create `lib/heartbeat.js` stub with exports**

```js
// lib/heartbeat.js
'use strict';

const { loadLoops, loadLoopState, getLoopsPath } = require('./loops');

function getDefaultHeartbeatConfig() {
  return {
    staleThresholdMinutes: 30,
    iterationLimitPercent: 80,
    cooldownMinutes: 15,
    notifications: {
      slack: { enabled: false, channel: '#dev-loops', webhookUrl: null },
      macos: { enabled: true }
    }
  };
}

function heartbeat(installDir) {
  return { timestamp: new Date().toISOString(), activeLoops: 0, alerts: [], healthy: [], summary: '0 active loops' };
}

module.exports = { heartbeat, getDefaultHeartbeatConfig };
```

- [ ] **Step 2: Write failing tests for condition evaluation**

```js
// test/heartbeat.test.js
const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { heartbeat, getDefaultHeartbeatConfig } = require('../lib/heartbeat');
const { saveLoops, saveLoopState } = require('../lib/loops');

describe('heartbeat', () => {
  let tempDir;
  let installDir;
  let originalLog;
  let originalError;
  let logs;
  let errors;

  before(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'heartbeat-test-'));
    originalLog = console.log;
    originalError = console.error;
  });

  after(() => {
    console.log = originalLog;
    console.error = originalError;
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    installDir = path.join(tempDir, `install-${Date.now()}-${Math.random()}`);
    fs.mkdirSync(installDir, { recursive: true });
    logs = [];
    errors = [];
    console.log = (...args) => logs.push(args.join(' '));
    console.error = (...args) => errors.push(args.join(' '));
  });

  describe('getDefaultHeartbeatConfig', () => {
    it('should return default config with expected fields', () => {
      const config = getDefaultHeartbeatConfig();
      assert.strictEqual(config.staleThresholdMinutes, 30);
      assert.strictEqual(config.iterationLimitPercent, 80);
      assert.strictEqual(config.cooldownMinutes, 15);
      assert.strictEqual(config.notifications.macos.enabled, true);
      assert.strictEqual(config.notifications.slack.enabled, false);
    });
  });

  describe('heartbeat()', () => {
    it('should return empty report when no loops exist', () => {
      const report = heartbeat(installDir);
      assert.strictEqual(report.activeLoops, 0);
      assert.deepStrictEqual(report.alerts, []);
      assert.deepStrictEqual(report.healthy, []);
      assert.ok(report.timestamp);
      assert.ok(report.summary.includes('0'));
    });

    it('should return healthy report when all loops are running normally', () => {
      const loopsDir = path.join(installDir, 'loops');
      fs.mkdirSync(loopsDir, { recursive: true });
      saveLoops(installDir, {
        loops: [{ id: 'loop_abc', name: 'test-loop', createdAt: new Date().toISOString() }],
        activeId: 'loop_abc',
        config: {}
      });
      const loopDir = path.join(loopsDir, 'loop_abc');
      fs.mkdirSync(loopDir, { recursive: true });
      saveLoopState(installDir, 'loop_abc', {
        id: 'loop_abc',
        name: 'test-loop',
        status: 'running',
        phase: 'execute',
        iterations: { current: 5, max: 50, history: [] },
        updatedAt: new Date().toISOString()
      });

      const report = heartbeat(installDir);
      assert.strictEqual(report.activeLoops, 1);
      assert.strictEqual(report.alerts.length, 0);
      assert.strictEqual(report.healthy.length, 1);
      assert.strictEqual(report.healthy[0].name, 'test-loop');
    });

    it('should detect failed loops with critical severity', () => {
      const loopsDir = path.join(installDir, 'loops');
      fs.mkdirSync(loopsDir, { recursive: true });
      saveLoops(installDir, {
        loops: [{ id: 'loop_fail', name: 'failed-loop', createdAt: new Date().toISOString() }],
        activeId: null,
        config: {}
      });
      const loopDir = path.join(loopsDir, 'loop_fail');
      fs.mkdirSync(loopDir, { recursive: true });
      saveLoopState(installDir, 'loop_fail', {
        id: 'loop_fail',
        name: 'failed-loop',
        status: 'failed',
        phase: 'execute',
        pauseReason: 'build error',
        iterations: { current: 10, max: 50, history: [] },
        updatedAt: new Date().toISOString()
      });

      const report = heartbeat(installDir);
      assert.strictEqual(report.alerts.length, 1);
      assert.strictEqual(report.alerts[0].type, 'failed');
      assert.strictEqual(report.alerts[0].severity, 'critical');
      assert.ok(report.alerts[0].message.includes('build error'));
    });

    it('should detect stale loops based on updatedAt vs threshold', () => {
      const loopsDir = path.join(installDir, 'loops');
      fs.mkdirSync(loopsDir, { recursive: true });
      saveLoops(installDir, {
        loops: [{ id: 'loop_stale', name: 'stale-loop', createdAt: new Date().toISOString() }],
        activeId: 'loop_stale',
        config: { heartbeat: { staleThresholdMinutes: 30 } }
      });
      const loopDir = path.join(loopsDir, 'loop_stale');
      fs.mkdirSync(loopDir, { recursive: true });
      // Set updatedAt to 45 minutes ago
      const staleTime = new Date(Date.now() - 45 * 60 * 1000).toISOString();
      saveLoopState(installDir, 'loop_stale', {
        id: 'loop_stale',
        name: 'stale-loop',
        status: 'running',
        phase: 'execute',
        iterations: { current: 5, max: 50, history: [] },
        updatedAt: staleTime
      });

      const report = heartbeat(installDir);
      const staleAlert = report.alerts.find(a => a.type === 'stale');
      assert.ok(staleAlert, 'Should have a stale alert');
      assert.strictEqual(staleAlert.severity, 'warning');
      assert.ok(staleAlert.message.includes('45m') || staleAlert.message.includes('no update'));
    });

    it('should detect iteration_limit when >= 80% of max iterations', () => {
      const loopsDir = path.join(installDir, 'loops');
      fs.mkdirSync(loopsDir, { recursive: true });
      saveLoops(installDir, {
        loops: [{ id: 'loop_limit', name: 'limit-loop', createdAt: new Date().toISOString() }],
        activeId: 'loop_limit',
        config: {}
      });
      const loopDir = path.join(loopsDir, 'loop_limit');
      fs.mkdirSync(loopDir, { recursive: true });
      saveLoopState(installDir, 'loop_limit', {
        id: 'loop_limit',
        name: 'limit-loop',
        status: 'running',
        phase: 'execute',
        iterations: { current: 42, max: 50, history: [] },
        updatedAt: new Date().toISOString()
      });

      const report = heartbeat(installDir);
      const limitAlert = report.alerts.find(a => a.type === 'iteration_limit');
      assert.ok(limitAlert, 'Should have an iteration_limit alert');
      assert.strictEqual(limitAlert.severity, 'warning');
      assert.ok(limitAlert.message.includes('42/50'));
    });

    it('should detect phase_gate when in plan phase and running', () => {
      const loopsDir = path.join(installDir, 'loops');
      fs.mkdirSync(loopsDir, { recursive: true });
      saveLoops(installDir, {
        loops: [{ id: 'loop_gate', name: 'gate-loop', createdAt: new Date().toISOString() }],
        activeId: 'loop_gate',
        config: {}
      });
      const loopDir = path.join(loopsDir, 'loop_gate');
      fs.mkdirSync(loopDir, { recursive: true });
      saveLoopState(installDir, 'loop_gate', {
        id: 'loop_gate',
        name: 'gate-loop',
        status: 'running',
        phase: 'plan',
        iterations: { current: 3, max: 50, history: [] },
        updatedAt: new Date().toISOString()
      });

      const report = heartbeat(installDir);
      const gateAlert = report.alerts.find(a => a.type === 'phase_gate');
      assert.ok(gateAlert, 'Should have a phase_gate alert');
      assert.strictEqual(gateAlert.severity, 'info');
      assert.ok(gateAlert.message.includes('plan approval'));
    });

    it('should detect blocked loops when paused with reason', () => {
      const loopsDir = path.join(installDir, 'loops');
      fs.mkdirSync(loopsDir, { recursive: true });
      saveLoops(installDir, {
        loops: [{ id: 'loop_block', name: 'blocked-loop', createdAt: new Date().toISOString() }],
        activeId: null,
        config: {}
      });
      const loopDir = path.join(loopsDir, 'loop_block');
      fs.mkdirSync(loopDir, { recursive: true });
      saveLoopState(installDir, 'loop_block', {
        id: 'loop_block',
        name: 'blocked-loop',
        status: 'paused',
        phase: 'execute',
        pauseReason: 'waiting for API key',
        iterations: { current: 5, max: 50, history: [] },
        updatedAt: new Date().toISOString()
      });

      const report = heartbeat(installDir);
      const blockAlert = report.alerts.find(a => a.type === 'blocked');
      assert.ok(blockAlert, 'Should have a blocked alert');
      assert.strictEqual(blockAlert.severity, 'info');
      assert.ok(blockAlert.message.includes('waiting for API key'));
    });

    it('should use per-loop stale threshold override', () => {
      const loopsDir = path.join(installDir, 'loops');
      fs.mkdirSync(loopsDir, { recursive: true });
      saveLoops(installDir, {
        loops: [{ id: 'loop_custom', name: 'custom-loop', createdAt: new Date().toISOString() }],
        activeId: 'loop_custom',
        config: { heartbeat: { staleThresholdMinutes: 30 } }
      });
      const loopDir = path.join(loopsDir, 'loop_custom');
      fs.mkdirSync(loopDir, { recursive: true });
      // 45 min ago — stale by global default (30m), but NOT stale by per-loop override (60m)
      const staleTime = new Date(Date.now() - 45 * 60 * 1000).toISOString();
      saveLoopState(installDir, 'loop_custom', {
        id: 'loop_custom',
        name: 'custom-loop',
        status: 'running',
        phase: 'execute',
        iterations: { current: 5, max: 50, history: [] },
        updatedAt: staleTime,
        heartbeat: { staleThresholdMinutes: 60 }
      });

      const report = heartbeat(installDir);
      const staleAlert = report.alerts.find(a => a.type === 'stale');
      assert.ok(!staleAlert, 'Should NOT have stale alert with 60m per-loop threshold');
    });

    it('should generate accurate summary string', () => {
      const loopsDir = path.join(installDir, 'loops');
      fs.mkdirSync(loopsDir, { recursive: true });
      saveLoops(installDir, {
        loops: [
          { id: 'loop_h', name: 'healthy', createdAt: new Date().toISOString() },
          { id: 'loop_f', name: 'broken', createdAt: new Date().toISOString() }
        ],
        activeId: 'loop_h',
        config: {}
      });
      fs.mkdirSync(path.join(loopsDir, 'loop_h'), { recursive: true });
      fs.mkdirSync(path.join(loopsDir, 'loop_f'), { recursive: true });
      saveLoopState(installDir, 'loop_h', {
        id: 'loop_h', name: 'healthy', status: 'running', phase: 'execute',
        iterations: { current: 5, max: 50, history: [] },
        updatedAt: new Date().toISOString()
      });
      saveLoopState(installDir, 'loop_f', {
        id: 'loop_f', name: 'broken', status: 'failed', phase: 'execute',
        pauseReason: 'error',
        iterations: { current: 10, max: 50, history: [] },
        updatedAt: new Date().toISOString()
      });

      const report = heartbeat(installDir);
      assert.strictEqual(report.activeLoops, 2);
      assert.ok(report.summary.includes('2'));
      assert.ok(report.summary.includes('critical'));
      assert.ok(report.summary.includes('healthy'));
    });

    it('should skip completed and cancelled loops', () => {
      const loopsDir = path.join(installDir, 'loops');
      fs.mkdirSync(loopsDir, { recursive: true });
      saveLoops(installDir, {
        loops: [{ id: 'loop_done', name: 'done-loop', createdAt: new Date().toISOString() }],
        activeId: null,
        config: {}
      });
      fs.mkdirSync(path.join(loopsDir, 'loop_done'), { recursive: true });
      saveLoopState(installDir, 'loop_done', {
        id: 'loop_done', name: 'done-loop', status: 'completed', phase: 'execute',
        iterations: { current: 50, max: 50, history: [] },
        updatedAt: new Date().toISOString()
      });

      const report = heartbeat(installDir);
      assert.strictEqual(report.activeLoops, 0);
      assert.strictEqual(report.alerts.length, 0);
      assert.strictEqual(report.healthy.length, 0);
    });
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `node --test test/heartbeat.test.js`
Expected: `getDefaultHeartbeatConfig` passes, all `heartbeat()` tests fail (stub returns empty report)

- [ ] **Step 4: Commit stub and tests**

```bash
git add lib/heartbeat.js test/heartbeat.test.js
git commit -m "test: add heartbeat evaluation tests (red)"
```

---

### Task 2: Core Heartbeat Evaluation — Implementation

**Files:**
- Modify: `lib/heartbeat.js`

- [ ] **Step 1: Implement `heartbeat()` function**

Replace the stub in `lib/heartbeat.js` with the full implementation:

```js
// lib/heartbeat.js
'use strict';

const fs = require('fs');
const path = require('path');
const { loadLoops, loadLoopState, getLoopsPath } = require('./loops');

function getDefaultHeartbeatConfig() {
  return {
    staleThresholdMinutes: 30,
    iterationLimitPercent: 80,
    cooldownMinutes: 15,
    notifications: {
      slack: { enabled: false, channel: '#dev-loops', webhookUrl: null },
      macos: { enabled: true }
    }
  };
}

function loadHeartbeatConfig(installDir) {
  const data = loadLoops(installDir);
  const globalConfig = data.config || {};
  return { ...getDefaultHeartbeatConfig(), ...globalConfig.heartbeat };
}

function heartbeat(installDir) {
  const data = loadLoops(installDir);
  const config = loadHeartbeatConfig(installDir);
  const now = Date.now();
  const alerts = [];
  const healthy = [];

  for (const entry of (data.loops || [])) {
    const state = loadLoopState(installDir, entry.id);
    if (!state) continue;

    // Skip terminal states
    if (state.status === 'completed' || state.status === 'cancelled') continue;

    const loopAlerts = evaluateLoop(state, config, now);

    if (loopAlerts.length > 0) {
      alerts.push(...loopAlerts);
    } else {
      healthy.push({
        loopId: state.id,
        name: state.name,
        phase: state.phase,
        iteration: `${state.iterations.current}/${state.iterations.max}`
      });
    }
  }

  const activeLoops = alerts.length + healthy.length;
  const summary = buildSummary(activeLoops, alerts, healthy);

  return {
    timestamp: new Date().toISOString(),
    activeLoops,
    alerts,
    healthy,
    summary
  };
}

function evaluateLoop(state, globalConfig, now) {
  const alerts = [];

  // Failed
  if (state.status === 'failed') {
    const reason = state.pauseReason || 'unknown error';
    alerts.push({
      loopId: state.id,
      name: state.name,
      type: 'failed',
      message: `Loop failed: ${reason}`,
      severity: 'critical'
    });
    return alerts; // No need to check other conditions
  }

  // Stale (running but not updated recently)
  if (state.status === 'running' && state.updatedAt) {
    const thresholdMinutes = state.heartbeat?.staleThresholdMinutes
      || globalConfig.staleThresholdMinutes
      || 30;
    const updatedAt = new Date(state.updatedAt).getTime();
    const minutesAgo = Math.floor((now - updatedAt) / 60000);
    if (minutesAgo >= thresholdMinutes) {
      alerts.push({
        loopId: state.id,
        name: state.name,
        type: 'stale',
        message: `No update in ${minutesAgo}m (threshold: ${thresholdMinutes}m)`,
        severity: 'warning'
      });
    }
  }

  // Iteration limit approaching
  if (state.iterations) {
    const limitPercent = globalConfig.iterationLimitPercent || 80;
    const pct = (state.iterations.current / state.iterations.max) * 100;
    if (pct >= limitPercent) {
      alerts.push({
        loopId: state.id,
        name: state.name,
        type: 'iteration_limit',
        message: `At ${state.iterations.current}/${state.iterations.max} iterations (${Math.round(pct)}%)`,
        severity: 'warning'
      });
    }
  }

  // Phase gate — waiting for plan approval
  if (state.phase === 'plan' && state.status === 'running') {
    alerts.push({
      loopId: state.id,
      name: state.name,
      type: 'phase_gate',
      message: 'Waiting for plan approval',
      severity: 'info'
    });
  }

  // Blocked — paused with reason
  if (state.status === 'paused' && state.pauseReason) {
    alerts.push({
      loopId: state.id,
      name: state.name,
      type: 'blocked',
      message: `Paused: ${state.pauseReason}`,
      severity: 'info'
    });
  }

  return alerts;
}

function buildSummary(activeLoops, alerts, healthy) {
  if (activeLoops === 0) return '0 active loops';

  const counts = { critical: 0, warning: 0, info: 0 };
  for (const alert of alerts) {
    counts[alert.severity] = (counts[alert.severity] || 0) + 1;
  }

  const parts = [`${activeLoops} active loops:`];
  if (counts.critical > 0) parts.push(`${counts.critical} critical`);
  if (counts.warning > 0) parts.push(`${counts.warning} warning`);
  if (counts.info > 0) parts.push(`${counts.info} info`);
  if (healthy.length > 0) parts.push(`${healthy.length} healthy`);

  return parts.join(', ');
}

module.exports = {
  heartbeat,
  getDefaultHeartbeatConfig,
  loadHeartbeatConfig,
  evaluateLoop,
  buildSummary
};
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `node --test test/heartbeat.test.js`
Expected: All 10 tests PASS

- [ ] **Step 3: Commit**

```bash
git add lib/heartbeat.js
git commit -m "feat: implement heartbeat loop evaluation engine"
```

---

### Task 3: Notification Dispatch — Tests

**Files:**
- Modify: `test/heartbeat.test.js`
- Modify: `lib/heartbeat.js`

- [ ] **Step 1: Add notification and deduplication tests to `test/heartbeat.test.js`**

Append these test blocks after the existing `heartbeat()` describe block:

```js
  describe('deduplication', () => {
    it('should save last heartbeat for dedup tracking', () => {
      const loopsDir = path.join(installDir, 'loops');
      fs.mkdirSync(loopsDir, { recursive: true });
      saveLoops(installDir, {
        loops: [{ id: 'loop_dup', name: 'dup-loop', createdAt: new Date().toISOString() }],
        activeId: null,
        config: {}
      });
      fs.mkdirSync(path.join(loopsDir, 'loop_dup'), { recursive: true });
      saveLoopState(installDir, 'loop_dup', {
        id: 'loop_dup', name: 'dup-loop', status: 'failed', phase: 'execute',
        pauseReason: 'error',
        iterations: { current: 5, max: 50, history: [] },
        updatedAt: new Date().toISOString()
      });

      const { heartbeat: hb, saveLastHeartbeat, loadLastHeartbeat } = require('../lib/heartbeat');
      const report = hb(installDir);
      saveLastHeartbeat(installDir, report);

      const saved = loadLastHeartbeat(installDir);
      assert.ok(saved);
      assert.ok(saved.alertHashes);
      assert.ok(saved.alertHashes['loop_dup:failed']);
    });

    it('should detect duplicate alerts within cooldown', () => {
      const { shouldNotify, saveLastHeartbeat } = require('../lib/heartbeat');
      const loopsDir = path.join(installDir, 'loops');
      fs.mkdirSync(loopsDir, { recursive: true });

      // Simulate a previous heartbeat with an alert
      const prevReport = {
        alertHashes: { 'loop_x:failed': Date.now() },
        timestamp: new Date().toISOString()
      };
      saveLastHeartbeat(installDir, prevReport);

      const alert = { loopId: 'loop_x', type: 'failed' };
      const result = shouldNotify(installDir, alert, 15);
      assert.strictEqual(result, false);
    });

    it('should allow notification after cooldown expires', () => {
      const { shouldNotify, saveLastHeartbeat } = require('../lib/heartbeat');
      const loopsDir = path.join(installDir, 'loops');
      fs.mkdirSync(loopsDir, { recursive: true });

      // Simulate a previous heartbeat 20 min ago
      const prevReport = {
        alertHashes: { 'loop_x:failed': Date.now() - 20 * 60 * 1000 },
        timestamp: new Date().toISOString()
      };
      saveLastHeartbeat(installDir, prevReport);

      const alert = { loopId: 'loop_x', type: 'failed' };
      const result = shouldNotify(installDir, alert, 15);
      assert.strictEqual(result, true);
    });
  });

  describe('macOS notification', () => {
    it('should construct correct osascript command', () => {
      const { buildMacosNotification } = require('../lib/heartbeat');
      const report = {
        summary: '2 loops: 1 critical, 1 healthy',
        alerts: [
          { name: 'test-loop', type: 'failed', severity: 'critical', message: 'Loop failed: error' }
        ]
      };
      const cmd = buildMacosNotification(report);
      assert.ok(cmd.includes('osascript'));
      assert.ok(cmd.includes('Ralph Heartbeat'));
      assert.ok(cmd.includes('critical'));
    });
  });

  describe('quiet mode', () => {
    it('should return exit code 0 when healthy', () => {
      const { getExitCode } = require('../lib/heartbeat');
      const report = { alerts: [], healthy: [{ loopId: 'a' }], activeLoops: 1 };
      assert.strictEqual(getExitCode(report), 0);
    });

    it('should return exit code 1 when alerts with warning or critical', () => {
      const { getExitCode } = require('../lib/heartbeat');
      const report = {
        alerts: [{ severity: 'warning', type: 'stale' }],
        healthy: [],
        activeLoops: 1
      };
      assert.strictEqual(getExitCode(report), 1);
    });

    it('should return exit code 0 when only info alerts', () => {
      const { getExitCode } = require('../lib/heartbeat');
      const report = {
        alerts: [{ severity: 'info', type: 'phase_gate' }],
        healthy: [],
        activeLoops: 1
      };
      assert.strictEqual(getExitCode(report), 0);
    });
  });
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `node --test test/heartbeat.test.js`
Expected: New dedup/notification/quiet tests fail (functions not exported yet)

- [ ] **Step 3: Commit**

```bash
git add test/heartbeat.test.js
git commit -m "test: add heartbeat notification and dedup tests (red)"
```

---

### Task 4: Notification Dispatch — Implementation

**Files:**
- Modify: `lib/heartbeat.js`

- [ ] **Step 1: Add deduplication, notification, and exit code functions to `lib/heartbeat.js`**

Add these functions before the `module.exports`:

```js
function saveLastHeartbeat(installDir, report) {
  const loopsDir = path.join(installDir, 'loops');
  if (!fs.existsSync(loopsDir)) {
    fs.mkdirSync(loopsDir, { recursive: true });
  }
  const filePath = path.join(loopsDir, 'last-heartbeat.json');

  const alertHashes = {};
  if (report.alerts) {
    for (const alert of report.alerts) {
      alertHashes[`${alert.loopId}:${alert.type}`] = Date.now();
    }
  }

  const data = { alertHashes, timestamp: new Date().toISOString() };
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

function loadLastHeartbeat(installDir) {
  const filePath = path.join(installDir, 'loops', 'last-heartbeat.json');
  if (fs.existsSync(filePath)) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      return null;
    }
  }
  return null;
}

function shouldNotify(installDir, alert, cooldownMinutes) {
  const last = loadLastHeartbeat(installDir);
  if (!last || !last.alertHashes) return true;

  const key = `${alert.loopId}:${alert.type}`;
  const lastTime = last.alertHashes[key];
  if (!lastTime) return true;

  const elapsed = (Date.now() - lastTime) / 60000;
  return elapsed >= cooldownMinutes;
}

function buildMacosNotification(report) {
  const criticalCount = report.alerts.filter(a => a.severity === 'critical').length;
  const warningCount = report.alerts.filter(a => a.severity === 'warning').length;

  let body = '';
  if (criticalCount > 0) body += `${criticalCount} critical`;
  if (warningCount > 0) body += `${body ? ', ' : ''}${warningCount} warning`;

  // Escape quotes for osascript
  const escapedBody = body.replace(/"/g, '\\"');
  const escapedSummary = report.summary.replace(/"/g, '\\"');

  return `osascript -e 'display notification "${escapedBody}" with title "Ralph Heartbeat" subtitle "${escapedSummary}"'`;
}

function getExitCode(report) {
  if (!report.alerts || report.alerts.length === 0) return 0;
  const hasCriticalOrWarning = report.alerts.some(a => a.severity === 'critical' || a.severity === 'warning');
  return hasCriticalOrWarning ? 1 : 0;
}
```

Update `module.exports` to include the new functions:

```js
module.exports = {
  heartbeat,
  getDefaultHeartbeatConfig,
  loadHeartbeatConfig,
  evaluateLoop,
  buildSummary,
  saveLastHeartbeat,
  loadLastHeartbeat,
  shouldNotify,
  buildMacosNotification,
  getExitCode
};
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `node --test test/heartbeat.test.js`
Expected: All 17 tests PASS

- [ ] **Step 3: Commit**

```bash
git add lib/heartbeat.js
git commit -m "feat: add heartbeat notification dispatch and deduplication"
```

---

### Task 5: CLI Heartbeat Command + Formatted Output

**Files:**
- Modify: `lib/heartbeat.js` (add `formatReport` function)
- Modify: `lib/cli.js`:230-290 (add `heartbeat` subcommand)
- Modify: `config-loader.js`:33,232-253 (import and expose on manager)

- [ ] **Step 1: Add `formatReport()` to `lib/heartbeat.js`**

Add before `module.exports`:

```js
function formatReport(report) {
  const chalk = require('chalk');
  const lines = [];

  lines.push('');
  lines.push(chalk.magenta(`\u2764 Loop Heartbeat \u2014 ${new Date(report.timestamp).toLocaleString()}`));
  lines.push('');

  // Group alerts by severity
  const critical = report.alerts.filter(a => a.severity === 'critical');
  const warning = report.alerts.filter(a => a.severity === 'warning');
  const info = report.alerts.filter(a => a.severity === 'info');

  if (critical.length > 0) {
    lines.push(chalk.red.bold('\u{1F534} CRITICAL'));
    for (const a of critical) {
      lines.push(chalk.red(`   \u2717 ${a.name} \u2014 ${a.message}`));
    }
    lines.push('');
  }

  if (warning.length > 0) {
    lines.push(chalk.yellow.bold('\u{1F7E1} WARNING'));
    for (const a of warning) {
      lines.push(chalk.yellow(`   \u26A0 ${a.name} \u2014 ${a.message}`));
    }
    lines.push('');
  }

  if (info.length > 0) {
    lines.push(chalk.blue.bold('\u{1F535} INFO'));
    for (const a of info) {
      lines.push(chalk.blue(`   \u2139 ${a.name} \u2014 ${a.message}`));
    }
    lines.push('');
  }

  if (report.healthy.length > 0) {
    lines.push(chalk.green.bold('\u{1F7E2} HEALTHY'));
    for (const h of report.healthy) {
      lines.push(chalk.green(`   \u25CF ${h.name} [${h.phase}] ${h.iteration}`));
    }
    lines.push('');
  }

  lines.push(`Summary: ${report.summary}`);
  lines.push('');

  return lines.join('\n');
}
```

Add `formatReport` to `module.exports`.

- [ ] **Step 2: Add heartbeat methods to `config-loader.js`**

In the import line (line 33), add heartbeat imports:

```js
const { heartbeat: runHeartbeat, formatReport, getExitCode, saveLastHeartbeat, shouldNotify, buildMacosNotification, loadHeartbeatConfig, getDefaultHeartbeatConfig } = require('./lib/heartbeat');
```

Add methods to `ClaudeConfigManager` class (after the existing loop methods around line 253):

```js
  loopHeartbeat(options = {}) {
    const report = runHeartbeat(this.installDir);

    if (options.json) {
      console.log(JSON.stringify(report, null, 2));
    } else if (options.quiet) {
      if (getExitCode(report) === 1) {
        console.log(formatReport(report));
      }
    } else {
      console.log(formatReport(report));
    }

    if (options.notify) {
      const config = loadHeartbeatConfig(this.installDir);
      const newAlerts = report.alerts.filter(a =>
        (a.severity === 'critical' || a.severity === 'warning') &&
        shouldNotify(this.installDir, a, config.cooldownMinutes || 15)
      );

      if (newAlerts.length > 0) {
        // macOS notification
        if (config.notifications?.macos?.enabled !== false) {
          const cmd = buildMacosNotification(report);
          try {
            require('child_process').execSync(cmd);
          } catch (e) {
            // osascript may fail in non-GUI contexts
          }
        }

        // Slack webhook
        if (config.notifications?.slack?.enabled && config.notifications?.slack?.webhookUrl) {
          const https = require('https');
          const url = new URL(config.notifications.slack.webhookUrl);
          const payload = JSON.stringify({ text: `Ralph Heartbeat: ${report.summary}` });
          const req = https.request({ hostname: url.hostname, path: url.pathname, method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          req.write(payload);
          req.end();
        }

        saveLastHeartbeat(this.installDir, report);
      }
    }

    return report;
  }
```

- [ ] **Step 3: Add `heartbeat` subcommand to `lib/cli.js`**

In `lib/cli.js`, inside the `case 'loop':` block (around line 275, before `} else if (args[1] === 'inject')`), add:

```js
      } else if (args[1] === 'heartbeat') {
        const options = {
          notify: args.includes('--notify'),
          quiet: args.includes('--quiet'),
          json: args.includes('--json')
        };
        const report = manager.loopHeartbeat(options);
        if (options.quiet) {
          process.exitCode = report.alerts.some(a => a.severity === 'critical' || a.severity === 'warning') ? 1 : 0;
        }
```

Also add to the help text (around line 458, after `cmd('loop config', ...)`):

```js
      cmd('loop heartbeat', 'Check loop health'),
      cmd('loop heartbeat --notify', 'Check + send notifications'),
      cmd('loop heartbeat --quiet', 'Silent unless alerts'),
```

- [ ] **Step 4: Run all tests**

Run: `npm test`
Expected: All tests pass (existing + new heartbeat tests)

- [ ] **Step 5: Commit**

```bash
git add lib/heartbeat.js lib/cli.js config-loader.js
git commit -m "feat: add 'coder-config loop heartbeat' CLI command with formatted output"
```

---

### Task 6: Heartbeat Config via `loop config`

**Files:**
- Modify: `lib/loops.js`:627-658 (update `loopConfig` to handle nested heartbeat keys)
- Modify: `lib/cli.js`:264-274 (update config arg parsing)

- [ ] **Step 1: Update `loopConfig` in `lib/loops.js` to handle nested heartbeat config**

Replace the `loopConfig` function (lines 627-658) with:

```js
function loopConfig(installDir, updates = null) {
  const data = loadLoops(installDir);
  data.config = data.config || getDefaultConfig();

  if (!updates) {
    console.log('\n\u2699\uFE0F  Loop Configuration:\n');
    console.log(`   Max Iterations: ${data.config.maxIterations}`);
    console.log(`   Auto-approve Plan: ${data.config.autoApprovePlan}`);
    console.log(`   Max Clarify Iterations: ${data.config.maxClarifyIterations}`);
    console.log(`   Completion Promise: ${data.config.completionPromise || 'DONE'}`);

    // Show heartbeat config if present
    if (data.config.heartbeat) {
      const hb = data.config.heartbeat;
      console.log('');
      console.log('   Heartbeat:');
      console.log(`     Stale Threshold: ${hb.staleThresholdMinutes || 30}m`);
      console.log(`     Iteration Limit: ${hb.iterationLimitPercent || 80}%`);
      console.log(`     Cooldown: ${hb.cooldownMinutes || 15}m`);
      if (hb.notifications) {
        console.log(`     macOS Notifications: ${hb.notifications.macos?.enabled !== false ? 'on' : 'off'}`);
        console.log(`     Slack: ${hb.notifications.slack?.enabled ? `on (${hb.notifications.slack.channel || 'no channel'})` : 'off'}`);
      }
    }

    console.log('');
    return data.config;
  }

  // Apply updates — support dot-notation for heartbeat keys
  for (const [key, value] of Object.entries(updates)) {
    if (key.startsWith('heartbeat.')) {
      if (!data.config.heartbeat) {
        const { getDefaultHeartbeatConfig } = require('./heartbeat');
        data.config.heartbeat = getDefaultHeartbeatConfig();
      }
      setNestedValue(data.config.heartbeat, key.replace('heartbeat.', ''), value);
    } else if (key === 'maxIterations') {
      data.config.maxIterations = parseInt(value, 10);
    } else if (key === 'autoApprovePlan') {
      data.config.autoApprovePlan = value === true || value === 'true';
    } else if (key === 'maxClarifyIterations') {
      data.config.maxClarifyIterations = parseInt(value, 10);
    } else if (key === 'completionPromise') {
      data.config.completionPromise = value;
    }
  }

  saveLoops(installDir, data);
  console.log('\u2713 Configuration updated');
  return data.config;
}

function setNestedValue(obj, dotPath, value) {
  const parts = dotPath.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]] || typeof current[parts[i]] !== 'object') {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }
  // Auto-convert "true"/"false" strings to booleans
  if (value === 'true') value = true;
  else if (value === 'false') value = false;
  // Auto-convert numeric strings
  else if (/^\d+$/.test(value)) value = parseInt(value, 10);
  current[parts[parts.length - 1]] = value;
}
```

- [ ] **Step 2: Update CLI arg parsing in `lib/cli.js`**

Replace the existing `loop config` block (around lines 264-274) with:

```js
      } else if (args[1] === 'config') {
        // Support: loop config key value (dot-notation for heartbeat)
        if (args[2] && args[3] !== undefined) {
          const updates = { [args[2]]: args[3] };
          manager.loopConfig(updates);
        } else if (args[2]) {
          // Show specific key
          const config = manager.loopConfig();
        } else {
          // Existing flag-based parsing for backwards compat
          const updates = {};
          const maxIterIdx = args.indexOf('--max-iterations');
          if (maxIterIdx !== -1) updates.maxIterations = args[maxIterIdx + 1];
          if (args.includes('--auto-approve-plan')) updates.autoApprovePlan = true;
          if (args.includes('--no-auto-approve-plan')) updates.autoApprovePlan = false;
          if (Object.keys(updates).length > 0) {
            manager.loopConfig(updates);
          } else {
            manager.loopConfig();
          }
        }
```

- [ ] **Step 3: Run all tests**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add lib/loops.js lib/cli.js
git commit -m "feat: support heartbeat config via 'loop config' with dot-notation keys"
```

---

### Task 7: Web UI API Endpoint

**Files:**
- Modify: `ui/routes/loops.js`:601-627 (add endpoint and export)
- Modify: `ui/server.cjs` (wire route if needed — check how routes are registered)

- [ ] **Step 1: Check how routes are registered in `ui/server.cjs`**

Read `ui/server.cjs` to find how loop routes are mounted. Look for the pattern used to register loop endpoints so we follow it exactly.

- [ ] **Step 2: Add `getHeartbeat` function to `ui/routes/loops.js`**

Add before `module.exports`:

```js
function getHeartbeat(manager) {
  if (!manager) return { error: 'Manager not available' };
  const { heartbeat: runHeartbeat } = require('../../lib/heartbeat');
  return runHeartbeat(manager.installDir);
}
```

Add `getHeartbeat` to `module.exports`.

- [ ] **Step 3: Register the endpoint in `ui/server.cjs`**

Following the existing pattern for loop endpoints, add:

```js
app.get('/api/loops/heartbeat', (req, res) => {
  const result = loopRoutes.getHeartbeat(manager);
  res.json(result);
});
```

Place this alongside the other `/api/loops/` routes.

- [ ] **Step 4: Run all tests**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add ui/routes/loops.js ui/server.cjs
git commit -m "feat: add GET /api/loops/heartbeat endpoint"
```

---

### Task 8: CHANGELOG Update

**Files:**
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Add heartbeat entry to CHANGELOG.md**

Under `## [Unreleased]` > `### Added`, add:

```markdown
- **Ralph Loop Heartbeat** - Supervisor/monitoring system for autonomous loops
  - `coder-config loop heartbeat` prints health report (failed, stale, blocked, iteration limit, phase gate)
  - `--notify` flag dispatches macOS native notifications and Slack webhooks
  - `--quiet` flag for cron/scheduled use (exit code 1 on critical/warning alerts)
  - `--json` flag for machine-readable output
  - Per-loop stale threshold override via `heartbeat.staleThresholdMinutes` in loop state
  - Deduplication prevents repeated notifications within configurable cooldown
  - Heartbeat config via `coder-config loop config heartbeat.<key> <value>`
  - Web UI: `GET /api/loops/heartbeat` endpoint returns health report JSON
```

- [ ] **Step 2: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: add heartbeat feature to CHANGELOG"
```

---

### Task 9: Final Integration Test

**Files:**
- No new files — manual verification

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: All tests pass (385 existing + 17 new heartbeat tests = 402+)

- [ ] **Step 2: Manual CLI smoke test**

```bash
# Create a test loop
node cli.js loop create "Test heartbeat monitoring"

# Run heartbeat (should show 1 pending loop — no alerts since pending is not active)
node cli.js loop heartbeat

# Start the loop
node cli.js loop start <id-from-above>

# Run heartbeat again (should show 1 healthy)
node cli.js loop heartbeat

# JSON output
node cli.js loop heartbeat --json

# Quiet mode
node cli.js loop heartbeat --quiet
echo $?  # Should be 0

# Config display
node cli.js loop config

# Set heartbeat config
node cli.js loop config heartbeat.staleThresholdMinutes 15

# Clean up
node cli.js loop delete <id-from-above>
```

- [ ] **Step 3: Commit any fixes if needed**

Only if smoke testing reveals issues.

---

## Deferred Items

These are called out in the spec but deferred from this plan:

### Scheduled Agent (`--schedule` / `--unschedule`)

The scheduled agent uses the `schedule` skill to create a Claude Cowork trigger. This is a skill invocation, not code — run `coder-config loop heartbeat --schedule` after implementation to set up the trigger interactively. The CLI flags can be added as a follow-up if we want to automate the trigger creation programmatically.

### Web UI Health Banner (React component)

The spec calls for a health banner at the top of the Loops view. This requires inspecting the React component structure in `ui/src/views/` and adding a component that polls `GET /api/loops/heartbeat`. Deferred to a follow-up since it depends on the current Loops view layout. The API endpoint (Task 7) provides the data it needs.
