const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  loadJson,
  saveJson,
  loadEnvFile,
  interpolate,
  resolveEnvVars,
  copyDirRecursive,
} = require('../lib/utils.js');

describe('utils', () => {
  let tempDir;

  before(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'utils-test-'));
  });

  after(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('loadJson', () => {
    it('should return null for non-existent file', () => {
      const result = loadJson('/nonexistent/path.json');
      assert.strictEqual(result, null);
    });

    it('should load valid JSON file', () => {
      const testPath = path.join(tempDir, 'test.json');
      fs.writeFileSync(testPath, JSON.stringify({ test: 'value' }));

      const result = loadJson(testPath);
      assert.deepStrictEqual(result, { test: 'value' });
    });

    it('should return null for invalid JSON', () => {
      const testPath = path.join(tempDir, 'invalid.json');
      fs.writeFileSync(testPath, 'not valid json');

      const result = loadJson(testPath);
      assert.strictEqual(result, null);
    });

    it('should handle empty file', () => {
      const testPath = path.join(tempDir, 'empty.json');
      fs.writeFileSync(testPath, '');

      const result = loadJson(testPath);
      assert.strictEqual(result, null);
    });
  });

  describe('saveJson', () => {
    it('should save JSON with formatting', () => {
      const testPath = path.join(tempDir, 'save-test.json');
      const data = { key: 'value', nested: { a: 1 } };

      saveJson(testPath, data);

      const content = fs.readFileSync(testPath, 'utf8');
      assert.ok(content.includes('\n')); // Should be formatted
      assert.deepStrictEqual(JSON.parse(content), data);
    });

    it('should add newline at end of file', () => {
      const testPath = path.join(tempDir, 'newline-test.json');
      saveJson(testPath, { test: true });

      const content = fs.readFileSync(testPath, 'utf8');
      assert.ok(content.endsWith('\n'));
    });

    it('should handle arrays', () => {
      const testPath = path.join(tempDir, 'array-test.json');
      const data = [1, 2, 3];

      saveJson(testPath, data);

      const result = loadJson(testPath);
      assert.deepStrictEqual(result, data);
    });
  });

  describe('loadEnvFile', () => {
    it('should return empty object for non-existent file', () => {
      const result = loadEnvFile('/nonexistent/.env');
      assert.deepStrictEqual(result, {});
    });

    it('should parse simple key=value pairs', () => {
      const envPath = path.join(tempDir, '.env');
      fs.writeFileSync(envPath, 'KEY1=value1\nKEY2=value2');

      const result = loadEnvFile(envPath);
      assert.deepStrictEqual(result, { KEY1: 'value1', KEY2: 'value2' });
    });

    it('should ignore comments', () => {
      const envPath = path.join(tempDir, '.env-comments');
      fs.writeFileSync(envPath, '# comment\nKEY=value\n# another comment');

      const result = loadEnvFile(envPath);
      assert.deepStrictEqual(result, { KEY: 'value' });
    });

    it('should strip quotes from values', () => {
      const envPath = path.join(tempDir, '.env-quotes');
      fs.writeFileSync(envPath, 'SINGLE=\'quoted\'\nDOUBLE="quoted"');

      const result = loadEnvFile(envPath);
      assert.deepStrictEqual(result, { SINGLE: 'quoted', DOUBLE: 'quoted' });
    });

    it('should handle values with = signs', () => {
      const envPath = path.join(tempDir, '.env-equals');
      fs.writeFileSync(envPath, 'URL=postgres://host?key=val');

      const result = loadEnvFile(envPath);
      assert.deepStrictEqual(result, { URL: 'postgres://host?key=val' });
    });

    it('should handle empty lines', () => {
      const envPath = path.join(tempDir, '.env-empty-lines');
      fs.writeFileSync(envPath, 'KEY1=value1\n\n\nKEY2=value2\n');

      const result = loadEnvFile(envPath);
      assert.deepStrictEqual(result, { KEY1: 'value1', KEY2: 'value2' });
    });

    it('should trim whitespace', () => {
      const envPath = path.join(tempDir, '.env-whitespace');
      fs.writeFileSync(envPath, '  KEY1  =  value1  \n  KEY2=value2\n');

      const result = loadEnvFile(envPath);
      assert.deepStrictEqual(result, { KEY1: 'value1', KEY2: 'value2' });
    });
  });

  describe('interpolate', () => {
    it('should replace ${VAR} with env values', () => {
      const env = { TOKEN: 'secret123' };
      const result = interpolate('Bearer ${TOKEN}', env);
      assert.strictEqual(result, 'Bearer secret123');
    });

    it('should handle nested objects', () => {
      const env = { HOST: 'localhost', PORT: '3000' };
      const obj = { url: 'http://${HOST}:${PORT}', nested: { path: '${HOST}' } };

      const result = interpolate(obj, env);
      assert.deepStrictEqual(result, {
        url: 'http://localhost:3000',
        nested: { path: 'localhost' }
      });
    });

    it('should handle arrays', () => {
      const env = { ARG: 'test' };
      const arr = ['${ARG}', 'static', '${ARG}2'];

      const result = interpolate(arr, env);
      assert.deepStrictEqual(result, ['test', 'static', 'test2']);
    });

    it('should leave unmatched vars unchanged', () => {
      const result = interpolate('${UNDEFINED}', {});
      assert.strictEqual(result, '${UNDEFINED}');
    });

    it('should pass through non-string primitives', () => {
      assert.strictEqual(interpolate(42, {}), 42);
      assert.strictEqual(interpolate(true, {}), true);
      assert.strictEqual(interpolate(null, {}), null);
    });

    it('should handle multiple variables in one string', () => {
      const env = { USER: 'john', DOMAIN: 'example.com' };
      const result = interpolate('${USER}@${DOMAIN}', env);
      assert.strictEqual(result, 'john@example.com');
    });

    it('should fall back to process.env', () => {
      process.env.TEST_VAR = 'from_process';
      const result = interpolate('Value: ${TEST_VAR}', {});
      assert.strictEqual(result, 'Value: from_process');
      delete process.env.TEST_VAR;
    });
  });

  describe('resolveEnvVars', () => {
    it('should replace ${VAR} with actual values', () => {
      const env = { TOKEN: 'secret123' };
      const result = resolveEnvVars('Bearer ${TOKEN}', env);
      assert.strictEqual(result, 'Bearer secret123');
    });

    it('should replace unmatched vars with empty string', () => {
      const result = resolveEnvVars('${UNDEFINED}', {});
      assert.strictEqual(result, '');
    });

    it('should handle nested objects', () => {
      const env = { HOST: 'localhost' };
      const obj = { server: { host: '${HOST}' } };

      const result = resolveEnvVars(obj, env);
      assert.deepStrictEqual(result, { server: { host: 'localhost' } });
    });

    it('should handle arrays', () => {
      const env = { ARG: 'test' };
      const arr = ['${ARG}', 'static'];

      const result = resolveEnvVars(arr, env);
      assert.deepStrictEqual(result, ['test', 'static']);
    });

    it('should handle null values', () => {
      const result = resolveEnvVars(null, {});
      assert.strictEqual(result, null);
    });
  });

  describe('copyDirRecursive', () => {
    it('should copy directory with files', () => {
      const srcDir = path.join(tempDir, 'src-copy');
      const destDir = path.join(tempDir, 'dest-copy');

      fs.mkdirSync(srcDir);
      fs.writeFileSync(path.join(srcDir, 'file1.txt'), 'content1');
      fs.writeFileSync(path.join(srcDir, 'file2.txt'), 'content2');

      copyDirRecursive(srcDir, destDir);

      assert.ok(fs.existsSync(path.join(destDir, 'file1.txt')));
      assert.ok(fs.existsSync(path.join(destDir, 'file2.txt')));
      assert.strictEqual(
        fs.readFileSync(path.join(destDir, 'file1.txt'), 'utf8'),
        'content1'
      );
    });

    it('should copy nested directories', () => {
      const srcDir = path.join(tempDir, 'src-nested');
      const destDir = path.join(tempDir, 'dest-nested');

      fs.mkdirSync(srcDir);
      fs.mkdirSync(path.join(srcDir, 'subdir'));
      fs.writeFileSync(path.join(srcDir, 'root.txt'), 'root');
      fs.writeFileSync(path.join(srcDir, 'subdir', 'nested.txt'), 'nested');

      copyDirRecursive(srcDir, destDir);

      assert.ok(fs.existsSync(path.join(destDir, 'root.txt')));
      assert.ok(fs.existsSync(path.join(destDir, 'subdir', 'nested.txt')));
      assert.strictEqual(
        fs.readFileSync(path.join(destDir, 'subdir', 'nested.txt'), 'utf8'),
        'nested'
      );
    });

    it('should create destination if it does not exist', () => {
      const srcDir = path.join(tempDir, 'src-new');
      const destDir = path.join(tempDir, 'deep', 'path', 'dest-new');

      fs.mkdirSync(srcDir);
      fs.writeFileSync(path.join(srcDir, 'test.txt'), 'test');

      copyDirRecursive(srcDir, destDir);

      assert.ok(fs.existsSync(destDir));
      assert.ok(fs.existsSync(path.join(destDir, 'test.txt')));
    });
  });
});
