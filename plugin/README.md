# coder-config Plugin

Skills for workstream context management and session persistence.

## Skills

### `/flush`
Save current session context to `.claude/session-context.md` for seamless continuation later.

### `/update-docs`
Keep README.md and CHANGELOG.md in sync with the current state of the codebase.

### `/refactor`
Break down large files into smaller, focused modules while preserving functionality.

## Installation

This plugin is part of the [coder-config](https://github.com/regression-io/coder-config) tool.

To use these skills, install coder-config:

```bash
npm install -g coder-config
```

Then install the plugin:

```bash
claude /install coder-config@claude-config-plugins
```

## Related

- [coder-config](https://github.com/regression-io/coder-config) - Full configuration manager with UI, MCP management, workstreams
- [claude-config-plugins](https://github.com/regression-io/claude-config-plugins) - Plugin marketplace
