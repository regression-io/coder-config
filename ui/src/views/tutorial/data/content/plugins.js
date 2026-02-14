export const pluginsContent = {
  'what-are-plugins': {
    title: 'What Are Plugins?',
    content: `
Plugins are pre-packaged configurations you can install with a click. Instead of writing rules from scratch, researching best practices, and figuring out which MCPs work well together, you install a plugin that someone else has already assembled.

### What's Inside a Plugin

A plugin can include any combination of configuration elements. It might have **rules**—markdown files with guidelines for your AI, like a React plugin that includes rules about hooks, component structure, and testing patterns. It might have **skills**—reusable prompts invoked via slash commands, like a testing plugin with skills for generating unit tests, integration tests, and test data. It might configure **MCPs**—server connections, like a database plugin with pre-configured connections for PostgreSQL, MySQL, and SQLite.

### Why Use Plugins

Writing good AI configuration takes time. You need to think through conventions, test what works, refine the wording. Plugin authors have done this work already. They've figured out which rules actually help, what patterns work well, and how to phrase things clearly.

Plugins also let you learn from others. When you install a React TypeScript plugin, you're getting someone's refined understanding of how AI assistants work best with that stack. Even if you customize it later, you start from a much better baseline.

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

To install a plugin, go to **Project Explorer**, click the **+** menu on your project folder, and choose **Install Plugins**. You'll see a dialog where you can pick from available plugins. Select the ones you want and they'll be added to your project's \`.claude/\` folder.

### What Happens After Installing

The plugin's files are copied into your project configuration. Rules become active immediately—they're loaded on the next session. Skills appear in your available slash commands list. MCPs might need additional setup; check the plugin's documentation for any environment variables or configuration needed.

### Managing Installed Plugins

Back on the Plugins view, you'll see a section showing what you've installed. You can uninstall plugins you no longer need, which removes the files they added.

### Finding More Plugins

The default marketplace is just a starting point. You can add additional marketplaces from the **Plugins** view using **Manage Marketplaces**. Community marketplaces, company-internal collections, or your own curated set—add the git repo URL and refresh to see new plugins.

You can also create your own plugins. The format is straightforward: a git repo with a manifest file and your configuration files. The Plugins view links to documentation if you want to try this.
    `
  },
};
