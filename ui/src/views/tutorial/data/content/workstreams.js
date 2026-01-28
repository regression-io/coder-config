export const workstreamsContent = {
  'what-are-workstreams': {
    title: 'What Are Workstreams?',
    content: `
Workstreams solve a problem that anyone working on multi-repo projects knows well: your code is split across several repositories, but mentally it's all one thing.

### The Multi-Repo Reality

Modern software often spans multiple repositories. You might have a React frontend in one repo, a Node.js API in another, shared TypeScript types in a third, and infrastructure configs in a fourth. These are all part of the same product, but they live in separate folders with separate Claude configurations.

Every time you switch repos, Claude loses context. It doesn't know that the API you're calling from the frontend lives in that other repo you were just working in. It doesn't remember the database schema you discussed yesterday while working on the backend.

### Workstreams Connect the Dots

A workstream groups related repositories together. You create a workstream called "Acme App" and add your frontend, backend, and shared repos to it. Now Claude understands these are all part of the same system.

When you're working in any repo that belongs to a workstream, Claude automatically knows about the workstream context. Rules you write at the workstream level apply to all member repos. Context about "Acme App" as a whole—its architecture, its conventions, how the pieces fit together—is available everywhere.

### What This Means in Practice

Say you're in the frontend repo and ask Claude to call a new API endpoint. With workstreams, Claude knows the API repo's structure and conventions. It can suggest code that matches how endpoints are actually built there, not just guess based on what it sees in the frontend.

Or you're debugging an issue that spans both repos. Claude can reason about the full request flow—from frontend component to API handler to database—because it has context about both sides.

### When You Need Workstreams

If you work on a single monorepo that contains everything, you probably don't need workstreams—your project already has unified context.

If your work is split across multiple repos that represent one logical product or system, workstreams help. The more repos involved, the more valuable the unified context becomes.
    `
  },
  'creating-workstream': {
    title: 'Creating a Workstream',
    content: `
Let's set up a workstream to connect your related repositories.

### Getting Started

Click **Workstreams** in the sidebar. If you haven't created any yet, you'll see an empty state with a button to create your first one. Click **New Workstream**.

### Naming Your Workstream

Pick a name that describes the product or system, not the technology. "Acme App" or "Customer Portal" rather than "React Frontend" or "Node Backend." The name should make sense when you see it in a list of workstreams.

Add an optional description if you want—something like "Full-stack app for acme customers. React frontend, Express API, PostgreSQL database."

### Adding Repositories

Now add the repos that belong together. Click **Add** and select from your registered projects. Only add repos that are genuinely part of this product. Don't mix unrelated projects just because you work on them at the same time.

The order doesn't matter much, but putting the "main" repo first can make things feel more organized.

### Writing Workstream Rules

This is where workstreams get powerful. Click into the rules section and write context that applies across all member repos:

\`\`\`markdown
# Acme App Context

This is a full-stack TypeScript application.

Frontend: React 18 with Vite, deployed to Vercel
Backend: Express.js API, deployed to Railway
Database: PostgreSQL 15, hosted on Neon

All repos use pnpm. Types are shared via the @acme/types package.
API calls go through /api prefix. Auth uses JWT tokens stored in httpOnly cookies.
\`\`\`

These rules load automatically whenever you're working in any member repo.

### Activating a Workstream

Workstreams activate based on which directory you're in. When you open Claude Code inside a workstream member repo, the workstream context applies automatically.

You can also manually activate a workstream with \`coder-config workstream use <name>\`. This sets the context for your current terminal session. The Workstreams view shows which workstream is active and lets you switch.

### One Product Per Workstream

Keep workstreams focused. Each workstream represents one product or system. If you work on multiple products, create separate workstreams. Mixing unrelated repos in one workstream dilutes the context and confuses Claude about what goes with what.
    `
  },
};
