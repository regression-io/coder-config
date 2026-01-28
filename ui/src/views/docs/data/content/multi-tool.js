export const multiToolContent = {
  'supported-tools': {
    title: 'Supported Tools',
    content: `
## Supported AI Coding Tools

coder-config supports multiple AI coding assistants:

| Tool | Type | Config Location |
|------|------|-----------------|
| **Claude Code** | Terminal CLI | \`.mcp.json\`, \`~/.claude/\` |
| **Gemini CLI** | Terminal CLI | \`.gemini/settings.json\`, \`~/.gemini/settings.json\` |
| **Codex CLI** | Terminal CLI | \`~/.codex/config.toml\` |
| **Antigravity** | Full IDE | \`~/.gemini/antigravity/mcp_config.json\` |

### Shared MCP Registry

All tools use the **MCP (Model Context Protocol)** for server configurations. coder-config maintains a shared registry and generates tool-specific output files.

### Enabling Tools

In **Preferences**, toggle which tools receive configuration updates:

- **Claude Code** - Anthropic's terminal AI assistant
- **Gemini CLI** - Google's terminal AI assistant
- **Codex CLI** - OpenAI's terminal AI assistant
- **Antigravity** - Google's AI-powered IDE

When you click **Apply Config**, enabled tools get updated configurations.
    `
  },
  'gemini-cli': {
    title: 'Gemini CLI',
    content: `
## Gemini CLI Support

Gemini CLI is Google's terminal-based AI coding assistant, similar to Claude Code.

### Configuration

Gemini CLI settings are stored in two locations:
- **Global**: \`~/.gemini/settings.json\`
- **Per-project**: \`.gemini/settings.json\` (in project directory)

When you apply config, both files are generated:

\`\`\`json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path"]
    }
  }
}
\`\`\`

### Key Differences from Claude Code

| Feature | Claude Code | Gemini CLI |
|---------|-------------|------------|
| MCP Config | Separate \`.mcp.json\` | Embedded in settings.json |
| Global Instructions | \`~/.claude/CLAUDE.md\` | \`~/.gemini/GEMINI.md\` |
| Project Instructions | \`CLAUDE.md\` | \`GEMINI.md\` |
| Skills | \`.claude/commands/\` | \`.gemini/commands/\` (TOML) |

### Gemini Settings Editor

Access via **Gemini CLI** in the sidebar to:

- Configure MCP servers
- Edit global settings
- Manage Gemini-specific options

### Project Files

| Purpose | File |
|---------|------|
| Project instructions | \`GEMINI.md\` or \`.gemini/GEMINI.md\` |
| Skills | \`.gemini/commands/*.toml\` |
| Config folder | \`.gemini/\` |
    `
  },
  'antigravity': {
    title: 'Antigravity Support',
    content: `
## Antigravity Support

Antigravity is Google's full AI-powered IDE (similar to Cursor/Windsurf).

### Configuration

Antigravity MCP config is stored at \`~/.gemini/antigravity/mcp_config.json\`:

\`\`\`json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/absolute/path"]
    }
  }
}
\`\`\`

### Key Difference: No Environment Variables

**Important**: Antigravity does NOT support \`\${VAR}\` interpolation.

When generating Antigravity configs, coder-config automatically resolves all environment variables to their actual values.

Example:
- Claude Code: \`"path": "\${HOME}/projects"\`
- Antigravity: \`"path": "/Users/you/projects"\`

### Project Files

| Purpose | Claude Code | Antigravity |
|---------|-------------|-------------|
| Config folder | \`.claude/\` | \`.agent/\` |
| Rules | \`.claude/rules/*.md\` | \`.agent/rules/*.md\` |
| Instructions | \`CLAUDE.md\` | \`GEMINI.md\` or \`AGENT.md\` |

### Known Limitation

Antigravity and Gemini CLI share \`~/.gemini/GEMINI.md\` for global instructions. This is a known conflict in Google's tools.
    `
  },
  'tool-differences': {
    title: 'Tool Differences',
    content: `
## Tool Differences

### Configuration Formats

All tools use identical JSON format for MCP server definitions:

\`\`\`json
{
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["-y", "@some/server"],
      "env": { "API_KEY": "..." }
    }
  }
}
\`\`\`

### Feature Comparison

| Feature | Claude Code | Gemini CLI | Codex CLI | Antigravity |
|---------|-------------|------------|-----------|-------------|
| Type | Terminal CLI | Terminal CLI | Terminal CLI | Full IDE |
| MCP Config | \`.mcp.json\` | \`.gemini/settings.json\` | \`~/.codex/config.toml\` | \`~/.gemini/antigravity/\` |
| Config Format | JSON | JSON | TOML | JSON |
| Env Interpolation | Yes (\`\${VAR}\`) | Yes | Yes | No |
| Skills | \`.claude/commands/\` | \`.gemini/commands/\` | N/A | Unknown |
| Rules | \`.claude/rules/\` | \`.gemini/rules/\` | N/A | \`.agent/rules/\` |
| Instructions | \`CLAUDE.md\` | \`GEMINI.md\` | N/A | \`GEMINI.md\` |

### What This Means

- Your MCP registry is shared between all tools
- When you click "Apply Config", all enabled tools get updated
- Rules can be synced between Claude Code, Gemini CLI, and Antigravity
- Gemini CLI and Antigravity share global instructions (known conflict)
    `
  },
  'enabling-tools': {
    title: 'Enabling Tools',
    content: `
## Enabling Tools

Control which tools receive configuration updates.

### Via Preferences UI

1. Go to **Preferences** in the sidebar
2. Find the **Enabled AI Tools** section
3. Toggle tools on/off:
   - **Claude Code** - Writes to \`.mcp.json\`
   - **Gemini CLI** - Writes to \`~/.gemini/settings.json\`
   - **Codex CLI** - Writes to \`~/.codex/config.toml\`
   - **Antigravity** - Writes to \`~/.gemini/antigravity/mcp_config.json\`

### Apply Behavior

When you click **Apply Config**:
- Config is generated for ALL enabled tools
- Toast notification shows which tools were updated
- Each tool receives its format-specific output

### Config File

Tool preferences are stored in \`~/.coder-config/config.json\`:

\`\`\`json
{
  "enabledTools": ["claude", "gemini", "codex", "antigravity"]
}
\`\`\`
    `
  },
  'syncing-rules': {
    title: 'Syncing Rules',
    content: `
## Syncing Rules Between Tools

Sync rules between Claude Code, Gemini CLI, and Antigravity to maintain consistency.

### Accessing Sync

1. Enable **multiple tools** in Preferences
2. Go to **Project Explorer**
3. Click the **Sync** button in the toolbar

### Sync Dialog

The sync dialog allows you to:

- **Choose direction**: Any tool → Any tool (Claude Code ↔ Gemini CLI ↔ Antigravity)
- **Preview changes**: See which files will be copied
- **Selective sync**: Choose specific files to sync
- **Status indicators**:
  - **New**: File doesn't exist in target
  - **Modified**: File differs from target
  - **Same**: Files are identical

### What Gets Synced

| Tool | Rules Location |
|------|----------------|
| Claude Code | \`.claude/rules/*.md\` |
| Gemini CLI | \`.gemini/rules/*.md\` |
| Antigravity | \`.agent/rules/*.md\` |

Rules can be synced in any direction between these three tools.

### Notes

- Syncing **copies** files (doesn't move them)
- Target files are **overwritten** if they exist
- Instructions files (CLAUDE.md / GEMINI.md) are not synced
- Skills and workflows are Claude-specific (not synced)
    `
  },
};
