import React, { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  BookOpen, Folder, Package, Brain, Settings, Terminal,
  Layout, Lock, Layers, ChevronRight, ExternalLink, Keyboard,
  Wand2, RefreshCw, Shield, FileText, HelpCircle, Sparkles
} from 'lucide-react';

const docSections = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: BookOpen,
    subsections: [
      { id: 'installation', title: 'Installation' },
      { id: 'quick-start', title: 'Quick Start' },
      { id: 'updating', title: 'Updating' },
    ]
  },
  {
    id: 'projects',
    title: 'Project Management',
    icon: Layers,
    subsections: [
      { id: 'project-registry', title: 'Project Registry' },
      { id: 'project-switching', title: 'Switching Projects' },
      { id: 'project-structure', title: 'Project Structure' },
    ]
  },
  {
    id: 'file-explorer',
    title: 'Project Explorer',
    icon: Folder,
    subsections: [
      { id: 'claude-folders', title: '.claude Folders' },
      { id: 'rules', title: 'Rules' },
      { id: 'commands', title: 'Commands' },
      { id: 'workflows', title: 'Workflows' },
      { id: 'hierarchy', title: 'Configuration Hierarchy' },
      { id: 'subprojects', title: 'Sub-Projects' },
    ]
  },
  {
    id: 'workstreams',
    title: 'Workstreams',
    icon: Layers,
    isNew: true,
    subsections: [
      { id: 'workstreams-overview', title: 'Overview' },
      { id: 'creating-workstreams', title: 'Creating Workstreams' },
      { id: 'workstream-hooks', title: 'Hook Integration' },
      { id: 'activity-tracking', title: 'Activity Tracking' },
      { id: 'smart-sync', title: 'Smart Sync' },
    ]
  },
  {
    id: 'plugins',
    title: 'Plugins',
    icon: Package,
    isNew: true,
    subsections: [
      { id: 'plugins-overview', title: 'Overview' },
      { id: 'installing-plugins', title: 'Installing Plugins' },
      { id: 'plugin-marketplaces', title: 'Marketplaces' },
    ]
  },
  {
    id: 'mcp-registry',
    title: 'MCP Registry',
    icon: Package,
    subsections: [
      { id: 'mcp-overview', title: 'Overview' },
      { id: 'adding-mcps', title: 'Adding MCPs' },
      { id: 'configuring-mcps', title: 'Configuring MCPs' },
      { id: 'environment-vars', title: 'Environment Variables' },
    ]
  },
  {
    id: 'memory',
    title: 'Memory System',
    icon: Brain,
    subsections: [
      { id: 'memory-overview', title: 'Overview' },
      { id: 'global-memory', title: 'Global Memory' },
      { id: 'project-memory', title: 'Project Memory' },
      { id: 'memory-entries', title: 'Memory Entry Types' },
    ]
  },
  {
    id: 'claude-settings',
    title: 'Claude Code Settings',
    icon: Shield,
    subsections: [
      { id: 'permissions', title: 'Permissions' },
      { id: 'model-selection', title: 'Model Selection' },
      { id: 'behavior', title: 'Behavior Settings' },
      { id: 'hooks', title: 'Hooks' },
    ]
  },
  {
    id: 'templates',
    title: 'Templates',
    icon: Layout,
    subsections: [
      { id: 'using-templates', title: 'Using Templates' },
      { id: 'available-templates', title: 'Available Templates' },
      { id: 'custom-templates', title: 'Custom Templates' },
    ]
  },
  {
    id: 'cli',
    title: 'CLI Reference',
    icon: Terminal,
    subsections: [
      { id: 'cli-overview', title: 'Overview' },
      { id: 'cli-commands', title: 'All Commands' },
      { id: 'daemon-mode', title: 'Daemon Mode' },
    ]
  },
  {
    id: 'multi-tool',
    title: 'Multi-Tool Support',
    icon: Sparkles,
    subsections: [
      { id: 'supported-tools', title: 'Supported Tools' },
      { id: 'gemini-cli', title: 'Gemini CLI' },
      { id: 'antigravity', title: 'Antigravity' },
      { id: 'tool-differences', title: 'Tool Differences' },
      { id: 'enabling-tools', title: 'Enabling Tools' },
      { id: 'syncing-rules', title: 'Syncing Rules' },
    ]
  },
  {
    id: 'keyboard',
    title: 'Keyboard Shortcuts',
    icon: Keyboard,
    subsections: []
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    icon: HelpCircle,
    subsections: [
      { id: 'common-issues', title: 'Common Issues' },
      { id: 'getting-help', title: 'Getting Help' },
    ]
  },
];

