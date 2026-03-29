const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  heartbeat, getDefaultHeartbeatConfig,
  saveLastHeartbeat, loadLastHeartbeat, shouldNotify,
  buildMacosNotification, getExitCode
} = require('../lib/heartbeat.js');
const { saveLoops, saveLoopState, getLoopDir } = require('../lib/loops.js');

describe('heartbeat', () => {
  let tempDir;
  let installDir;
  let originalLog;
  let originalError;

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
    console.log = () => {};
    console.error = () => {};
  });

  // 1. getDefaultHeartbeatConfig returns expected defaults
  describe('getDefaultHeartbeatConfig', () => {
    it('returns expected defaults', () => {
      const cfg = getDefaultHeartbeatConfig();
      assert.strictEqual(cfg.staleThresholdMinutes, 30);
      assert.strictEqual(cfg.iterationLimitPercent, 80);
      assert.strictEqual(cfg.cooldownMinutes, 15);
      assert.strictEqual(cfg.notifications.macos.enabled, true);
      assert.strictEqual(cfg.notifications.slack.enabled, false);
    });
  });

  // 2. Returns empty report when no loops exist
  it('returns empty report when no loops exist', () => {
    const report = heartbeat(installDir);
    assert.ok(report.timestamp);
    assert.strictEqual(report.activeLoops, 0);
    assert.deepStrictEqual(report.alerts, []);
    assert.deepStrictEqual(report.healthy, []);
    assert.ok(typeof report.summary === 'string');
  });

  // 3. Returns healthy report when all loops running normally
  it('returns healthy report when all loops running normally', () => {
    saveLoops(installDir, {
      loops: [{ id: 'loop_001', name: 'My Loop' }],
      activeId: 'loop_001',
      config: {}
    });
    fs.mkdirSync(getLoopDir(installDir, 'loop_001'), { recursive: true });
    saveLoopState(installDir, 'loop_001', {
      id: 'loop_001',
      name: 'My Loop',
      status: 'running',
      phase: 'execute',
      iterations: { current: 5, max: 50 }
    });

    const report = heartbeat(installDir);
    assert.strictEqual(report.activeLoops, 1);
    assert.deepStrictEqual(report.alerts, []);
    assert.strictEqual(report.healthy.length, 1);
    assert.strictEqual(report.healthy[0].loopId, 'loop_001');
    assert.strictEqual(report.healthy[0].name, 'My Loop');
    assert.strictEqual(report.healthy[0].phase, 'execute');
    assert.strictEqual(report.healthy[0].iteration, 5);
  });

  // 4. Detects failed loops with critical severity
  it('detects failed loops with critical severity', () => {
    saveLoops(installDir, {
      loops: [{ id: 'loop_002', name: 'Bad Loop' }],
      activeId: null,
      config: {}
    });
    fs.mkdirSync(getLoopDir(installDir, 'loop_002'), { recursive: true });
    saveLoopState(installDir, 'loop_002', {
      id: 'loop_002',
      name: 'Bad Loop',
      status: 'failed',
      phase: 'execute',
      iterations: { current: 10, max: 50 }
    });

    const report = heartbeat(installDir);
    assert.strictEqual(report.alerts.length, 1);
    const alert = report.alerts[0];
    assert.strictEqual(alert.loopId, 'loop_002');
    assert.strictEqual(alert.type, 'failed');
    assert.strictEqual(alert.severity, 'critical');
  });

  // 5. Detects stale loops with warning severity
  it('detects stale loops with warning severity', () => {
    saveLoops(installDir, {
      loops: [{ id: 'loop_003', name: 'Stale Loop' }],
      activeId: 'loop_003',
      config: {}
    });
    fs.mkdirSync(getLoopDir(installDir, 'loop_003'), { recursive: true });
    saveLoopState(installDir, 'loop_003', {
      id: 'loop_003',
      name: 'Stale Loop',
      status: 'running',
      phase: 'execute',
      iterations: { current: 5, max: 50 }
    });

    // Overwrite updatedAt with old timestamp
    const stateFile = path.join(getLoopDir(installDir, 'loop_003'), 'state.json');
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    state.updatedAt = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 60 minutes ago
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2) + '\n');

    const report = heartbeat(installDir);
    const staleAlert = report.alerts.find(a => a.type === 'stale');
    assert.ok(staleAlert, 'Expected a stale alert');
    assert.strictEqual(staleAlert.loopId, 'loop_003');
    assert.strictEqual(staleAlert.severity, 'warning');
  });

  // 6. Detects iteration_limit (>=80% of max) with warning severity
  it('detects iteration_limit at or above 80% with warning severity', () => {
    saveLoops(installDir, {
      loops: [{ id: 'loop_004', name: 'Near Limit Loop' }],
      activeId: 'loop_004',
      config: {}
    });
    fs.mkdirSync(getLoopDir(installDir, 'loop_004'), { recursive: true });
    saveLoopState(installDir, 'loop_004', {
      id: 'loop_004',
      name: 'Near Limit Loop',
      status: 'running',
      phase: 'execute',
      iterations: { current: 40, max: 50 } // 80% exactly
    });

    const report = heartbeat(installDir);
    const limitAlert = report.alerts.find(a => a.type === 'iteration_limit');
    assert.ok(limitAlert, 'Expected an iteration_limit alert');
    assert.strictEqual(limitAlert.loopId, 'loop_004');
    assert.strictEqual(limitAlert.severity, 'warning');
  });

  // 7. Detects phase_gate (plan phase + running) with info severity
  it('detects phase_gate for plan phase running loops with info severity', () => {
    saveLoops(installDir, {
      loops: [{ id: 'loop_005', name: 'Planning Loop' }],
      activeId: 'loop_005',
      config: {}
    });
    fs.mkdirSync(getLoopDir(installDir, 'loop_005'), { recursive: true });
    saveLoopState(installDir, 'loop_005', {
      id: 'loop_005',
      name: 'Planning Loop',
      status: 'running',
      phase: 'plan',
      iterations: { current: 2, max: 50 }
    });

    const report = heartbeat(installDir);
    const gateAlert = report.alerts.find(a => a.type === 'phase_gate');
    assert.ok(gateAlert, 'Expected a phase_gate alert');
    assert.strictEqual(gateAlert.loopId, 'loop_005');
    assert.strictEqual(gateAlert.severity, 'info');
  });

  // 8. Detects blocked (paused with pauseReason) with info severity
  it('detects blocked loops (paused with pauseReason) with info severity', () => {
    saveLoops(installDir, {
      loops: [{ id: 'loop_006', name: 'Blocked Loop' }],
      activeId: null,
      config: {}
    });
    fs.mkdirSync(getLoopDir(installDir, 'loop_006'), { recursive: true });
    saveLoopState(installDir, 'loop_006', {
      id: 'loop_006',
      name: 'Blocked Loop',
      status: 'paused',
      phase: 'execute',
      iterations: { current: 10, max: 50 },
      pauseReason: 'Waiting for user input'
    });

    const report = heartbeat(installDir);
    const blockedAlert = report.alerts.find(a => a.type === 'blocked');
    assert.ok(blockedAlert, 'Expected a blocked alert');
    assert.strictEqual(blockedAlert.loopId, 'loop_006');
    assert.strictEqual(blockedAlert.severity, 'info');
    assert.ok(blockedAlert.message.includes('Waiting for user input'));
  });

  // 9. Per-loop stale threshold override takes precedence
  it('uses per-loop staleThresholdMinutes when set', () => {
    saveLoops(installDir, {
      loops: [{ id: 'loop_007', name: 'Custom Threshold Loop' }],
      activeId: 'loop_007',
      config: {}
    });
    fs.mkdirSync(getLoopDir(installDir, 'loop_007'), { recursive: true });
    saveLoopState(installDir, 'loop_007', {
      id: 'loop_007',
      name: 'Custom Threshold Loop',
      status: 'running',
      phase: 'execute',
      iterations: { current: 5, max: 50 },
      heartbeat: { staleThresholdMinutes: 5 } // override to 5 min
    });

    // Set updatedAt to 10 minutes ago — past custom threshold but not global (30 min)
    const stateFile = path.join(getLoopDir(installDir, 'loop_007'), 'state.json');
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    state.updatedAt = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // 10 minutes ago
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2) + '\n');

    // With global threshold (30 min), 10 min age should NOT trigger
    // With per-loop threshold (5 min), 10 min age SHOULD trigger
    const report = heartbeat(installDir);
    const staleAlert = report.alerts.find(a => a.type === 'stale');
    assert.ok(staleAlert, 'Expected stale alert due to per-loop threshold override');
    assert.strictEqual(staleAlert.loopId, 'loop_007');
  });

  // 10. Accurate summary string
  it('produces accurate summary string', () => {
    saveLoops(installDir, {
      loops: [
        { id: 'loop_008a', name: 'Healthy Loop' },
        { id: 'loop_008b', name: 'Failed Loop' }
      ],
      activeId: 'loop_008a',
      config: {}
    });
    fs.mkdirSync(getLoopDir(installDir, 'loop_008a'), { recursive: true });
    saveLoopState(installDir, 'loop_008a', {
      id: 'loop_008a',
      name: 'Healthy Loop',
      status: 'running',
      phase: 'execute',
      iterations: { current: 5, max: 50 }
    });
    fs.mkdirSync(getLoopDir(installDir, 'loop_008b'), { recursive: true });
    saveLoopState(installDir, 'loop_008b', {
      id: 'loop_008b',
      name: 'Failed Loop',
      status: 'failed',
      phase: 'execute',
      iterations: { current: 10, max: 50 }
    });

    const report = heartbeat(installDir);
    assert.ok(typeof report.summary === 'string', 'summary should be a string');
    assert.ok(report.summary.includes('2 active loops'), `Expected "2 active loops" in: ${report.summary}`);
    assert.ok(report.summary.includes('1 critical'), `Expected "1 critical" in: ${report.summary}`);
  });

  // 11. Skips completed and cancelled loops
  it('skips completed and cancelled loops', () => {
    saveLoops(installDir, {
      loops: [
        { id: 'loop_009a', name: 'Done Loop' },
        { id: 'loop_009b', name: 'Cancelled Loop' },
        { id: 'loop_009c', name: 'Active Loop' }
      ],
      activeId: 'loop_009c',
      config: {}
    });

    fs.mkdirSync(getLoopDir(installDir, 'loop_009a'), { recursive: true });
    saveLoopState(installDir, 'loop_009a', {
      id: 'loop_009a', name: 'Done Loop', status: 'completed',
      phase: 'execute', iterations: { current: 50, max: 50 }
    });

    fs.mkdirSync(getLoopDir(installDir, 'loop_009b'), { recursive: true });
    saveLoopState(installDir, 'loop_009b', {
      id: 'loop_009b', name: 'Cancelled Loop', status: 'cancelled',
      phase: 'execute', iterations: { current: 20, max: 50 }
    });

    fs.mkdirSync(getLoopDir(installDir, 'loop_009c'), { recursive: true });
    saveLoopState(installDir, 'loop_009c', {
      id: 'loop_009c', name: 'Active Loop', status: 'running',
      phase: 'execute', iterations: { current: 10, max: 50 }
    });

    const report = heartbeat(installDir);
    assert.strictEqual(report.activeLoops, 1);
    assert.strictEqual(report.healthy.length, 1);
    assert.strictEqual(report.healthy[0].loopId, 'loop_009c');
    assert.deepStrictEqual(report.alerts, []);
  });
});

