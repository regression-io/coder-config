/**
 * CLI command handler
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const chalk = require('chalk');
const { VERSION, TOOL_PATHS } = require('./constants');

/**
 * Load coder-config settings
 */
function loadCoderConfigSettings() {
  const configPath = path.join(os.homedir(), '.claude-config', 'config.json');
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (e) {
    // Ignore errors
  }
  return {};
}

/**
 * Check if Ralph Loops experimental feature is enabled
 */
function isRalphLoopsEnabled() {
  const config = loadCoderConfigSettings();
  return config?.experimental?.ralphLoops === true;
}

/**
 * Run CLI command
 */
function runCli(manager) {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    // Core
    case 'init':
      manager.init(args[1]);
      break;
    case 'apply':
      manager.apply(args[1]);
      break;
    case 'show':
      manager.show(args[1]);
      break;
    case 'list':
    case 'mcps':
      manager.list();
      break;

    // Edit MCPs
    case 'add':
      manager.add(args.slice(1));
      break;
    case 'remove':
    case 'rm':
      manager.remove(args.slice(1));
      break;

    // Registry management
    case 'registry':
      if (args[1] === 'add') {
        manager.registryAdd(args[2], args[3]);
      } else if (args[1] === 'remove' || args[1] === 'rm') {
        manager.registryRemove(args[2]);
      } else {
        manager.registryList();
      }
      break;

    // Memory
    case 'memory':
      if (args[1] === 'init') {
        manager.memoryInit(args[2]);
      } else if (args[1] === 'add') {
        manager.memoryAdd(args[2], args.slice(3).join(' '));
      } else if (args[1] === 'search') {
        manager.memorySearch(args.slice(2).join(' '));
      } else {
        manager.memoryList();
      }
      break;

    // Environment
    case 'env':
      if (args[1] === 'set') {
        manager.envSet(args[2], args[3]);
      } else if (args[1] === 'unset') {
        manager.envUnset(args[2]);
      } else {
        manager.envList();
      }
      break;

    // Project registry (for UI)
    case 'project':
    case 'projects':
      if (args[1] === 'add') {
        const nameIdx = args.indexOf('--name');
        const name = nameIdx !== -1 ? args[nameIdx + 1] : null;
        const projectPath = args[2] && !args[2].startsWith('--') ? args[2] : process.cwd();
        manager.projectAdd(projectPath, name);
      } else if (args[1] === 'remove' || args[1] === 'rm') {
        manager.projectRemove(args[2]);
      } else {
        manager.projectList();
      }
      break;

    // Workstreams
    case 'workstream':
    case 'ws':
      if (args[1] === 'create' || args[1] === 'new') {
        manager.workstreamCreate(args[2]);
      } else if (args[1] === 'delete' || args[1] === 'rm') {
        manager.workstreamDelete(args[2]);
      } else if (args[1] === 'use' || args[1] === 'switch') {
        const evalMode = args.includes('--eval') || args.includes('-e');
        manager.workstreamUse(args[2], evalMode);
      } else if (args[1] === 'add') {
        manager.workstreamAddProject(args[2], args[3]);
      } else if (args[1] === 'remove' || args[1] === 'rm') {
        manager.workstreamRemoveProject(args[2], args[3]);
      } else if (args[1] === 'inject') {
        const silent = args.includes('--silent') || args.includes('-s');
        manager.workstreamInject(silent);
      } else if (args[1] === 'detect') {
        const ws = manager.workstreamDetect(args[2] || process.cwd());
        if (ws) {
          console.log(ws.name);
        }
      } else if (args[1] === 'active') {
        const ws = manager.workstreamActive();
        if (ws) {
          console.log(`Active: ${ws.name}`);
          if (ws.projects && ws.projects.length > 0) {
            console.log(`Projects: ${ws.projects.map(p => path.basename(p)).join(', ')}`);
          }
        } else {
          console.log('No active workstream');
        }
      } else if (args[1] === 'install-hook') {
        const forGemini = args.includes('--gemini') || args.includes('-g');
        const forCodex = args.includes('--codex') || args.includes('-x');
        const forAll = args.includes('--all') || args.includes('-a');
        if (forAll) {
          manager.workstreamInstallHook();
          manager.workstreamInstallHookGemini();
          manager.workstreamInstallHookCodex();
        } else if (forGemini) {
          manager.workstreamInstallHookGemini();
        } else if (forCodex) {
          manager.workstreamInstallHookCodex();
        } else {
          manager.workstreamInstallHook();
        }
      } else if (args[1] === 'deactivate') {
        manager.workstreamDeactivate();
      } else if (args[1] === 'check-path') {
        const targetPath = args[2];
        if (!targetPath) {
          console.error('Usage: coder-config workstream check-path <path>');
          process.exit(1);
        }
        const silent = args.includes('--silent') || args.includes('-s');
        const isValid = manager.workstreamCheckPath(targetPath, silent);
        process.exit(isValid ? 0 : 1);
      } else if (args[1] === 'add-trigger') {
        if (!args[2] || !args[3]) {
          console.error('Usage: coder-config workstream add-trigger <workstream> <folder>');
          process.exit(1);
        }
        manager.workstreamAddTrigger(args[2], args[3]);
      } else if (args[1] === 'remove-trigger') {
        if (!args[2] || !args[3]) {
          console.error('Usage: coder-config workstream remove-trigger <workstream> <folder>');
          process.exit(1);
        }
        manager.workstreamRemoveTrigger(args[2], args[3]);
      } else if (args[1] === 'auto-activate') {
        if (!args[2]) {
          console.error('Usage: coder-config workstream auto-activate <workstream> [on|off|default]');
          process.exit(1);
        }
        const value = args[3] || 'on';
        manager.workstreamSetAutoActivate(args[2], value);
      } else if (args[1] === 'check-folder') {
        const folderPath = args[2] || process.cwd();
        const jsonOutput = args.includes('--json') || args.includes('-j');
        manager.workstreamCheckFolder(folderPath, jsonOutput);
      } else if (args[1] === 'install-cd-hook') {
        manager.workstreamInstallCdHook();
      } else if (args[1] === 'uninstall-cd-hook') {
        manager.workstreamUninstallCdHook();
      } else if (args[1] === 'cd-hook-status') {
        const status = manager.workstreamCdHookStatus();
        console.log(`CD hook: ${status.installed ? 'installed' : 'not installed'}`);
        console.log(`Shell: ${status.shell}`);
        console.log(`RC file: ${status.rcFile}`);
      } else {
        manager.workstreamList();
      }
      break;

    // Loops (Ralph Loop)
    case 'loop':
    case 'loops':
      if (!isRalphLoopsEnabled()) {
        console.log('Ralph Loops is an experimental feature that is currently disabled.');
        console.log('');
        console.log('To enable it:');
        console.log('  1. Open coder-config UI: coder-config ui');
        console.log('  2. Go to Preferences > Experimental Features');
        console.log('  3. Enable "Ralph Loops"');
        break;
      }
      if (args[1] === 'create' || args[1] === 'new') {
        const task = args.slice(2).join(' ');
        const wsIdx = args.indexOf('--workstream');
        const workstreamId = wsIdx !== -1 ? args[wsIdx + 1] : null;
        manager.loopCreate(task, { workstreamId });
      } else if (args[1] === 'start') {
        manager.loopStart(args[2]);
      } else if (args[1] === 'pause') {
        manager.loopPause(args[2]);
      } else if (args[1] === 'resume') {
        manager.loopResume(args[2]);
      } else if (args[1] === 'cancel') {
        manager.loopCancel(args[2]);
      } else if (args[1] === 'approve') {
        manager.loopApprove(args[2]);
      } else if (args[1] === 'complete') {
        manager.loopComplete(args[2]);
      } else if (args[1] === 'delete' || args[1] === 'rm') {
        manager.loopDelete(args[2]);
      } else if (args[1] === 'status') {
        manager.loopStatus(args[2]);
      } else if (args[1] === 'history') {
        manager.loopHistory();
      } else if (args[1] === 'config') {
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
      } else if (args[1] === 'inject') {
        const silent = args.includes('--silent') || args.includes('-s');
        manager.loopInject(silent);
      } else if (args[1] === 'active') {
        const loop = manager.getActiveLoop();
        if (loop) {
          console.log(`Active: ${loop.name}`);
          console.log(`  Phase: ${loop.phase}`);
          console.log(`  Status: ${loop.status}`);
          console.log(`  Iteration: ${loop.iterations.current}/${loop.iterations.max}`);
        } else {
          console.log('No active loop');
        }
      } else {
        manager.loopList();
      }
      break;

    // Session management
    case 'session':
      if (args[1] === 'clear') {
        manager.sessionClear();
      } else if (args[1] === 'install') {
        manager.sessionInstall();
      } else {
        manager.sessionStatus();
      }
      break;

    // Maintenance
    case 'migrate':
      const migrateOptions = {
        force: args.includes('--force') || args.includes('-f'),
        removeLegacy: args.includes('--remove') || args.includes('-r'),
        removeEmpty: true
      };
      manager.migrate(migrateOptions);
      break;

    case 'update':
      manager.update(args.slice(1)).catch(err => {
        console.error('Update error:', err.message);
        process.exit(1);
      });
      break;
    case 'ui': {
      const UIServer = require('../ui/server.cjs');
      const port = parseInt(args.find(a => a.startsWith('--port='))?.split('=')[1] || '3333');
      const uiDir = args.find(a => !a.startsWith('--') && a !== 'ui') || process.cwd();
      const uiServer = new UIServer(port, uiDir, manager);
      uiServer.start();
      break;
    }
    case 'version':
    case '-v':
    case '--version':
      manager.version();
      break;

    default:
      printHelp();
  }
}

