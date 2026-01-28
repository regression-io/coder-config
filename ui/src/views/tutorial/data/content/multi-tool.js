export const multiToolContent = {
  'other-tools': {
    title: 'Beyond Claude Code',
    content: `
Coder Config started as a configuration manager for Claude Code, but it's grown to support other AI coding tools too. If you use multiple assistants—maybe Claude for complex reasoning and Gemini for quick tasks—you can manage them all from one place.

### Supported Tools

**Claude Code** has full support. Everything in this tutorial applies, and Claude Code is the primary tool Coder Config is built around.

**Gemini CLI** from Google has good support. You can configure MCP servers, sync rules, and manage per-project settings. The configuration lives in \`.gemini/\` folders.

**Codex CLI** from OpenAI has similar support. MCP configuration, security policies, sandbox modes, and project settings. Configuration goes in \`.codex/\` folders.

**Antigravity** has basic support. MCP configuration and rule syncing work. The tool is less mature than the others, so support is correspondingly lighter.

### Why You'd Use Multiple Tools

Different AI assistants have different strengths. Claude excels at complex reasoning and careful analysis. Gemini is fast and well-integrated with Google services. Codex has particular strengths with certain languages and frameworks.

Some developers pick one tool and stick with it. Others switch based on the task—Claude for architecture decisions, Gemini for quick fixes, Codex for Python work. Coder Config supports either approach.

### The Unified Configuration Idea

The value proposition is simple: configure once, use everywhere. Your rules about code style, your MCP servers, your preferences—define them in Coder Config and they apply across all your tools.

In practice, there are limits. Each tool has its own configuration format and quirks. Not everything maps perfectly. But the common elements—rules, basic MCP setup, project organization—work across tools without duplicating effort.

### Enabling Other Tools

By default, Coder Config focuses on Claude Code. To add other tools, go to **Preferences** in the sidebar. Find the **Enabled Tools** section and check the tools you want to manage. New menu items appear in the sidebar for each enabled tool.
    `
  },
  'syncing-tools': {
    title: 'Syncing Between Tools',
    content: `
When you use multiple AI coding tools, keeping their configurations in sync becomes important. You don't want different rules telling Claude one thing and Gemini another.

### What Sync Does

Rule syncing copies your rule files between tool-specific folders. Claude Code rules live in \`.claude/rules/\`, Gemini CLI rules in \`.gemini/rules/\`, and Antigravity rules in \`.agent/rules/\`. When you write rules in Coder Config and sync, those rules appear in all enabled tools' configuration folders. Each tool reads from its own location, but the content is the same.

### How to Sync

Go to **Project Explorer** and look for the **Sync Rules** button. Click it, choose which tools to sync with, and the files are copied over.

You can also set up automatic syncing in Preferences. When enabled, changes to rules automatically propagate to other tools' folders.

### What Syncs and What Doesn't

Rules—markdown files—sync well. They're just text with instructions, and that works the same everywhere.

MCP configurations don't sync automatically. Each tool has its own MCP format—slightly different JSON structures, different paths, different conventions. You configure MCPs separately for each tool.

Settings also stay tool-specific. Permission rules for Claude don't map to Gemini's security model. Each tool has unique settings that don't translate.

### Source of Truth

With syncing, you need a clear source of truth. The recommended approach: treat Coder Config as the primary location. Edit rules in Coder Config, then sync to other tools. Don't edit directly in \`.gemini/rules/\` or other tool folders—those edits might get overwritten on the next sync.

If you need tool-specific rules that shouldn't sync, put them in a separate folder that the sync process ignores.

### Per-Tool Configuration

Each enabled tool has its own settings page in the sidebar. Claude Code has permissions and model preferences. Gemini CLI has display and sandbox settings. Codex CLI has security policies.

Configure each tool according to its capabilities and your needs. The unified rules give you consistency in coding conventions; the per-tool settings let you optimize each assistant's behavior.
    `
  },
};
