/**
 * CLI command handler
 */

const path = require('path');
const { VERSION, TOOL_PATHS } = require('./constants');

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
      } else {
        manager.workstreamList();
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

  Per-session activation (enables parallel work):
    export CODER_WORKSTREAM=<name-or-id>

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
