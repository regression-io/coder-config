export const permissionsContent = {
  'understanding-permissions': {
    title: 'How Permissions Work',
    content: `
Permissions control how much autonomy Claude has. Without them, Claude either asks permission for everything (slow and tedious) or runs in full trust mode (fast but risky). Permissions let you find the middle ground—automatic approval for safe operations, manual review for sensitive ones.

### The Three Levels

**Allow** means Claude proceeds without asking. Use this for operations that are safe and frequent. Reading source code files, running test suites, checking git status—things you'd approve 100% of the time anyway. Allowing them saves you from constant "May I?" dialogs.

**Ask** means Claude pauses and requests permission. Use this for operations you want to review before they happen. Installing npm packages, editing configuration files, running database migrations—things that could cause problems if done wrong. You see what Claude wants to do and decide whether to approve.

**Deny** means Claude cannot perform that operation at all. Use this for things that should never happen automatically. Deleting production files, pushing to main without review, exposing secrets—operations where the risk isn't worth the convenience.

### Finding the Balance

The goal is smooth flow for routine work while keeping guardrails on risky operations. Start by thinking about your typical development session. What does Claude do repeatedly that you always approve? Those operations should be allowed. What operations would you want to review before they happen? Those should be ask. What should never happen? Those should be denied.

Most developers land somewhere like: allow reading files and running tests, ask before editing files or running arbitrary shell commands, deny operations that touch production or delete things.

### Why This Matters

Good permissions make Claude feel like a trusted collaborator rather than an overeager intern who needs constant supervision. You can give Claude a task and let it work without interrupting you every few seconds. But you still have oversight where it counts.

Bad permissions—either too restrictive or too loose—create friction. Too restrictive and you're just clicking "approve" constantly. Too loose and you're anxious about what Claude might do while you're not looking.
    `
  },
  'setting-permissions': {
    title: 'Setting Up Permissions',
    content: `
Let's configure permissions for your workflow.

### Getting to the Permissions Panel

Click **Claude Code** in the sidebar. Scroll to the **Permissions** section. You'll see three columns: Allow, Ask, and Deny. Each shows the rules currently configured for that level.

### Adding Rules

Click **Add Rules** on any column. A dialog appears with two options: choose from presets or write a custom rule.

Presets cover common cases—"Read all files," "Run npm commands," "Edit source files." These are tested patterns that work well for most developers. Start with presets unless you have specific needs.

Custom rules let you be more precise. Want to allow editing only TypeScript files? Allow bash commands only in certain directories? Custom rules give you that control.

### A Good Starting Point

If you're not sure what to configure, here's a reasonable baseline:

**Allow:**
- \`Read(**)\` — Read any file. Claude needs to understand your code to help with it.
- \`Bash(npm:test)\` — Run tests. Tests should be safe to run.
- \`Bash(git:status)\` — Check git state. Read-only, no risk.

**Ask:**
- \`Edit(**)\` — Edit any file. Review changes before they happen.
- \`Write(**)\` — Create new files. Know what's being added.
- \`Bash(npm:install)\` — Install packages. Approve new dependencies.

**Deny:**
- \`Edit(.env*)\` — Never edit env files. Too easy to expose secrets.
- \`Bash(rm:*)\` — No delete commands. Prevent accidents.

Adjust based on your comfort level. Some developers allow edits to speed things up. Others ask about everything and only allow pure reads.

### Understanding the Patterns

Permissions use patterns to match operations:

\`**\` matches everything. \`*.js\` matches JavaScript files. \`src/**\` matches anything under src/.

For bash commands, \`npm:*\` matches any npm command. \`git:push\` matches exactly that command. \`*\` matches any command (use carefully).

Hover over any rule chip to see what it matches. The UI explains each pattern in plain English.

### Testing Your Setup

After configuring, try working with Claude normally. If you're approving the same thing repeatedly, consider allowing it. If something happens that makes you uncomfortable, add an ask or deny rule. Permissions are meant to be tuned over time.
    `
  },
  'permission-patterns': {
    title: 'Permission Patterns',
    content: `
Permissions use pattern matching to determine what operations they cover. Understanding patterns lets you write precise rules.

### File Patterns

These control file operations—Read, Edit, Write.

\`**\` — Everything, any depth. \`Read(**)\` means read any file anywhere.

\`*.js\` — All .js files in the current directory only.

\`**/*.js\` — All .js files at any depth.

\`src/**\` — Everything under the src/ folder.

\`.env\` — Exactly that file, nothing else.

\`*.{ts,tsx}\` — TypeScript and TSX files.

### Bash Patterns

These control what shell commands Claude can run.

\`npm:*\` — Any npm command with any arguments. Matches "npm install", "npm test", "npm run build".

\`git:*\` — Any git command.

\`npm:test\` — Exactly "npm test" and nothing else.

\`*\` — Any command at all. Be careful with this in Allow.

### MCP Patterns

These control which MCP tools Claude can use.

\`mcp__filesystem__*\` — Any tool from the filesystem MCP.

\`mcp__github__*\` — Any GitHub MCP tool.

\`mcp__*__*\` — Any tool from any MCP. Very broad.

### Combining Patterns

You can add multiple rules at each level. They combine logically—if any Allow rule matches, the operation is allowed (unless a Deny rule also matches). Deny takes precedence.

A reasonable combination:
- Allow \`Read(**)\` — Read anything
- Allow \`Edit(src/**)\` — Edit source files
- Deny \`Edit(.env*)\` — But never env files
- Ask \`Edit(**)\` — Ask for everything else

### Precision vs Simplicity

More precise patterns give finer control but require more maintenance. Simpler patterns are easier to understand but less flexible.

Start simple. \`Allow Read(**)\` is probably fine—reading files is rarely dangerous. \`Ask Edit(**)\` is a safe default for modifications. Add more specific rules when you notice patterns in what you're approving or denying repeatedly.

The permission system is designed to evolve. Your initial setup doesn't have to be perfect. Watch how Claude operates, see what interrupts your flow or makes you nervous, and adjust accordingly.
    `
  },
};
