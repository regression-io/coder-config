# CC-9: Claude Code Router Integration — Design Spec

**Status:** APPROVED
**Date:** 2026-04-12
**Related:** [ROADMAP.md CC-9](../../../ROADMAP.md), [claude-code-router](https://github.com/musistudio/claude-code-router)

## Summary

Integrate Claude Code Router (CCR) configuration and lifecycle management into coder-config. CCR is a local proxy that routes Claude Code API calls to different LLM providers based on task type (default, background, reasoning, long-context, web-search, image).

## Architecture

### New Module: `lib/router.js` (new)

Manages `~/.claude-code-router/config.json`:

- `getConfig()` — read and parse CCR config
- `saveConfig(config)` — write CCR config (preserves unknown fields)
- `listProviders()` — list configured providers
- `addProvider(name, config)` — add provider entry
- `removeProvider(name)` — remove provider entry
- `getRouterRules()` — get task-to-model mapping
- `setRouterRule(task, providerModel)` — set `Router.<task>` to `"provider,model"`
- `listPresets()` — list saved presets from `~/.claude-code-router/presets/`
- `savePreset(name)` — snapshot current config as preset
- `loadPreset(name)` — restore config from preset
- `getStatus()` — detect CCR installation, check if proxy is running (port check on 3456)
- `activate()` — return env vars needed (`ANTHROPIC_BASE_URL`, `ANTHROPIC_AUTH_TOKEN`, etc.)
- `deactivate()` — return original env vars to restore

### CLI Commands in `lib/cli.js` (existing)

```
coder-config router status          # Show CCR install status, proxy status, active config
coder-config router list            # List providers and routing rules
coder-config router add-provider    # Interactive or: add-provider <name> --url <url> --key <key>
coder-config router remove-provider <name>
coder-config router set-rule <task> <provider,model>
coder-config router preset list
coder-config router preset save <name>
coder-config router preset load <name>
coder-config router start           # Start CCR proxy (delegates to `ccr start`)
coder-config router stop            # Stop CCR proxy (delegates to `ccr stop`)
coder-config router activate        # Print eval-able env vars for shell
```

### API Endpoints in `ui/routes/router.js` (new)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/router/status` | Installation status, proxy running, port |
| GET | `/api/router/config` | Full CCR config |
| PUT | `/api/router/config` | Save full CCR config |
| GET | `/api/router/providers` | List providers |
| POST | `/api/router/providers` | Add provider |
| DELETE | `/api/router/providers/:name` | Remove provider |
| GET | `/api/router/rules` | Get routing rules |
| PUT | `/api/router/rules` | Update routing rules |
| GET | `/api/router/presets` | List presets |
| POST | `/api/router/presets` | Save current as preset |
| POST | `/api/router/presets/:name/load` | Load preset |
| POST | `/api/router/start` | Start proxy |
| POST | `/api/router/stop` | Stop proxy |

### Web UI: `ui/src/views/RouterView.jsx` (new)

Sidebar placement: **Developer** section (next to "Create MCP" and "Ralph Loops").

#### Layout

Three sections in a single scrollable view:

**1. Status Bar (top)**
- CCR installation status (installed/not found)
- Proxy status (running on port 3456 / stopped)
- Start/Stop button
- Activate button (copies env vars to clipboard)

**2. Routing Rules**
- 6 task type cards in a grid:
  - `default` — general tasks
  - `background` — low-cost background tasks
  - `think` — reasoning tasks
  - `longContext` — large context (with threshold input)
  - `webSearch` — web-search capable model
  - `image` — image tasks (beta)
- Each card shows current `provider,model` assignment
- Click to edit via dropdown of available providers × models

**3. Providers**
- Collapsible list of configured providers (same pattern as MCP editors)
- Each shows: name, api_base_url, model count, transformer
- Add Provider button → dialog with fields: name, api_base_url, api_key (supports `$ENV_VAR`), models array
- Remove button per provider

**4. Presets (collapsed by default)**
- List of saved presets
- Save Current / Load buttons

### CCR Config Format Reference

```json
{
  "APIKEY": "optional-bearer-token",
  "HOST": "127.0.0.1",
  "LOG": false,
  "Providers": [
    {
      "name": "openrouter",
      "api_base_url": "https://openrouter.ai/api/v1/chat/completions",
      "api_key": "$OPENROUTER_API_KEY",
      "models": ["anthropic/claude-sonnet-4", "deepseek/deepseek-chat"],
      "transformer": { "use": ["openrouter"] }
    }
  ],
  "Router": {
    "default": "openrouter,anthropic/claude-sonnet-4",
    "background": "openrouter,deepseek/deepseek-chat",
    "think": "openrouter,anthropic/claude-sonnet-4",
    "longContext": "openrouter,anthropic/claude-sonnet-4",
    "longContextThreshold": 60000,
    "webSearch": "openrouter,anthropic/claude-sonnet-4",
    "image": "openrouter,anthropic/claude-sonnet-4"
  }
}
```

### Process Management

CCR proxy detection:
- Check if `ccr` command exists (`which ccr`)
- Check if port 3456 is listening (`lsof -i :3456` or net connect test)
- Parse `~/.claude-code-router/config.json` for custom port

Start/stop delegates to CCR's own CLI:
- Start: `ccr start` (or `ccr start --port <port>`)
- Stop: `ccr stop`

### Env Var Activation

CCR works by setting env vars that redirect Claude Code to the proxy:
```
ANTHROPIC_BASE_URL=http://127.0.0.1:3456
ANTHROPIC_AUTH_TOKEN=<configured key>
NO_PROXY=127.0.0.1
```

The `activate` command outputs these for `eval "$(coder-config router activate)"` usage. The Web UI shows a "Copy Activation" button.

## Exit Criteria

- [ ] `coder-config router status` shows CCR installation and proxy status
- [ ] `coder-config router list` shows providers and routing rules
- [ ] `coder-config router add-provider` creates valid provider in CCR config
- [ ] `coder-config router set-rule default openrouter,claude-sonnet-4` updates routing
- [ ] Web UI Router view shows status, rules, providers
- [ ] Start/Stop proxy buttons work when CCR is installed
- [ ] Presets save/load round-trip correctly
- [ ] Env var activation outputs correct shell commands

## Out of Scope

- Custom router JS module editor (CCR's `custom-router.js`)
- Transformer pipeline configuration (beyond showing which transformers are active)
- Request/response monitoring or logging viewer
- Installing CCR itself (just detect and configure)
