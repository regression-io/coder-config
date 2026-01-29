const { describe, it } = require('node:test');
const assert = require('node:assert');

const { VERSION, TOOL_PATHS } = require('../lib/constants.js');

describe('constants', () => {
  describe('VERSION', () => {
    it('should be a valid semver string', () => {
      assert.ok(typeof VERSION === 'string');
      assert.ok(/^\d+\.\d+\.\d+$/.test(VERSION));
    });

    it('should match package.json version', () => {
      const packageJson = require('../package.json');
      assert.strictEqual(VERSION, packageJson.version);
    });
  });

  describe('TOOL_PATHS', () => {
    it('should export TOOL_PATHS object', () => {
      assert.ok(typeof TOOL_PATHS === 'object');
      assert.ok(TOOL_PATHS !== null);
    });

    it('should include claude configuration', () => {
      assert.ok(TOOL_PATHS.claude);
      assert.strictEqual(TOOL_PATHS.claude.name, 'Claude Code');
      assert.strictEqual(TOOL_PATHS.claude.globalConfig, '~/.claude/mcps.json');
      assert.strictEqual(TOOL_PATHS.claude.outputFile, '.mcp.json');
    });

    it('should include gemini configuration', () => {
      assert.ok(TOOL_PATHS.gemini);
      assert.strictEqual(TOOL_PATHS.gemini.name, 'Gemini CLI');
      assert.strictEqual(TOOL_PATHS.gemini.projectFolder, '.gemini');
    });

    it('should include antigravity configuration', () => {
      assert.ok(TOOL_PATHS.antigravity);
      assert.strictEqual(TOOL_PATHS.antigravity.name, 'Antigravity');
      assert.strictEqual(TOOL_PATHS.antigravity.supportsEnvInterpolation, false);
    });

    it('should include codex configuration', () => {
      assert.ok(TOOL_PATHS.codex);
      assert.strictEqual(TOOL_PATHS.codex.name, 'Codex CLI');
      assert.strictEqual(TOOL_PATHS.codex.projectFolder, '.codex');
    });

    it('should have consistent structure across tools', () => {
      const tools = ['claude', 'gemini', 'antigravity', 'codex'];

      for (const tool of tools) {
        assert.ok(TOOL_PATHS[tool].name);
        assert.ok(TOOL_PATHS[tool].icon);
        assert.ok(TOOL_PATHS[tool].color);
        assert.ok(TOOL_PATHS[tool].projectFolder);
        assert.ok(typeof TOOL_PATHS[tool].supportsEnvInterpolation === 'boolean');
      }
    });

    it('should have valid color values', () => {
      const validColors = ['orange', 'blue', 'purple', 'green', 'red', 'yellow'];

      for (const tool of Object.values(TOOL_PATHS)) {
        assert.ok(validColors.includes(tool.color), `Invalid color: ${tool.color}`);
      }
    });

    it('should have valid icon values', () => {
      const validIcons = ['sparkles', 'terminal', 'rocket', 'code'];

      for (const tool of Object.values(TOOL_PATHS)) {
        assert.ok(validIcons.includes(tool.icon), `Invalid icon: ${tool.icon}`);
      }
    });
  });
});
