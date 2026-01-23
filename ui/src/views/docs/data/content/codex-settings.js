export const codexSettingsContent = {
  'codex-overview': {
    title: 'Codex CLI Overview',
    content: `
## Codex CLI

OpenAI's Codex CLI is an AI-powered coding assistant that runs in your terminal, similar to Claude Code.

### Configuration File

Codex settings are stored in:
\`\`\`
~/.codex/config.toml
\`\`\`

### Key Features

- **GPT-5.2 Codex** - Latest OpenAI coding model
- **Reasoning effort** - Control how thoroughly the model thinks
- **Sandbox modes** - Configurable filesystem access
- **MCP support** - Connect external tools and services
- **Web search** - Allow the model to search the web

### Quick Start

\`\`\`bash
# Install Codex CLI
npm install -g @openai/codex

# Start a session
codex

# Use a specific model
codex --model gpt-5.2-codex

# Full auto mode (minimal approvals)
codex --full-auto
\`\`\`

### In Coder Config

Navigate to **Configuration > Codex CLI** to manage settings through the UI, or edit the TOML file directly.
    `
  },
  'codex-model': {
    title: 'Model Selection',
    content: `
## Codex Model Selection

Choose the AI model that powers your Codex CLI sessions.

### Available Models

| Model | Description |
|-------|-------------|
| **gpt-5.2-codex** | Latest and most capable (recommended) |
| **gpt-5-codex** | Previous generation, still very capable |
| **gpt-5** | General purpose model |
| **o3-mini** | Fast reasoning model for quick tasks |

### Reasoning Effort

Control how thoroughly the model reasons about problems:

| Level | Description |
|-------|-------------|
| **Minimal** | Fastest responses, least thorough |
| **Low** | Quick responses |
| **Medium** | Balanced (default) |
| **High** | More thorough reasoning |
| **Extra High** | Most thorough, slowest |

### Configuration

\`\`\`toml
# ~/.codex/config.toml

model = "gpt-5.2-codex"
model_reasoning_effort = "medium"
\`\`\`

### CLI Override

\`\`\`bash
# Use a specific model for one session
codex --model o3-mini
\`\`\`
    `
  },
  'codex-security': {
    title: 'Security Settings',
    content: `
## Codex Security Settings

Configure how Codex handles permissions and approvals.

### Approval Policies

Control when Codex asks for permission to run commands:

| Policy | Description |
|--------|-------------|
| **On Request** | Ask before running commands (default) |
| **Untrusted** | Ask for everything |
| **On Failure** | Ask only when commands fail |
| **Never** | Never ask (use with caution) |

### Sandbox Modes

Control filesystem and network access:

| Mode | Description |
|------|-------------|
| **Read Only** | Can only read files (default, safest) |
| **Workspace Write** | Can write within workspace |
| **Full Access** | Full filesystem access (dangerous) |

### Configuration

\`\`\`toml
# ~/.codex/config.toml

approval_policy = "on-request"
sandbox_mode = "read-only"
\`\`\`

### Best Practices

1. **Start restrictive** - Use read-only sandbox until you trust the workflow
2. **Project-specific** - Consider workspace-write for active development
3. **Review commands** - Keep approval on "on-request" for learning
    `
  },
  'codex-mcp': {
    title: 'MCP Servers',
    content: `
## Codex MCP Servers

Connect external tools and services to Codex via the Model Context Protocol.

### Adding MCP Servers

In Coder Config, click **Add MCP** in the Codex CLI settings, or edit the TOML directly:

\`\`\`toml
# ~/.codex/config.toml

[mcp_servers.filesystem]
command = "npx"
args = ["-y", "@anthropic/mcp-filesystem"]
enabled = true

[mcp_servers.github]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-github"]
enabled = true
env = { GITHUB_TOKEN = "your-token" }
\`\`\`

### MCP Server Format

Each MCP server needs:

- **command** - The executable to run (required)
- **args** - Command arguments (optional)
- **env** - Environment variables (optional)
- **enabled** - Whether the server is active (optional, defaults to true)

### Popular MCP Servers

| Server | Description |
|--------|-------------|
| **filesystem** | Read/write local files |
| **github** | Interact with GitHub repos |
| **postgres** | Query PostgreSQL databases |
| **fetch** | Make HTTP requests |

### Enabling/Disabling

Toggle servers on/off without removing the configuration:

\`\`\`toml
[mcp_servers.expensive-server]
command = "npx"
args = ["-y", "@example/expensive-mcp"]
enabled = false  # Disabled but config preserved
\`\`\`
    `
  },
  'codex-features': {
    title: 'Features & Display',
    content: `
## Codex Features & Display

Configure Codex behavior and visual settings.

### Features

| Feature | Description | Default |
|---------|-------------|---------|
| **Shell Snapshot** | Speed up repeated commands (Beta) | On |
| **Web Search** | Allow the model to search the web | On |

### Display Settings

| Setting | Description | Default |
|---------|-------------|---------|
| **Animations** | Enable UI animations | On |
| **Notifications** | Show system notifications | On |

### History

| Option | Description |
|--------|-------------|
| **Save All** | Keep all session history |
| **None** | Do not persist history |

### Analytics

Control whether anonymous usage data is sent to OpenAI.

### Configuration

\`\`\`toml
# ~/.codex/config.toml

[features]
shell_snapshot = true
web_search_request = true

[tui]
animations = true
notifications = true

[history]
persistence = "save-all"

[analytics]
enabled = true
\`\`\`

### CLI Mode

For low-friction autonomous coding:

\`\`\`bash
# Full auto mode - minimal approvals
codex --full-auto
\`\`\`
    `
  },
};
