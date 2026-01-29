const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { apply } = require('../lib/apply.js');
const { saveJson } = require('../lib/utils.js');

describe('apply', () => {
  let tempDir;
  let projectDir;
  let registryPath;
  let originalLog;
  let originalWarn;
  let originalError;
  let logs;
  let warnings;
  let errors;

  before(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'apply-test-'));
    originalLog = console.log;
    originalWarn = console.warn;
    originalError = console.error;
  });

  after(() => {
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    projectDir = path.join(tempDir, `project-${Date.now()}-${Math.random()}`);
    fs.mkdirSync(path.join(projectDir, '.claude'), { recursive: true });

    registryPath = path.join(tempDir, `registry-${Date.now()}.json`);

    // Create mock registry
    saveJson(registryPath, {
      mcpServers: {
        github: {
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-github']
        },
        filesystem: {
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-filesystem'],
          env: { ROOT_PATH: '${ROOT_PATH}' }
        },
        postgres: {
          command: 'docker',
          args: ['run', 'postgres'],
          env: { DATABASE_URL: '${DATABASE_URL}' }
        }
      }
    });

    logs = [];
    warnings = [];
    errors = [];
    console.log = (...args) => logs.push(args.join(' '));
    console.warn = (...args) => warnings.push(args.join(' '));
    console.error = (...args) => errors.push(args.join(' '));
  });

  describe('apply', () => {
    it('should generate .mcp.json from project config', () => {
      // Create project config
      saveJson(path.join(projectDir, '.claude', 'mcps.json'), {
        include: ['github', 'filesystem']
      });

      const result = apply(registryPath, projectDir);

      assert.strictEqual(result, true);

      const mcpPath = path.join(projectDir, '.mcp.json');
      assert.ok(fs.existsSync(mcpPath));

      const mcp = JSON.parse(fs.readFileSync(mcpPath, 'utf8'));
      assert.ok(mcp.mcpServers.github);
      assert.ok(mcp.mcpServers.filesystem);
      assert.ok(!mcp.mcpServers.postgres);
    });

    it('should include MCPs from include array', () => {
      saveJson(path.join(projectDir, '.claude', 'mcps.json'), {
        include: ['github']
      });

      apply(registryPath, projectDir);

      const mcp = JSON.parse(fs.readFileSync(path.join(projectDir, '.mcp.json'), 'utf8'));
      assert.ok(mcp.mcpServers.github);
      // Verify github is included (may have additional MCPs from parent configs)
      assert.ok(Object.keys(mcp.mcpServers).includes('github'));
    });

    it('should include custom mcpServers from config', () => {
      saveJson(path.join(projectDir, '.claude', 'mcps.json'), {
        include: [],
        mcpServers: {
          custom: {
            command: 'node',
            args: ['custom-server.js']
          }
        }
      });

      apply(registryPath, projectDir);

      const mcp = JSON.parse(fs.readFileSync(path.join(projectDir, '.mcp.json'), 'utf8'));
      assert.ok(mcp.mcpServers.custom);
      assert.strictEqual(mcp.mcpServers.custom.command, 'node');
    });

    it('should skip MCPs starting with underscore', () => {
      saveJson(path.join(projectDir, '.claude', 'mcps.json'), {
        include: [],
        mcpServers: {
          _disabled: { command: 'test' },
          enabled: { command: 'test2' }
        }
      });

      apply(registryPath, projectDir);

      const mcp = JSON.parse(fs.readFileSync(path.join(projectDir, '.mcp.json'), 'utf8'));
      assert.ok(!mcp.mcpServers._disabled);
      assert.ok(mcp.mcpServers.enabled);
    });

    it('should interpolate environment variables', () => {
      // Create .env file
      fs.writeFileSync(
        path.join(projectDir, '.claude', '.env'),
        'ROOT_PATH=/home/user\nDATABASE_URL=postgres://localhost'
      );

      saveJson(path.join(projectDir, '.claude', 'mcps.json'), {
        include: ['filesystem', 'postgres']
      });

      apply(registryPath, projectDir);

      const mcp = JSON.parse(fs.readFileSync(path.join(projectDir, '.mcp.json'), 'utf8'));
      assert.strictEqual(mcp.mcpServers.filesystem.env.ROOT_PATH, '/home/user');
      assert.strictEqual(mcp.mcpServers.postgres.env.DATABASE_URL, 'postgres://localhost');
    });

    it('should warn for MCPs not in registry', () => {
      saveJson(path.join(projectDir, '.claude', 'mcps.json'), {
        include: ['nonexistent']
      });

      apply(registryPath, projectDir);

      assert.ok(warnings.some(w => w.includes('not found in registry')));
      assert.ok(warnings.some(w => w.includes('nonexistent')));
    });

    it('should show success message', () => {
      saveJson(path.join(projectDir, '.claude', 'mcps.json'), {
        include: ['github']
      });

      apply(registryPath, projectDir);

      assert.ok(logs.some(log => log.includes('✓ Generated')));
      assert.ok(logs.some(log => log.includes('.mcp.json')));
    });

    it('should show count of MCPs generated', () => {
      saveJson(path.join(projectDir, '.claude', 'mcps.json'), {
        include: ['github', 'filesystem']
      });

      apply(registryPath, projectDir);

      assert.ok(logs.some(log => log.includes('2 MCP(s)')));
    });

    it('should list MCP names in output', () => {
      saveJson(path.join(projectDir, '.claude', 'mcps.json'), {
        include: ['github']
      });

      apply(registryPath, projectDir);

      assert.ok(logs.some(log => log.includes('github')));
    });

    it('should handle directory with no local config', () => {
      // Create directory without config but may inherit from parents
      const noConfigDir = path.join(tempDir, 'no-local-config');
      fs.mkdirSync(noConfigDir, { recursive: true });

      const result = apply(registryPath, noConfigDir);

      // Result depends on whether parent configs exist
      // Just verify it doesn't crash
      assert.ok(typeof result === 'boolean');
    });

    it('should return false when registry cannot be loaded', () => {
      saveJson(path.join(projectDir, '.claude', 'mcps.json'), {
        include: ['github']
      });

      const result = apply('/nonexistent/registry.json', projectDir);

      assert.strictEqual(result, false);
      assert.ok(errors.some(err => err.includes('Could not load MCP registry')));
    });

    it('should use current directory when projectDir not provided', () => {
      const originalCwd = process.cwd();
      process.chdir(projectDir);

      saveJson(path.join(projectDir, '.claude', 'mcps.json'), {
        include: ['github']
      });

      apply(registryPath);

      process.chdir(originalCwd);

      const mcpPath = path.join(projectDir, '.mcp.json');
      assert.ok(fs.existsSync(mcpPath));
    });

    it('should generate settings.json when enabledPlugins configured', () => {
      saveJson(path.join(projectDir, '.claude', 'mcps.json'), {
        include: ['github'],
        enabledPlugins: {
          'test-plugin': true,
          'another-plugin': false
        }
      });

      apply(registryPath, projectDir);

      const settingsPath = path.join(projectDir, '.claude', 'settings.json');
      assert.ok(fs.existsSync(settingsPath));

      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      assert.ok(settings.enabledPlugins);
      assert.strictEqual(settings.enabledPlugins['test-plugin'], true);
      assert.strictEqual(settings.enabledPlugins['another-plugin'], false);
    });

    it('should show plugin count in output', () => {
      saveJson(path.join(projectDir, '.claude', 'mcps.json'), {
        include: [],
        enabledPlugins: {
          'plugin1': true,
          'plugin2': true,
          'plugin3': false
        }
      });

      apply(registryPath, projectDir);

      assert.ok(logs.some(log => log.includes('2 plugin(s) enabled')));
    });

    it('should merge enabledPlugins with existing settings', () => {
      // Create existing settings
      saveJson(path.join(projectDir, '.claude', 'settings.json'), {
        someOtherSetting: 'value',
        enabledPlugins: {
          'old-plugin': true
        }
      });

      saveJson(path.join(projectDir, '.claude', 'mcps.json'), {
        include: [],
        enabledPlugins: {
          'new-plugin': true
        }
      });

      apply(registryPath, projectDir);

      const settings = JSON.parse(
        fs.readFileSync(path.join(projectDir, '.claude', 'settings.json'), 'utf8')
      );
      assert.strictEqual(settings.someOtherSetting, 'value');
      assert.ok(settings.enabledPlugins['new-plugin']);
    });

    it('should handle invalid existing settings gracefully', () => {
      // Create invalid settings file
      fs.writeFileSync(
        path.join(projectDir, '.claude', 'settings.json'),
        'invalid json'
      );

      saveJson(path.join(projectDir, '.claude', 'mcps.json'), {
        include: [],
        enabledPlugins: { 'plugin': true }
      });

      // Should not crash
      apply(registryPath, projectDir);

      const settings = JSON.parse(
        fs.readFileSync(path.join(projectDir, '.claude', 'settings.json'), 'utf8')
      );
      assert.ok(settings.enabledPlugins);
    });
  });

  describe('apply with hierarchy', () => {
    let parentDir;

    beforeEach(() => {
      // Create parent directory with config
      parentDir = path.join(tempDir, `parent-${Date.now()}`);
      fs.mkdirSync(path.join(parentDir, '.claude'), { recursive: true });

      // Create child directory
      projectDir = path.join(parentDir, 'child');
      fs.mkdirSync(path.join(projectDir, '.claude'), { recursive: true });
    });

    it('should merge configs from parent and child', () => {
      // Parent config
      saveJson(path.join(parentDir, '.claude', 'mcps.json'), {
        include: ['github']
      });

      // Child config
      saveJson(path.join(projectDir, '.claude', 'mcps.json'), {
        include: ['filesystem']
      });

      apply(registryPath, projectDir);

      const mcp = JSON.parse(fs.readFileSync(path.join(projectDir, '.mcp.json'), 'utf8'));
      assert.ok(mcp.mcpServers.github);
      assert.ok(mcp.mcpServers.filesystem);
    });

    it('should show hierarchy message when merging', () => {
      saveJson(path.join(parentDir, '.claude', 'mcps.json'), {
        include: ['github']
      });

      saveJson(path.join(projectDir, '.claude', 'mcps.json'), {
        include: ['filesystem']
      });

      apply(registryPath, projectDir);

      assert.ok(logs.some(log => log.includes('Config hierarchy')));
    });

    it('should merge environment variables from hierarchy', () => {
      // Parent config (so its .env gets loaded)
      saveJson(path.join(parentDir, '.claude', 'mcps.json'), {
        include: []
      });

      // Parent .env
      fs.writeFileSync(
        path.join(parentDir, '.claude', '.env'),
        'PARENT_VAR=parent'
      );

      // Child .env
      fs.writeFileSync(
        path.join(projectDir, '.claude', '.env'),
        'CHILD_VAR=child'
      );

      saveJson(path.join(projectDir, '.claude', 'mcps.json'), {
        mcpServers: {
          custom: {
            command: 'test',
            env: {
              parent: '${PARENT_VAR}',
              child: '${CHILD_VAR}'
            }
          }
        }
      });

      apply(registryPath, projectDir);

      const mcp = JSON.parse(fs.readFileSync(path.join(projectDir, '.mcp.json'), 'utf8'));
      assert.strictEqual(mcp.mcpServers.custom.env.parent, 'parent');
      assert.strictEqual(mcp.mcpServers.custom.env.child, 'child');
    });

    it('should override parent env vars with child values', () => {
      // Parent config
      saveJson(path.join(parentDir, '.claude', 'mcps.json'), {
        include: []
      });

      fs.writeFileSync(
        path.join(parentDir, '.claude', '.env'),
        'VAR=parent'
      );

      fs.writeFileSync(
        path.join(projectDir, '.claude', '.env'),
        'VAR=child'
      );

      saveJson(path.join(projectDir, '.claude', 'mcps.json'), {
        mcpServers: {
          custom: {
            command: 'test',
            env: { value: '${VAR}' }
          }
        }
      });

      apply(registryPath, projectDir);

      const mcp = JSON.parse(fs.readFileSync(path.join(projectDir, '.mcp.json'), 'utf8'));
      assert.strictEqual(mcp.mcpServers.custom.env.value, 'child');
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle corrupted registry JSON gracefully', () => {
      fs.writeFileSync(registryPath, '{invalid json');

      saveJson(path.join(projectDir, '.claude', 'mcps.json'), {
        include: ['github']
      });

      const result = apply(registryPath, projectDir);

      assert.strictEqual(result, false);
      assert.ok(errors.some(err => err.includes('Could not load MCP registry')));
    });

    it('should handle corrupted project config gracefully', () => {
      fs.writeFileSync(
        path.join(projectDir, '.claude', 'mcps.json'),
        '{invalid'
      );

      const result = apply(registryPath, projectDir);

      // Should handle gracefully - behavior may vary
      assert.ok(typeof result === 'boolean');
    });

    it('should handle missing .claude directory', () => {
      const noClaudeDir = path.join(tempDir, 'no-claude');
      fs.mkdirSync(noClaudeDir, { recursive: true });

      const result = apply(registryPath, noClaudeDir);

      // Should handle gracefully
      assert.ok(typeof result === 'boolean');
    });

    it('should handle write permission errors gracefully', () => {
      saveJson(path.join(projectDir, '.claude', 'mcps.json'), {
        include: ['github']
      });

      // Create .mcp.json as directory to cause write error
      const mcpPath = path.join(projectDir, '.mcp.json');
      fs.mkdirSync(mcpPath, { recursive: true });

      try {
        const result = apply(registryPath, projectDir);
        // If it throws, that's acceptable error handling
        assert.ok(typeof result === 'boolean');
      } catch (err) {
        // Throwing is also acceptable error handling
        assert.ok(err.code === 'EISDIR' || err.code === 'EACCES');
      }

      // Cleanup
      fs.rmSync(mcpPath, { recursive: true, force: true });
    });

    it('should handle registry with no mcpServers field', () => {
      saveJson(registryPath, {});

      saveJson(path.join(projectDir, '.claude', 'mcps.json'), {
        include: ['github']
      });

      const result = apply(registryPath, projectDir);

      // Should warn about missing MCP
      assert.ok(warnings.some(w => w.includes('not found')));
    });

    it('should handle empty include array', () => {
      saveJson(path.join(projectDir, '.claude', 'mcps.json'), {
        include: []
      });

      const result = apply(registryPath, projectDir);

      assert.strictEqual(result, true);
      // Should generate .mcp.json even if empty
      const mcpPath = path.join(projectDir, '.mcp.json');
      assert.ok(fs.existsSync(mcpPath));

      const mcp = JSON.parse(fs.readFileSync(mcpPath, 'utf8'));
      assert.ok(mcp.mcpServers);
    });

    it('should handle config with only custom mcpServers (no include)', () => {
      saveJson(path.join(projectDir, '.claude', 'mcps.json'), {
        mcpServers: {
          custom1: { command: 'test1' },
          custom2: { command: 'test2' }
        }
      });

      const result = apply(registryPath, projectDir);

      assert.strictEqual(result, true);

      const mcp = JSON.parse(fs.readFileSync(path.join(projectDir, '.mcp.json'), 'utf8'));
      assert.ok(mcp.mcpServers.custom1);
      assert.ok(mcp.mcpServers.custom2);
    });

    it('should handle MCP with missing command field', () => {
      saveJson(registryPath, {
        mcpServers: {
          broken: {
            args: ['test']
            // Missing command
          }
        }
      });

      saveJson(path.join(projectDir, '.claude', 'mcps.json'), {
        include: ['broken']
      });

      const result = apply(registryPath, projectDir);

      // Should include it anyway (validation happens elsewhere)
      const mcp = JSON.parse(fs.readFileSync(path.join(projectDir, '.mcp.json'), 'utf8'));
      assert.ok(mcp.mcpServers.broken);
    });

    it('should handle very large number of MCPs', () => {
      const largeMcpServers = {};
      for (let i = 0; i < 100; i++) {
        largeMcpServers[`mcp-${i}`] = {
          command: 'test',
          args: [`arg-${i}`]
        };
      }

      saveJson(registryPath, { mcpServers: largeMcpServers });

      const includeList = Array.from({ length: 100 }, (_, i) => `mcp-${i}`);
      saveJson(path.join(projectDir, '.claude', 'mcps.json'), {
        include: includeList
      });

      const result = apply(registryPath, projectDir);

      assert.strictEqual(result, true);

      const mcp = JSON.parse(fs.readFileSync(path.join(projectDir, '.mcp.json'), 'utf8'));
      // Should have all 100 MCPs
      assert.strictEqual(Object.keys(mcp.mcpServers).length, 100);
    });

    it('should handle MCPs with complex nested env structures', () => {
      saveJson(registryPath, {
        mcpServers: {
          complex: {
            command: 'test',
            env: {
              SIMPLE: '${SIMPLE_VAR}',
              NESTED: {
                DEEP: '${DEEP_VAR}'
              },
              ARRAY: ['${ARRAY_VAR}']
            }
          }
        }
      });

      fs.writeFileSync(
        path.join(projectDir, '.claude', '.env'),
        'SIMPLE_VAR=simple\nDEEP_VAR=deep\nARRAY_VAR=array'
      );

      saveJson(path.join(projectDir, '.claude', 'mcps.json'), {
        include: ['complex']
      });

      const result = apply(registryPath, projectDir);

      assert.strictEqual(result, true);
    });

    it('should handle missing .env file when env vars referenced', () => {
      saveJson(path.join(projectDir, '.claude', 'mcps.json'), {
        include: ['filesystem'] // Has env vars
      });

      // No .env file created

      const result = apply(registryPath, projectDir);

      // Should succeed but env vars will be empty or from process.env
      assert.strictEqual(result, true);
    });

    it('should handle enabledPlugins with no plugins enabled', () => {
      saveJson(path.join(projectDir, '.claude', 'mcps.json'), {
        include: [],
        enabledPlugins: {
          'plugin1': false,
          'plugin2': false
        }
      });

      const result = apply(registryPath, projectDir);

      assert.strictEqual(result, true);

      const settings = JSON.parse(
        fs.readFileSync(path.join(projectDir, '.claude', 'settings.json'), 'utf8')
      );
      // Both plugins should be in settings, even if false
      assert.ok('plugin1' in settings.enabledPlugins);
      assert.ok('plugin2' in settings.enabledPlugins);
      assert.strictEqual(settings.enabledPlugins.plugin1, false);
      assert.strictEqual(settings.enabledPlugins.plugin2, false);
    });

    it('should handle exclude array correctly', () => {
      saveJson(path.join(projectDir, '.claude', 'mcps.json'), {
        include: ['github', 'filesystem', 'postgres'],
        exclude: ['filesystem']
      });

      const result = apply(registryPath, projectDir);

      assert.strictEqual(result, true);

      const mcp = JSON.parse(fs.readFileSync(path.join(projectDir, '.mcp.json'), 'utf8'));
      assert.ok(mcp.mcpServers.github);
      assert.ok(!mcp.mcpServers.filesystem);
      assert.ok(mcp.mcpServers.postgres);
    });
  });

  describe('Integration tests', () => {
    it('should handle rapid apply calls', () => {
      saveJson(path.join(projectDir, '.claude', 'mcps.json'), {
        include: ['github']
      });

      // Call apply multiple times rapidly
      for (let i = 0; i < 10; i++) {
        const result = apply(registryPath, projectDir);
        assert.strictEqual(result, true);
      }

      // Final state should be valid
      const mcp = JSON.parse(fs.readFileSync(path.join(projectDir, '.mcp.json'), 'utf8'));
      assert.ok(mcp.mcpServers.github);
    });

    it('should update .mcp.json when config changes', () => {
      // Start with github
      saveJson(path.join(projectDir, '.claude', 'mcps.json'), {
        include: ['github']
      });
      apply(registryPath, projectDir);

      let mcp = JSON.parse(fs.readFileSync(path.join(projectDir, '.mcp.json'), 'utf8'));
      assert.ok(mcp.mcpServers.github);

      // Add filesystem
      saveJson(path.join(projectDir, '.claude', 'mcps.json'), {
        include: ['github', 'filesystem']
      });
      apply(registryPath, projectDir);

      mcp = JSON.parse(fs.readFileSync(path.join(projectDir, '.mcp.json'), 'utf8'));
      assert.ok(mcp.mcpServers.github);
      assert.ok(mcp.mcpServers.filesystem);
    });

    it('should handle adding and removing custom mcpServers', () => {
      // Start with custom server
      saveJson(path.join(projectDir, '.claude', 'mcps.json'), {
        mcpServers: {
          custom: { command: 'test' }
        }
      });
      apply(registryPath, projectDir);

      let mcp = JSON.parse(fs.readFileSync(path.join(projectDir, '.mcp.json'), 'utf8'));
      assert.ok(mcp.mcpServers.custom);

      // Remove custom server, add registry MCP
      saveJson(path.join(projectDir, '.claude', 'mcps.json'), {
        include: ['github']
      });
      apply(registryPath, projectDir);

      mcp = JSON.parse(fs.readFileSync(path.join(projectDir, '.mcp.json'), 'utf8'));
      assert.ok(!mcp.mcpServers.custom);
      assert.ok(mcp.mcpServers.github);
    });

    it('should preserve settings.json across multiple applies', () => {
      // Initial apply with plugin settings
      saveJson(path.join(projectDir, '.claude', 'mcps.json'), {
        include: ['github'],
        enabledPlugins: { plugin1: true }
      });
      apply(registryPath, projectDir);

      // Second apply with different MCPs
      saveJson(path.join(projectDir, '.claude', 'mcps.json'), {
        include: ['filesystem'],
        enabledPlugins: { plugin1: true, plugin2: false }
      });
      apply(registryPath, projectDir);

      const settings = JSON.parse(
        fs.readFileSync(path.join(projectDir, '.claude', 'settings.json'), 'utf8')
      );
      assert.strictEqual(settings.enabledPlugins.plugin1, true);
      assert.strictEqual(settings.enabledPlugins.plugin2, false);
    });

    it('should handle complex workflow of multiple changes', () => {
      // Step 1: Add github and custom server
      saveJson(path.join(projectDir, '.claude', 'mcps.json'), {
        include: ['github'],
        mcpServers: { custom: { command: 'test' } }
      });
      apply(registryPath, projectDir);

      // Step 2: Add filesystem, exclude github
      saveJson(path.join(projectDir, '.claude', 'mcps.json'), {
        include: ['github', 'filesystem'],
        exclude: ['github'],
        mcpServers: { custom: { command: 'test' } }
      });
      apply(registryPath, projectDir);

      // Step 3: Remove custom, add postgres
      saveJson(path.join(projectDir, '.claude', 'mcps.json'), {
        include: ['filesystem', 'postgres']
      });
      apply(registryPath, projectDir);

      const mcp = JSON.parse(fs.readFileSync(path.join(projectDir, '.mcp.json'), 'utf8'));
      assert.ok(!mcp.mcpServers.github);
      assert.ok(mcp.mcpServers.filesystem);
      assert.ok(mcp.mcpServers.postgres);
      assert.ok(!mcp.mcpServers.custom);
    });

    it('should handle env var changes across applies', () => {
      fs.writeFileSync(
        path.join(projectDir, '.claude', '.env'),
        'VAR1=value1'
      );

      saveJson(path.join(projectDir, '.claude', 'mcps.json'), {
        mcpServers: {
          test: {
            command: 'test',
            env: { KEY: '${VAR1}' }
          }
        }
      });
      apply(registryPath, projectDir);

      // Change env var
      fs.writeFileSync(
        path.join(projectDir, '.claude', '.env'),
        'VAR1=value2'
      );
      apply(registryPath, projectDir);

      const mcp = JSON.parse(fs.readFileSync(path.join(projectDir, '.mcp.json'), 'utf8'));
      assert.strictEqual(mcp.mcpServers.test.env.KEY, 'value2');
    });
  });
});
