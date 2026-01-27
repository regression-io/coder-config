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
2. Automatically restore that context when you start a new session

### Quick Setup

**From the UI:** Go to **Settings > Sessions** and click "Install All"

**From the CLI:**
\`\`\`bash
coder-config session install
\`\`\`

This installs:
- **SessionStart hook** - Restores saved context
- **SessionEnd hook** - Preserves flushed context
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

Claude will write a summary including:
- Task summary and current state
- Key decisions made
- Files modified
- Pending work
- Important context

### Restoring Context

Just start a new Claude Code session. If you have saved context from the last 24 hours, it's automatically injected.

### Checking Status

\`\`\`bash
coder-config session
\`\`\`

Shows:
- Whether saved context exists
- How old the context is
- Last session metadata

### Clearing Context

\`\`\`bash
coder-config session clear
\`\`\`

Removes all saved session data.
    `
  },
  'sessions-storage': {
    title: 'Session Storage',
    content: `
## Session Storage

Session data is stored in \`~/.coder-config/sessions/\`:

| File | Purpose |
|------|---------|
| \`flushed-context.md\` | Context saved by /flush |
| \`last-flushed-context.md\` | Preserved from last session end |
| \`last-session.json\` | Metadata about last session |

### Context Expiration

Saved context is automatically restored if it's less than 24 hours old. Older context is ignored (but not deleted).

### Manual Context

You can also manually edit \`flushed-context.md\` to inject custom context into your next session.
    `
  },
};
