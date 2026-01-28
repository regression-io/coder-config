export const pluginsContent = {
  'what-are-plugins': {
    title: 'What Are Plugins?',
    content: `
Plugins are pre-packaged configurations you can install with a click. Instead of writing rules from scratch, researching best practices, and figuring out which MCPs work well together, you install a plugin that someone else has already assembled.

### What's Inside a Plugin

A plugin can include any combination of:

**Rules** — Markdown files with guidelines for Claude. A React plugin might include rules about hooks, component structure, and testing patterns.

**Commands** — Reusable prompts. A testing plugin might include commands for generating unit tests, integration tests, and test data.

**MCPs** — Server configurations. A database plugin might include pre-configured connections for PostgreSQL, MySQL, and SQLite.

**Skills** — Workflows discoverable by Claude. A coder-config plugin includes skills like /flush for saving session context.

### Why Use Plugins

Writing good Claude configuration takes time. You need to think through conventions, test what works, refine the wording. Plugin authors have done this work already. They've figured out which rules actually help, what patterns Claude follows well, and how to phrase things clearly.

Plugins also let you learn from others. When you install a React TypeScript plugin, you're getting someone's refined understanding of how Claude works best with that stack. Even if you customize it later, you start from a much better baseline.

### Where Plugins Come From

Plugins live in marketplaces—git repositories that contain plugin definitions. Coder Config ships with a default marketplace that has popular, vetted plugins. You can add additional marketplaces if you find collections you like, or create your own for private/team use.

### Plugins vs Writing Your Own

Start with plugins for well-established stacks. If you're using React, Next.js, FastAPI, or other popular frameworks, someone has probably created good plugins. Install those first, then customize with your own rules layered on top.

Write your own configuration for project-specific conventions that no plugin would cover—your team's particular patterns, your company's coding standards, integrations with internal tools.
    `
  },
  'installing-plugin': {
    title: 'Installing a Plugin',
    content: `
Let's install a plugin to see how it works.

### Browsing Available Plugins

Click **Plugins** in the sidebar. You'll see cards for available plugins, organized by category. Browse around or use the search bar if you know what you're looking for.

Click on a plugin card to see its details: what rules it includes, any MCPs it configures, and a description of what it's for.

### Installing

Found one you want? Click **Install**. A dialog asks where to install it:

**Project scope** — The plugin's files go into your current project's \`.claude/\` folder. Only this project uses it. Good for project-specific plugins.

**User scope** — The plugin installs to your global \`~/.claude/\` folder. All your projects can use it. Good for plugins you want everywhere.

### What Happens After Installing

The plugin's files are copied to your chosen location. Rules become active immediately—Claude reads them on the next session. Commands appear in your available commands list. MCPs might need additional setup; check the plugin's documentation for any environment variables or configuration needed.

### Managing Installed Plugins

Back on the Plugins view, you'll see a section showing what you've installed. From here you can:

**Enable/disable** — Toggle plugins without uninstalling. Useful for temporarily turning something off.

**Uninstall** — Remove the plugin completely. This deletes the files it added.

**Update** — When plugin authors release new versions, you can update to get the latest.

### Per-Directory Control

Here's a powerful feature: you can enable or disable plugins at different levels of your project hierarchy. Maybe you want a plugin globally but turned off for one specific project. Or enabled only for a particular subfolder. The Plugins view lets you set this up.

### Finding More Plugins

The default marketplace is just a starting point. You can add additional marketplaces in Settings → Plugin Marketplaces. Community marketplaces, company-internal collections, or your own curated set—add the git repo URL and refresh to see new plugins.

You can also create your own plugins. The format is straightforward: a git repo with a manifest file and your configuration files. The Plugins view links to documentation if you want to try this.
    `
  },
};
