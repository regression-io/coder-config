export const pluginsContent = {
  'what-are-plugins': {
    title: 'What Are Plugins?',
    content: `
## What Are Plugins?

Plugins are **pre-built configurations** you can install with one click. Instead of writing rules from scratch, use plugins created by the community.

### What's in a Plugin?

A plugin can include:
- **Rules** - Guidelines for Claude
- **Commands** - Reusable prompts
- **MCPs** - Tool configurations

### Example Plugins

- **react-typescript** - Best practices for React + TypeScript
- **fastapi** - Python FastAPI conventions
- **nextjs** - Next.js 14 patterns
- **security** - Security-focused rules

### Why Use Plugins?

- **Save time** - Don't reinvent the wheel
- **Learn best practices** - See how experts configure Claude
- **Consistency** - Use the same setup across projects
- **Easy updates** - Plugin authors maintain the config

### Plugin Sources

Plugins come from **marketplaces** - curated collections maintained by the community. The default marketplace has popular, vetted plugins.
    `
  },
  'installing-plugin': {
    title: 'Installing a Plugin',
    content: `
## Installing a Plugin

Let's install your first plugin!

![Plugins View](/tutorial/plugins-view.png)

### Step by Step

1. Click **"Plugins"** in the sidebar
2. Browse the available plugins
3. Click on one that interests you
4. Click **"Install"**

### Choose a Scope

When installing, you'll choose where to install:

- **Project** - Only this project (\`.claude/\` folder)
- **Global** - All projects (\`~/.claude/\` folder)
- **Local** - Your machine only (not committed to git)

### What Happens

After installing:
1. Plugin files are copied to your chosen location
2. Rules become active immediately
3. Commands become available to use
4. MCPs may need additional setup (like API keys)

### Managing Installed Plugins

- View installed plugins in the Plugins view
- Uninstall by clicking the trash icon
- Update when new versions are available

### Finding More Plugins

Want more plugins? You can:
1. Add custom marketplaces in Settings
2. Create your own plugins
3. Share plugins with your team
    `
  },
};
