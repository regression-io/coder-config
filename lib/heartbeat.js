/**
 * Heartbeat module - monitors Ralph Loop health
 */

const fs = require('fs');
const path = require('path');
const { loadLoops, loadLoopState, getLoopsPath } = require('./loops.js');

/**
 * Get default heartbeat configuration
 */
function getDefaultHeartbeatConfig() {
  return {
    staleThresholdMinutes: 30,
    iterationLimitPercent: 80,
    cooldownMinutes: 15,
    notifications: {
      macos: { enabled: true },
      slack: { enabled: false }
    }
  };
}

/**
 * Load heartbeat config from loops.json, merged with defaults
 * @param {string} installDir - path to coder-config install dir
 * @returns {object} merged heartbeat config
 */
function loadHeartbeatConfig(installDir) {
  const data = loadLoops(installDir);
  return { ...getDefaultHeartbeatConfig(), ...data.config?.heartbeat };
}

/**
 * Evaluate a single loop state and return any alerts
 * @param {object} state - loop state object
 * @param {object} globalConfig - heartbeat config (merged defaults)
 * @param {Date} now - current date/time
 * @returns {Array} array of alert objects for this loop
 */
function evaluateLoop(state, globalConfig, now) {
  const alerts = [];
  const status = state.status || 'unknown';
  const name = state.name || state.id;

  // Check: failed
  if (status === 'failed') {
    alerts.push({
      loopId: state.id,
      name,
      type: 'failed',
      message: `Loop "${name}" has failed`,
      severity: 'critical'
    });
    return alerts;
  }

  // Check: stale
  const perLoopThreshold = state.heartbeat && state.heartbeat.staleThresholdMinutes != null
    ? state.heartbeat.staleThresholdMinutes
    : globalConfig.staleThresholdMinutes;

  if (state.updatedAt) {
    const updatedAt = new Date(state.updatedAt);
    const ageMinutes = ((now || new Date()).getTime() - updatedAt.getTime()) / 60000;
    if (ageMinutes >= perLoopThreshold) {
      alerts.push({
        loopId: state.id,
        name,
        type: 'stale',
        message: `Loop "${name}" has not updated in ${Math.floor(ageMinutes)} minutes`,
        severity: 'warning'
      });
    }
  }

  // Check: iteration_limit
  const iterations = state.iterations || {};
  const current = iterations.current != null ? iterations.current : 0;
  const max = iterations.max != null ? iterations.max : 0;
  if (max > 0) {
    const pct = (current / max) * 100;
    if (pct >= globalConfig.iterationLimitPercent) {
      alerts.push({
        loopId: state.id,
        name,
        type: 'iteration_limit',
        message: `Loop "${name}" is at ${Math.round(pct)}% of iteration limit (${current}/${max})`,
        severity: 'warning'
      });
    }
  }

  // Check: phase_gate (plan phase + running)
  if (state.phase === 'plan' && status === 'running') {
    alerts.push({
      loopId: state.id,
      name,
      type: 'phase_gate',
      message: `Loop "${name}" is waiting at plan phase gate`,
      severity: 'info'
    });
  }

  // Check: blocked (paused with pauseReason)
  if (status === 'paused' && state.pauseReason) {
    alerts.push({
      loopId: state.id,
      name,
      type: 'blocked',
      message: `Loop "${name}" is blocked: ${state.pauseReason}`,
      severity: 'info'
    });
  }

  return alerts;
}

/**
 * Build a summary string from heartbeat results
 * @param {number} activeLoops - count of active (non-terminal) loops
 * @param {Array} alerts - array of alert objects
 * @param {Array} healthy - array of healthy loop objects
 * @returns {string} summary string
 */
function buildSummary(activeLoops, alerts, healthy) {
  if (alerts.length === 0) {
    return `${activeLoops} active loop${activeLoops !== 1 ? 's' : ''}, all healthy`;
  }
  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;
  const infoCount = alerts.filter(a => a.severity === 'info').length;
  const parts = [];
  if (criticalCount > 0) parts.push(`${criticalCount} critical`);
  if (warningCount > 0) parts.push(`${warningCount} warning${warningCount !== 1 ? 's' : ''}`);
  if (infoCount > 0) parts.push(`${infoCount} info`);
  return `${activeLoops} active loop${activeLoops !== 1 ? 's' : ''}, ${parts.join(', ')}`;
}

/**
 * Evaluate heartbeat for all active loops
 * @param {string} installDir - path to coder-config install dir
 * @param {object} [config] - optional heartbeat config overrides
 * @returns {object} report with alerts and healthy loops
 */
function heartbeat(installDir, config) {
  const hbConfig = Object.assign({}, getDefaultHeartbeatConfig(), config || {});

  const registry = loadLoops(installDir);
  const loops = registry.loops || [];

  const alerts = [];
  const healthy = [];
  const terminalStates = new Set(['completed', 'cancelled']);
  const now = new Date();

  for (const entry of loops) {
    const state = loadLoopState(installDir, entry.id);
    if (!state) continue;

    const status = state.status || 'unknown';
    if (terminalStates.has(status)) continue;

    const name = state.name || entry.name || entry.id;
    // Ensure state has id and name for evaluateLoop
    const stateWithMeta = { ...state, id: entry.id, name };

    const loopAlerts = evaluateLoop(stateWithMeta, hbConfig, now);

    if (loopAlerts.length > 0) {
      alerts.push(...loopAlerts);
    } else {
      const iterations = state.iterations || {};
      const current = iterations.current != null ? iterations.current : 0;
      healthy.push({
        loopId: entry.id,
        name,
        phase: state.phase || null,
        iteration: current
      });
    }
  }

  const activeLoops = loops.filter(e => {
    const state = loadLoopState(installDir, e.id);
    if (!state) return false;
    const status = state.status || 'unknown';
    return !terminalStates.has(status);
  }).length;

  const summary = buildSummary(activeLoops, alerts, healthy);

  return {
    timestamp: now.toISOString(),
    activeLoops,
    alerts,
    healthy,
    summary
  };
}

module.exports = {
  heartbeat,
  getDefaultHeartbeatConfig,
  loadHeartbeatConfig,
  evaluateLoop,
  buildSummary
};
