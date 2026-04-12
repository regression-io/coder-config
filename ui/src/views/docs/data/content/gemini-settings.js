export const geminiSettingsContent = {
  'gemini-model': {
    title: 'Model Selection',
    content: `
## Model Selection

Choose which Gemini model to use.

### Available Models

| Model | Description |
|-------|-------------|
| **Auto** | CLI picks best model per task |
| **Gemini 3.1 Pro** | Latest, thinking + multimodal tool use |
| **Gemini 3 Pro** | Thinking + multimodal tools |
| **Gemini 3 Flash** | Fast with thinking |
| **Gemini 2.5 Pro** | Previous generation capable |
| **Gemini 2.5 Flash** | Previous generation fast |

### Model Aliases

You can also use aliases: \`auto\`, \`pro\`, \`flash\`, \`flash-lite\`
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
| **Theme** | Color theme for the CLI interface |
| **Dynamic Window Title** | Update title with status icons |
| **Show Line Numbers** | Display line numbers in chat |
| **Show Citations** | Display citations for generated text |
| **Hide Context Summary** | Hide GEMINI.md and MCP servers above input |
| **Hide Footer** | Remove footer from the UI |
| **Screen Reader Mode** | Accessible plain-text output |
| **Inline Thinking** | Show model thinking (off or full) |
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
| **Auto Update** | Check for new Gemini CLI versions |
| **Checkpointing** | Enable session recovery support |
| **Approval Mode** | Default: ask, Auto Edit: auto-approve edits, Plan: read-only |

### Approval Modes

| Mode | Description |
|------|-------------|
| **default** | Ask before tool execution |
| **auto_edit** | Auto-approve file edits |
| **plan** | Read-only, no edits allowed |
| **yolo** | Auto-approve everything (use with caution) |

### Configuration File

Settings are stored in \`~/.gemini/settings.json\`:

\`\`\`json
{
  "general": {
    "vimMode": false,
    "defaultApprovalMode": "default",
    "enableAutoUpdate": true,
    "checkpointing": { "enabled": false }
  },
  "model": {
    "name": "auto"
  }
}
\`\`\`
    `
  },
  'gemini-sandbox': {
    title: 'Sandbox Mode',
    content: `
## Sandbox Mode

Control command execution safety. Gemini CLI supports 5 sandbox methods.

### Sandbox Methods

| Method | Platform | Description |
|--------|----------|-------------|
| **sandbox-exec** | macOS | Lightweight seatbelt profiles |
| **Docker** | Cross-platform | Container-based isolation |
| **Podman** | Cross-platform | Container-based (rootless) |
| **gVisor (runsc)** | Linux | Strongest isolation, user-space kernel |
| **LXC** | Linux | Full system container (experimental) |

### Configuration

\`\`\`json
{
  "tools": {
    "sandbox": {
      "enabled": true,
      "command": "docker",
      "networkAccess": false,
      "allowedPaths": ["/workspace"]
    }
  }
}
\`\`\`

### When to Disable

Only disable sandbox mode when:
- Working with local development servers
- Running commands that need direct system access
- Debugging sandbox-related issues

**Warning**: Disabling sandbox mode reduces security isolation.
    `
  },
};
