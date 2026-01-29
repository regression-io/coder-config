const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  findAllConfigs,
  getConfigPath,
  collectFilesFromHierarchy,
  mergeConfigs,
} = require('../lib/config.js');
const { saveJson } = require('../lib/utils.js');

describe('config', () => {
  let tempDir;
  let originalCwd;
  let originalHome;

  before(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'config-test-'));
    originalCwd = process.cwd();
    originalHome = process.env.HOME;
  });

  after(() => {
    process.chdir(originalCwd);
    process.env.HOME = originalHome;
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('findAllConfigs', () => {
    let projectRoot;
    let subProject;
    let deepSubProject;

    beforeEach(() => {
      // Create nested project structure
      projectRoot = path.join(tempDir, 'project-root');
      subProject = path.join(projectRoot, 'packages', 'sub');
      deepSubProject = path.join(subProject, 'modules', 'deep');

      fs.mkdirSync(path.join(projectRoot, '.claude'), { recursive: true });
      fs.mkdirSync(path.join(subProject, '.claude'), { recursive: true });
      fs.mkdirSync(deepSubProject, { recursive: true });

      // Create config files
      saveJson(path.join(projectRoot, '.claude', 'mcps.json'), {
        include: ['github']
      });
      saveJson(path.join(subProject, '.claude', 'mcps.json'), {
        include: ['filesystem']
      });
    });

    it('should find all configs in hierarchy', () => {
      const configs = findAllConfigs(deepSubProject);

      assert.ok(configs.length >= 2);
      assert.ok(configs.some(c => c.dir === projectRoot));
      assert.ok(configs.some(c => c.dir === subProject));
    });

    it('should return configs from root to leaf order', () => {
      const configs = findAllConfigs(deepSubProject);

      const rootIdx = configs.findIndex(c => c.dir === projectRoot);
      const subIdx = configs.findIndex(c => c.dir === subProject);

      assert.ok(rootIdx < subIdx, 'Root config should come before sub config');
    });

    it('should include home config if it exists', () => {
      const fakeHome = path.join(tempDir, 'fake-home');
      fs.mkdirSync(path.join(fakeHome, '.claude'), { recursive: true });
      saveJson(path.join(fakeHome, '.claude', 'mcps.json'), {
        include: ['home-mcp']
      });

      process.env.HOME = fakeHome;

      const configs = findAllConfigs(deepSubProject);

      process.env.HOME = originalHome;

      assert.ok(configs.some(c => c.dir === fakeHome));
    });

    it('should not duplicate home config', () => {
      const fakeHome = path.join(tempDir, 'fake-home2');
      fs.mkdirSync(path.join(fakeHome, '.claude'), { recursive: true });
      saveJson(path.join(fakeHome, '.claude', 'mcps.json'), {
        include: ['home-mcp']
      });

      process.env.HOME = fakeHome;

      // Start search from home directory itself
      const configs = findAllConfigs(fakeHome);

      process.env.HOME = originalHome;

      const homeConfigs = configs.filter(c => c.dir === fakeHome);
      assert.strictEqual(homeConfigs.length, 1, 'Home config should appear only once');
    });

    it('should handle directories with no configs', () => {
      const emptyDir = path.join(tempDir, 'empty-dir');
      fs.mkdirSync(emptyDir, { recursive: true });

      const configs = findAllConfigs(emptyDir);

      // Should still find home config if it exists
      assert.ok(Array.isArray(configs));
    });
  });

  describe('getConfigPath', () => {
    it('should return config path for project directory', () => {
      const projectDir = path.join(tempDir, 'test-project');
      fs.mkdirSync(path.join(projectDir, '.claude'), { recursive: true });

      const configPath = getConfigPath(tempDir, projectDir);

      assert.strictEqual(
        configPath,
        path.join(projectDir, '.claude', 'mcps.json')
      );
    });

    it('should use cwd when no project directory provided', () => {
      const testDir = path.join(tempDir, 'cwd-test');
      fs.mkdirSync(testDir, { recursive: true });

      process.chdir(testDir);
      const configPath = getConfigPath(tempDir);
      process.chdir(originalCwd);

      assert.ok(configPath.includes(testDir));
      assert.ok(configPath.endsWith('.claude/mcps.json'));
    });
  });

  describe('collectFilesFromHierarchy', () => {
    let projectRoot;
    let subProject;

    beforeEach(() => {
      projectRoot = path.join(tempDir, 'collect-root');
      subProject = path.join(projectRoot, 'sub');

      const rootRulesDir = path.join(projectRoot, '.claude', 'rules');
      const subRulesDir = path.join(subProject, '.claude', 'rules');

      fs.mkdirSync(rootRulesDir, { recursive: true });
      fs.mkdirSync(subRulesDir, { recursive: true });

      // Create rule files
      fs.writeFileSync(path.join(rootRulesDir, 'rule1.md'), '# Rule 1');
      fs.writeFileSync(path.join(rootRulesDir, 'rule2.md'), '# Rule 2');
      fs.writeFileSync(path.join(subRulesDir, 'rule3.md'), '# Rule 3');
      fs.writeFileSync(path.join(subRulesDir, 'rule1.md'), '# Rule 1 Override');
    });

    it('should collect all rule files from hierarchy', () => {
      const configLocations = [
        { dir: projectRoot },
        { dir: subProject }
      ];

      const files = collectFilesFromHierarchy(configLocations, 'rules');

      assert.ok(files.length >= 3);
      assert.ok(files.some(f => f.file === 'rule1.md'));
      assert.ok(files.some(f => f.file === 'rule2.md'));
      assert.ok(files.some(f => f.file === 'rule3.md'));
    });

    it('should use child file when same name exists in parent', () => {
      const configLocations = [
        { dir: projectRoot },
        { dir: subProject }
      ];

      const files = collectFilesFromHierarchy(configLocations, 'rules');
      const rule1 = files.find(f => f.file === 'rule1.md');

      // Child version should override parent
      assert.strictEqual(rule1.source, subProject);
    });

    it('should include full path for each file', () => {
      const configLocations = [{ dir: projectRoot }];

      const files = collectFilesFromHierarchy(configLocations, 'rules');

      assert.ok(files.every(f => f.fullPath));
      assert.ok(files.every(f => fs.existsSync(f.fullPath)));
    });

    it('should handle non-existent subdirectories', () => {
      const configLocations = [
        { dir: path.join(tempDir, 'nonexistent') }
      ];

      const files = collectFilesFromHierarchy(configLocations, 'rules');

      assert.strictEqual(files.length, 0);
    });

    it('should only collect .md files', () => {
      const testDir = path.join(tempDir, 'md-test');
      const rulesDir = path.join(testDir, '.claude', 'rules');
      fs.mkdirSync(rulesDir, { recursive: true });

      fs.writeFileSync(path.join(rulesDir, 'rule.md'), '# Rule');
      fs.writeFileSync(path.join(rulesDir, 'not-rule.txt'), 'Text');
      fs.writeFileSync(path.join(rulesDir, 'also-not.js'), '// JS');

      const configLocations = [{ dir: testDir }];
      const files = collectFilesFromHierarchy(configLocations, 'rules');

      assert.strictEqual(files.length, 1);
      assert.strictEqual(files[0].file, 'rule.md');
    });

    it('should work with commands subdirectory', () => {
      const testDir = path.join(tempDir, 'commands-test');
      const commandsDir = path.join(testDir, '.claude', 'commands');
      fs.mkdirSync(commandsDir, { recursive: true });

      fs.writeFileSync(path.join(commandsDir, 'cmd1.md'), '# Command 1');
      fs.writeFileSync(path.join(commandsDir, 'cmd2.md'), '# Command 2');

      const configLocations = [{ dir: testDir }];
      const files = collectFilesFromHierarchy(configLocations, 'commands');

      assert.strictEqual(files.length, 2);
    });
  });

  describe('mergeConfigs - exclude functionality', () => {
    it('should handle exclude array', () => {
      const configs = [
        { config: { include: ['github', 'filesystem', 'postgres'] } },
        { config: { exclude: ['github'] } }
      ];

      const result = mergeConfigs(configs);

      assert.ok(!result.include.includes('github'));
      assert.ok(result.include.includes('filesystem'));
      assert.ok(result.include.includes('postgres'));
    });

    it('should exclude from final include list', () => {
      const configs = [
        { config: { include: ['github', 'filesystem'] } },
        { config: { include: ['postgres'], exclude: ['github'] } }
      ];

      const result = mergeConfigs(configs);

      assert.deepStrictEqual(
        result.include.sort(),
        ['filesystem', 'postgres'].sort()
      );
    });

    it('should collect all excludes', () => {
      const configs = [
        { config: { exclude: ['github'] } },
        { config: { exclude: ['filesystem'] } }
      ];

      const result = mergeConfigs(configs);

      assert.ok(result.exclude.includes('github'));
      assert.ok(result.exclude.includes('filesystem'));
    });

    it('should not duplicate excludes', () => {
      const configs = [
        { config: { exclude: ['github'] } },
        { config: { exclude: ['github'] } }
      ];

      const result = mergeConfigs(configs);

      assert.strictEqual(
        result.exclude.filter(x => x === 'github').length,
        1
      );
    });
  });

  describe('mergeConfigs - enabledPlugins', () => {
    it('should merge enabledPlugins', () => {
      const configs = [
        { config: { enabledPlugins: { plugin1: true } } },
        { config: { enabledPlugins: { plugin2: true } } }
      ];

      const result = mergeConfigs(configs);

      assert.strictEqual(result.enabledPlugins.plugin1, true);
      assert.strictEqual(result.enabledPlugins.plugin2, true);
    });

    it('should allow child to override parent plugin settings', () => {
      const configs = [
        { config: { enabledPlugins: { plugin1: true } } },
        { config: { enabledPlugins: { plugin1: false } } }
      ];

      const result = mergeConfigs(configs);

      assert.strictEqual(result.enabledPlugins.plugin1, false);
    });

    it('should handle explicit false to disable parent-enabled plugin', () => {
      const configs = [
        { config: { enabledPlugins: { plugin1: true, plugin2: true } } },
        { config: { enabledPlugins: { plugin1: false } } }
      ];

      const result = mergeConfigs(configs);

      assert.strictEqual(result.enabledPlugins.plugin1, false);
      assert.strictEqual(result.enabledPlugins.plugin2, true);
    });
  });

  describe('mergeConfigs - complex integration', () => {
    it('should merge mcpServers from multiple levels', () => {
      const configs = [
        {
          config: {
            mcpServers: {
              github: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-github'] }
            }
          }
        },
        {
          config: {
            mcpServers: {
              filesystem: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem'] }
            }
          }
        }
      ];

      const result = mergeConfigs(configs);

      assert.ok(result.mcpServers.github);
      assert.ok(result.mcpServers.filesystem);
      assert.strictEqual(result.mcpServers.github.command, 'npx');
      assert.strictEqual(result.mcpServers.filesystem.command, 'npx');
    });

    it('should allow child to override parent mcpServer config', () => {
      const configs = [
        {
          config: {
            mcpServers: {
              github: {
                command: 'npx',
                args: ['-y', '@modelcontextprotocol/server-github'],
                env: { GITHUB_TOKEN: 'parent-token' }
              }
            }
          }
        },
        {
          config: {
            mcpServers: {
              github: {
                command: 'npx',
                args: ['-y', '@modelcontextprotocol/server-github'],
                env: { GITHUB_TOKEN: 'child-token' }
              }
            }
          }
        }
      ];

      const result = mergeConfigs(configs);

      assert.strictEqual(result.mcpServers.github.env.GITHUB_TOKEN, 'child-token');
    });

    it('should merge include arrays without duplicates', () => {
      const configs = [
        { config: { include: ['github', 'filesystem'] } },
        { config: { include: ['filesystem', 'postgres'] } },
        { config: { include: ['github', 'memory'] } }
      ];

      const result = mergeConfigs(configs);

      assert.strictEqual(result.include.length, 4);
      assert.ok(result.include.includes('github'));
      assert.ok(result.include.includes('filesystem'));
      assert.ok(result.include.includes('postgres'));
      assert.ok(result.include.includes('memory'));
    });

    it('should handle empty config objects', () => {
      const configs = [
        { config: {} },
        { config: { include: ['github'] } },
        { config: {} }
      ];

      const result = mergeConfigs(configs);

      assert.ok(Array.isArray(result.include));
      assert.ok(result.include.includes('github'));
    });

    it('should handle configs with null/undefined values', () => {
      const configs = [
        { config: { include: ['github'] } },
        { config: { include: null } },
        { config: { include: ['filesystem'] } }
      ];

      const result = mergeConfigs(configs);

      assert.ok(Array.isArray(result.include));
      // Should have both github and filesystem despite null in middle
      assert.ok(result.include.length >= 1);
    });

    it('should properly handle exclude with mcpServers', () => {
      const configs = [
        {
          config: {
            include: ['github', 'filesystem'],
            mcpServers: {
              github: { command: 'npx', args: [] },
              filesystem: { command: 'npx', args: [] }
            }
          }
        },
        {
          config: {
            exclude: ['github']
          }
        }
      ];

      const result = mergeConfigs(configs);

      assert.ok(!result.include.includes('github'));
      assert.ok(result.include.includes('filesystem'));
      // mcpServers should still have both (exclude only affects include)
      assert.ok(result.mcpServers.github);
      assert.ok(result.mcpServers.filesystem);
    });

    it('should shallow merge mcpServers (child completely replaces server config)', () => {
      const configs = [
        {
          config: {
            mcpServers: {
              custom: {
                command: 'node',
                args: ['index.js'],
                env: {
                  VAR1: 'value1',
                  VAR2: 'value2'
                }
              }
            }
          }
        },
        {
          config: {
            mcpServers: {
              custom: {
                command: 'node',
                args: ['index.js', '--prod'],
                env: {
                  VAR2: 'override2',
                  VAR3: 'value3'
                }
              }
            }
          }
        }
      ];

      const result = mergeConfigs(configs);

      // Object.assign at mcpServers level means child completely replaces parent
      // Child provided full server config so we get child's values
      assert.strictEqual(result.mcpServers.custom.command, 'node');
      assert.deepStrictEqual(result.mcpServers.custom.args, ['index.js', '--prod']);
      assert.strictEqual(result.mcpServers.custom.env.VAR1, undefined);
      assert.strictEqual(result.mcpServers.custom.env.VAR2, 'override2');
      assert.strictEqual(result.mcpServers.custom.env.VAR3, 'value3');
    });
  });
});
