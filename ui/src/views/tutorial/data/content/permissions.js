export const permissionsContent = {
  'understanding-permissions': {
    title: 'How Permissions Work',
    content: `
## How Permissions Work

Permissions control what Claude can do **automatically** vs what requires your approval.

### The Three Categories

**Allow** (Green)
- Claude does this without asking
- Good for safe, routine operations
- Example: Reading source code files

**Ask** (Amber)
- Claude asks for permission each time
- Good for operations you want to review
- Example: Running npm install

**Deny** (Red)
- Claude cannot do this at all
- Good for dangerous operations
- Example: Deleting production files

### Why This Matters

Without permissions:
- Claude asks about EVERYTHING (annoying)
- Or you use "trust mode" (risky)

With permissions:
- Claude works smoothly on safe operations
- You stay in control of sensitive ones

### Example Workflow

1. You allow \`Read(**)\` - Claude can read any file
2. You ask for \`Bash(npm:*)\` - Claude asks before running npm commands
3. You deny \`Edit(.env)\` - Claude can never edit .env files

This gives you speed AND safety.
    `
  },
  'setting-permissions': {
    title: 'Setting Up Permissions',
    content: `
## Setting Up Permissions

Let's configure some permissions for your workflow.

![Claude Code Settings](/tutorial/claude-settings.png)

### Getting There

1. Click **"Claude Code"** in the sidebar
2. Find the **"Permissions"** section
3. You'll see three tabs: Allow, Ask, Deny

### Adding a Rule

1. Click **"Add Rules"** on any tab
2. Choose from **presets** or create a **custom rule**
3. Select one or more rules to add
4. Click **"Add"**

### Recommended Starting Point

For most developers, try:

**Allow:**
- \`Read(**)\` - Read all files
- \`Bash(npm:*)\` - Run npm commands
- \`Bash(git:*)\` - Run git commands

**Ask:**
- \`Edit(**)\` - Edit any file (review changes)
- \`Write(**)\` - Create new files

**Deny:**
- \`Edit(.env)\` - Protect secrets
- \`Bash(rm:*)\` - No delete commands

### Hover for Explanations

Hover over any rule chip to see:
- What the rule means in plain English
- Examples of what it matches
- What category means for this operation
    `
  },
  'permission-patterns': {
    title: 'Permission Patterns',
    content: `
## Permission Patterns

Permissions use **patterns** to match operations. Here's how they work.

### File Patterns

- \`**\` - All files, any depth
- \`*.js\` - All .js files in current directory
- \`src/**\` - Everything under src/
- \`.env\` - Exactly the .env file

### Bash Patterns

- \`npm:*\` - Any npm command with any args
- \`git:*\` - Any git command
- \`node:*\` - Run node with any args
- \`*\` - Any command (be careful!)

### Pattern Examples

\`\`\`
Read(src/**)        → Read any file under src/
Edit(*.ts)          → Edit TypeScript files
Bash(npm:install)   → Run "npm install" only
Bash(docker:*)      → Any docker command
Write(tests/**)     → Create files under tests/
\`\`\`

### MCP Patterns

\`\`\`
mcp__filesystem__*  → Any filesystem MCP tool
mcp__github__*      → Any GitHub MCP tool
mcp__*__*           → Any MCP tool (broad!)
\`\`\`

### Tips

- Start restrictive, then allow more as needed
- Use specific patterns for sensitive operations
- Group related permissions (all npm stuff in one rule)
    `
  },
};
