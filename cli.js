#!/usr/bin/env node

/**
 * Claude Config CLI
 *
 * Configuration management for Claude Code
 * CLI-first with optional Web UI
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn, execSync } = require('child_process');

const args = process.argv.slice(2);
const command = args[0] || '';

// PID file for daemon mode
const PID_FILE = path.join(os.homedir(), '.claude-config', 'ui.pid');

// UI command needs special handling (starts web server with better error handling)
if (command === 'ui' || command === 'web' || command === 'server') {
  // Check for subcommand: ui stop, ui status
  const subcommand = args[1];
  if (subcommand === 'stop') {
    stopDaemon();
  } else if (subcommand === 'status') {
    checkDaemonStatus();
  } else {
    startUI();
  }
} else {
  // Pass everything to config-loader.js
  const loaderPath = path.join(__dirname, 'config-loader.js');
  const child = spawn('node', [loaderPath, ...args], {
    stdio: 'inherit',
    cwd: process.cwd()
  });

  child.on('close', (code) => {
    process.exit(code || 0);
  });
}

function stopDaemon() {
  if (!fs.existsSync(PID_FILE)) {
    console.log('No daemon running (PID file not found)');
    return;
  }

  try {
    const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim());
    process.kill(pid, 'SIGTERM');
    fs.unlinkSync(PID_FILE);
    console.log(`Stopped daemon (PID: ${pid})`);
  } catch (err) {
    if (err.code === 'ESRCH') {
      // Process doesn't exist, clean up PID file
      fs.unlinkSync(PID_FILE);
      console.log('Daemon was not running, cleaned up stale PID file');
    } else {
      console.error('Failed to stop daemon:', err.message);
    }
  }
}

function checkDaemonStatus() {
  if (!fs.existsSync(PID_FILE)) {
    console.log('Daemon: not running');
    return;
  }

  try {
    const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim());
    // Check if process is running
    process.kill(pid, 0);
    console.log(`Daemon: running (PID: ${pid})`);
    console.log(`UI available at: http://localhost:3333`);
  } catch (err) {
    console.log('Daemon: not running (stale PID file)');
    fs.unlinkSync(PID_FILE);
  }
}

function startDaemon(flags) {
  // Check if already running
  if (fs.existsSync(PID_FILE)) {
    try {
      const existingPid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim());
      process.kill(existingPid, 0);
      console.log(`Daemon already running (PID: ${existingPid})`);
      console.log(`UI available at: http://localhost:${flags.port}`);
      console.log('Use "claude-config ui stop" to stop the daemon');
      return;
    } catch (err) {
      // Process not running, clean up stale PID file
      fs.unlinkSync(PID_FILE);
    }
  }

  // Ensure PID directory exists
  const pidDir = path.dirname(PID_FILE);
  if (!fs.existsSync(pidDir)) {
    fs.mkdirSync(pidDir, { recursive: true });
  }

  // Log file for daemon output
  const logFile = path.join(pidDir, 'ui.log');

  // Build args for spawned process - must use --foreground since daemon is now default
  const spawnArgs = ['ui', '--foreground'];
  if (flags.port !== 3333) {
    spawnArgs.push('--port', String(flags.port));
  }
  if (flags.dir) {
    spawnArgs.push('--dir', flags.dir);
  }

  // Spawn detached process
  const out = fs.openSync(logFile, 'a');
  const err = fs.openSync(logFile, 'a');

  const child = spawn(process.execPath, [__filename, ...spawnArgs], {
    detached: true,
    stdio: ['ignore', out, err],
    cwd: os.homedir()
  });

  // Write PID file
  fs.writeFileSync(PID_FILE, String(child.pid));

  // Unref to allow parent to exit
  child.unref();

  console.log(`Started daemon (PID: ${child.pid})`);
  console.log(`UI available at: http://localhost:${flags.port}`);
  console.log(`Logs: ${logFile}`);
  console.log('\nCommands:');
  console.log('  claude-config ui status  - Check daemon status');
  console.log('  claude-config ui stop    - Stop the daemon');
}

function startUI() {
  // Parse UI-specific flags
  const flags = {
    port: 3333,
    dir: null, // Will default to active project or home
    foreground: false  // Default to daemon mode
  };

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--port' || arg === '-p') {
      const portArg = args[++i];
      if (!portArg || isNaN(parseInt(portArg))) {
        console.error('Error: --port requires a valid port number');
        process.exit(1);
      }
      flags.port = parseInt(portArg);
    } else if (arg.startsWith('--port=')) {
      const portVal = parseInt(arg.split('=')[1]);
      if (isNaN(portVal)) {
        console.error('Error: --port requires a valid port number');
        process.exit(1);
      }
      flags.port = portVal;
    } else if (arg === '--dir' || arg === '-d') {
      flags.dir = args[++i] || null;
    } else if (arg.startsWith('--dir=')) {
      flags.dir = arg.split('=')[1] || null;
    } else if (arg === '--foreground' || arg === '-f' || arg === '--daemon' || arg === '-D') {
      // --foreground runs in foreground, --daemon kept for backwards compat (now default)
      flags.foreground = (arg === '--foreground' || arg === '-f');
    } else if (!arg.startsWith('-') && fs.existsSync(arg) && fs.statSync(arg).isDirectory()) {
      flags.dir = arg;
    }
  }

  // Default: daemon mode (spawn detached and exit)
  if (!flags.foreground) {
    return startDaemon(flags);
  }

  // Validate port range
  if (flags.port < 1 || flags.port > 65535) {
    console.error('Error: Port must be between 1 and 65535');
    process.exit(1);
  }

  // Validate directory exists (if specified)
  if (flags.dir) {
    if (!fs.existsSync(flags.dir)) {
      console.error(`Error: Directory not found: ${flags.dir}`);
      process.exit(1);
    }

    if (!fs.statSync(flags.dir).isDirectory()) {
      console.error(`Error: Not a directory: ${flags.dir}`);
      process.exit(1);
    }

    flags.dir = path.resolve(flags.dir);
  }
  // If no dir specified, server will load from projects registry or use cwd

  // Load dependencies
  const serverPath = path.join(__dirname, 'ui', 'server.cjs');

  if (!fs.existsSync(serverPath)) {
    console.error('Error: UI server not found.');
    console.error('The package may not be installed correctly.');
    process.exit(1);
  }

  const distPath = path.join(__dirname, 'ui', 'dist');
  if (!fs.existsSync(distPath)) {
    console.error('Error: UI build not found.');
    console.error('Run "npm run build" to build the UI first.');
    process.exit(1);
  }

  let ConfigUIServer, ClaudeConfigManager;
  try {
    ConfigUIServer = require(serverPath);
    ClaudeConfigManager = require('./config-loader.js');
  } catch (err) {
    console.error('Error: Failed to load dependencies');
    console.error(err.message);
    if (err.message.includes('node-pty')) {
      console.error('\nThe terminal feature requires node-pty which failed to load.');
      console.error('Try reinstalling: npm rebuild node-pty');
    }
    process.exit(1);
  }

  // Handle server errors
  process.on('uncaughtException', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\nError: Port ${flags.port} is already in use.`);
      console.error(`Try a different port: claude-config ui --port ${flags.port + 1}`);
      process.exit(1);
    } else if (err.code === 'EACCES') {
      console.error(`\nError: Permission denied for port ${flags.port}.`);
      console.error('Ports below 1024 require elevated privileges.');
      process.exit(1);
    } else {
      console.error('\nUnexpected error:', err.message);
      process.exit(1);
    }
  });

  try {
    const manager = new ClaudeConfigManager();
    const server = new ConfigUIServer(flags.port, flags.dir, manager);
    server.start();
  } catch (err) {
    console.error('Error: Failed to start server');
    console.error(err.message);
    process.exit(1);
  }
}
