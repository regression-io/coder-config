export const mcpContent = {
  'what-are-mcps': {
    title: 'What Are MCPs?',
    content: `
MCP stands for Model Context Protocol. In practical terms, MCPs are plugins that give your AI coding tools new abilities—ways to interact with systems beyond just reading and writing files.

### What MCPs Can Do

By default, your AI can read files, run shell commands, and write code. MCPs extend this. A database MCP lets it query your PostgreSQL or MySQL database directly. A GitHub MCP lets it read issues, create pull requests, and manage repositories. A memory MCP gives it persistent storage across sessions.

The protocol is standardized, so MCPs work consistently regardless of who built them. There's a growing ecosystem of MCPs for everything from Slack integration to Kubernetes management.

### How They Work

When you configure an MCP, you're telling your AI how to start a server that provides specific tools. It connects to that server and can then use whatever capabilities it offers. From your perspective, you just see your AI suddenly able to do things it couldn't do before—query your database, post to Slack, read from a spreadsheet.

The server runs locally on your machine. Your data doesn't go anywhere unusual; the MCP just acts as a bridge between your AI and the system you're connecting to.

### A Practical Example

Say you add the filesystem MCP configured to access \`/var/logs/\`. Now your AI can read log files from that directory. You can ask "What errors happened in the last hour?" and it reads the actual logs to answer, rather than asking you to paste them.

Or add the GitHub MCP with your personal token. Your AI can now list your repos, read issues, even create PRs on your behalf. The things you'd normally do through the GitHub UI or CLI, it can do directly.

### Where MCPs Come From

There are official MCPs maintained for common integrations. The community has built many more, available through npm or GitHub. And if you have specific needs, you can build your own—the protocol is documented and there are templates to start from.
    `
  },
  'adding-mcp': {
    title: 'Adding Your First MCP',
    content: `
Let's add an MCP to see how it works. We'll use the filesystem MCP as an example since it's straightforward and immediately useful.

### Finding the MCP Registry

Click **MCP Registry** in the sidebar. This shows MCPs from the global registry—a curated list of known, working servers. Use the search bar to find "filesystem" and click on it to see the details.

### Adding to Your Project

From the MCP Registry, you can add any MCP to the global registry. To add it to a specific project, go to **Project Explorer**, open the project's \`mcps.json\` file, and click **+ Add MCP**. Select from registry MCPs or add a custom one. The MCP gets stored in your project's \`.claude/mcps.json\`.

### Configuration

After adding, you'll see the configuration panel. The filesystem MCP needs to know which directories your AI should be able to access. The default config looks like this:

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

After configuring, click **Re-apply** in the header (config also auto-applies on save). This updates the generated config files that your AI reads. If your AI tool is already running, restart it so it picks up the new MCP.

### Testing It Works

In your AI coding tool, try asking something that uses your new MCP. If you configured the filesystem MCP for \`/var/logs\`, ask "List files in /var/logs" or "Show me the most recent log entries." It should respond with actual content from those files.

If it doesn't work, check that the path exists and is readable, that you clicked Re-apply, and that you restarted your AI tool after the change.

### What Else to Try

Other popular MCPs worth exploring: the **memory** MCP for persistent storage, the **GitHub** MCP if you work with GitHub repos, and the **postgres** MCP if you have databases to query. Each one unlocks new capabilities.
    `
  },
  'mcp-config': {
    title: 'Configuring MCPs',
    content: `
Each MCP has its own configuration needs. Some just need a command to run; others need API keys, database URLs, or other credentials. Here's how to manage all of that.

### The Configuration Panel

When you click an MCP that's been added to your project, you see its configuration panel. The **Command** field specifies the program to run—usually \`npx\` for npm packages, or a direct path to an executable. The **Args** field contains arguments passed to that command, typically including the package name and any configuration values. The **Environment Variables** section holds key-value pairs made available to the MCP process—this is where secrets go.

### Environment Variables and Secrets

Many MCPs need authentication. The GitHub MCP needs a personal access token. Database MCPs need connection strings. API integrations need API keys.

Add these in the Environment Variables section:

\`\`\`
GITHUB_TOKEN=ghp_xxxxxxxxxxxx
DATABASE_URL=postgres://user:pass@localhost/mydb
\`\`\`

These values are stored locally in your \`.claude/.env\` file. They're never committed to git (add that file to \`.gitignore\` if it isn't already). The MCP sees them as environment variables when it starts.

### Global vs Project MCPs

You can configure MCPs at two levels. **Global MCPs** apply to all your projects—configure these in the Project Explorer's home-level \`mcps.json\` (under \`~/.claude/\`). Good candidates include the memory MCP for persistent storage across everything, or tools you use universally regardless of project.

**Project MCPs** apply to one project only—configure these in your project's \`mcps.json\` via the Project Explorer. Good candidates include database connections specific to that project, or API integrations you only need in certain contexts.

When your AI starts in a project directory, it loads global MCPs first, then adds any project-specific ones.

### Removing and Disabling

To remove an MCP from a project, find it in your project's MCP list and click the delete icon. To temporarily disable without removing, look for the toggle switch—disabled MCPs stay in your config but don't load.

### Troubleshooting

When an MCP isn't working, start by checking whether environment variables are set correctly—missing tokens or credentials are the most common problem. If that looks fine, try running the MCP command manually in your terminal to see if the package is installed and working. Make sure you clicked Re-apply and restarted your AI tool, since config changes don't take effect until both happen. Finally, check your AI tool's output for error messages—they usually point directly at the problem.

The MCP Registry includes troubleshooting notes for each MCP. Check there if you're stuck on a specific one.
    `
  },
};
