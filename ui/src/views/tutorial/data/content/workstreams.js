export const workstreamsContent = {
  'what-are-workstreams': {
    title: 'What Are Workstreams?',
    content: `
Workstreams are for when you work on **multiple related projects** together. They group projects and share context between them.

### When to Use Workstreams

You have a:
- **Monorepo** with frontend, backend, and shared packages
- **Microservices** architecture with related services
- **Project + libraries** that you maintain together

### Example

Imagine you're building an app:
- \`my-app-frontend\` - React app
- \`my-app-api\` - Node.js API
- \`my-app-shared\` - Shared types and utilities

With a workstream:
- Claude understands they're related
- Rules can apply across all three
- Context is shared between them

### Benefits

- **Unified context** - Claude knows the full picture
- **Shared rules** - Write once, apply everywhere
- **Smart switching** - Auto-switch when you change projects
- **Activity tracking** - See which projects you're actively working on
    `
  },
  'creating-workstream': {
    title: 'Creating a Workstream',
    content: `
Let's set up a workstream for related projects.

### Step by Step

1. Click **"Workstreams"** in the sidebar
2. Click **"New Workstream"**
3. Give it a name (e.g., "My App Stack")
4. Add projects to the workstream

### Adding Projects

Select which projects belong together:
- Check the boxes next to each project
- Or drag projects into the workstream

### Workstream Rules

You can add rules that apply to all projects in the workstream:
1. Click on your workstream
2. Go to the **Rules** tab
3. Add rules that apply across all projects

### Smart Sync

Enable **Smart Sync** to automatically switch workstreams based on which project you're working in:

1. Go to workstream settings
2. Enable "Smart Sync"
3. Set the threshold (how confident before auto-switching)

### Activity Tracking

The workstream view shows:
- Which projects have recent activity
- File changes in each project
- Time spent in each project

This helps you see your workflow at a glance.
    `
  },
};
