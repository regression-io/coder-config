/**
 * Constants and tool path configurations
 */

const VERSION = '0.36.16';

// Tool-specific path configurations
const TOOL_PATHS = {
  claude: {
    name: 'Claude Code',
    icon: 'sparkles',
    color: 'orange',
    globalConfig: '~/.claude/mcps.json',
    globalSettings: '~/.claude/settings.json',
    projectFolder: '.claude',
    projectRules: '.claude/rules',
    projectCommands: '.claude/commands',
    projectWorkflows: '.claude/workflows',
    projectInstructions: 'CLAUDE.md',
    outputFile: '.mcp.json',
    supportsEnvInterpolation: true,
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
};

module.exports = { VERSION, TOOL_PATHS };
