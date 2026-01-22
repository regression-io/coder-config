export const mcpRegistryContent = {
  'mcp-overview': {
    title: 'MCP Overview',
    content: `
## MCP Overview

MCPs (Model Context Protocol servers) extend Claude's capabilities by providing additional tools and context.

### What are MCPs?

MCPs are servers that implement the Model Context Protocol, providing:
- **Tools** - Additional commands Claude can execute
- **Resources** - Data and context Claude can access
- **Prompts** - Pre-defined prompt templates

### Common MCPs

- **filesystem** - File system access
- **github** - GitHub integration
- **postgres** - PostgreSQL database access
- **memory** - Persistent memory storage

### Configuration

MCPs are configured in \`.claude/mcps.json\`:

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
    `
  },
  'adding-mcps': {
    title: 'Adding MCPs',
    content: `
## Adding MCPs

### Via UI - Registry

1. Go to **MCP Registry** in the sidebar
2. Click **Add MCP** button
3. Paste JSON configuration:

\`\`\`json
{
  "my-mcp": {
    "command": "npx",
    "args": ["-y", "@example/mcp-server"],
    "env": {
      "API_KEY": "\${API_KEY}"
    }
  }
}
\`\`\`

4. Click "Add to Registry"

### Via UI - Config Editor

1. Go to **Project Explorer**
2. Select an \`mcps.json\` file
3. Click **Add MCP** in the editor header
4. Paste JSON to add inline MCP to that config level

### Accepted JSON Formats

Both formats work:

**Simple format:**
\`\`\`json
{ "name": { "command": "...", "args": [...] } }
\`\`\`

**Full format:**
\`\`\`json
{ "mcpServers": { "name": { "command": "...", "args": [...] } } }
\`\`\`

### Via CLI

\`\`\`bash
coder-config add filesystem github postgres
\`\`\`

### From Search Results

Search GitHub or npm in the Registry view. Click "Add" to pre-fill the JSON with suggested configuration.
    `
  },
  'configuring-mcps': {
    title: 'Configuring MCPs',
    content: `
## Configuring MCPs

### Required Fields

- **command** - The executable to run (e.g., "npx", "node", "python")
- **args** - Array of command-line arguments

### Optional Fields

- **env** - Environment variables for the MCP
- **cwd** - Working directory

### Example Configuration

\`\`\`json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "\${GITHUB_TOKEN}"
      }
    },
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "DATABASE_URL": "\${DATABASE_URL}"
      }
    }
  }
}
\`\`\`

### Per-Level Configuration

You can enable/disable MCPs at different hierarchy levels. An MCP enabled globally can be disabled for a specific project.
    `
  },
  'environment-vars': {
    title: 'Environment Variables',
    content: `
## Environment Variables

### Syntax

Use \`\${VAR_NAME}\` syntax in your MCP configuration:

\`\`\`json
{
  "env": {
    "API_KEY": "\${MY_API_KEY}"
  }
}
\`\`\`

### .env Files

Create a \`.claude/.env\` file in your project:

\`\`\`
GITHUB_TOKEN=ghp_xxxxx
DATABASE_URL=postgresql://localhost/mydb
\`\`\`

### Environment View

Use the **Environment** view in the sidebar to manage environment variables for your project.

### Security

- Never commit \`.claude/.env\` to version control
- Add it to your \`.gitignore\`
- Use different values for development and production
    `
  },
};
