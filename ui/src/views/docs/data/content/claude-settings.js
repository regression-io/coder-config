export const claudeSettingsContent = {
  'permissions': {
    title: 'Permissions',
    content: `
## Permissions

Control what Claude Code can do automatically.

### Permission Levels

- **Allow** - Tools that run without asking
- **Ask** - Tools that require confirmation
- **Deny** - Tools that are blocked

### Pattern Syntax

\`\`\`
Tool(pattern)
\`\`\`

Examples:
- \`Bash(npm run build)\` - Specific command
- \`Bash(npm:*)\` - Prefix match (npm anything)
- \`Read(**)\` - All file reads
- \`Edit(src/**)\` - Edit files in src/
- \`mcp__github__*\` - All GitHub MCP tools

### Managing Permissions

In the **Claude Code** settings view:
1. Navigate to the Permissions tab
2. Add patterns to Allow, Ask, or Deny lists
3. Click Save to apply

### Best Practices

- Start restrictive, allow more as needed
- Use specific patterns over wildcards
- Review deny list for security-sensitive operations
    `
  },
  'model-selection': {
    title: 'Model Selection',
    content: `
## Model Selection

Choose which Claude model to use.

### Available Models

- **Claude Opus 4.6** - Most capable, best for complex tasks
- **Claude Sonnet 4.6** - Fast output, great balance of speed and capability
- **Claude Sonnet 4.5** - Previous generation, balanced
- **Claude Haiku 4.5** - Fastest, good for simple tasks

### Setting the Model

In **Claude Code** settings, use the Model tab to select your preferred model.

### Effort Level

Control reasoning thoroughness:
- **Low** - Faster, less thorough
- **Medium** - Balanced (default)
- **High** - Most thorough reasoning

### Per-Task Model

Some tasks may benefit from different models:
- Use Haiku 4.5 for quick edits and simple tasks
- Use Opus 4.6 for complex refactoring and architecture
- Use Sonnet 4.6 as a balanced default
    `
  },
  'behavior': {
    title: 'Behavior Settings',
    content: `
## Behavior Settings

Configure how Claude Code behaves.

### Available Settings

- **Respect .gitignore** - Honor .gitignore patterns when searching
- **Show Thinking Summaries** - Display extended thinking summaries
- **Voice Dictation** - Enable push-to-talk voice input
- **Auto Memory** - Allow Claude to save notes across sessions
- **Enable All Project MCP Servers** - Auto-approve project .mcp.json servers
- **Output Style** - Named output style for responses
- **Default Shell** - Bash or PowerShell
- **CLAUDE.md Excludes** - Skip specific CLAUDE.md files in monorepos

### Configuration

These settings are stored in \`~/.claude/settings.json\` and can be edited in the Claude Code settings view.
    `
  },
  'hooks': {
    title: 'Hooks',
    content: `
## Hooks

Hooks allow you to run custom commands at specific points.

### Hook Events (30 total)

Key events include:
- **SessionStart** / **SessionEnd** - Session lifecycle
- **PreToolUse** / **PostToolUse** - Before/after tool execution
- **UserPromptSubmit** - Before processing user input
- **SubagentStart** / **SubagentStop** - Agent spawning
- **FileChanged** / **CwdChanged** - File system events
- **TaskCreated** / **TaskCompleted** - Task tracking

### Handler Types

- **command** - Shell script (with async, timeout options)
- **http** - HTTP POST to a URL
- **prompt** - Single-turn LLM evaluation
- **agent** - Spawns a subagent

### Configuration

\`\`\`json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Bash",
      "hooks": [{ "type": "command", "command": "~/.claude/hooks/pre.sh" }]
    }]
  }
}
\`\`\`

### Use Cases

- Run linters after file edits
- Log tool usage
- Custom notifications
- Workstream context injection
    `
  },
};
