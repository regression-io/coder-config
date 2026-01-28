export const pluginsContent = {
  'plugins-overview': {
    title: 'Plugins Overview',
    content: `
## Plugins

Claude Code plugins extend functionality with LSP servers, MCP servers, and skills.

### What Are Plugins?

Plugins are packages that add capabilities to Claude Code:

- **LSP Servers** - Language Server Protocol servers for code intelligence
- **MCP Servers** - Model Context Protocol servers for additional tools
- **Skills** - Reusable prompts and workflows

### Plugin Directory

The **Plugins** page shows all available plugins with:

- **Search** - Find plugins by name or description
- **Category filter** - Filter by plugin category
- **Source filter** - Anthropic official vs Community plugins
- **Installed filter** - Show only installed or available plugins

### Plugin Types

| Type | Badge | Description |
|------|-------|-------------|
| LSP | \`LSP\` | Language server providing code intelligence |
| MCP | \`MCP\` | Model context protocol server |
| Skills | \`CMD\` | Custom skills and prompts |
    `
  },
  'installing-plugins': {
    title: 'Installing Plugins',
    content: `
## Installing Plugins

### From Project Explorer

The recommended way to install plugins:

1. Open **Project Explorer**
2. Click the **+** menu on any project folder
3. Select **Install Plugins**
4. Browse available plugins
5. Toggle plugins on/off
6. Select scope (Project/Global/Local)

### Scope Options

| Scope | Location | Description |
|-------|----------|-------------|
| Project | \`.claude/plugins.json\` | Only for this project |
| Global | \`~/.claude/plugins.json\` | All projects |
| Local | Project-specific | Scoped to workspace |

### From Plugin Directory

1. Go to **Plugins** in the sidebar
2. Find a plugin you want
3. Click **Install** button
4. Select target project and scope

### Via CLI

\`\`\`bash
# Install a plugin to current project
claude plugin install plugin-name

# Install globally
claude plugin install plugin-name --global
\`\`\`
    `
  },
  'plugin-marketplaces': {
    title: 'Plugin Marketplaces',
    content: `
## Plugin Marketplaces

Plugins are distributed through marketplaces (Git repositories).

### Default Marketplace

**claude-plugins-official** - Anthropic's official plugins

### Adding Marketplaces

1. Go to **Plugins** page
2. Click **Add Marketplace** button
3. Enter marketplace URL or shorthand

### Supported Formats

- \`owner/repo\` — GitHub shorthand
- \`https://github.com/owner/repo\` — Full URL
- \`/local/path\` — Local directory

### Managing Marketplaces

- **Refresh** - Update plugin list from all marketplaces
- **Remove** - Remove a marketplace (plugins remain installed)
- **View external** - Toggle to see external marketplace plugins

### Creating a Marketplace

A marketplace is a Git repo with:

\`\`\`
marketplace/
├── plugins.json      # Plugin registry
└── plugins/
    ├── plugin-a/
    │   ├── plugin.json
    │   └── ...
    └── plugin-b/
        └── ...
\`\`\`

### plugins.json Format

\`\`\`json
{
  "plugins": [
    {
      "name": "my-plugin",
      "description": "Does something useful",
      "category": "utilities",
      "source": "community"
    }
  ]
}
\`\`\`
    `
  },
};
