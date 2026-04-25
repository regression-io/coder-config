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

    // Global MCPs (~/.claude.json)
    case 'global':
      if (args[1] === 'add') {
        manager.globalAdd(args.slice(2));
      } else if (args[1] === 'remove' || args[1] === 'rm') {
        manager.globalRemove(args.slice(2));
      } else {
        manager.globalList();
      }
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
      } else if (args[1] === 'inject' || args[1] === 'reload') {
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
      } else if (args[1] === 'sandbox') {
        if (!args[2]) {
          console.error('Usage: coder-config workstream sandbox <workstream> [on|off]');
          process.exit(1);
        }
        const value = args[3] || 'on';
        manager.workstreamSetSandbox(args[2], value);
      } else if (args[1] === 'color') {
        if (!args[2]) {
          console.error('Usage: coder-config workstream color <workstream> [red|orange|yellow|green|cyan|blue|purple|pink|gray|none]');
          process.exit(1);
        }
        const value = args[3] || 'none';
        manager.workstreamSetColor(args[2], value);
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
        // Dot-notation key=value: coder-config loop config heartbeat.staleThresholdMinutes 30
        if (args[2] && args[3] && !args[2].startsWith('--')) {
          updates[args[2]] = args[3];
        } else {
          // Flag-based (backwards compatible)
          const maxIterIdx = args.indexOf('--max-iterations');
          if (maxIterIdx !== -1) updates.maxIterations = args[maxIterIdx + 1];
          if (args.includes('--auto-approve-plan')) updates.autoApprovePlan = true;
          if (args.includes('--no-auto-approve-plan')) updates.autoApprovePlan = false;
        }
        if (Object.keys(updates).length > 0) {
          manager.loopConfig(updates);
        } else {
          manager.loopConfig();
        }
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
    // Shell integration
    case 'shell':
      if (args[1] === 'install') {
        manager.shellInstall();
      } else if (args[1] === 'uninstall') {
        manager.shellUninstall();
      } else {
        manager.shellStatus();
      }
      break;

    // Router (CCR)
    case 'router': {
      const sub = args[1];
      if (sub === 'status') {
        const status = manager.routerGetStatus();
        console.log(`CCR installed: ${status.installed ? 'yes' : 'no'}`);
        console.log(`Config exists: ${status.configExists ? 'yes' : 'no'}`);
        console.log(`Proxy running: ${status.running ? 'yes' : 'no'}`);
        if (!status.installed) {
          console.log('\nInstall: npm install -g claude-code-router');
        }
      } else if (sub === 'list') {
        const providers = manager.routerListProviders();
        if (providers.length === 0) {
          console.log('No providers configured.');
        } else {
          console.log('Providers:');
          for (const p of providers) {
            const models = p.models && p.models.length > 0 ? ` (${p.models.join(', ')})` : '';
            console.log(`  ${p.name} — ${p.api_base_url || p.url || '(no url)'}${models}`);
          }
        }
        console.log('');
        const rules = manager.routerGetRules();
        const ruleKeys = Object.keys(rules);
        if (ruleKeys.length === 0) {
          console.log('No routing rules configured.');
        } else {
          console.log('Routing rules:');
          for (const key of ruleKeys) {
            console.log(`  ${key} → ${rules[key]}`);
          }
        }
      } else if (sub === 'add-provider') {
        const name = args[2];
        if (!name) {
          console.error('Usage: coder-config router add-provider <name> --url <url> [--key <key>] [--models <m1,m2>]');
          process.exitCode = 1;
          break;
        }
        const urlIdx = args.indexOf('--url');
        const keyIdx = args.indexOf('--key');
        const modelsIdx = args.indexOf('--models');
        const api_base_url = urlIdx !== -1 ? args[urlIdx + 1] : undefined;
        const api_key = keyIdx !== -1 ? args[keyIdx + 1] : undefined;
        const models = modelsIdx !== -1 ? args[modelsIdx + 1].split(',') : undefined;
        if (!api_base_url) {
          console.error('--url is required');
          process.exitCode = 1;
          break;
        }
        const providerConfig = { api_base_url, models };
        if (api_key) providerConfig.api_key = api_key;
        manager.routerAddProvider(name, providerConfig);
        console.log(`Provider '${name}' added.`);
      } else if (sub === 'remove-provider') {
        const name = args[2];
        if (!name) {
          console.error('Usage: coder-config router remove-provider <name>');
          process.exitCode = 1;
          break;
        }
        manager.routerRemoveProvider(name);
        console.log(`Provider '${name}' removed.`);
      } else if (sub === 'set-rule') {
        const task = args[2];
        const providerModel = args[3];
        if (!task || !providerModel) {
          console.error('Usage: coder-config router set-rule <task> <provider,model>');
          process.exitCode = 1;
          break;
        }
        manager.routerSetRule(task, providerModel);
        console.log(`Rule set: ${task} → ${providerModel}`);
      } else if (sub === 'preset') {
        const presetCmd = args[2];
        if (presetCmd === 'list') {
          const presets = manager.routerListPresets();
          if (presets.length === 0) {
            console.log('No presets saved.');
          } else {
            console.log('Presets:');
            for (const p of presets) {
              console.log(`  ${p}`);
            }
          }
        } else if (presetCmd === 'save') {
          const name = args[3];
          if (!name) {
            console.error('Usage: coder-config router preset save <name>');
            process.exitCode = 1;
            break;
          }
          manager.routerSavePreset(name);
          console.log(`Preset '${name}' saved.`);
        } else if (presetCmd === 'load') {
          const name = args[3];
          if (!name) {
            console.error('Usage: coder-config router preset load <name>');
            process.exitCode = 1;
            break;
          }
          manager.routerLoadPreset(name);
          console.log(`Preset '${name}' loaded.`);
        } else {
          console.log('Usage: coder-config router preset <list|save|load> [name]');
        }
      } else if (sub === 'start') {
        const { execSync } = require('child_process');
        try {
          execSync('ccr code', { stdio: 'inherit' });
        } catch (e) {
          console.error('Failed to start CCR proxy. Is ccr installed?');
          process.exitCode = 1;
        }
      } else if (sub === 'stop') {
        const { execSync } = require('child_process');
        try {
          execSync('ccr stop', { stdio: 'inherit' });
        } catch (e) {
          console.error('Failed to stop CCR proxy. Is ccr installed?');
          process.exitCode = 1;
        }
      } else if (sub === 'activate') {
        const env = manager.routerGetActivationEnv();
        for (const [key, value] of Object.entries(env)) {
          console.log(`export ${key}="${value}"`);
        }
      } else {
        console.log('Usage: coder-config router <command>');
        console.log('');
        console.log('Commands:');
        console.log('  status                          Show CCR install/proxy status');
        console.log('  list                            Show providers and routing rules');
        console.log('  add-provider <name> --url <url> Add a provider');
        console.log('  remove-provider <name>          Remove a provider');
        console.log('  set-rule <task> <provider,model> Set routing rule');
        console.log('  preset list|save|load [name]    Manage presets');
        console.log('  start                           Start CCR proxy');
        console.log('  stop                            Stop CCR proxy');
        console.log('  activate                        Print env vars for shell eval');
      }
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
    cmd('apply', 'Generate .mcp.json and sandbox scope'),
    cmd('show', 'Show current project config'),
    cmd('list', 'List available MCPs (✓ = active)'),
    cmd('add <mcp> [mcp...]', 'Add MCP(s) to project'),
    cmd('remove <mcp> [mcp...]', 'Remove MCP(s) from project'),
  ]));
  console.log();

  // Global MCPs (~/.claude.json)
  console.log(box('Global MCPs', [
    cmd('global', 'List global MCPs (~/.claude.json)'),
    cmd('global add <mcp> [mcp...]', 'Add MCP(s) to global config'),
    cmd('global remove <mcp>', 'Remove MCP from global config'),
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
    cmd('workstream sandbox <ws> [on|off]', 'Toggle sandbox enforcement'),
    cmd('workstream color <ws> <color>', 'Set color (red, cyan, purple, ... or none)'),
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
      cmd('loop heartbeat', 'Check loop health'),
      cmd('loop heartbeat --notify', 'Check + send notifications'),
      cmd('loop heartbeat --quiet', 'Silent unless alerts'),
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

  // Shell Integration
  console.log(box('Shell', [
    cmd('shell', 'Show shell integration status'),
    cmd('shell install', 'Add to ~/.zshrc'),
    cmd('shell uninstall', 'Remove from ~/.zshrc'),
  ]));
  console.log();

  // Router (CCR)
  console.log(box('Router (CCR)', [
    cmd('router status', 'Show CCR install/proxy status'),
    cmd('router list', 'Show providers and routing rules'),
    cmd('router add-provider <name>', 'Add a provider'),
    cmd('router remove-provider <name>', 'Remove a provider'),
    cmd('router set-rule <task> <p,m>', 'Set routing rule'),
    cmd('router preset list|save|load', 'Manage presets'),
    cmd('router start', 'Start CCR proxy'),
    cmd('router stop', 'Stop CCR proxy'),
    cmd('router activate', 'Print env vars for shell eval'),
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