/**
 * Print help message with nice TUI formatting
 */
function printHelp() {
  const showLoops = isRalphLoopsEnabled();

  // Helper to format a command line
  const cmd = (name, desc) => {
    const paddedName = name.padEnd(32);
    return `${chalk.cyan(paddedName)}${desc}`;
  };

  // Helper to create a boxed section
  const box = (title, lines) => {
    // Strip ANSI codes for length calculation
    const stripAnsi = (str) => str.replace(/\x1b\[[0-9;]*m/g, '');
    const maxLen = Math.max(...lines.map(l => stripAnsi(l).length), title.length + 4);
    const width = Math.min(maxLen + 2, 80);
    const top = `┌─ ${chalk.bold(title)} ${'─'.repeat(Math.max(0, width - title.length - 5))}┐`;
    const bot = `└${'─'.repeat(width)}┘`;
    const content = lines.map(l => {
      const stripped = stripAnsi(l);
      const padding = Math.max(0, width - stripped.length - 1);
      return `│ ${l}${' '.repeat(padding)}│`;
    }).join('\n');
    return `${top}\n${content}\n${bot}`;
  };

  // Header
  console.log(`
${chalk.yellow('Usage:')} ${chalk.bold('coder-config')} [OPTIONS] ${chalk.cyan('COMMAND')} [ARGS]...

${chalk.dim('Configuration manager for AI coding tools (Claude Code, Gemini CLI, Codex CLI)')}
`);

  // Options section
  console.log(box('Options', [
    `${chalk.green('--version')}          ${chalk.dim('-v')}    Show version and exit`,
    `${chalk.green('--help')}             ${chalk.dim('-h')}    Show this message and exit`,
  ]));
  console.log();

  // Project Commands
  console.log(box('Project', [
    cmd('init', 'Initialize project with .claude/mcps.json'),
    cmd('apply', 'Generate .mcp.json from config'),
    cmd('show', 'Show current project config'),
    cmd('list', 'List available MCPs (✓ = active)'),
    cmd('add <mcp> [mcp...]', 'Add MCP(s) to project'),
    cmd('remove <mcp> [mcp...]', 'Remove MCP(s) from project'),
  ]));
  console.log();

  // Memory Commands
  console.log(box('Memory', [
    cmd('memory', 'Show memory status'),
    cmd('memory init', 'Initialize project memory'),
    cmd('memory add <type> <text>', 'Add entry to memory'),
    cmd('memory search <query>', 'Search all memory files'),
  ]));
  console.log();

  // Environment Commands
  console.log(box('Environment', [
    cmd('env', 'List environment variables'),
    cmd('env set <KEY> <value>', 'Set variable in .claude/.env'),
    cmd('env unset <KEY>', 'Remove variable'),
  ]));
  console.log();

  // Registry Commands
  console.log(box('Registry', [
    cmd('registry', 'List MCPs in global registry'),
    cmd('registry add <name> \'<json>\'', 'Add MCP to registry'),
    cmd('registry remove <name>', 'Remove MCP from registry'),
  ]));
  console.log();

  // Workstream Commands
  console.log(box('Workstreams', [
    cmd('workstream', 'List all workstreams'),
    cmd('workstream create "Name"', 'Create new workstream'),
    cmd('workstream delete <name>', 'Delete workstream'),
    cmd('workstream use <name>', 'Set active workstream'),
    cmd('workstream add <ws> <path>', 'Add project to workstream'),
    cmd('workstream remove <ws> <path>', 'Remove from workstream'),
    cmd('workstream install-hook', 'Install pre-prompt hook'),
  ]));
  console.log();

  // Loop Commands (if enabled)
  if (showLoops) {
    console.log(box('Loops (Ralph Loop)', [
      cmd('loop', 'List all loops'),
      cmd('loop create "Task"', 'Create new loop'),
      cmd('loop start <id>', 'Start/resume a loop'),
      cmd('loop pause <id>', 'Pause loop'),
      cmd('loop cancel <id>', 'Cancel loop'),
      cmd('loop status [id]', 'Show loop status'),
      cmd('loop config', 'Show/set loop config'),
    ]));
    console.log();
  }

  // Session Commands
  console.log(box('Sessions', [
    cmd('session', 'Show session status'),
    cmd('session install', 'Install hooks and /flush'),
    cmd('session clear', 'Clear saved context'),
  ]));
  console.log();

  // UI & Maintenance
  console.log(box('UI & Maintenance', [
    cmd('ui', 'Start web UI (daemon mode)'),
    cmd('ui install', 'Auto-start on login'),
    cmd('ui status', 'Check daemon status'),
    cmd('ui stop', 'Stop the daemon'),
    cmd('update', 'Check and install updates'),
    cmd('version', 'Show version info'),
  ]));
  console.log();

  // Examples
  console.log(chalk.yellow('Examples:'));
  console.log(`  ${chalk.dim('$')} coder-config init`);
  console.log(`  ${chalk.dim('$')} coder-config add postgres github`);
  console.log(`  ${chalk.dim('$')} coder-config memory add preference "Use TypeScript"`);
  console.log(`  ${chalk.dim('$')} coder-config ui`);
  console.log();
}

module.exports = {
  runCli,
  printHelp,
};
