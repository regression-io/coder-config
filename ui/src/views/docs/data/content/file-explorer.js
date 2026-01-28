export const fileExplorerContent = {
  'claude-folders': {
    title: '.claude Folders',
    content: `
## .claude Folders

The \`.claude\` folder contains all Claude Code configuration for a directory.

### Creating .claude Folders

In the Project Explorer, click "+ .claude" on any directory in the hierarchy to create a new configuration folder.

### Hierarchy

Configuration is inherited from parent directories:

\`\`\`
~/.claude/              # Global - applies everywhere
~/projects/.claude/     # Workspace - applies to all projects here
~/projects/my-app/      # Project - specific to this project
\`\`\`

Settings merge from global to project, with more specific settings taking precedence.
    `
  },
  'rules': {
    title: 'Rules',
    content: `
## Rules

Rules are markdown files that provide guidelines and instructions for Claude.

### Creating Rules

1. Navigate to a \`.claude\` folder in the Project Explorer
2. Click the "+" button next to "rules"
3. Enter a name (e.g., "coding-style")

### Rule Content

Rules should be written in markdown and contain:
- Guidelines for code style
- Project-specific patterns
- Do's and don'ts
- Architecture decisions

### Example Rule

\`\`\`markdown
# Coding Style

## TypeScript
- Use strict mode
- Prefer interfaces over types
- Use named exports

## React
- Use functional components
- Prefer hooks over HOCs
- Keep components small and focused
\`\`\`

### Rule Priority

Rules are loaded in order from global to project. Project rules can override global rules.
    `
  },
  'skills': {
    title: 'Skills',
    content: `
## Skills

Skills are reusable prompts that can be invoked in Claude Code via slash commands.

### Creating Skills

1. Navigate to a \`.claude\` folder in the Project Explorer
2. Click the "+" button and select "New Skill"
3. Enter a name (e.g., "review")

### Skill Content

Skills are markdown files containing a prompt template. They can include:
- Instructions for Claude
- Templates with placeholders
- Multi-step workflows

### Example Skill

\`\`\`markdown
# Code Review

Review the selected code for:

1. **Bugs** - Logic errors, edge cases
2. **Security** - Vulnerabilities, input validation
3. **Performance** - Inefficiencies, memory leaks
4. **Style** - Consistency, readability

Provide specific suggestions with code examples.
\`\`\`

### Using Skills

In Claude Code, use \`/skill-name\` to invoke a skill.

### Note on Commands

Claude Code previously called these "commands" and stored them in \`.claude/commands/\`. Both locations still work - skills and commands have been merged into one system.
    `
  },
  'workflows': {
    title: 'Workflows',
    content: `
## Workflows

Workflows are markdown files that define multi-step processes or cross-repository operations.

### Location

Workflows are stored in \`.claude/workflows/\` in your project root.

### Creating Workflows

1. Navigate to a \`.claude\` folder in the Project Explorer
2. Click the "+" button and select "New Workflow"
3. Enter a name (e.g., "deploy-all")

### Workflow Content

Workflows typically include:
- Step-by-step instructions
- Cross-repository coordination
- Environment setup
- Deployment processes

### Example Workflow

\`\`\`markdown
# Deploy All Services

## Steps

1. Build auth-service first
2. Then build api-gateway
3. Run integration tests
4. Deploy to staging
5. Deploy to production
\`\`\`

### Use Cases

- Multi-repo deployments
- Complex build processes
- Onboarding procedures
- Release workflows
    `
  },
  'subprojects': {
    title: 'Sub-Projects',
    content: `
## Sub-Projects

Sub-projects are nested git repositories within your main project (monorepos, workspaces).

### Detection

Sub-projects are automatically detected by scanning for \`.git\` directories within your project.

### Sub-Projects View

Access via **Sub-Projects** in the sidebar (only appears if sub-projects exist).

The view shows:
- All detected sub-projects
- Which have \`.claude\` folders configured
- MCP count per sub-project

### Managing Sub-Projects

**Initialize .claude folder:**
Click the folder+ icon on a sub-project without configuration.

**Delete .claude folder:**
Click the trash icon (with confirmation) to remove configuration.

**Switch to sub-project:**
Click a sub-project card to switch context and manage it in Project Explorer.

### Sticky Navigation

When inside a sub-project, the Sub-Projects menu remains visible showing all sub-projects from the root project. Use "Back to Root" to return.

### Configuration Inheritance

Sub-projects inherit configuration from parent directories. Each sub-project can have its own \`.claude\` folder that extends the parent configuration.
    `
  },
  'hierarchy': {
    title: 'Configuration Hierarchy',
    content: `
## Configuration Hierarchy

Coder Config uses a hierarchical configuration system where settings cascade from global to local.

### Levels

1. **Global** (\`~/.claude/\`) - Applies to all projects
2. **Workspace** (intermediate directories) - Applies to projects in that directory
3. **Project** (your project's \`.claude/\`) - Specific to one project

### Merging Behavior

- **MCPs**: Merged, with local configs overriding global
- **Rules**: All rules are loaded, local rules can override
- **Skills**: All skills are available, local takes precedence
- **Settings**: Deep merged, local values override

### Viewing the Hierarchy

In the Project Explorer, you'll see all \`.claude\` folders in the hierarchy from your project up to home. You can manage configuration at each level.
    `
  },
};
