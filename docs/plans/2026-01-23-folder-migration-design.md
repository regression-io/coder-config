# Folder Migration: ~/.claude-config/ → ~/.coder-config/

## Overview

Migrate the user configuration folder from `~/.claude-config/` to `~/.coder-config/` to align with the renamed package.

## Current State

- **Config folder**: `~/.claude-config/`
- **Contents**:
  - `config.json` - User preferences (toolsDir, registryPath, ui settings)
  - `projects.json` - Registered projects
  - `workstreams.json` - Workstream definitions
  - `smart-sync.json` - Smart sync preferences
  - `activity.json` - Activity tracking data
  - `ui.log` - UI daemon logs
  - `ui.pid` - UI daemon PID file

## Migration Strategy

### Phase 1: Dual Path Support (v0.41.0)

Add transparent support for both paths with preference for the new location.

**Implementation:**
1. Create helper function `getConfigDir()` that:
   - Checks if `~/.coder-config/` exists → use it
   - Falls back to `~/.claude-config/` if it exists
   - Creates `~/.coder-config/` for new installations

2. Update all config path references to use `getConfigDir()`:
   - `lib/workstreams.js` - workstreams.json, activity.json
   - `lib/smart-sync.js` - smart-sync.json
   - `ui/server.cjs` - projects.json, ui.log, ui.pid
   - `scripts/postinstall.js` - initial setup

3. Show deprecation warning when old path is used:
   ```
   Warning: ~/.claude-config/ is deprecated. Run 'coder-config migrate' to move to ~/.coder-config/
   ```

**Files to modify:**
- `lib/paths.js` (new) - Centralized path resolution
- `lib/workstreams.js`
- `lib/smart-sync.js`
- `ui/server.cjs`
- `ui/routes/projects.js`
- `scripts/postinstall.js`

### Phase 2: Migration Command (v0.41.0)

Add `coder-config migrate` command to move config folder.

**Behavior:**
```bash
coder-config migrate
```
1. Check if `~/.claude-config/` exists
2. Check if `~/.coder-config/` already exists (abort if so, unless --force)
3. Copy all files from old to new location
4. Verify copy succeeded
5. Delete old folder (or rename to `~/.claude-config.bak`)
6. Print success message

**Options:**
- `--dry-run` - Show what would be migrated without doing it
- `--force` - Overwrite existing `~/.coder-config/` if present
- `--keep-old` - Don't delete old folder after migration

### Phase 3: Auto-Migration Prompt (v0.42.0)

When old folder is detected, prompt user:
```
Found configuration at ~/.claude-config/
Would you like to migrate to ~/.coder-config/? (recommended) [Y/n]
```

Only prompt once per session. Remember "no" choice for 7 days.

### Phase 4: Remove Old Path Support (v1.0.0)

- Remove fallback to `~/.claude-config/`
- Remove migration command (or keep for stragglers)
- Remove deprecation warnings
- Clean release for v1.0.0

## Implementation Details

### New lib/paths.js

```javascript
const path = require('path');
const fs = require('fs');
const os = require('os');

const NEW_CONFIG_DIR = path.join(os.homedir(), '.coder-config');
const OLD_CONFIG_DIR = path.join(os.homedir(), '.claude-config');

let _configDir = null;
let _usingOldPath = false;

function getConfigDir() {
  if (_configDir) return _configDir;

  // Prefer new path
  if (fs.existsSync(NEW_CONFIG_DIR)) {
    _configDir = NEW_CONFIG_DIR;
    return _configDir;
  }

  // Fall back to old path
  if (fs.existsSync(OLD_CONFIG_DIR)) {
    _configDir = OLD_CONFIG_DIR;
    _usingOldPath = true;
    return _configDir;
  }

  // New installation - use new path
  _configDir = NEW_CONFIG_DIR;
  return _configDir;
}

function isUsingOldPath() {
  getConfigDir(); // Ensure initialized
  return _usingOldPath;
}

function showDeprecationWarning() {
  if (isUsingOldPath()) {
    console.warn('\x1b[33mWarning: ~/.claude-config/ is deprecated.');
    console.warn('Run "coder-config migrate" to move to ~/.coder-config/\x1b[0m\n');
  }
}

function getConfigPath(filename) {
  return path.join(getConfigDir(), filename);
}

module.exports = {
  getConfigDir,
  getConfigPath,
  isUsingOldPath,
  showDeprecationWarning,
  NEW_CONFIG_DIR,
  OLD_CONFIG_DIR,
};
```

### Migration Command in lib/cli.js

```javascript
case 'migrate':
  manager.migrate({
    dryRun: args.includes('--dry-run'),
    force: args.includes('--force'),
    keepOld: args.includes('--keep-old'),
  });
  break;
```

### Migration Function in config-loader.js

```javascript
function migrate(options = {}) {
  const { dryRun, force, keepOld } = options;
  const { OLD_CONFIG_DIR, NEW_CONFIG_DIR } = require('./lib/paths');

  if (!fs.existsSync(OLD_CONFIG_DIR)) {
    console.log('Nothing to migrate - ~/.claude-config/ not found');
    return;
  }

  if (fs.existsSync(NEW_CONFIG_DIR) && !force) {
    console.error('~/.coder-config/ already exists. Use --force to overwrite.');
    process.exit(1);
  }

  const files = fs.readdirSync(OLD_CONFIG_DIR);

  if (dryRun) {
    console.log('Would migrate:');
    files.forEach(f => console.log(`  ${f}`));
    return;
  }

  // Create new directory
  fs.mkdirSync(NEW_CONFIG_DIR, { recursive: true });

  // Copy files
  files.forEach(file => {
    const src = path.join(OLD_CONFIG_DIR, file);
    const dest = path.join(NEW_CONFIG_DIR, file);
    fs.copyFileSync(src, dest);
    console.log(`Migrated: ${file}`);
  });

  // Remove or backup old
  if (keepOld) {
    console.log('\nOld folder kept at ~/.claude-config/');
  } else {
    fs.rmSync(OLD_CONFIG_DIR, { recursive: true });
    console.log('\nRemoved ~/.claude-config/');
  }

  console.log('\n✓ Migration complete! Config now at ~/.coder-config/');
}
```

## Testing Plan

1. **Fresh install**: Verify `~/.coder-config/` is created
2. **Existing old folder**: Verify fallback works, warning shown
3. **Both folders exist**: Verify new folder takes precedence
4. **migrate command**: Test all options (--dry-run, --force, --keep-old)
5. **UI**: Verify projects, workstreams load from correct location

## Timeline

| Version | Milestone |
|---------|-----------|
| v0.41.0 | Dual path support + migrate command |
| v0.42.0 | Auto-migration prompt |
| v0.50.0 | Warning becomes more prominent |
| v1.0.0  | Remove old path support |

## Risks

1. **Data loss**: Mitigated by copy-then-delete and --keep-old option
2. **Permissions**: May fail if user lacks write permission - handle gracefully
3. **Symlinks**: Some users may have symlinked folder - detect and warn
4. **Active processes**: UI daemon may have files open - warn to stop first
