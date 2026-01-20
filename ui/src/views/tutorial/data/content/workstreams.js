export const workstreamsContent = {
  'what-are-workstreams': {
    title: 'What Are Workstreams?',
    content: `
Workstreams are **virtual projects** that group multiple repos belonging to the same product or system.

### The Problem

Many products are split across multiple repositories:
- A frontend repo
- A backend/API repo
- Shared libraries or types
- Infrastructure configs

When you work on "Product X", you're often jumping between these repos - but they're all part of the same thing.

### The Solution

A workstream groups these repos together so Claude understands they're related:

\`\`\`
"Acme App" workstream:
  - acme-frontend (React app)
  - acme-api (Node.js backend)
  - acme-shared (TypeScript types)
\`\`\`

### Benefits

- **Unified context** - Claude knows all three repos are part of "Acme App"
- **Shared rules** - Write rules once, apply to all repos in the workstream
- **Auto-switching** - Claude detects which workstream you're in based on the repo
- **Cross-repo awareness** - Claude can reference patterns from related repos
    `
  },
  'creating-workstream': {
    title: 'Creating a Workstream',
    content: `
Let's create a workstream for your product.

### Step by Step

1. Click **"Workstreams"** in the sidebar
2. Click **"New Workstream"**
3. Name it after your product (e.g., "Acme App", "Customer Portal")
4. Add the repos that belong to this product

### Adding Repos

Click **"Add"** and select from your registered projects. Only add repos that are part of the same product - don't mix repos from different products.

### Workstream Rules

Add rules that apply across all repos in this workstream:

\`\`\`markdown
# Acme App Context

This is a full-stack TypeScript app.
- Frontend: React 18 with Vite
- Backend: Node.js with Express
- Shared types in acme-shared package

Always import types from @acme/shared.
\`\`\`

### When It Activates

The workstream automatically activates when you're working in any of its repos. Claude will inject the workstream rules into every session.

### One Product = One Workstream

Keep it simple: each workstream represents one product or system. If you have multiple products, create separate workstreams for each.
    `
  },
};
