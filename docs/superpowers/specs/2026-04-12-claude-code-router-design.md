# CC-9: Claude Code Router Integration — Design Spec

**Status:** APPROVED
**Date:** 2026-04-12
**Related:** [ROADMAP.md CC-9](../../../ROADMAP.md), [claude-code-router](https://github.com/musistudio/claude-code-router)

## Summary

Integrate Claude Code Router (CCR) configuration and lifecycle management into coder-config. CCR is a local proxy that routes Claude Code API calls to different LLM providers based on task type (default, background, reasoning, long-context, web-search, image).

## Architecture

### New Module: `lib/router.js` (new)

Manages `~/.claude-code-router/config.json`:

- `getConfig()` — read and parse CCR config (JSON5 format)
- `saveConfig(config)` — write CCR config, preserving all fields including unmanaged ones (see Known Fields below)
- `listProviders()` — list configured providers from `Providers[]` array
- `addProvider(name, config)` — add provider entry to `Providers[]`
- `removeProvider(name)` — remove provider entry by name
- `getRouterRules()` — get `Router.*` task-to-model mapping
- `setRouterRule(task, providerModel)` — set `Router.<task>` to `"provider,model"`
- `listPresets()` — list saved presets from `~/.claude-code-router/presets/`
- `savePreset(name)` — snapshot current config as preset (coder-config managed, not CCR's `ccr preset`)
- `loadPreset(name)` — restore config from preset
- `getStatus()` — detect CCR installation (`which ccr`), check if proxy is running (connect test on configured port), return version
- `getActivationEnv()` — return env vars needed for activation
- `getConfigPath()` — return `~/.claude-code-router/config.json`

### Config-Loader Integration in `config-loader.js` (existing)

Import `lib/router.js` and bind methods to `ClaudeConfigManager`:
- `this.routerGetConfig()`, `this.routerSaveConfig(config)`
- `this.routerListProviders()`, `this.routerAddProvider(name, config)`, `this.routerRemoveProvider(name)`
- `this.routerGetRules()`, `this.routerSetRule(task, providerModel)`
- `this.routerGetStatus()`, `this.routerListPresets()`, etc.

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
coder-config router start           # Start CCR proxy (delegates to `ccr code`)
coder-config router stop            # Stop CCR proxy (delegates to `ccr stop`)
coder-config router activate        # Print eval-able env vars for shell
```

All commands print "CCR not installed" with install instructions when `ccr` is not found.

### API Endpoints in `ui/routes/router.js` (new)

Uses query params and POST body for identifiers (no path params — matches existing server.cjs dispatch pattern).

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/router/status` | Installation status, proxy running, port, version |
| GET | `/api/router/config` | Full CCR config |
| PUT | `/api/router/config` | Save full CCR config |
| GET | `/api/router/providers` | List providers |
| POST | `/api/router/providers` | Add provider (body: `{ name, config }`) |
| DELETE | `/api/router/providers` | Remove provider (query: `?name=openrouter`) |
| GET | `/api/router/rules` | Get routing rules |
| PUT | `/api/router/rules` | Update routing rules (body: `{ task, providerModel }`) |
| GET | `/api/router/presets` | List presets |
| POST | `/api/router/presets` | Save current as preset (body: `{ name }`) |
| POST | `/api/router/preset-load` | Load preset (body: `{ name }`) |
| POST | `/api/router/start` | Start proxy (delegates to `ccr code`) |
| POST | `/api/router/stop` | Stop proxy (delegates to `ccr stop`) |

### Web UI: `ui/src/views/RouterView.jsx` (new)

Sidebar placement: **Developer** section (next to "Create MCP" and "Ralph Loops"). Always visible (no experimental gate). Shows "CCR not installed" state when `ccr` is absent.

#### Layout

Three sections in a single scrollable view:

**1. Status Bar (top)**
- CCR installation status (installed with version / not found with install link)
- Proxy status (running on port N / stopped)
- Start/Stop button (disabled when not installed)
- "Copy Activation" button (copies `eval` command to clipboard)

**2. Routing Rules**
- 6 task type cards in a 2×3 grid:
  - `default` — general tasks
  - `background` — low-cost background tasks
  - `think` — reasoning tasks
  - `longContext` — large context (with threshold input for `longContextThreshold`)
  - `webSearch` — web-search capable model
  - `image` — image tasks (beta)
- Each card shows current `provider,model` assignment
- Click to edit via dropdown of available providers × models from `Providers[]`

**3. Providers**
- Collapsible list of configured providers (same pattern as MCP editors)
- Each shows: name, api_base_url, model count, active transformers
- Add Provider button → dialog with fields: name, api_base_url, api_key (supports `$ENV_VAR`), models array
- Remove button per provider

**4. Presets (collapsed by default)**
- List of saved presets with timestamps
- Save Current / Load buttons

### CCR Config Format — Known Fields

**Managed by coder-config (read/write):**

| Field | Type | Description |
|-------|------|-------------|
| `Providers[]` | array | Provider definitions |
| `Providers[].name` | string | Provider identifier |
| `Providers[].api_base_url` | string | Chat completions endpoint |
| `Providers[].api_key` | string | Supports `$ENV_VAR` interpolation |
| `Providers[].models` | string[] | Available models |
| `Providers[].transformer` | object | `use` array of transformer names |
| `Router.default` | string | `"provider,model"` for general tasks |
| `Router.background` | string | Low-cost tasks |
| `Router.think` | string | Reasoning tasks |
| `Router.longContext` | string | Large context |
| `Router.longContextThreshold` | number | Token threshold (default 60000) |
| `Router.webSearch` | string | Web-search capable model |
| `Router.image` | string | Image tasks (beta) |

**Preserved but not edited (read-only display):**

| Field | Type | Description |
|-------|------|-------------|
| `APIKEY` | string | Bearer token for request auth |
| `PROXY_URL` | string | HTTP proxy for upstream API calls |
| `HOST` | string | Bind address (forced 127.0.0.1 if no APIKEY) |
| `LOG` | boolean | Enable logging |
| `LOG_LEVEL` | string | Log level (fatal/error/warn/info/debug/trace) |
| `API_TIMEOUT_MS` | number | Timeout (default 600000) |
| `NON_INTERACTIVE_MODE` | boolean | CI/CD mode |
| `CUSTOM_ROUTER_PATH` | string | Path to custom JS router module |
| `transformers[]` | array | Custom transformer plugin paths |

`saveConfig()` must round-trip all fields, including any unknown future fields.

### Process Management

CCR proxy detection:
1. Check if `ccr` command exists (`which ccr`)
2. Read port from config (default 3456)
3. Attempt TCP connect to `127.0.0.1:<port>` to check if running

Start/stop delegates to CCR's own CLI:
- Start: `ccr code` (launches proxy + Claude Code)
- Stop: `ccr stop`
- Restart: `ccr restart`

### Env Var Activation

CCR works by setting env vars that redirect Claude Code to the proxy:
```
ANTHROPIC_BASE_URL=http://127.0.0.1:<port>
ANTHROPIC_AUTH_TOKEN=<APIKEY from config>
NO_PROXY=127.0.0.1
DISABLE_TELEMETRY=1
DISABLE_COST_WARNINGS=1
```

The `activate` command outputs these for `eval "$(coder-config router activate)"` usage. The `deactivate` command outputs `unset` commands for the same variables (stateless — just unsets, does not restore previous values).

### Testing: `test/router.test.js` (new)

- Config read/write with unknown field preservation
- Provider CRUD (add, remove, list)
- Rule get/set
- Preset save/load round-trip
- Status detection (mock `which ccr`, mock port check)
- Activation env var generation
- Error handling when CCR not installed

## Exit Criteria

- [ ] `coder-config router status` shows CCR installation and proxy status
- [ ] `coder-config router list` shows providers and routing rules
- [ ] `coder-config router add-provider` creates valid provider in CCR config
- [ ] `coder-config router set-rule default openrouter,claude-sonnet-4` updates routing
- [ ] Web UI Router view shows status, rules, providers under Developer section
- [ ] Start/Stop proxy buttons work when CCR is installed
- [ ] Presets save/load round-trip correctly
- [ ] Env var activation outputs correct shell commands including DISABLE_TELEMETRY
- [ ] All CLI commands gracefully handle missing CCR installation
- [ ] `test/router.test.js` passes with full coverage of lib/router.js

## Out of Scope

- Custom router JS module editor (CCR's `custom-router.js`)
- Transformer pipeline configuration (beyond showing which transformers are active per provider)
- Request/response monitoring or logging viewer
- Installing CCR itself (just detect and configure)
- Wrapping CCR's native `ccr preset` system (we manage our own presets)