describe('saveLastHeartbeat / loadLastHeartbeat', () => {
  let tempDir;
  let installDir;

  before(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'heartbeat-dedup-test-'));
  });

  after(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    installDir = path.join(tempDir, `install-${Date.now()}-${Math.random()}`);
    fs.mkdirSync(installDir, { recursive: true });
  });

  // 12. saveLastHeartbeat writes alertHashes, loadLastHeartbeat reads them back
  it('saves report with alert hashes and reads them back', () => {
    const report = {
      alerts: [
        { loopId: 'loop_001', type: 'failed', severity: 'critical', name: 'Test', message: 'failed' },
        { loopId: 'loop_002', type: 'stale', severity: 'warning', name: 'Test2', message: 'stale' }
      ]
    };
    saveLastHeartbeat(installDir, report);
    const loaded = loadLastHeartbeat(installDir);
    assert.ok(loaded, 'loadLastHeartbeat should return an object');
    assert.ok(loaded.alertHashes, 'should have alertHashes');
    assert.ok(typeof loaded.alertHashes['loop_001:failed'] === 'number', 'should have loop_001:failed hash');
    assert.ok(typeof loaded.alertHashes['loop_002:stale'] === 'number', 'should have loop_002:stale hash');
    assert.ok(typeof loaded.timestamp === 'number', 'should have numeric timestamp');
  });

  // 13. shouldNotify returns false for duplicate alerts within cooldown
  it('shouldNotify returns false for duplicate within cooldown', () => {
    const report = {
      alerts: [{ loopId: 'loop_001', type: 'failed', severity: 'critical', name: 'Test', message: 'failed' }]
    };
    saveLastHeartbeat(installDir, report);
    const alert = { loopId: 'loop_001', type: 'failed' };
    const result = shouldNotify(installDir, alert, 15);
    assert.strictEqual(result, false, 'should not notify within cooldown');
  });

  // 14. shouldNotify returns true after cooldown expires
  it('shouldNotify returns true after cooldown expires', () => {
    const twentyMinutesAgo = Date.now() - 20 * 60 * 1000;
    const loopsDir = path.join(installDir, 'loops');
    fs.mkdirSync(loopsDir, { recursive: true });
    fs.writeFileSync(
      path.join(loopsDir, 'last-heartbeat.json'),
      JSON.stringify({ alertHashes: { 'loop_001:failed': twentyMinutesAgo }, timestamp: twentyMinutesAgo })
    );
    const alert = { loopId: 'loop_001', type: 'failed' };
    const result = shouldNotify(installDir, alert, 15);
    assert.strictEqual(result, true, 'should notify after cooldown expires');
  });
});

