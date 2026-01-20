export const mcpContent = {
  'what-are-mcps': {
    title: 'What Are MCPs?',
    content: `
## What Are MCPs?

MCP stands for **Model Context Protocol**. Think of MCPs as "plugins" that give Claude new abilities.

### What Can MCPs Do?

MCPs connect Claude to external systems:

- **Database access** - Query your PostgreSQL, MySQL, or SQLite databases
- **File operations** - Read/write files with more control
- **API integrations** - Connect to GitHub, Slack, Linear, and more
- **Memory** - Persistent storage across sessions
- **Custom tools** - Anything you can imagine!

### How They Work

1. An MCP server runs in the background
2. Claude connects to it via the MCP protocol
3. Claude can now use the tools that server provides

### Example: Filesystem MCP

The filesystem MCP lets Claude:
- Read files from specific directories
- Write files with proper permissions
- Search file contents

\`\`\`
Claude: "Read the config file at /etc/myapp/config.json"
→ Uses filesystem MCP to safely access the file
\`\`\`

### Where Do MCPs Come From?

- **Official MCPs** - Built by Anthropic and partners
- **Community MCPs** - Open source on npm and GitHub
- **Custom MCPs** - Build your own for specific needs
    `
  },
  'adding-mcp': {
    title: 'Adding Your First MCP',
    content: `
## Adding Your First MCP

Let's add an MCP to your project. We'll use the popular **filesystem** MCP as an example.

![MCP Registry](/tutorial/mcp-registry.png)

### Step by Step

1. Click **"MCP Registry"** in the sidebar
2. Use the search bar to find "filesystem"
3. Click on the MCP card to see details
4. Click **"Add to Project"**

### Configure the MCP

After adding, you'll see a configuration panel:

\`\`\`json
{
  "command": "npx",
  "args": [
    "-y",
    "@anthropic/mcp-server-filesystem",
    "/path/to/allowed/directory"
  ]
}
\`\`\`

Customize the path to match where you want Claude to have access.

### Apply Your Changes

After configuring:
1. Click **"Re-apply Config"** in the header
2. Restart Claude Code if it's running

### Verify It's Working

In Claude Code, try:
\`\`\`
"List files in /path/to/allowed/directory"
\`\`\`

If Claude can list the files, your MCP is working!

### Popular MCPs to Try

- **@anthropic/mcp-server-filesystem** - File access
- **@anthropic/mcp-server-memory** - Persistent memory
- **@anthropic/mcp-server-github** - GitHub integration
- **@anthropic/mcp-server-postgres** - PostgreSQL queries
    `
  },
  'mcp-config': {
    title: 'Configuring MCPs',
    content: `
## Configuring MCPs

Each MCP has its own configuration options. Here's how to manage them.

### The Configuration Panel

When you click on an MCP in your project, you'll see:
- **Command** - How to start the server
- **Args** - Arguments passed to the server
- **Environment Variables** - Secrets and settings

### Environment Variables

Many MCPs need API keys or secrets. Add them in the **Environment Variables** section:

\`\`\`
GITHUB_TOKEN=ghp_xxxxxxxxxxxx
DATABASE_URL=postgres://user:pass@host/db
\`\`\`

These are stored locally and **never** committed to git.

### Global vs Project MCPs

- **Global MCPs** apply to all projects (configured in Preferences)
- **Project MCPs** apply to one project (stored in \`.claude/mcps.json\`)

Use global for MCPs you want everywhere (like memory). Use project for project-specific ones (like a specific database).

### Removing MCPs

To remove an MCP:
1. Go to MCP Registry
2. Find the MCP in your project list
3. Click the delete button

### Troubleshooting

If an MCP isn't working:
1. Check the environment variables are set correctly
2. Make sure the MCP package is installed
3. Restart Claude Code
4. Check Claude's output for error messages
    `
  },
};