const docContent = {
  // Getting Started
  'installation': {
    title: 'Installation',
    content: `
## Installation

Install claude-config globally via npm:

\`\`\`bash
npm install -g @regression-io/claude-config
\`\`\`

Or install from GitHub directly:

\`\`\`bash
npm install -g github:regression-io/claude-config
\`\`\`

### Requirements

- **Node.js 18+** is required
- Works on macOS, Linux, and Windows (with some limitations)

### Verify Installation

After installation, verify it's working:

\`\`\`bash
claude-config --version
\`\`\`

This should display the version number and installation paths.
    `
  },
  'quick-start': {
    title: 'Quick Start',
    content: `
## Quick Start

### 1. Start the UI

\`\`\`bash
claude-config ui
\`\`\`

This starts the web UI as a background daemon on port 3333.

### 2. Open in Browser

Navigate to **http://localhost:3333**

### 3. Add a Project

Click "Add Project" in the header or go to All Projects view to register your project directories.

### 4. Initialize Configuration

For each project, you can:
- Create a \`.claude\` folder with configuration
- Add rules (guidelines for Claude)
- Add commands (reusable prompts)
- Configure MCPs (Model Context Protocol servers)

### 5. Apply Templates

Use pre-built templates to quickly set up rules for your project type:
- **fastapi** - Python FastAPI projects
- **react-ts** - React with TypeScript
- **python-cli** - Python CLI tools
- And more...

### 6. Install as App (Optional)

Claude Config is a PWA (Progressive Web App). Install it to your taskbar:

**Chrome/Edge:** Click the install icon in the address bar
**Safari:** Share → Add to Dock

### 7. Theme

Use the theme toggle in the header to switch between:
- **Light** - Light mode
- **Dark** - Dark mode
- **Auto** - Follow system preference
    `
  },
  'updating': {
    title: 'Updating',
    content: `
## Updating

### Automatic Update Detection

The UI automatically checks npm for new versions. When an update is available, you'll see a notification in the Preferences page.

### Manual Update

\`\`\`bash
npm update -g @regression-io/claude-config
\`\`\`

Or for a clean reinstall:

\`\`\`bash
npm uninstall -g @regression-io/claude-config
npm install -g @regression-io/claude-config
\`\`\`

### After Updating

If you have the UI running as a daemon, restart it:

\`\`\`bash
claude-config ui stop
claude-config ui
\`\`\`
    `
  },

  // Project Management
  'project-registry': {
    title: 'Project Registry',
    content: `
## Project Registry

The project registry keeps track of all your Claude-enabled projects. It's stored in \`~/.claude-config/projects.json\`.

### Adding Projects

**Via UI:**
1. Click "Add Project" in the header
2. Select a directory

**Via CLI:**
\`\`\`bash
claude-config project add /path/to/project
claude-config project add /path/to/project --name "My Project"
\`\`\`

### Listing Projects

\`\`\`bash
claude-config project
\`\`\`

### Removing Projects

\`\`\`bash
claude-config project remove "My Project"
claude-config project remove /path/to/project
\`\`\`

Note: Removing a project from the registry does not delete the project files.
    `
  },
  'project-switching': {
    title: 'Switching Projects',
    content: `
## Switching Projects

### Via UI

Use the project dropdown in the header to quickly switch between registered projects. The UI will reload to show the new project's configuration.

### Via CLI

\`\`\`bash
claude-config ui --dir /path/to/project
\`\`\`

### Active Project

The active project is remembered between sessions. When you start the UI, it automatically loads the last active project.
    `
  },
  'project-structure': {
    title: 'Project Structure',
    content: `
## Project Structure

A Claude-enabled project has a \`.claude\` folder with this structure:

\`\`\`
your-project/
├── .claude/
│   ├── mcps.json       # MCP configuration
│   ├── settings.json   # Project-specific settings
│   ├── CLAUDE.md       # Project instructions
│   ├── rules/          # Rule files (*.md)
│   │   ├── style.md
│   │   └── patterns.md
│   ├── commands/       # Command files (*.md)
│   │   ├── review.md
│   │   └── test.md
│   ├── workflows/      # Workflow files (*.md)
│   │   └── deploy.md
│   └── memory/         # Project memory (optional)
│       ├── context.md
│       └── patterns.md
└── .mcp.json           # Generated - Claude Code reads this
\`\`\`

### Generated Files

The \`.mcp.json\` file in your project root is generated by running \`claude-config apply\`. Claude Code reads this file to configure MCPs.
    `
  },

  // File Explorer
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
  'commands': {
    title: 'Commands',
    content: `
## Commands

Commands are reusable prompts that can be invoked in Claude Code.

### Creating Commands

1. Navigate to a \`.claude\` folder in the Project Explorer
2. Click the "+" button next to "commands"
3. Enter a name (e.g., "review")

### Command Content

Commands are markdown files containing a prompt template. They can include:
- Instructions for Claude
- Templates with placeholders
- Multi-step workflows

### Example Command

\`\`\`markdown
# Code Review

Review the selected code for:

1. **Bugs** - Logic errors, edge cases
2. **Security** - Vulnerabilities, input validation
3. **Performance** - Inefficiencies, memory leaks
4. **Style** - Consistency, readability

Provide specific suggestions with code examples.
\`\`\`

### Using Commands

In Claude Code, use \`/command-name\` to invoke a command.
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

Claude Config uses a hierarchical configuration system where settings cascade from global to local.

### Levels

1. **Global** (\`~/.claude/\`) - Applies to all projects
2. **Workspace** (intermediate directories) - Applies to projects in that directory
3. **Project** (your project's \`.claude/\`) - Specific to one project

### Merging Behavior

- **MCPs**: Merged, with local configs overriding global
- **Rules**: All rules are loaded, local rules can override
- **Commands**: All commands are available, local takes precedence
- **Settings**: Deep merged, local values override

### Viewing the Hierarchy

In the Project Explorer, you'll see all \`.claude\` folders in the hierarchy from your project up to home. You can manage configuration at each level.
    `
  },

  // MCP Registry
  'mcp-overview': {
    title: 'MCP Overview',
    content: `
## MCP Overview

MCPs (Model Context Protocol servers) extend Claude's capabilities by providing additional tools and context.

### What are MCPs?

MCPs are servers that implement the Model Context Protocol, providing:
- **Tools** - Additional commands Claude can execute
- **Resources** - Data and context Claude can access
- **Prompts** - Pre-defined prompt templates

### Common MCPs

- **filesystem** - File system access
- **github** - GitHub integration
- **postgres** - PostgreSQL database access
- **memory** - Persistent memory storage

### Configuration

MCPs are configured in \`.claude/mcps.json\`:

\`\`\`json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path"]
    }
  }
}
\`\`\`
    `
  },
  'adding-mcps': {
    title: 'Adding MCPs',
    content: `
## Adding MCPs

### Via UI - Registry

1. Go to **MCP Registry** in the sidebar
2. Click **Add MCP** button
3. Paste JSON configuration:

\`\`\`json
{
  "my-mcp": {
    "command": "npx",
    "args": ["-y", "@example/mcp-server"],
    "env": {
      "API_KEY": "\${API_KEY}"
    }
  }
}
\`\`\`

4. Click "Add to Registry"

### Via UI - Config Editor

1. Go to **Project Explorer**
2. Select an \`mcps.json\` file
3. Click **Add MCP** in the editor header
4. Paste JSON to add inline MCP to that config level

### Accepted JSON Formats

Both formats work:

**Simple format:**
\`\`\`json
{ "name": { "command": "...", "args": [...] } }
\`\`\`

**Full format:**
\`\`\`json
{ "mcpServers": { "name": { "command": "...", "args": [...] } } }
\`\`\`

### Via CLI

\`\`\`bash
claude-config add filesystem github postgres
\`\`\`

### From Search Results

Search GitHub or npm in the Registry view. Click "Add" to pre-fill the JSON with suggested configuration.
    `
  },
  'configuring-mcps': {
    title: 'Configuring MCPs',
    content: `
## Configuring MCPs

### Required Fields

- **command** - The executable to run (e.g., "npx", "node", "python")
- **args** - Array of command-line arguments

### Optional Fields

- **env** - Environment variables for the MCP
- **cwd** - Working directory

### Example Configuration

\`\`\`json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "\${GITHUB_TOKEN}"
      }
    },
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "DATABASE_URL": "\${DATABASE_URL}"
      }
    }
  }
}
\`\`\`

### Per-Level Configuration

You can enable/disable MCPs at different hierarchy levels. An MCP enabled globally can be disabled for a specific project.
    `
  },
  'environment-vars': {
    title: 'Environment Variables',
    content: `
## Environment Variables

### Syntax

Use \`\${VAR_NAME}\` syntax in your MCP configuration:

\`\`\`json
{
  "env": {
    "API_KEY": "\${MY_API_KEY}"
  }
}
\`\`\`

### .env Files

Create a \`.claude/.env\` file in your project:

\`\`\`
GITHUB_TOKEN=ghp_xxxxx
DATABASE_URL=postgresql://localhost/mydb
\`\`\`

### Environment View

Use the **Environment** view in the sidebar to manage environment variables for your project.

### Security

- Never commit \`.claude/.env\` to version control
- Add it to your \`.gitignore\`
- Use different values for development and production
    `
  },

  // Memory System
  'memory-overview': {
    title: 'Memory Overview',
    content: `
## Memory System

The memory system allows Claude to retain knowledge across sessions.

### Types of Memory

1. **Global Memory** (\`~/.claude/memory/\`)
   - Preferences - Your personal preferences
   - Corrections - Mistakes to avoid
   - Facts - Facts about your environment

2. **Project Memory** (\`project/.claude/memory/\`)
   - Context - Project overview
   - Patterns - Code patterns
   - Decisions - Architecture decisions
   - Issues - Known issues
   - History - Session history

### How It Works

Memory files are markdown documents that Claude reads at the start of each session, providing context and learned knowledge.
    `
  },
  'global-memory': {
    title: 'Global Memory',
    content: `
## Global Memory

Global memory applies to all your Claude interactions.

### Location

\`~/.claude/memory/\`

### Files

- **preferences.md** - Your coding preferences, tool choices, style preferences
- **corrections.md** - Things Claude got wrong that it should remember
- **facts.md** - Facts about your environment, setup, tools

### Example: preferences.md

\`\`\`markdown
# Preferences

## Code Style
- Use 2 spaces for indentation
- Prefer functional programming patterns
- Always add TypeScript types

## Tools
- Use pnpm instead of npm
- Prefer Vite over webpack
\`\`\`
    `
  },
  'project-memory': {
    title: 'Project Memory',
    content: `
## Project Memory

Project memory is specific to a single project.

### Location

\`project/.claude/memory/\`

### Files

- **context.md** - Project overview, tech stack, architecture
- **patterns.md** - Code patterns specific to this project
- **decisions.md** - Architectural decisions and rationale
- **issues.md** - Known issues and workarounds
- **history.md** - Log of work done in sessions

### Initializing Project Memory

In the Memory view, click "Initialize" to create memory files from templates.

### Example: context.md

\`\`\`markdown
# Project Context

## Overview
E-commerce platform built with Next.js and Prisma.

## Tech Stack
- Frontend: Next.js 14, React 18, Tailwind CSS
- Backend: Next.js API routes, Prisma ORM
- Database: PostgreSQL
- Auth: NextAuth.js

## Key Directories
- /app - Next.js app router pages
- /components - React components
- /lib - Utilities and helpers
\`\`\`
    `
  },
  'memory-entries': {
    title: 'Memory Entry Types',
    content: `
## Memory Entry Types

### Preference

User preferences for tools, style, and workflow.

\`\`\`markdown
## [Category]
- Preference description
- Another preference
\`\`\`

### Correction

Something Claude got wrong that should be remembered.

\`\`\`markdown
## [Topic]
- **Wrong**: What Claude did wrong
- **Right**: What to do instead
\`\`\`

### Pattern

A code pattern specific to the project.

\`\`\`markdown
## Pattern Name
Description of when to use this pattern.

\\\`\\\`\\\`typescript
// Code example
\\\`\\\`\\\`
\`\`\`

### Decision

An architectural decision with context.

\`\`\`markdown
## Decision Title
**Context**: Why this decision was needed
**Decision**: What was decided
**Rationale**: Why this was chosen
\`\`\`

### Issue

A known issue with workaround.

\`\`\`markdown
## Issue Title
**Problem**: Description of the issue
**Workaround**: How to work around it
\`\`\`
    `
  },

  // Claude Settings
  'permissions': {
    title: 'Permissions',
    content: `
## Permissions

Control what Claude Code can do automatically.

### Permission Levels

- **Allow** - Tools that run without asking
- **Ask** - Tools that require confirmation
- **Deny** - Tools that are blocked

### Pattern Syntax

\`\`\`
Tool(pattern)
\`\`\`

Examples:
- \`Bash(npm run build)\` - Specific command
- \`Bash(npm:*)\` - Prefix match (npm anything)
- \`Read(**)\` - All file reads
- \`Edit(src/**)\` - Edit files in src/
- \`mcp__github__*\` - All GitHub MCP tools

### Managing Permissions

In the **Claude Code** settings view:
1. Navigate to the Permissions tab
2. Add patterns to Allow, Ask, or Deny lists
3. Click Save to apply

### Best Practices

- Start restrictive, allow more as needed
- Use specific patterns over wildcards
- Review deny list for security-sensitive operations
    `
  },
  'model-selection': {
    title: 'Model Selection',
    content: `
## Model Selection

Choose which Claude model to use.

### Available Models

- **Claude Sonnet 4** - Fast, capable, good for most tasks
- **Claude Opus 4** - Most capable, best for complex tasks
- **Claude Haiku** - Fastest, good for simple tasks

### Setting the Model

In **Claude Code** settings, use the Model dropdown to select your preferred model.

### Per-Task Model

Some tasks may benefit from different models:
- Use Haiku for quick edits
- Use Opus for complex refactoring
- Use Sonnet as a balanced default
    `
  },
  'behavior': {
    title: 'Behavior Settings',
    content: `
## Behavior Settings

Configure how Claude Code behaves.

### Available Settings

- **Auto-accept edits** - Automatically accept file changes
- **Verbose mode** - Show more detailed output
- **Enable MCPs** - Toggle MCP servers on/off

### Configuration

These settings are stored in \`~/.claude/settings.json\` and can be edited in the Claude Code settings view.
    `
  },
  'hooks': {
    title: 'Hooks',
    content: `
## Hooks

Hooks allow you to run custom commands at specific points.

### Available Hooks

- **preToolUse** - Before a tool is used
- **postToolUse** - After a tool is used
- **notification** - When Claude sends a notification

### Configuration

\`\`\`json
{
  "hooks": {
    "postToolUse": "echo 'Tool used'"
  }
}
\`\`\`

### Use Cases

- Run linters after file edits
- Log tool usage
- Custom notifications
    `
  },

  // Templates
  'using-templates': {
    title: 'Using Templates',
    content: `
## Using Templates

Templates provide pre-configured rules and settings for different project types.

### Applying Templates

**Via UI:**
1. Go to **Templates** in the sidebar
2. Select a template
3. Click "Apply to Project"

**Via CLI:**
\`\`\`bash
claude-config init --template fastapi
claude-config apply-template react-ts
\`\`\`

### What Templates Include

- Rules for the technology/framework
- Best practices
- Common patterns
- Style guidelines
    `
  },
  'available-templates': {
    title: 'Available Templates',
    content: `
## Available Templates

### Languages

- **python** - Python general
- **typescript** - TypeScript general
- **javascript** - JavaScript general

### Frameworks

- **fastapi** - Python FastAPI
- **react-ts** - React with TypeScript
- **react-js** - React with JavaScript
- **python-cli** - Python CLI apps
- **mcp-python** - MCP server in Python

### Composites

- **fastapi-react-ts** - Full-stack FastAPI + React TypeScript
- **fastapi-react-js** - Full-stack FastAPI + React JavaScript

### Universal

- **universal** - Common rules for any project
    `
  },
  'custom-templates': {
    title: 'Custom Templates',
    content: `
## Custom Templates

### Creating Custom Templates

Templates are stored in the templates directory. To create a custom template:

1. Create a directory in \`~/.claude-config/templates/\`
2. Add a \`template.json\` manifest
3. Add rules in a \`rules/\` subdirectory

### Template Structure

\`\`\`
my-template/
├── template.json
└── rules/
    ├── style.md
    └── patterns.md
\`\`\`

### template.json

\`\`\`json
{
  "name": "My Template",
  "description": "Custom template for my projects",
  "category": "custom"
}
\`\`\`
    `
  },

  // CLI Reference
  'cli-overview': {
    title: 'CLI Overview',
    content: `
## CLI Overview

The \`claude-config\` CLI provides command-line access to all features.

### Basic Usage

\`\`\`bash
claude-config [command] [options]
\`\`\`

### Getting Help

\`\`\`bash
claude-config --help
claude-config <command> --help
\`\`\`

### Global Options

- \`--version, -v\` - Show version
- \`--help, -h\` - Show help
    `
  },
  'cli-commands': {
    title: 'All Commands',
    content: `
## All CLI Commands

### UI Commands

\`\`\`bash
claude-config ui                  # Start UI (daemon mode)
claude-config ui --foreground     # Run in foreground
claude-config ui --port 8080      # Custom port
claude-config ui status           # Check daemon status
claude-config ui stop             # Stop daemon
\`\`\`

### Project Commands

\`\`\`bash
claude-config init                # Initialize project
claude-config init --template X   # Initialize with template
claude-config apply               # Generate .mcp.json
claude-config show                # Show configuration
\`\`\`

### MCP Commands

\`\`\`bash
claude-config list                # List available MCPs
claude-config add <mcp>           # Add MCP to project
claude-config remove <mcp>        # Remove MCP
claude-config registry-add        # Add to registry
claude-config registry-remove     # Remove from registry
\`\`\`

### Project Registry

\`\`\`bash
claude-config project             # List projects
claude-config project add         # Add project
claude-config project remove      # Remove project
\`\`\`

### Memory Commands

\`\`\`bash
claude-config memory              # Show memory status
claude-config memory init         # Initialize memory
claude-config memory add          # Add entry
claude-config memory search       # Search memory
\`\`\`

### Environment

\`\`\`bash
claude-config env                 # List variables
claude-config env set KEY value   # Set variable
claude-config env unset KEY       # Remove variable
\`\`\`

### Templates

\`\`\`bash
claude-config templates           # List templates
claude-config apply-template X    # Apply template
\`\`\`

### Workstreams

\`\`\`bash
claude-config workstream              # List workstreams
claude-config workstream create "X"   # Create workstream
claude-config workstream delete "X"   # Delete workstream
claude-config workstream use "X"      # Set active
claude-config workstream active       # Show active
claude-config workstream add-project "X" /path    # Add project
claude-config workstream remove-project "X" /path # Remove project
claude-config workstream inject       # Output rules for hooks
claude-config workstream detect       # Detect from directory
\`\`\`
    `
  },
  'daemon-mode': {
    title: 'Daemon Mode',
    content: `
## Daemon Mode

By default, \`claude-config ui\` runs as a background daemon.

### Starting the Daemon

\`\`\`bash
claude-config ui
\`\`\`

The UI starts in the background and you can continue using your terminal.

### Checking Status

\`\`\`bash
claude-config ui status
\`\`\`

### Stopping the Daemon

\`\`\`bash
claude-config ui stop
\`\`\`

### Foreground Mode

To run in the foreground (blocking):

\`\`\`bash
claude-config ui --foreground
# or
claude-config ui -f
\`\`\`

### Logs

Daemon logs are stored in \`~/.claude-config/ui.log\`
    `
  },

  // Multi-Tool Support
  'tool-differences': {
    title: 'Tool Differences',
    content: `
## Tool Differences

### Configuration Formats

All tools use identical JSON format for MCP server definitions:

\`\`\`json
{
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["-y", "@some/server"],
      "env": { "API_KEY": "..." }
    }
  }
}
\`\`\`

### Feature Comparison

| Feature | Claude Code | Gemini CLI | Antigravity |
|---------|-------------|------------|-------------|
| Type | Terminal CLI | Terminal CLI | Full IDE |
| MCP Config | \`.mcp.json\` | \`~/.gemini/settings.json\` | \`~/.gemini/antigravity/\` |
| Env Interpolation | Yes (\`\${VAR}\`) | Yes | No |
| Commands | \`.claude/commands/\` | \`.gemini/commands/\` | Unknown |
| Rules | \`.claude/rules/\` | \`.gemini/\` | \`.agent/rules/\` |
| Instructions | \`CLAUDE.md\` | \`GEMINI.md\` | \`GEMINI.md\` |

### What This Means

- Your MCP registry is shared between all tools
- When you click "Apply Config", all enabled tools get updated
- Rules can be synced between Claude Code and Antigravity
- Gemini CLI and Antigravity share global instructions (known conflict)
    `
  },
  'enabling-tools': {
    title: 'Enabling Tools',
    content: `
## Enabling Tools

Control which tools receive configuration updates.

### Via Preferences UI

1. Go to **Preferences** in the sidebar
2. Find the **Enabled AI Tools** section
3. Toggle tools on/off:
   - **Claude Code** - Writes to \`.mcp.json\`
   - **Gemini CLI** - Writes to \`~/.gemini/settings.json\`
   - **Antigravity** - Writes to \`~/.gemini/antigravity/mcp_config.json\`

### Apply Behavior

When you click **Apply Config**:
- Config is generated for ALL enabled tools
- Toast notification shows which tools were updated
- Each tool receives its format-specific output

### Config File

Tool preferences are stored in \`~/.claude-config/config.json\`:

\`\`\`json
{
  "enabledTools": ["claude", "gemini", "antigravity"]
}
\`\`\`
    `
  },
  'syncing-rules': {
    title: 'Syncing Rules',
    content: `
## Syncing Rules Between Tools

Sync rules between Claude Code and Antigravity to maintain consistency.

### Accessing Sync

1. Enable **both tools** in Preferences
2. Go to **Project Explorer**
3. Click the **Sync** button in the toolbar

### Sync Dialog

The sync dialog allows you to:

- **Choose direction**: Claude Code → Antigravity or vice versa
- **Preview changes**: See which files will be copied
- **Selective sync**: Choose specific files to sync
- **Status indicators**:
  - **New**: File doesn't exist in target
  - **Modified**: File differs from target
  - **Same**: Files are identical

### What Gets Synced

| From | To |
|------|-----|
| \`.claude/rules/*.md\` | \`.agent/rules/*.md\` |
| \`.agent/rules/*.md\` | \`.claude/rules/*.md\` |

### Notes

- Syncing **copies** files (doesn't move them)
- Target files are **overwritten** if they exist
- Instructions files (CLAUDE.md / GEMINI.md) are not synced
- Commands and workflows are Claude-specific (not synced)
- Gemini CLI uses different paths and is not currently included in rule sync
    `
  },

  // Keyboard Shortcuts
  'keyboard': {
    title: 'Keyboard Shortcuts',
    content: `
## Keyboard Shortcuts

### File Explorer

| Shortcut | Action |
|----------|--------|
| \`Ctrl/Cmd + S\` | Save current file |
| \`Delete\` | Delete selected item |
| \`Enter\` | Open selected item |

### Editor

| Shortcut | Action |
|----------|--------|
| \`Ctrl/Cmd + S\` | Save file |
| \`Ctrl/Cmd + Z\` | Undo |
| \`Ctrl/Cmd + Shift + Z\` | Redo |

### Navigation

| Shortcut | Action |
|----------|--------|
| \`Ctrl/Cmd + 1-9\` | Switch sidebar sections |
    `
  },

  // Troubleshooting
  'common-issues': {
    title: 'Common Issues',
    content: `
## Common Issues

### UI won't start

**Symptom**: \`claude-config ui\` shows "Started daemon" but the UI doesn't open.

**Solution**:
\`\`\`bash
claude-config ui stop
claude-config ui --foreground
\`\`\`

Check for errors in the output.

### Port already in use

**Symptom**: Error about port 3333 being in use.

**Solution**:
\`\`\`bash
claude-config ui --port 3334
\`\`\`

Or find and stop the process using port 3333.

### MCPs not loading

**Symptom**: MCPs show in config but aren't available in Claude Code.

**Solution**:
1. Run \`claude-config apply\` to regenerate .mcp.json
2. Restart Claude Code
3. Check environment variables are set

### npm install fails

**Symptom**: Errors during \`npm install -g\`

**Solution**:
\`\`\`bash
npm cache clean --force
npm install -g @regression-io/claude-config
\`\`\`
    `
  },
  'getting-help': {
    title: 'Getting Help',
    content: `
## Getting Help

### Documentation

This documentation is available in the app under **Docs & Help**.

### GitHub Issues

Report bugs and request features:
https://github.com/regression-io/claude-config/issues

### Version Info

\`\`\`bash
claude-config --version
\`\`\`

### Debug Info

When reporting issues, include:
- claude-config version
- Node.js version (\`node --version\`)
- Operating system
- Error messages or logs
    `
  },

  // Workstreams
  'workstreams-overview': {
    title: 'Workstreams Overview',
    content: `
## Workstreams

Workstreams are **context sets** for multi-project workflows. They group related projects and inject context rules into every Claude session.

### Why Workstreams?

When working on complex features that span multiple repos (e.g., REST API + UI + shared library), you need Claude to understand the broader context. Workstreams solve this by:

1. **Grouping related projects together**
2. **Defining rules specific to that workflow**
3. **Automatically injecting those rules into every Claude session**

### Example Use Cases

- **Feature Development**: Group API, frontend, and shared libraries for a feature
- **Bug Investigation**: Group related services to trace issues across boundaries
- **Refactoring**: Group all affected repos during large-scale changes
- **Onboarding**: Create workstreams for different parts of your codebase

### Workstream Structure

Each workstream has:
- **Name** - Descriptive name (e.g., "User Auth", "Payment Flow")
- **Projects** - List of project directories included
- **Rules** - Context and guidelines specific to this workflow
- **Active Status** - Only one workstream can be active at a time
    `
  },
  'creating-workstreams': {
    title: 'Creating Workstreams',
    content: `
## Creating Workstreams

### Via UI

1. Go to **Workstreams** in the sidebar
2. Click **Create Workstream** button
3. Enter a name and optional description
4. Add projects using the project picker
5. Write rules for Claude to follow
6. Click **Create**

### Via CLI

\`\`\`bash
# Create a workstream
claude-config workstream create "User Auth"

# Add projects to it
claude-config workstream add-project "User Auth" ~/projects/api
claude-config workstream add-project "User Auth" ~/projects/ui
claude-config workstream add-project "User Auth" ~/projects/shared

# Activate it
claude-config workstream use "User Auth"
\`\`\`

### Managing Workstreams

**List all workstreams:**
\`\`\`bash
claude-config workstream
\`\`\`

**Show active workstream:**
\`\`\`bash
claude-config workstream active
\`\`\`

**Delete a workstream:**
\`\`\`bash
claude-config workstream delete "User Auth"
\`\`\`

### Editing Rules

In the UI, click a workstream to expand it and edit rules. Rules are markdown text that gets injected into Claude sessions:

\`\`\`markdown
Focus on user authentication flow.
- Use JWT tokens for auth
- React Query for state management
- PostgreSQL for persistence
- Follow REST conventions
\`\`\`
    `
  },
  'workstream-hooks': {
    title: 'Workstream Hook Integration',
    content: `
## Hook Integration

For workstream rules to be automatically injected into Claude sessions, you need to install a pre-prompt hook.

### One-Click Install (Recommended)

1. Open Web UI → **Workstreams**
2. Click **Install Hook Automatically**
3. Done! A green "Hook Installed" badge will appear

### Manual Installation

Add to \`~/.claude/hooks/pre-prompt.sh\`:

\`\`\`bash
#!/bin/bash
claude-config workstream inject --silent
\`\`\`

Make it executable:
\`\`\`bash
chmod +x ~/.claude/hooks/pre-prompt.sh
\`\`\`

### How It Works

1. When you start a Claude session, the pre-prompt hook runs
2. It checks for an active workstream
3. If found, it outputs the workstream's rules
4. These rules are prepended to your Claude session context

### Testing the Hook

\`\`\`bash
# See what would be injected
claude-config workstream inject

# Silent mode (no output if no workstream)
claude-config workstream inject --silent
\`\`\`

### Auto-Detection

Claude-config can also detect which workstream to use based on your current directory:

\`\`\`bash
claude-config workstream detect /path/to/project
\`\`\`
    `
  },
  'activity-tracking': {
    title: 'Activity Tracking',
    content: `
## Activity Tracking

Activity tracking observes which files and projects you work with during Claude sessions, enabling intelligent workstream suggestions.

### How It Works

1. A post-response hook logs file paths accessed during Claude sessions
2. Co-activity patterns are detected (projects frequently worked on together)
3. Workstream suggestions appear in the UI based on these patterns

### Setting Up Activity Tracking

Add to \`~/.claude/hooks/post-response.sh\`:

\`\`\`bash
#!/bin/bash
source /path/to/claude-config/hooks/activity-track.sh
\`\`\`

Or use the one-click install in the Workstreams view.

### Activity Insights Panel

In the **Workstreams** view, the Activity Insights panel shows:
- **Sessions tracked** - Number of Claude sessions logged
- **Files tracked** - Total file accesses recorded
- **Active projects** - Projects with recent activity
- **Top projects** - Most frequently accessed projects

### Workstream Suggestions

Based on co-activity patterns, claude-config suggests workstreams:

- **Co-activity score** - Percentage showing how often projects are worked on together
- **Create button** - Opens pre-filled dialog (tweak projects as needed)
- **Dismiss button** - Hide suggestions you don't want (persists to localStorage)

### Privacy

- Activity data is stored locally in \`~/.claude-config/activity.json\`
- Only file paths are logged (not file contents)
- You can delete the activity file at any time
- Activity tracking is read-only and never modifies your code
    `
  },
  'smart-sync': {
    title: 'Smart Sync',
    content: `
## Smart Sync

Smart Sync intelligently suggests workstream switches based on your current coding activity.

### How It Works

1. **Detection**: Monitors which projects you're actively working in
2. **Matching**: Compares activity against configured workstreams
3. **Nudging**: Shows non-blocking toast notifications when a switch might help
4. **Learning**: Remembers your choices to reduce future prompts

### Toast Notifications

When Smart Sync detects you might benefit from switching workstreams:

- **Switch nudge**: "Working on api, ui. Switch to 'User Auth'?" [Yes] [No] [Always] [Never]
- **Add project nudge**: "New project detected. Add to workstream?" [Yes] [No]

### Auto-Switch

When confidence is high (80%+ by default), Smart Sync can automatically switch workstreams without prompting.

### Settings

In the **Workstreams** view, find the Smart Sync settings panel:

- **Enable/Disable** - Toggle Smart Sync on or off
- **Threshold slider** - Adjust auto-switch confidence threshold (0-100%)

### Bulletproof Design

Smart Sync is designed to never block your workflow:

- All nudges are dismissible
- Fails silently if anything goes wrong
- Rate-limited (max one nudge per 5 minutes)
- Defaults to last-used workstream if detection fails
- Learns from your choices to reduce prompts over time

### User Choices

- **Yes** - Switch to suggested workstream
- **No** - Dismiss this nudge
- **Always** - Remember to always switch for this project-workstream pair
- **Never** - Never suggest this workstream for these projects again

Preferences are stored in \`~/.claude-config/smart-sync.json\`.
    `
  },

  // Plugins
  'plugins-overview': {
    title: 'Plugins Overview',
    content: `
## Plugins

Claude Code plugins extend functionality with LSP servers, MCP servers, and commands.

### What Are Plugins?

Plugins are packages that add capabilities to Claude Code:

- **LSP Servers** - Language Server Protocol servers for code intelligence
- **MCP Servers** - Model Context Protocol servers for additional tools
- **Commands** - Reusable prompts and workflows

### Plugin Directory

The **Plugins** page shows all available plugins with:

- **Search** - Find plugins by name or description
- **Category filter** - Filter by plugin category
- **Source filter** - Anthropic official vs Community plugins
- **Installed filter** - Show only installed or available plugins

### Plugin Types

| Type | Badge | Description |
|------|-------|-------------|
| LSP | \`LSP\` | Language server providing code intelligence |
| MCP | \`MCP\` | Model context protocol server |
| Commands | \`CMD\` | Custom commands and prompts |
    `
  },
  'installing-plugins': {
    title: 'Installing Plugins',
    content: `
## Installing Plugins

### From Project Explorer

The recommended way to install plugins:

1. Open **Project Explorer**
2. Click the **+** menu on any project folder
3. Select **Install Plugins**
4. Browse available plugins
5. Toggle plugins on/off
6. Select scope (Project/Global/Local)

### Scope Options

| Scope | Location | Description |
|-------|----------|-------------|
| Project | \`.claude/plugins.json\` | Only for this project |
| Global | \`~/.claude/plugins.json\` | All projects |
| Local | Project-specific | Scoped to workspace |

### From Plugin Directory

1. Go to **Plugins** in the sidebar
2. Find a plugin you want
3. Click **Install** button
4. Select target project and scope

### Via CLI

\`\`\`bash
# Install a plugin to current project
claude plugin install plugin-name

# Install globally
claude plugin install plugin-name --global
\`\`\`
    `
  },
  'plugin-marketplaces': {
    title: 'Plugin Marketplaces',
    content: `
## Plugin Marketplaces

Plugins are distributed through marketplaces (Git repositories).

### Default Marketplace

**claude-plugins-official** - Anthropic's official plugins

### Adding Marketplaces

1. Go to **Plugins** page
2. Click **Add Marketplace** button
3. Enter marketplace URL or shorthand

### Supported Formats

- \`owner/repo\` — GitHub shorthand
- \`https://github.com/owner/repo\` — Full URL
- \`/local/path\` — Local directory

### Managing Marketplaces

- **Refresh** - Update plugin list from all marketplaces
- **Remove** - Remove a marketplace (plugins remain installed)
- **View external** - Toggle to see external marketplace plugins

### Creating a Marketplace

A marketplace is a Git repo with:

\`\`\`
marketplace/
├── plugins.json      # Plugin registry
└── plugins/
    ├── plugin-a/
    │   ├── plugin.json
    │   └── ...
    └── plugin-b/
        └── ...
\`\`\`

### plugins.json Format

\`\`\`json
{
  "plugins": [
    {
      "name": "my-plugin",
      "description": "Does something useful",
      "category": "utilities",
      "source": "community"
    }
  ]
}
\`\`\`
    `
  },

  // Multi-Tool Support - Updated sections
  'supported-tools': {
    title: 'Supported Tools',
    content: `
## Supported AI Coding Tools

claude-config supports multiple AI coding assistants:

| Tool | Type | Config Location |
|------|------|-----------------|
| **Claude Code** | Terminal CLI | \`.mcp.json\`, \`~/.claude/\` |
| **Gemini CLI** | Terminal CLI | \`~/.gemini/settings.json\` |
| **Antigravity** | Full IDE | \`~/.gemini/antigravity/mcp_config.json\` |

### Shared MCP Registry

All tools use the **MCP (Model Context Protocol)** for server configurations. claude-config maintains a shared registry and generates tool-specific output files.

### Enabling Tools

In **Preferences**, toggle which tools receive configuration updates:

- **Claude Code** - Anthropic's terminal AI assistant
- **Gemini CLI** - Google's terminal AI assistant
- **Antigravity** - Google's AI-powered IDE

When you click **Apply Config**, enabled tools get updated configurations.
    `
  },
  'gemini-cli': {
    title: 'Gemini CLI',
    content: `
## Gemini CLI Support

Gemini CLI is Google's terminal-based AI coding assistant, similar to Claude Code.

### Configuration

Gemini CLI settings are stored in \`~/.gemini/settings.json\`:

\`\`\`json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path"]
    }
  }
}
\`\`\`

### Key Differences from Claude Code

| Feature | Claude Code | Gemini CLI |
|---------|-------------|------------|
| MCP Config | Separate \`.mcp.json\` | Embedded in settings.json |
| Global Instructions | \`~/.claude/CLAUDE.md\` | \`~/.gemini/GEMINI.md\` |
| Project Instructions | \`CLAUDE.md\` | \`GEMINI.md\` |
| Commands | \`.claude/commands/\` | \`.gemini/commands/\` (TOML) |

### Gemini Settings Editor

Access via **Gemini CLI** in the sidebar to:

- Configure MCP servers
- Edit global settings
- Manage Gemini-specific options

### Project Files

| Purpose | File |
|---------|------|
| Project instructions | \`GEMINI.md\` or \`.gemini/GEMINI.md\` |
| Commands | \`.gemini/commands/*.toml\` |
| Config folder | \`.gemini/\` |
    `
  },
  'antigravity': {
    title: 'Antigravity Support',
    content: `
## Antigravity Support

Antigravity is Google's full AI-powered IDE (similar to Cursor/Windsurf).

### Configuration

Antigravity MCP config is stored at \`~/.gemini/antigravity/mcp_config.json\`:

\`\`\`json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/absolute/path"]
    }
  }
}
\`\`\`

### Key Difference: No Environment Variables

**Important**: Antigravity does NOT support \`\${VAR}\` interpolation.

When generating Antigravity configs, claude-config automatically resolves all environment variables to their actual values.

Example:
- Claude Code: \`"path": "\${HOME}/projects"\`
- Antigravity: \`"path": "/Users/you/projects"\`

### Project Files

| Purpose | Claude Code | Antigravity |
|---------|-------------|-------------|
| Config folder | \`.claude/\` | \`.agent/\` |
| Rules | \`.claude/rules/*.md\` | \`.agent/rules/*.md\` |
| Instructions | \`CLAUDE.md\` | \`GEMINI.md\` or \`AGENT.md\` |

### Known Limitation

Antigravity and Gemini CLI share \`~/.gemini/GEMINI.md\` for global instructions. This is a known conflict in Google's tools.
    `
  },
};

