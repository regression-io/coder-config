export const mcpContent = {
  'what-are-mcps': {
    title: 'What Are MCPs?',
    content: `
MCP stands for Model Context Protocol. In practical terms, MCPs are plugins that give Claude new abilities—ways to interact with systems beyond just reading and writing files.

### What MCPs Can Do

By default, Claude can read files, run shell commands, and write code. MCPs extend this. A database MCP lets Claude query your PostgreSQL or MySQL database directly. A GitHub MCP lets it read issues, create pull requests, and manage repositories. A memory MCP gives Claude persistent storage across sessions.

The protocol is standardized, so MCPs work consistently regardless of who built them. Anthropic publishes official MCPs for common use cases, and there's a growing ecosystem of community-built ones for everything from Slack integration to Kubernetes management.

### How They Work

When you configure an MCP, you're telling Claude how to start a server that provides specific tools. Claude connects to that server and can then use whatever capabilities it offers. From your perspective, you just see Claude suddenly able to do things it couldn't do before—query your database, post to Slack, read from a spreadsheet.

The server runs locally on your machine. Your data doesn't go anywhere unusual; the MCP just acts as a bridge between Claude and the system you're connecting to.

### A Practical Example

Say you add the filesystem MCP configured to access \`/var/logs/\`. Now Claude can read log files from that directory. You can ask "What errors happened in the last hour?" and Claude reads the actual logs to answer, rather than asking you to paste them.

Or add the GitHub MCP with your personal token. Claude can now list your repos, read issues, even create PRs on your behalf. The things you'd normally do through the GitHub UI or CLI, Claude can do directly.

### Where MCPs Come From

Anthropic maintains official MCPs for common integrations. The community has built many more, available through npm or GitHub. And if you have specific needs, you can build your own—the protocol is documented and there are templates to start from.
    `
  },
  'adding-mcp': {
    title: 'Adding Your First MCP',
    content: `
Let's add an MCP to see how it works. We'll use the filesystem MCP as an example since it's straightforward and immediately useful.

### Finding the MCP Registry

Click **MCP Registry** in the sidebar. This shows MCPs from the global registry—a curated list of known, working servers. Use the search bar to find "filesystem" and click on it to see the details.

### Adding to Your Project

On the MCP detail page, you'll see an **Add to Project** button. Click it. This adds the MCP to your current project's configuration, stored in \`.claude/mcps.json\`.

### Configuration

After adding, you'll see the configuration panel. The filesystem MCP needs to know which directories Claude should be able to access. The default config looks like this:

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

Change \`/path/to/allowed/directory\` to an actual path on your system—maybe \`/var/logs\` or \`/Users/yourname/data\`. You can specify multiple paths by adding more entries to the args array.

### Applying the Configuration

After configuring, click **Re-apply Config** in the header. This updates the generated config files that Claude reads. If Claude Code is already running, restart it so it picks up the new MCP.

### Testing It Works

In Claude Code, try asking something that uses your new MCP. If you configured the filesystem MCP for \`/var/logs\`, ask "List files in /var/logs" or "Show me the most recent log entries." Claude should respond with actual content from those files.

If it doesn't work, check that the path exists and is readable, that you clicked Re-apply, and that Claude Code was restarted after the change.

### What Else to Try

Other popular MCPs worth exploring: the **memory** MCP for persistent storage, the **GitHub** MCP if you work with GitHub repos, and the **postgres** MCP if you have databases to query. Each one unlocks new capabilities.
    `
  },
  'mcp-config': {
    title: 'Configuring MCPs',
    content: `
Each MCP has its own configuration needs. Some just need a command to run; others need API keys, database URLs, or other credentials. Here's how to manage all of that.

### The Configuration Panel

When you click an MCP that's been added to your project, you see its configuration panel. The main fields are:

**Command** — The program to run. Usually \`npx\` for npm packages, or a direct path to an executable.

**Args** — Arguments passed to the command. This typically includes the package name and any configuration values.

**Environment Variables** — Key-value pairs made available to the MCP process. This is where secrets go.

### Environment Variables and Secrets

Many MCPs need authentication. The GitHub MCP needs a personal access token. Database MCPs need connection strings. API integrations need API keys.

Add these in the Environment Variables section:

\`\`\`
GITHUB_TOKEN=ghp_xxxxxxxxxxxx
DATABASE_URL=postgres://user:pass@localhost/mydb
\`\`\`

These values are stored locally in your \`.claude/.env\` file. They're never committed to git (add that file to \`.gitignore\` if it isn't already). The MCP sees them as environment variables when it starts.

### Global vs Project MCPs

You can configure MCPs at two levels:

**Global MCPs** apply to all your projects. Configure these in Preferences → MCP Servers. Good candidates: memory (persistent storage across everything), tools you use universally.

**Project MCPs** apply to one project. Configure these in the MCP Registry when a project is selected. Good candidates: database connections, project-specific API integrations.

When Claude starts in a project directory, it loads global MCPs first, then adds any project-specific ones.

### Removing and Disabling

To remove an MCP from a project, find it in your project's MCP list and click the delete icon. To temporarily disable without removing, look for the toggle switch—disabled MCPs stay in your config but don't load.

### Troubleshooting

When an MCP isn't working, check these things in order:

1. Are environment variables set? Missing tokens or credentials are the most common problem.
2. Is the MCP package installed? Try running the command manually in your terminal.
3. Did you click Re-apply and restart Claude? Config changes don't take effect until both happen.
4. Check Claude's output for error messages—they usually point directly at the problem.

The MCP Registry includes troubleshooting notes for each MCP. Check there if you're stuck on a specific one.
    `
  },
};
