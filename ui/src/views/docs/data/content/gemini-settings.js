export const geminiSettingsContent = {
  'gemini-model': {
    title: 'Model Selection',
    content: `
## Model Selection

Choose which Gemini model to use.

### Available Models

| Model | Description |
|-------|-------------|
| **Gemini 2.5 Pro** | Most capable, best for complex tasks |
| **Gemini 2.5 Flash** | Fast and efficient, good balance |
| **Gemini 2.0 Pro** | Previous generation capable model |
| **Gemini 2.0 Flash** | Previous generation fast model |

### Preview Features

Enable **Preview Features** to access experimental models like Gemini 2.5 Pro Preview.
    `
  },
  'gemini-display': {
    title: 'Display Options',
    content: `
## Display Options

Configure Gemini CLI's appearance and output.

### Settings

| Setting | Description |
|---------|-------------|
| **Theme** | Color theme (Dark, Light, System) |
| **Show Token Count** | Display token usage in responses |
| **Show Diff View** | Use diff format for file changes |
| **Streaming** | Enable real-time response streaming |
    `
  },
  'gemini-general': {
    title: 'General Settings',
    content: `
## General Settings

Core Gemini CLI behavior options.

### Settings

| Setting | Description |
|---------|-------------|
| **Vim Keybindings** | Enable Vim mode in the CLI |
| **Auto-save** | Automatically save file changes |
| **Check for Updates** | Check for new Gemini CLI versions |

### Configuration File

Settings are stored in \`~/.gemini/settings.json\`:

\`\`\`json
{
  "general": {
    "vimMode": false,
    "autoSave": true,
    "checkForUpdates": true
  },
  "model": {
    "default": "gemini-2.5-flash",
    "previewFeatures": false
  }
}
\`\`\`
    `
  },
  'gemini-sandbox': {
    title: 'Sandbox Mode',
    content: `
## Sandbox Mode

Control command execution safety.

### Options

| Mode | Description |
|------|-------------|
| **Enabled** | Commands run in isolated environment |
| **Disabled** | Commands run directly on system |

### When to Disable

Only disable sandbox mode when:
- Working with local development servers
- Running commands that need direct system access
- Debugging sandbox-related issues

**Warning**: Disabling sandbox mode reduces security isolation.
    `
  },
};
