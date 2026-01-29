const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { envSet, envUnset } = require('../lib/env.js');

describe('env', () => {
  let tempDir;
  let projectDir;
  let originalLog;
  let originalError;
  let logs;
  let errors;

  before(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'env-test-'));
    originalLog = console.log;
    originalError = console.error;
  });

  after(() => {
    console.log = originalLog;
    console.error = originalError;
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    projectDir = path.join(tempDir, `project-${Date.now()}-${Math.random()}`);
    fs.mkdirSync(projectDir, { recursive: true });

    logs = [];
    errors = [];
    console.log = (...args) => logs.push(args.join(' '));
    console.error = (...args) => errors.push(args.join(' '));
  });

  describe('envSet', () => {
    it('should create .env file with variable', () => {
      envSet('API_KEY', 'secret123', projectDir);

      const envPath = path.join(projectDir, '.claude', '.env');
      assert.ok(fs.existsSync(envPath));

      const content = fs.readFileSync(envPath, 'utf8');
      assert.ok(content.includes('API_KEY=secret123'));
    });

    it('should convert key to uppercase', () => {
      envSet('api_key', 'secret', projectDir);

      const envPath = path.join(projectDir, '.claude', '.env');
      const content = fs.readFileSync(envPath, 'utf8');

      assert.ok(content.includes('API_KEY=secret'));
      assert.ok(!content.includes('api_key='));
    });

    it('should update existing variable', () => {
      envSet('TOKEN', 'old_value', projectDir);
      envSet('TOKEN', 'new_value', projectDir);

      const envPath = path.join(projectDir, '.claude', '.env');
      const content = fs.readFileSync(envPath, 'utf8');

      assert.ok(content.includes('TOKEN=new_value'));
      assert.ok(!content.includes('old_value'));

      // Should only appear once
      const matches = content.match(/TOKEN=/g);
      assert.strictEqual(matches.length, 1);
    });

    it('should preserve other variables when updating', () => {
      envSet('VAR1', 'value1', projectDir);
      envSet('VAR2', 'value2', projectDir);
      envSet('VAR1', 'updated', projectDir);

      const envPath = path.join(projectDir, '.claude', '.env');
      const content = fs.readFileSync(envPath, 'utf8');

      assert.ok(content.includes('VAR1=updated'));
      assert.ok(content.includes('VAR2=value2'));
    });

    it('should create .claude directory if it does not exist', () => {
      const newProjectDir = path.join(tempDir, 'new-env-project');
      fs.mkdirSync(newProjectDir, { recursive: true });

      envSet('KEY', 'value', newProjectDir);

      const claudeDir = path.join(newProjectDir, '.claude');
      assert.ok(fs.existsSync(claudeDir));
    });

    it('should handle values with special characters', () => {
      envSet('URL', 'postgres://user:pass@host:5432/db', projectDir);

      const envPath = path.join(projectDir, '.claude', '.env');
      const content = fs.readFileSync(envPath, 'utf8');

      assert.ok(content.includes('postgres://user:pass@host:5432/db'));
    });

    it('should handle empty values', () => {
      envSet('EMPTY', '', projectDir);

      const envPath = path.join(projectDir, '.claude', '.env');
      const content = fs.readFileSync(envPath, 'utf8');

      assert.ok(content.includes('EMPTY='));
    });

    it('should handle values with spaces', () => {
      envSet('MESSAGE', 'hello world', projectDir);

      const envPath = path.join(projectDir, '.claude', '.env');
      const content = fs.readFileSync(envPath, 'utf8');

      assert.ok(content.includes('MESSAGE=hello world'));
    });

    it('should end file with newline', () => {
      envSet('VAR', 'value', projectDir);

      const envPath = path.join(projectDir, '.claude', '.env');
      const content = fs.readFileSync(envPath, 'utf8');

      assert.ok(content.endsWith('\n'));
    });

    it('should show success message', () => {
      envSet('KEY', 'value', projectDir);

      assert.ok(logs.some(log => log.includes('✓ Set KEY')));
    });

    it('should show error when key not provided', () => {
      envSet(null, 'value', projectDir);

      assert.ok(errors.some(err => err.includes('Usage:')));
    });

    it('should show error when value not provided', () => {
      envSet('KEY', undefined, projectDir);

      assert.ok(errors.some(err => err.includes('Usage:')));
    });
  });

  describe('envUnset', () => {
    beforeEach(() => {
      // Create .env file with some variables
      envSet('VAR1', 'value1', projectDir);
      envSet('VAR2', 'value2', projectDir);
      envSet('VAR3', 'value3', projectDir);
      logs = []; // Clear logs from setup
    });

    it('should remove variable from .env file', () => {
      envUnset('VAR2', projectDir);

      const envPath = path.join(projectDir, '.claude', '.env');
      const content = fs.readFileSync(envPath, 'utf8');

      assert.ok(!content.includes('VAR2='));
      assert.ok(content.includes('VAR1='));
      assert.ok(content.includes('VAR3='));
    });

    it('should convert key to uppercase when removing', () => {
      envUnset('var1', projectDir);

      const envPath = path.join(projectDir, '.claude', '.env');
      const content = fs.readFileSync(envPath, 'utf8');

      assert.ok(!content.includes('VAR1='));
    });

    it('should preserve other variables', () => {
      envUnset('VAR1', projectDir);

      const envPath = path.join(projectDir, '.claude', '.env');
      const content = fs.readFileSync(envPath, 'utf8');

      assert.ok(content.includes('VAR2=value2'));
      assert.ok(content.includes('VAR3=value3'));
    });

    it('should handle removing last variable', () => {
      envUnset('VAR1', projectDir);
      envUnset('VAR2', projectDir);
      envUnset('VAR3', projectDir);

      const envPath = path.join(projectDir, '.claude', '.env');
      const content = fs.readFileSync(envPath, 'utf8');

      // File should exist but be empty (or just newline)
      assert.ok(fs.existsSync(envPath));
      assert.ok(content.trim().length === 0);
    });

    it('should show message when variable not found', () => {
      envUnset('NONEXISTENT', projectDir);

      assert.ok(logs.some(log => log.includes('not found')));
    });

    it('should show message when .env file does not exist', () => {
      const newProjectDir = path.join(tempDir, 'no-env-project');
      fs.mkdirSync(newProjectDir, { recursive: true });

      envUnset('KEY', newProjectDir);

      assert.ok(logs.some(log => log.includes('No .env file found')));
    });

    it('should show success message when variable removed', () => {
      envUnset('VAR1', projectDir);

      assert.ok(logs.some(log => log.includes('✓ Removed VAR1')));
    });

    it('should show error when key not provided', () => {
      envUnset(null, projectDir);

      assert.ok(errors.some(err => err.includes('Usage:')));
    });

    it('should end file with newline after removal', () => {
      envUnset('VAR2', projectDir);

      const envPath = path.join(projectDir, '.claude', '.env');
      const content = fs.readFileSync(envPath, 'utf8');

      assert.ok(content.endsWith('\n'));
    });
  });

  describe('envSet and envUnset integration', () => {
    it('should handle multiple set and unset operations', () => {
      envSet('A', '1', projectDir);
      envSet('B', '2', projectDir);
      envSet('C', '3', projectDir);
      envUnset('B', projectDir);
      envSet('D', '4', projectDir);
      envUnset('A', projectDir);

      const envPath = path.join(projectDir, '.claude', '.env');
      const content = fs.readFileSync(envPath, 'utf8');

      assert.ok(!content.includes('A='));
      assert.ok(!content.includes('B='));
      assert.ok(content.includes('C=3'));
      assert.ok(content.includes('D=4'));
    });

    it('should handle set after unset for same key', () => {
      envSet('KEY', 'original', projectDir);
      envUnset('KEY', projectDir);
      envSet('KEY', 'new', projectDir);

      const envPath = path.join(projectDir, '.claude', '.env');
      const content = fs.readFileSync(envPath, 'utf8');

      assert.ok(content.includes('KEY=new'));

      // Should only appear once
      const matches = content.match(/KEY=/g);
      assert.strictEqual(matches.length, 1);
    });

    it('should handle complex workflow with many variables', () => {
      // Set initial variables
      for (let i = 1; i <= 20; i++) {
        envSet(`VAR${i}`, `value${i}`, projectDir);
      }

      // Remove every other variable
      for (let i = 2; i <= 20; i += 2) {
        envUnset(`VAR${i}`, projectDir);
      }

      // Update some remaining variables
      for (let i = 1; i <= 20; i += 4) {
        envSet(`VAR${i}`, `updated${i}`, projectDir);
      }

      const envPath = path.join(projectDir, '.claude', '.env');
      const content = fs.readFileSync(envPath, 'utf8');

      // Verify odd numbers remain
      assert.ok(content.includes('VAR1=updated1'));
      assert.ok(content.includes('VAR3=value3'));
      assert.ok(content.includes('VAR5=updated5'));

      // Verify even numbers removed
      assert.ok(!content.includes('VAR2='));
      assert.ok(!content.includes('VAR4='));
    });

    it('should handle variables with equals signs in values', () => {
      envSet('COMPLEX', 'a=b=c', projectDir);
      envSet('URL', 'http://example.com?foo=bar&baz=qux', projectDir);

      const envPath = path.join(projectDir, '.claude', '.env');
      const content = fs.readFileSync(envPath, 'utf8');

      assert.ok(content.includes('COMPLEX=a=b=c'));
      assert.ok(content.includes('URL=http://example.com?foo=bar&baz=qux'));
    });

    it('should handle special characters in values', () => {
      const specialValues = [
        ['QUOTES', '"hello world"'],
        ['SINGLE', "'hello world'"],
        ['BACKTICK', '`hello world`'],
        ['DOLLAR', '$VAR'],
        ['HASH', '#comment'],
        ['AMPERSAND', 'foo&bar'],
        ['SEMICOLON', 'foo;bar'],
        ['PIPE', 'foo|bar']
      ];

      for (const [key, value] of specialValues) {
        envSet(key, value, projectDir);
      }

      const envPath = path.join(projectDir, '.claude', '.env');
      const content = fs.readFileSync(envPath, 'utf8');

      for (const [key, value] of specialValues) {
        assert.ok(content.includes(`${key}=${value}`));
      }
    });

    it('should handle rapid set/unset cycles', () => {
      for (let i = 0; i < 50; i++) {
        envSet('RAPID', `value${i}`, projectDir);
        if (i % 3 === 0) {
          envUnset('RAPID', projectDir);
        }
      }

      const envPath = path.join(projectDir, '.claude', '.env');
      const content = fs.readFileSync(envPath, 'utf8');

      // Last value should be value49
      assert.ok(content.includes('RAPID=value49'));
    });

    it('should handle very long variable values', () => {
      const longValue = 'A'.repeat(5000);
      envSet('LONG_VAR', longValue, projectDir);

      const envPath = path.join(projectDir, '.claude', '.env');
      const content = fs.readFileSync(envPath, 'utf8');

      assert.ok(content.includes('LONG_VAR='));
      assert.ok(content.includes(longValue));
    });

    it('should handle multiline values with newlines', () => {
      const multiline = 'line1\\nline2\\nline3';
      envSet('MULTI', multiline, projectDir);

      const envPath = path.join(projectDir, '.claude', '.env');
      const content = fs.readFileSync(envPath, 'utf8');

      assert.ok(content.includes('MULTI=line1\\nline2\\nline3'));
    });

    it('should handle empty string value', () => {
      envSet('EMPTY', '', projectDir);

      const envPath = path.join(projectDir, '.claude', '.env');
      const content = fs.readFileSync(envPath, 'utf8');

      // Should create entry with empty value
      assert.ok(content.includes('EMPTY=') || content.includes('EMPTY=""'));
    });

    it('should handle whitespace-only values', () => {
      envSet('SPACES', '   ', projectDir);

      const envPath = path.join(projectDir, '.claude', '.env');
      const content = fs.readFileSync(envPath, 'utf8');

      assert.ok(content.includes('SPACES='));
    });

    it('should preserve file order after operations', () => {
      envSet('Z_VAR', 'z', projectDir);
      envSet('A_VAR', 'a', projectDir);
      envSet('M_VAR', 'm', projectDir);

      const envPath = path.join(projectDir, '.claude', '.env');
      const content = fs.readFileSync(envPath, 'utf8');
      const lines = content.split('\n').filter(l => l.trim());

      // Variables should appear in order they were added
      const zIndex = lines.findIndex(l => l.startsWith('Z_VAR='));
      const aIndex = lines.findIndex(l => l.startsWith('A_VAR='));
      const mIndex = lines.findIndex(l => l.startsWith('M_VAR='));

      assert.ok(zIndex < aIndex);
      assert.ok(aIndex < mIndex);
    });

    it('should handle case sensitivity correctly', () => {
      envSet('myvar', 'lowercase', projectDir);

      const envPath = path.join(projectDir, '.claude', '.env');
      const content = fs.readFileSync(envPath, 'utf8');

      // Should be converted to uppercase
      assert.ok(content.includes('MYVAR=lowercase'));
      assert.ok(!content.includes('myvar='));
    });

    it('should handle unset with case-insensitive key', () => {
      envSet('TEST_VAR', 'value', projectDir);
      envUnset('test_var', projectDir);

      const envPath = path.join(projectDir, '.claude', '.env');
      const content = fs.readFileSync(envPath, 'utf8');

      assert.ok(!content.includes('TEST_VAR='));
    });

    it('should handle concurrent modifications gracefully', () => {
      // Simulate rapid concurrent-like operations
      const operations = [];
      for (let i = 0; i < 10; i++) {
        envSet(`CONCURRENT${i}`, `val${i}`, projectDir);
      }

      const envPath = path.join(projectDir, '.claude', '.env');
      const content = fs.readFileSync(envPath, 'utf8');

      // All variables should be present
      for (let i = 0; i < 10; i++) {
        assert.ok(content.includes(`CONCURRENT${i}=val${i}`));
      }
    });
  });
});
