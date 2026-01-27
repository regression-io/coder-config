/**
 * CLI command handler
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
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
        manager.workstreamUse(args[2]);
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
        const maxCostIdx = args.indexOf('--max-cost');
        if (maxCostIdx !== -1) updates.maxCost = args[maxCostIdx + 1];
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
 * Print help message
 */
function printHelp() {
  const showLoops = isRalphLoopsEnabled();

  const loopHelp = showLoops ? `
Loop Commands (Ralph Loop - autonomous development):
  loop                       List all loops
  loop create "Task"         Create new loop with task description
  loop create "Task" --workstream <name>  Create loop in workstream context
  loop start <id>            Start/resume a loop
  loop pause <id>            Pause loop at next safe point
  loop resume <id>           Resume paused loop
  loop cancel <id>           Cancel loop
  loop delete <id>           Delete loop and its data
  loop approve <id>          Approve plan (when in plan phase)
  loop complete <id>         Mark loop as complete
  loop status [id]           Show status (active loop if no id)
  loop active                Show current active loop
  loop history               Show completed loops
  loop config                Show loop configuration
  loop config --max-iterations 50    Set max iterations
  loop config --max-cost 10.00       Set max cost budget
  loop config --auto-approve-plan    Skip manual plan approval
  loop inject [--silent]     Output loop context (for hooks)

  Running a loop with Claude Code:
    export CODER_LOOP_ID=<id>
    claude --continue "Your task"
` : '';

  console.log(`
coder-config v${VERSION}
Configuration manager for AI coding tools

Usage:
  coder-config <command> [args]
  claude-config <command> [args]  (alias)

Project Commands:
  init                       Initialize project with .claude/mcps.json
  apply                      Generate .mcp.json from config
  show                       Show current project config
  list                       List available MCPs (✓ = active)
  add <mcp> [mcp...]         Add MCP(s) to project
  remove <mcp> [mcp...]      Remove MCP(s) from project

Memory Commands:
  memory                     Show memory status
  memory init                Initialize project memory
  memory add <type> <content>  Add entry (types: preference, correction, fact,
                             context, pattern, decision, issue, history)
  memory search <query>      Search all memory files

Environment Commands:
  env                        List environment variables
  env set <KEY> <value>      Set variable in .claude/.env
  env unset <KEY>            Remove variable

Project Commands (for UI):
  project                    List registered projects
  project add [path]         Add project (defaults to cwd)
  project add [path] --name X  Add with custom display name
  project remove <name|path> Remove project from registry

Workstream Commands:
  workstream                 List all workstreams
  workstream create "Name"   Create new workstream
  workstream delete <name>   Delete workstream
  workstream use <name>      Set active workstream (global)
  workstream active          Show current active workstream
  workstream deactivate      Show how to deactivate workstream
  workstream add <ws> <path>     Add project to workstream
  workstream remove <ws> <path>  Remove project from workstream
  workstream inject [--silent]   Output restriction + context (for hooks)
  workstream detect [path]   Detect workstream for directory
  workstream install-hook    Install pre-prompt hook for Claude Code
  workstream install-hook --gemini   Install for Gemini CLI
  workstream install-hook --codex    Install for Codex CLI
  workstream install-hook --all      Install for all supported tools

  Folder Auto-Activation:
  workstream add-trigger <ws> <folder>    Add trigger folder
  workstream remove-trigger <ws> <folder> Remove trigger folder
  workstream auto-activate <ws> [on|off|default]  Set auto-activate
  workstream check-folder [path] [--json] Check folder for matches
  workstream install-cd-hook       Install cd hook for auto-activation
  workstream uninstall-cd-hook     Remove cd hook
  workstream cd-hook-status        Check if cd hook is installed

  Per-session activation (enables parallel work):
    export CODER_WORKSTREAM=<name-or-id>
${loopHelp}
Session Persistence:
  session                    Show session status (saved context)
  session install            Install hooks and /flush command
  session clear              Clear saved session context

Registry Commands:
  registry                       List MCPs in global registry
  registry add <name> '<json>'   Add MCP to global registry
  registry remove <name>         Remove MCP from registry

Maintenance:
  update                     Check npm for updates and install if available
  update --check             Check for updates without installing
  update /path/to/source     Update from local development source
  ui [--port=3333]           Start web UI (daemon mode by default)
  ui install                 Auto-start on login (macOS LaunchAgent)
  ui uninstall               Remove auto-start
  ui status                  Check if UI daemon is running
  ui stop                    Stop the UI daemon
  version                    Show version info

Plugins (Claude Code CLI):
  claude plugin marketplace add regression-io/coder-config-plugins
  claude plugin install <name>@coder-config-plugins

Examples:
  coder-config init
  coder-config add postgres github
  coder-config memory add preference "Use TypeScript for new files"
  coder-config env set GITHUB_TOKEN ghp_xxx
  coder-config apply
`);
}

module.exports = {
  runCli,
  printHelp,
};
