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

Most developers land somewhere like this: allow reading files and running tests, ask before editing files or running arbitrary shell commands, deny operations that touch production or delete things.

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

Presets cover common cases—reading all files, running npm commands, editing source files. These are tested patterns that work well for most developers. Start with presets unless you have specific needs.

Custom rules let you be more precise. Want to allow editing only TypeScript files? Allow bash commands only in certain directories? Custom rules give you that control.

### A Good Starting Point

If you're not sure where to begin, here's a sensible configuration. In the **Allow** column, add \`Read(**)\` so Claude can read any file—it needs to understand your code to help with it. Add \`Bash(npm:test)\` to let it run tests freely, and \`Bash(git:status)\` for checking git state. These are all read-only or safe operations.

In the **Ask** column, add \`Edit(**)\` and \`Write(**)\` so you review any file modifications before they happen. Add \`Bash(npm:install)\` to approve new dependencies before they're installed.

In the **Deny** column, add \`Edit(.env*)\` to protect your secrets from accidental exposure, and \`Bash(rm:*)\` to prevent delete commands entirely.

Adjust based on your comfort level. Some developers allow edits to speed things up. Others ask about everything and only allow pure reads.

### Understanding the Patterns

Permissions use glob patterns to match operations. The pattern \`**\` matches everything at any depth. The pattern \`*.js\` matches JavaScript files in the current directory. The pattern \`src/**\` matches anything under the src folder.

For bash commands, the colon separates the command from its arguments. The pattern \`npm:*\` matches any npm command. The pattern \`git:push\` matches exactly that command. A bare \`*\` matches any command at all—use that one carefully.

Hover over any rule chip in the UI to see what it matches. The interface explains each pattern in plain English.

### Testing Your Setup

After configuring, try working with Claude normally. If you find yourself approving the same thing repeatedly, consider allowing it. If something happens that makes you uncomfortable, add an ask or deny rule. Permissions are meant to be tuned over time as you learn what works for your workflow.
    `
  },
  'permission-patterns': {
    title: 'Permission Patterns',
    content: `
Permissions use pattern matching to determine what operations they cover. Understanding patterns lets you write precise rules.

### File Patterns

File patterns control Read, Edit, and Write operations. The pattern \`**\` matches everything at any depth, so \`Read(**)\` means Claude can read any file anywhere in your project. The pattern \`*.js\` matches JavaScript files but only in the current directory—if you want all JavaScript files at any depth, use \`**/*.js\` instead. The pattern \`src/**\` matches everything under the src folder. For an exact file match, just use the filename: \`.env\` matches exactly that file and nothing else. You can also use brace expansion: \`*.{ts,tsx}\` matches both TypeScript and TSX files.

### Bash Patterns

Bash patterns control what shell commands Claude can run. The format is \`command:arguments\` where the colon separates the base command from its arguments.

The pattern \`npm:*\` matches any npm command with any arguments—that includes npm install, npm test, npm run build, and everything else npm can do. Similarly, \`git:*\` matches any git command. If you want to be more specific, \`npm:test\` matches exactly "npm test" and nothing else. A bare \`*\` matches any command at all, which is powerful but dangerous in the Allow column.

### MCP Patterns

MCP patterns control which tools from which MCP servers Claude can use. The format uses double underscores: \`mcp__servername__toolname\`.

The pattern \`mcp__filesystem__*\` matches any tool from the filesystem MCP. The pattern \`mcp__github__*\` matches any GitHub MCP tool. If you want to allow all MCP tools across all servers, \`mcp__*__*\` does that—though it's quite broad.

### How Patterns Combine

You can add multiple rules at each permission level. They combine logically: if any Allow rule matches an operation, it's allowed (unless a Deny rule also matches, since Deny always takes precedence).

A typical setup might allow reading anything, allow editing source files specifically, deny editing env files absolutely, and ask about all other edits. The deny rule catches the env files even though Edit would otherwise be allowed for source.

### Precision vs Simplicity

More precise patterns give finer control but require more maintenance. Simpler patterns are easier to understand but less flexible.

Start simple. Allowing all reads is probably fine—reading files is rarely dangerous. Asking about all edits is a safe default. Add more specific rules when you notice patterns in what you're approving or denying repeatedly. The permission system is designed to evolve with your workflow.
    `
  },
};
