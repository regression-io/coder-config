#!/usr/bin/env node

/**
 * Coder Config CLI
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
const PID_FILE = path.join(os.homedir(), '.coder-config', 'ui.pid');

// LaunchAgent for macOS auto-start
const LAUNCH_AGENT_LABEL = 'io.regression.coder-config';
const LAUNCH_AGENT_PATH = path.join(os.homedir(), 'Library', 'LaunchAgents', `${LAUNCH_AGENT_LABEL}.plist`);

// UI command needs special handling (starts web server with better error handling)
if (command === 'ui' || command === 'web' || command === 'server') {
  // Check for subcommand: ui stop, ui status, ui install, ui uninstall
  const subcommand = args[1];
  if (subcommand === 'stop') {
    stopDaemon();
  } else if (subcommand === 'status') {
    checkDaemonStatus();
  } else if (subcommand === 'install') {
    installLaunchAgent();
  } else if (subcommand === 'uninstall') {
    uninstallLaunchAgent();
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
  // Check for LaunchAgent first (macOS)
  if (process.platform === 'darwin' && fs.existsSync(LAUNCH_AGENT_PATH)) {
    try {
      const { spawnSync } = require('child_process');
      const result = spawnSync('launchctl', ['list', LAUNCH_AGENT_LABEL], { encoding: 'utf8' });
      if (result.status === 0 && result.stdout) {
        // LaunchAgent is loaded, unload it to stop
        console.log('Stopping LaunchAgent daemon...');
        const unload = spawnSync('launchctl', ['unload', LAUNCH_AGENT_PATH], { encoding: 'utf8' });
        if (unload.status === 0) {
          console.log('Stopped daemon (LaunchAgent unloaded)');
          console.log('Run "coder-config ui" to restart');
          return;
        }
      }
    } catch {}
  }

  // Check PID file (manual daemon mode)
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
  // Check for LaunchAgent first (macOS)
  if (process.platform === 'darwin' && fs.existsSync(LAUNCH_AGENT_PATH)) {
    try {
      const { spawnSync } = require('child_process');
      const result = spawnSync('launchctl', ['list', LAUNCH_AGENT_LABEL], { encoding: 'utf8' });
      if (result.status === 0 && result.stdout) {
        // Parse the PID from output (format: "PID" = 12345;)
        const pidMatch = result.stdout.match(/"PID"\s*=\s*(\d+)/);
        if (pidMatch) {
          console.log(`Daemon: running via LaunchAgent (PID: ${pidMatch[1]})`);
          console.log(`UI available at: http://localhost:3333`);
          console.log(`Auto-start: enabled`);
          return;
        }
      }
    } catch {}
  }

  // Check PID file (manual daemon mode)
  if (fs.existsSync(PID_FILE)) {
    try {
      const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim());
      // Check if process is running
      process.kill(pid, 0);
      console.log(`Daemon: running (PID: ${pid})`);
      console.log(`UI available at: http://localhost:3333`);
      return;
    } catch (err) {
      fs.unlinkSync(PID_FILE);
    }
  }

  // Check if LaunchAgent exists but not running
  if (process.platform === 'darwin' && fs.existsSync(LAUNCH_AGENT_PATH)) {
    console.log('Daemon: not running (LaunchAgent installed but stopped)');
    console.log('Run: launchctl load ~/Library/LaunchAgents/io.regression.coder-config.plist');
  } else {
    console.log('Daemon: not running');
    console.log('Run: coder-config ui');
  }
}

function installLaunchAgent() {
  if (process.platform !== 'darwin') {
    console.error('Auto-start installation is only supported on macOS.');
    console.error('On Linux, create a systemd user service instead.');
    process.exit(1);
  }

  // Find the coder-config executable
  let execPath;
  try {
    execPath = execSync('which coder-config', { encoding: 'utf8' }).trim();
  } catch {
    execPath = path.join(__dirname, 'cli.js');
  }

  // Get the PATH that includes node
  let nodePath;
  try {
    nodePath = path.dirname(execSync('which node', { encoding: 'utf8' }).trim());
  } catch {
    nodePath = '/opt/homebrew/bin:/usr/local/bin';
  }
  const envPath = `${nodePath}:/usr/bin:/bin:/usr/sbin:/sbin`;

  const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${LAUNCH_AGENT_LABEL}</string>
    <key>ProgramArguments</key>
    <array>
        <string>${execPath}</string>
        <string>ui</string>
        <string>--foreground</string>
    </array>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>${envPath}</string>
    </dict>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${path.join(os.homedir(), '.coder-config', 'ui.log')}</string>
    <key>StandardErrorPath</key>
    <string>${path.join(os.homedir(), '.coder-config', 'ui.log')}</string>
    <key>WorkingDirectory</key>
    <string>${os.homedir()}</string>
</dict>
</plist>`;

  // Ensure LaunchAgents directory exists
  const launchAgentsDir = path.dirname(LAUNCH_AGENT_PATH);
  if (!fs.existsSync(launchAgentsDir)) {
    fs.mkdirSync(launchAgentsDir, { recursive: true });
  }

  // Ensure log directory exists
  const logDir = path.join(os.homedir(), '.coder-config');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  // Stop existing daemon if running
  if (fs.existsSync(PID_FILE)) {
    try {
      const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim());
      process.kill(pid, 'SIGTERM');
      fs.unlinkSync(PID_FILE);
    } catch {}
  }

  // Unload existing LaunchAgent if present (using spawn to avoid shell)
  if (fs.existsSync(LAUNCH_AGENT_PATH)) {
    try {
      const { spawnSync } = require('child_process');
      spawnSync('launchctl', ['unload', LAUNCH_AGENT_PATH], { stdio: 'ignore' });
    } catch {}
  }

  // Write plist file
  fs.writeFileSync(LAUNCH_AGENT_PATH, plistContent);

  // Load the LaunchAgent (using spawn to avoid shell injection)
  try {
    const { spawnSync } = require('child_process');
    const result = spawnSync('launchctl', ['load', LAUNCH_AGENT_PATH]);
    if (result.status !== 0) {
      throw new Error(result.stderr?.toString() || 'launchctl failed');
    }
  } catch (err) {
    console.error('Failed to load LaunchAgent:', err.message);
    process.exit(1);
  }

  console.log('✓ Installed auto-start for Coder Config UI');
  console.log('');
  console.log('The server will now:');
  console.log('  • Start automatically on login');
  console.log('  • Restart if it crashes');
  console.log('  • Run at http://localhost:3333');
  console.log('');
  console.log('Your PWA can now connect anytime!');
  console.log('');
  console.log('Commands:');
  console.log('  coder-config ui status     - Check if running');
  console.log('  coder-config ui uninstall  - Remove auto-start');
}

function uninstallLaunchAgent() {
  if (process.platform !== 'darwin') {
    console.error('Auto-start removal is only supported on macOS.');
    process.exit(1);
  }

  if (!fs.existsSync(LAUNCH_AGENT_PATH)) {
    console.log('Auto-start is not installed.');
    return;
  }

  // Unload the LaunchAgent (using spawn to avoid shell injection)
  try {
    const { spawnSync } = require('child_process');
    spawnSync('launchctl', ['unload', LAUNCH_AGENT_PATH], { stdio: 'ignore' });
  } catch {}

  // Remove the plist file
  fs.unlinkSync(LAUNCH_AGENT_PATH);

  console.log('✓ Removed auto-start for Coder Config UI');
  console.log('');
  console.log('To start manually: coder-config ui');
}

function startDaemon(flags) {
  const { spawnSync } = require('child_process');

  // Check if LaunchAgent is installed (macOS) - if so, reload it instead of PID mode
  if (process.platform === 'darwin' && fs.existsSync(LAUNCH_AGENT_PATH)) {
    // Unload first (ignore errors if not loaded)
    spawnSync('launchctl', ['unload', LAUNCH_AGENT_PATH], { encoding: 'utf8' });

    // Load the LaunchAgent
    const result = spawnSync('launchctl', ['load', LAUNCH_AGENT_PATH], { encoding: 'utf8' });
    if (result.status === 0) {
      console.log('Started daemon (LaunchAgent reloaded)');
      console.log(`UI available at: http://localhost:${flags.port}`);
      console.log('\nCommands:');
      console.log('  coder-config ui status  - Check daemon status');
      console.log('  coder-config ui stop    - Stop the daemon');
      return;
    }
    // If LaunchAgent load failed, fall through to PID mode
    console.log('LaunchAgent failed to load, falling back to PID mode');
  }

  // Check if already running via PID
  if (fs.existsSync(PID_FILE)) {
    try {
      const existingPid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim());
      process.kill(existingPid, 0);
      console.log(`Daemon already running (PID: ${existingPid})`);
      console.log(`UI available at: http://localhost:${flags.port}`);
      console.log('Use "coder-config ui stop" to stop the daemon');
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
  console.log('  coder-config ui status  - Check daemon status');
  console.log('  coder-config ui stop    - Stop the daemon');
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
      console.error(`Try a different port: coder-config ui --port ${flags.port + 1}`);
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
