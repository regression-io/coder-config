/**
 * Constants and tool path configurations
 */

const VERSION = '0.53.7-beta';

// Tool-specific path configurations
const TOOL_PATHS = {
  claude: {
    name: 'Claude Code',
    icon: 'sparkles',
    color: 'orange',
    // Global MCPs are embedded in ~/.claude.json under mcpServers key (no separate file)
    globalConfig: '~/.claude.json',
    globalSettings: '~/.claude/settings.json',
    globalMcpKey: 'mcpServers', // MCPs are under this key in globalConfig
    projectFolder: '.claude',
    projectRules: '.claude/rules',
    projectCommands: '.claude/commands',
    projectSkills: '.claude/skills',
    projectAgents: '.claude/agents',
    projectWorkflows: '.claude/workflows',
    projectInstructions: 'CLAUDE.md',
    outputFile: '.mcp.json', // Per-project MCPs go here (shared via git)
    settingsSchema: 'https://json.schemastore.org/claude-code-settings.json',
    supportsEnvInterpolation: true,
    // MCP scope names (CC terminology)
    mcpScopes: { local: 'Per-project in ~/.claude.json', user: 'Global in ~/.claude.json' },
  },
  gemini: {
    name: 'Gemini CLI',
    icon: 'terminal',
    color: 'blue',
    globalConfig: '~/.gemini/settings.json',
    globalSettings: '~/.gemini/settings.json',
    globalMcpConfig: '~/.gemini/mcps.json',
    projectFolder: '.gemini',
    projectConfig: '.gemini/mcps.json',
    projectRules: '.gemini',
    projectCommands: '.gemini/commands',
    projectInstructions: 'GEMINI.md',
    outputFile: '~/.gemini/settings.json',
    supportsEnvInterpolation: true,
    mergeIntoSettings: true,
  },
  antigravity: {
    name: 'Antigravity',
    icon: 'rocket',
    color: 'purple',
    globalConfig: '~/.gemini/antigravity/mcp_config.json',
    globalMcpConfig: '~/.gemini/antigravity/mcps.json',
    globalRules: '~/.gemini/GEMINI.md',
    projectFolder: '.agent',
    projectConfig: '.agent/mcps.json',
    projectRules: '.agent/rules',
    projectInstructions: 'GEMINI.md',
    outputFile: '~/.gemini/antigravity/mcp_config.json',
    supportsEnvInterpolation: false,
  },
  codex: {
    name: 'Codex CLI',
    icon: 'terminal',
    color: 'green',
    globalConfig: '~/.codex/config.toml',
    globalMcpConfig: '~/.codex/mcps.json', // coder-config internal registry
    projectFolder: '.codex',
    projectConfig: '.codex/mcps.json', // coder-config internal registry
    projectRules: '.codex/rules',
    projectInstructions: 'AGENTS.md', // Codex uses AGENTS.md, not CODEX.md
    projectInstructionsOverride: 'AGENTS.override.md',
    outputFile: '~/.codex/config.toml', // MCPs go into [mcp_servers] in config.toml
    supportsEnvInterpolation: true,
    configFormat: 'toml', // TOML, not JSON
  },
};

module.exports = { VERSION, TOOL_PATHS };
