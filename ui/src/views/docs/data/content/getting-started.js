export const gettingStartedContent = {
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

Claude Code works great out of the box. This tool helps you manage its configuration visually.

### 1. Start the Config UI

\`\`\`bash
claude-config ui
\`\`\`

This opens a web UI for managing Claude Code settings.

### 2. Add Your Projects

Click "Add Project" to register directories where you use Claude Code.

### 3. Configure as Needed

| Feature | Description |
|---------|-------------|
| **Rules** | Guidelines Claude follows in this project |
| **Commands** | Reusable prompts (slash commands) |
| **MCPs** | External tools Claude can use |
| **Permissions** | What Claude can do automatically |

### 4. Use Claude Code Normally

\`\`\`bash
cd ~/your-project
claude
\`\`\`

Claude Code automatically reads configuration from the \`.claude/\` folder.

### Optional: Install as App

The UI is a PWA - install it to your taskbar via Chrome/Edge's install button or Safari's Share → Add to Dock.
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
npm install -g @regression-io/claude-config@latest
\`\`\`

### After Updating

If you have the UI running as a daemon, restart it:

\`\`\`bash
claude-config ui stop
claude-config ui
\`\`\`
    `
  },
};
