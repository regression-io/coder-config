export const sessionsContent = {
  'sessions-overview': {
    title: 'Session Persistence',
    content: `
## Session Persistence

Save context from a Claude Code session and restore it on the next session start.

### The Problem

When a Claude Code session ends (context limit, exit, crash), you lose all the context Claude had about your task. Starting a new session means re-explaining everything.

### The Solution

Session persistence lets you:
1. Save context before exiting with \`/flush\`
2. Automatically restore that context when you start a new session in the same project

Context is stored locally in each project's \`.claude/session-context.md\` - each project has its own context.

### Quick Setup

**From the UI:** Go to **Settings > Sessions** and click "Install All"

**From the CLI:**
\`\`\`bash
coder-config session install
\`\`\`

This installs:
- **SessionStart hook** - Restores saved context from project
- **/flush command** - Tells Claude to save context
    `
  },
  'sessions-usage': {
    title: 'Using Session Persistence',
    content: `
## Using Session Persistence

### Saving Context

Before exiting Claude Code, run:

\`\`\`
/flush
\`\`\`

Claude will write a summary to \`.claude/session-context.md\` including:
- Task summary and current state
- Key decisions made
- Files modified
- Pending work
- Important context

### Restoring Context

Just start a new Claude Code session in the same project. If you have saved context, it's automatically injected.

### Checking Status

\`\`\`bash
coder-config session
\`\`\`

Shows whether saved context exists for the current project.

### Clearing Context

\`\`\`bash
coder-config session clear
\`\`\`

Removes saved context for the current project.
    `
  },
  'sessions-storage': {
    title: 'Session Storage',
    content: `
## Session Storage

Session context is stored in each project:

\`\`\`
<project>/.claude/session-context.md
\`\`\`

Each project has its own session context. /flush saves to the current project, and the next session in that project restores it.

### Context Expiration

Saved context is automatically restored if it's less than 7 days old.

### Manual Context

You can manually edit \`.claude/session-context.md\` to inject custom context into your next session.
    `
  },
};