export default function DocsView() {
  const [activeSection, setActiveSection] = useState('installation');
  const [expandedSections, setExpandedSections] = useState({ 'getting-started': true });

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const currentDoc = docContent[activeSection];

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-64 border-r border-border bg-muted/50 flex flex-col">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold flex items-center gap-2 text-foreground">
            <BookOpen className="w-5 h-5" />
            Documentation
          </h2>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2">
            {docSections.map((section) => (
              <div key={section.id} className="mb-1">
                <button
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent text-left",
                    (activeSection === section.id || section.subsections.some(s => s.id === activeSection)) && "bg-accent"
                  )}
                  onClick={() => {
                    if (section.subsections.length > 0) {
                      toggleSection(section.id);
                      if (!expandedSections[section.id]) {
                        setActiveSection(section.subsections[0].id);
                      }
                    } else {
                      setActiveSection(section.id);
                    }
                  }}
                >
                  <section.icon className="w-4 h-4 text-muted-foreground" />
                  <span className="flex-1">{section.title}</span>
                  {section.isNew && (
                    <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-green-500/20 text-green-600 dark:text-green-400">
                      new
                    </span>
                  )}
                  {section.subsections.length > 0 && (
                    <ChevronRight className={cn(
                      "w-4 h-4 text-muted-foreground transition-transform",
                      expandedSections[section.id] && "rotate-90"
                    )} />
                  )}
                </button>
                {section.subsections.length > 0 && expandedSections[section.id] && (
                  <div className="ml-6 mt-1 space-y-1">
                    {section.subsections.map((sub) => (
                      <button
                        key={sub.id}
                        className={cn(
                          "w-full text-left px-3 py-1.5 text-sm rounded-md hover:bg-accent text-foreground",
                          activeSection === sub.id && "bg-accent text-primary font-medium"
                        )}
                        onClick={() => setActiveSection(sub.id)}
                      >
                        {sub.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="max-w-3xl mx-auto p-8">
            {currentDoc ? (
              <div className="prose prose-sm max-w-none">
                <div dangerouslySetInnerHTML={{
                  __html: formatMarkdown(currentDoc.content)
                }} />
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-12">
                <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Select a topic from the sidebar</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

// Simple markdown formatter
function formatMarkdown(text) {
  // Process fenced code blocks FIRST (before inline code)
  let result = text.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const escaped = code.replace(/</g, '&lt;').replace(/>/g, '&gt;').trim();
    return `<pre class="bg-zinc-900 text-zinc-100 p-4 rounded-lg overflow-x-auto my-4"><code class="text-sm">${escaped}</code></pre>`;
  });

  // Process markdown tables (header | separator | rows)
  result = result.replace(/(\|[^\n]+\|\n\|[-| :]+\|\n(?:\|[^\n]+\|\n?)+)/g, (tableMatch) => {
    const lines = tableMatch.trim().split('\n');
    if (lines.length < 2) return tableMatch;

    const headerCells = lines[0].split('|').filter(c => c.trim()).map(c =>
      `<th class="border border-border px-3 py-2 bg-muted font-semibold text-left">${c.trim()}</th>`
    ).join('');

    const bodyRows = lines.slice(2).map(line => {
      const cells = line.split('|').filter(c => c.trim()).map(c =>
        `<td class="border border-border px-3 py-2">${c.trim()}</td>`
      ).join('');
      return `<tr>${cells}</tr>`;
    }).join('');

    return `<table class="w-full border-collapse border border-border my-4"><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
  });

  return result
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-6 mb-2 text-foreground">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mt-8 mb-4 text-foreground">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mb-6 text-foreground">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')
    .replace(/^- (.*$)/gim, '<li class="ml-4">$1</li>')
    .replace(/(<li.*<\/li>\n?)+/g, '<ul class="list-disc my-2">$&</ul>')
    .replace(/^\d+\. (.*$)/gim, '<li class="ml-4">$1</li>')
    .replace(/\n\n/g, '</p><p class="my-3 text-foreground">')
    .replace(/\n/g, '<br/>');
}
