export const cliContent = {
  'cli-overview': {
    title: 'CLI Overview',
    content: `
## CLI Overview

The \`claude-config\` CLI provides command-line access to all features.

### Basic Usage

\`\`\`bash
claude-config [command] [options]
\`\`\`

### Getting Help

\`\`\`bash
claude-config --help
claude-config <command> --help
\`\`\`

### Global Options

- \`--version, -v\` - Show version
- \`--help, -h\` - Show help
    `
  },
  'cli-commands': {
    title: 'All Commands',
    content: `
## All CLI Commands

### UI Commands

\`\`\`bash
claude-config ui                  # Start UI (daemon mode)
claude-config ui --foreground     # Run in foreground
claude-config ui --port 8080      # Custom port
claude-config ui status           # Check daemon status
claude-config ui stop             # Stop daemon
\`\`\`

### Project Commands

\`\`\`bash
claude-config init                # Initialize project
claude-config init --template X   # Initialize with template
claude-config apply               # Generate .mcp.json
claude-config show                # Show configuration
\`\`\`

### MCP Commands

\`\`\`bash
claude-config list                      # List available MCPs
claude-config add <mcp>                 # Add MCP to project
claude-config remove <mcp>              # Remove MCP
claude-config registry                  # List registry
claude-config registry add <name> '{}'  # Add to registry
claude-config registry remove <name>    # Remove from registry
\`\`\`

### Project Registry

\`\`\`bash
claude-config project             # List projects
claude-config project add         # Add project
claude-config project remove      # Remove project
\`\`\`

### Memory Commands

\`\`\`bash
claude-config memory              # Show memory status
claude-config memory init         # Initialize memory
claude-config memory add          # Add entry
claude-config memory search       # Search memory
\`\`\`

### Environment

\`\`\`bash
claude-config env                 # List variables
claude-config env set KEY value   # Set variable
claude-config env unset KEY       # Remove variable
\`\`\`

### Templates

\`\`\`bash
claude-config templates           # List templates
claude-config apply-template X    # Apply template
\`\`\`

### Workstreams

\`\`\`bash
claude-config workstream              # List workstreams
claude-config workstream create "X"   # Create workstream
claude-config workstream delete "X"   # Delete workstream
claude-config workstream use "X"      # Set active
claude-config workstream active       # Show active
claude-config workstream add "X" /path     # Add project
claude-config workstream remove "X" /path  # Remove project
claude-config workstream inject       # Output rules for hooks
claude-config workstream detect       # Detect from directory
\`\`\`
    `
  },
  'daemon-mode': {
    title: 'Daemon Mode',
    content: `
## Daemon Mode

By default, \`claude-config ui\` runs as a background daemon.

### Starting the Daemon

\`\`\`bash
claude-config ui
\`\`\`

The UI starts in the background and you can continue using your terminal.

### Checking Status

\`\`\`bash
claude-config ui status
\`\`\`

### Stopping the Daemon

\`\`\`bash
claude-config ui stop
\`\`\`

### Foreground Mode

To run in the foreground (blocking):

\`\`\`bash
claude-config ui --foreground
# or
claude-config ui -f
\`\`\`

### Logs

Daemon logs are stored in \`~/.claude-config/ui.log\`
    `
  },
};
