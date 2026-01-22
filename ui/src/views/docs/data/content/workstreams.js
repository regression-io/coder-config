export const workstreamsContent = {
  'workstreams-overview': {
    title: 'Workstreams Overview',
    content: `
## Workstreams

Workstreams are **virtual projects** that group multiple repos belonging to the same product or system.

### The Problem

Many products are split across multiple repositories:
- Frontend repo
- Backend/API repo
- Shared libraries or types
- Infrastructure configs

When you work on "Product X", you're jumping between repos that are all part of the same product.

### The Solution

A workstream groups these repos together so Claude understands they're related:

\`\`\`
"Acme App" workstream:
  - acme-frontend (React app)
  - acme-api (Node.js backend)
  - acme-shared (TypeScript types)
\`\`\`

### Workstream Structure

Each workstream has:
- **Name** - Product or system name (e.g., "Acme App", "Customer Portal")
- **Projects** - List of repos that belong to this product
- **Rules** - Context and guidelines for the entire product
- **Active Status** - Only one workstream can be active at a time
    `
  },
  'creating-workstreams': {
    title: 'Creating Workstreams',
    content: `
## Creating Workstreams

### Via UI

1. Go to **Workstreams** in the sidebar
2. Click **New Workstream**
3. Name it after your product (e.g., "Acme App")
4. Add the repos that belong to this product
5. Write rules for Claude to follow
6. Click **Create**

### Via CLI

\`\`\`bash
# Create a workstream for your product
coder-config workstream create "Acme App"

# Add repos to it
coder-config workstream add "Acme App" ~/projects/acme-frontend
coder-config workstream add "Acme App" ~/projects/acme-api
coder-config workstream add "Acme App" ~/projects/acme-shared

# Activate it
coder-config workstream use "Acme App"
\`\`\`

### Managing Workstreams

**List all workstreams:**
\`\`\`bash
coder-config workstream
\`\`\`

**Show active workstream:**
\`\`\`bash
coder-config workstream active
\`\`\`

**Delete a workstream:**
\`\`\`bash
coder-config workstream delete "Acme App"
\`\`\`

### Editing Rules

In the UI, click a workstream to expand it and edit rules. Rules are markdown text that gets injected into Claude sessions:

\`\`\`markdown
# Acme App

Full-stack TypeScript application.
- Frontend: React 18 with Vite
- Backend: Node.js with Express
- Shared types in @acme/shared package

All repos follow the same code style and conventions.
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
coder-config workstream inject --silent
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
coder-config workstream inject

# Silent mode (no output if no workstream)
coder-config workstream inject --silent
\`\`\`

### Auto-Detection

Claude-config can also detect which workstream to use based on your current directory:

\`\`\`bash
coder-config workstream detect /path/to/project
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
source /path/to/coder-config/hooks/activity-track.sh
\`\`\`

Or use the one-click install in the Workstreams view.

### Activity Insights Panel

In the **Workstreams** view, the Activity Insights panel shows:
- **Sessions tracked** - Number of Claude sessions logged
- **Files tracked** - Total file accesses recorded
- **Active projects** - Projects with recent activity
- **Top projects** - Most frequently accessed projects

### Workstream Suggestions

Based on co-activity patterns, coder-config suggests workstreams:

- **Co-activity score** - Percentage showing how often projects are worked on together
- **Create button** - Opens pre-filled dialog (tweak projects as needed)
- **Dismiss button** - Hide suggestions you don't want (persists to localStorage)

### Privacy

- Activity data is stored locally in \`~/.coder-config/activity.json\`
- Only file paths are logged (not file contents)
- You can delete the activity file at any time
- Activity tracking is read-only and never modifies your code
    `
  },
};
