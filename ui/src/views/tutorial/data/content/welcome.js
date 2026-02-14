export const welcomeContent = {
  'intro': {
    title: 'What is Coder Config?',
    content: `
Coder Config is your **control center** for AI coding tools. It supports **Claude Code**, **Gemini CLI**, **Codex CLI**, and **Antigravity**—all from one place. Instead of manually editing JSON files or remembering command-line flags, you get a friendly UI to manage everything.

You might be running the desktop app (downloaded from [GitHub Releases](https://github.com/regression-io/coder-config/releases)), or you installed the npm package with \`npm install -g coder-config\` and ran \`coder-config ui\`. Either way works identically—this tutorial applies to both.

### What problems does it solve?

When you use AI coding tools, configuration is scattered across multiple files. Your MCP servers live in one place, permissions in another, rules in markdown files throughout your project. Making changes means hunting through dotfiles and JSON. Each tool has its own config format and location.

Coder Config brings it all together. You register a project once, then manage its rules, permissions, MCP servers, and memory from a single dashboard. When you work on multiple projects, you can switch between them without losing your place. When you work across multiple repos at once, workstreams let you group them together with shared context.

### Who is this for?

Anyone using AI coding assistants who wants more control. Maybe you're tired of your AI forgetting your preferences between sessions. Maybe you work on multiple projects with different conventions. Maybe you want to connect your tools to your database or GitHub without editing JSON by hand.

Whatever brought you here, this tutorial will show you how to get the most out of Coder Config.
    `
  },
  'what-youll-learn': {
    title: "What You'll Learn",
    content: `
This tutorial walks you through Coder Config step-by-step.

We'll start with the basics: adding a project and creating your first rule. Rules are simple markdown files that tell your AI assistant about your preferences—things like "always use TypeScript" or "never modify package-lock.json." Once you see how rules work, you'll understand why they're so powerful.

Then we'll move to MCP servers. These give your AI coding tools new abilities—reading from your database, accessing your GitHub repos, persistent memory across sessions. You'll learn how to add them, configure them, and manage their credentials safely.

After that, we'll cover permissions (controlling what your AI can do without asking), memory (helping it remember things), and plugins (pre-built configurations you can install with a click).

Finally, we'll tackle workstreams—the feature that makes working across multiple repos actually pleasant. If you've ever had to re-explain how your API and frontend connect every time you start a new session, workstreams solve that.

Each section takes about five minutes. You can stop anytime and pick up where you left off.

Ready? Click **"Adding a Project"** below to begin.
    `
  },
};
