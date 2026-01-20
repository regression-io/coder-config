export const antigravitySettingsContent = {
  'antigravity-security': {
    title: 'Security Policies',
    content: `
## Security Policies

Control Antigravity's execution behavior.

### Terminal Execution Policy

| Policy | Description |
|--------|-------------|
| **Off** | Never auto-execute; requires explicit allow list |
| **Auto** | Safety model determines execution |
| **Turbo** | Auto-execute unless in deny list (dangerous) |

### Code Review Policy

| Policy | Description |
|--------|-------------|
| **Enabled** | Review code changes before applying |
| **Disabled** | Apply code changes automatically |

### JavaScript Execution

| Policy | Description |
|--------|-------------|
| **Sandboxed** | Run JS in isolated environment |
| **Direct** | Run JS without sandboxing |

**Recommendation**: Use "Auto" for terminal and enable code review for safety.
    `
  },
  'antigravity-mcp': {
    title: 'MCP Servers',
    content: `
## MCP Servers

Configure Model Context Protocol servers for Antigravity.

### Configuration Location

MCP config is stored at \`~/.gemini/antigravity/mcp_config.json\`.

### Important Limitation

**Antigravity does NOT support environment variable interpolation.**

Variables like \`\${HOME}\` are resolved to actual values when generating config.

### Managing Servers

Use the MCP Registry view to add/remove servers. When you apply config with Antigravity enabled, the config is generated at the correct location.
    `
  },
  'antigravity-browser': {
    title: 'Browser Allowlist',
    content: `
## Browser Allowlist

Control which URLs Antigravity can access.

### Configuration

Add trusted domains to the allowlist:

\`\`\`json
{
  "browserAllowlist": [
    "github.com",
    "stackoverflow.com",
    "docs.google.com"
  ]
}
\`\`\`

### Security Note

Only add domains you trust. Antigravity will be able to access and interact with these sites during sessions.
    `
  },
  'antigravity-agent': {
    title: 'Agent Mode',
    content: `
## Agent Mode

Configure Antigravity's autonomous capabilities.

### Settings

| Setting | Description |
|---------|-------------|
| **Enable Agent Mode** | Allow autonomous multi-step operations |
| **Max Iterations** | Limit on autonomous action steps |
| **Require Confirmation** | Ask before major changes |

### When to Use

Agent mode is useful for:
- Complex refactoring tasks
- Multi-file changes
- Automated testing workflows

### Caution

Agent mode can make many changes quickly. Use with code review policy enabled.
    `
  },
};
