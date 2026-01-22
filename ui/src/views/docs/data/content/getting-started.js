export const gettingStartedContent = {
  'installation': {
    title: 'Installation',
    content: `
## Installation

Choose your preferred installation method:

### Option A: Desktop App (Recommended)

Download the native app from [GitHub Releases](https://github.com/regression-io/coder-config/releases):

| Platform | Download |
|----------|----------|
| **macOS (Apple Silicon)** | \`Claude.Config_*_aarch64.dmg\` |
| **macOS (Intel)** | \`Claude.Config_*_x64.dmg\` |
| **Windows** | \`Claude.Config_*_x64-setup.exe\` |
| **Linux** | \`Claude.Config_*_amd64.deb\` or \`.AppImage\` |

The desktop app bundles everything - no Node.js or npm required. Just download, install, and run.

### Option B: npm Package (CLI)

Install globally via npm:

\`\`\`bash
npm install -g coder-config
\`\`\`

**Requirements:** Node.js 18+

Verify installation:

\`\`\`bash
coder-config --version
\`\`\`

Then start the UI:

\`\`\`bash
coder-config ui
\`\`\`
    `
  },
  'quick-start': {
    title: 'Quick Start',
    content: `
## Quick Start

Claude Code works great out of the box. This tool helps you manage its configuration visually.

### 1. Launch Coder Config

**Desktop App:** Double-click the app after installing from GitHub Releases.

**CLI:** Run \`coder-config ui\` in your terminal.

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

### Optional: Install as PWA

Using the CLI version? The UI is a PWA - install it to your taskbar via Chrome/Edge's install button or Safari's Share → Add to Dock.
    `
  },
  'updating': {
    title: 'Updating',
    content: `
## Updating

### Desktop App

Download the latest version from [GitHub Releases](https://github.com/regression-io/coder-config/releases) and install over your existing installation.

### npm Package

The UI automatically checks npm for new versions. When an update is available, you'll see a notification in the Preferences page.

**Manual update:**

\`\`\`bash
npm install -g coder-config@latest
\`\`\`

**After updating (if using daemon mode):**

\`\`\`bash
coder-config ui stop
coder-config ui
\`\`\`
    `
  },
};