describe('buildMacosNotification', () => {
  // 15. buildMacosNotification constructs osascript command
  it('constructs command containing osascript, Ralph Heartbeat, and critical', () => {
    const report = {
      alerts: [
        { loopId: 'loop_001', type: 'failed', severity: 'critical', name: 'Test', message: 'Loop failed' },
        { loopId: 'loop_002', type: 'stale', severity: 'warning', name: 'Test2', message: 'Loop stale' }
      ],
      summary: '2 active loops, 1 critical, 1 warning'
    };
    const cmd = buildMacosNotification(report);
    assert.ok(cmd.includes('osascript'), 'command should include osascript');
    assert.ok(cmd.includes('Ralph Heartbeat'), 'command should include "Ralph Heartbeat"');
    assert.ok(cmd.includes('critical'), 'command should include "critical"');
  });
});

describe('getExitCode', () => {
  // 16. getExitCode returns 0 when no alerts
  it('returns 0 when healthy (no alerts)', () => {
    const report = { alerts: [] };
    assert.strictEqual(getExitCode(report), 0);
  });

  // 17. getExitCode returns 1 when alerts with warning or critical
  it('returns 1 when alerts include warning or critical', () => {
    const report = {
      alerts: [
        { loopId: 'loop_001', type: 'stale', severity: 'warning', name: 'Test', message: 'stale' }
      ]
    };
    assert.strictEqual(getExitCode(report), 1);

    const report2 = {
      alerts: [
        { loopId: 'loop_001', type: 'failed', severity: 'critical', name: 'Test', message: 'failed' }
      ]
    };
    assert.strictEqual(getExitCode(report2), 1);
  });

  // 18. getExitCode returns 0 when only info alerts
  it('returns 0 when only info alerts', () => {
    const report = {
      alerts: [
        { loopId: 'loop_001', type: 'phase_gate', severity: 'info', name: 'Test', message: 'gate' },
        { loopId: 'loop_002', type: 'blocked', severity: 'info', name: 'Test2', message: 'blocked' }
      ]
    };
    assert.strictEqual(getExitCode(report), 0);
  });
});
