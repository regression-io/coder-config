export const multiToolContent = {
  'other-tools': {
    title: 'Beyond Claude Code',
    content: `
Claude Config isn't just for Claude Code! It also supports other AI coding tools.

### Supported Tools

**Claude Code** (Full support)
- Everything in this tutorial applies
- The primary tool we support

**Gemini CLI** (Good support)
- Google's AI coding assistant
- MCP configuration
- Rule syncing
- Per-project settings

**Antigravity** (Basic support)
- Alternative AI coding tool
- MCP configuration
- Rule syncing

### Why Multi-Tool?

You might use different tools for different things:
- Claude Code for complex reasoning
- Gemini CLI for quick tasks
- Different tools for different languages

With Claude Config, you configure once and use everywhere.

### Enabling Other Tools

1. Go to **Preferences** in the sidebar
2. Find **"Enabled Tools"**
3. Check the tools you want to use
4. New tabs appear in the sidebar for each tool
    `
  },
  'syncing-tools': {
    title: 'Syncing Between Tools',
    content: `
Keep your rules consistent across all your AI coding tools.

### The Sync Feature

Claude Config can sync rules between:
- \`.claude/rules/\` (Claude Code)
- \`.gemini/rules/\` (Gemini CLI)
- \`.agent/rules/\` (Antigravity)

### How to Sync

1. Go to **Project Explorer**
2. Click **"Sync Rules"** button
3. Choose which tools to sync
4. Rules are copied to each tool's folder

### What Gets Synced

- Rule files (\`.md\` files)
- Directory structure
- File contents

What doesn't sync:
- MCPs (different format per tool)
- Settings (tool-specific)

### Best Practice

Use Claude Config as your "source of truth":
1. Edit rules in Claude Config
2. Sync to other tools
3. Don't edit directly in other tool folders

This keeps everything consistent.

### Per-Tool Settings

Each tool has its own settings page in the sidebar:
- **Claude Code** - Permissions, model, behavior
- **Gemini CLI** - MCP configuration
- Configure each tool separately for tool-specific needs
    `
  },
};
