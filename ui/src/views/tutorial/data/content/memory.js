export const memoryContent = {
  'what-is-memory': {
    title: 'What is Memory?',
    content: `
Memory lets Claude retain information across conversations. Without it, every session starts fresh—Claude doesn't know you prefer tabs over spaces, or that your team has specific naming conventions, or that last week you decided to use PostgreSQL instead of MySQL. With memory, you teach Claude once and it remembers.

### Two Kinds of Memory

**Global memory** applies everywhere you use Claude. Your general preferences, facts about your development environment, corrections to mistakes Claude keeps making—these belong in global memory. It lives in \`~/.claude/memory/\` and Claude reads it no matter which project you're in.

**Project memory** applies to one project. The tech stack, architectural decisions, code patterns unique to this codebase—these belong in project memory. It lives in \`.claude/memory/\` inside your project folder.

### What Goes in Memory

Think about what you'd tell a new team member on their first day. That's memory material.

Preferences: "I prefer functional components with hooks, never class components." Corrections: "When I say 'deploy', I mean to staging unless I specifically say production." Facts: "We use PostgreSQL 15, not MySQL." Decisions: "We chose Redux over Context because of the debugging tools." Patterns: "API responses always use \`{ success, data, error }\` format."

### How Memory Works Technically

Memory is just markdown files. Each file contains entries organized by type—preferences, corrections, facts, patterns, decisions. Claude reads these files when a session starts, incorporating them into its context.

Here's what an entry looks like:

\`\`\`markdown
## Preference: Testing
Always run tests before committing. Use Jest for unit tests, Playwright for e2e.
Learned: 2024-01-15
\`\`\`

The format is flexible. What matters is that the information is clear enough for Claude to understand and apply.

### Memory vs Rules

Memory and rules overlap in purpose but differ in intent. Rules are prescriptive—"always do this, never do that." Memory is informational—"here's context that might help." Use rules for non-negotiable conventions. Use memory for preferences, facts, and accumulated knowledge.
    `
  },
  'using-memory': {
    title: 'Using Memory',
    content: `
Let's add some memory entries to make Claude smarter about how you work.

### Accessing the Memory View

Click **Memory** in the sidebar. You'll see two tabs: **Global** and **Project**. Global memory affects all your projects; project memory affects only the current project. Switch between them depending on where the information belongs.

### Adding an Entry

Click **Add Entry** and choose the type that fits:

**Preference** — How you like things done. "Use single quotes, not double quotes." "Always add TypeScript types."

**Correction** — Something Claude gets wrong that you want fixed. "Don't use console.log for debugging; use the logger at src/utils/logger.ts."

**Fact** — Objective information Claude should know. "This is a React 18 app." "The database is PostgreSQL 15."

**Pattern** — Code patterns specific to this project. "API errors return \`{ success: false, error: { code, message } }\`."

**Decision** — Why you chose one approach over another. "We use Server Components by default. Client Components only for interactivity."

### Writing Good Entries

Be specific. "Follow good practices" doesn't help Claude—it already tries to do that. "Use Tailwind classes, never inline styles" is actionable.

Include context when it matters. If a pattern has exceptions, mention them. If a decision had alternatives, note why you rejected them.

Keep entries focused. One preference per entry is easier to maintain than a giant document covering everything.

### Maintaining Memory

Memory should evolve with your project. When conventions change, update the entries. When you discover Claude making a repeated mistake, add a correction. When entries become outdated, delete them—stale memory confuses Claude more than no memory at all.

Check your memory files occasionally. Delete duplicates. Consolidate related entries. Keep things organized so you can actually find what's there.

### Where Files Live

Global memory: \`~/.claude/memory/\`
Project memory: \`your-project/.claude/memory/\`

You can edit these files directly if you prefer. They're just markdown. Coder Config's Memory view is a convenience, not a requirement.
    `
  },
};
