export const cliContent = {
  'cli-overview': {
    title: 'CLI Overview',
    content: `
## CLI Overview

The \`coder-config\` CLI provides command-line access to all features.

### Basic Usage

\`\`\`bash
coder-config [command] [options]
\`\`\`

### Getting Help

\`\`\`bash
coder-config --help
coder-config <command> --help
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
coder-config ui                  # Start UI (daemon mode)
coder-config ui --foreground     # Run in foreground
coder-config ui --port 8080      # Custom port
coder-config ui status           # Check daemon status
coder-config ui stop             # Stop daemon
\`\`\`

### Project Commands

\`\`\`bash
coder-config init                # Initialize project
coder-config init --template X   # Initialize with template
coder-config apply               # Generate .mcp.json
coder-config show                # Show configuration
\`\`\`

### MCP Commands

\`\`\`bash
coder-config list                      # List available MCPs
coder-config add <mcp>                 # Add MCP to project
coder-config remove <mcp>              # Remove MCP
coder-config registry                  # List registry
coder-config registry add <name> '{}'  # Add to registry
coder-config registry remove <name>    # Remove from registry
\`\`\`

### Project Registry

\`\`\`bash
coder-config project             # List projects
coder-config project add         # Add project
coder-config project remove      # Remove project
\`\`\`

### Memory Commands

\`\`\`bash
coder-config memory              # Show memory status
coder-config memory init         # Initialize memory
coder-config memory add          # Add entry
coder-config memory search       # Search memory
\`\`\`

### Environment

\`\`\`bash
coder-config env                 # List variables
coder-config env set KEY value   # Set variable
coder-config env unset KEY       # Remove variable
\`\`\`

### Workstreams

\`\`\`bash
coder-config workstream              # List workstreams
coder-config workstream create "X"   # Create workstream
coder-config workstream delete "X"   # Delete workstream
coder-config workstream use "X"      # Set active
coder-config workstream active       # Show active
coder-config workstream deactivate   # Show how to deactivate
coder-config workstream add "X" /path     # Add project
coder-config workstream remove "X" /path  # Remove project
coder-config workstream inject       # Output rules for hooks
coder-config workstream detect       # Detect from directory
coder-config workstream install-hook      # Install Claude Code hook
coder-config workstream install-hook --all  # Install for all tools
\`\`\`

### Workstream Folder Auto-Activation

\`\`\`bash
coder-config workstream install-cd-hook    # Install cd hook
coder-config workstream uninstall-cd-hook  # Remove cd hook
coder-config workstream cd-hook-status     # Check hook status
coder-config workstream add-trigger "X" /folder    # Add trigger folder
coder-config workstream remove-trigger "X" /folder # Remove trigger
coder-config workstream auto-activate "X" on|off   # Set auto-activate
coder-config workstream check-folder /path  # Check for matches
\`\`\`

### Session Persistence

\`\`\`bash
coder-config session             # Show session status
coder-config session install     # Install hooks + /flush command
coder-config session clear       # Clear saved context
\`\`\`
    `
  },
  'daemon-mode': {
    title: 'Daemon Mode',
    content: `
## Daemon Mode

By default, \`coder-config ui\` runs as a background daemon.

### Starting the Daemon

\`\`\`bash
coder-config ui
\`\`\`

The UI starts in the background and you can continue using your terminal.

### Checking Status

\`\`\`bash
coder-config ui status
\`\`\`

### Stopping the Daemon

\`\`\`bash
coder-config ui stop
\`\`\`

### Foreground Mode

To run in the foreground (blocking):

\`\`\`bash
coder-config ui --foreground
# or
coder-config ui -f
\`\`\`

### Logs

Daemon logs are stored in \`~/.coder-config/ui.log\`
    `
  },
};
