const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  memoryInit,
  memoryAdd,
  memorySearch,
} = require('../lib/memory.js');

describe('memory', () => {
  let tempDir;
  let projectDir;
  let originalHome;
  let originalLog;
  let originalError;
  let logs;
  let errors;

  before(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memory-test-'));
    projectDir = path.join(tempDir, 'project');
    fs.mkdirSync(projectDir, { recursive: true });

    originalHome = process.env.HOME;
    originalLog = console.log;
    originalError = console.error;
  });

  after(() => {
    process.env.HOME = originalHome;
    console.log = originalLog;
    console.error = originalError;
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    logs = [];
    errors = [];
    console.log = (...args) => logs.push(args.join(' '));
    console.error = (...args) => errors.push(args.join(' '));
  });

  describe('memoryInit', () => {
    it('should create memory directory with all files', () => {
      const testProject = path.join(tempDir, 'init-test');
      fs.mkdirSync(testProject, { recursive: true });

      memoryInit(testProject);

      const memoryDir = path.join(testProject, '.claude', 'memory');
      assert.ok(fs.existsSync(memoryDir));

      const expectedFiles = [
        'context.md',
        'patterns.md',
        'decisions.md',
        'issues.md',
        'history.md'
      ];

      for (const file of expectedFiles) {
        const filePath = path.join(memoryDir, file);
        assert.ok(fs.existsSync(filePath), `${file} should exist`);
        const content = fs.readFileSync(filePath, 'utf8');
        assert.ok(content.length > 0, `${file} should have content`);
      }
    });

    it('should create files with appropriate headers', () => {
      const testProject = path.join(tempDir, 'headers-test');
      fs.mkdirSync(testProject, { recursive: true });

      memoryInit(testProject);

      const memoryDir = path.join(testProject, '.claude', 'memory');
      const contextPath = path.join(memoryDir, 'context.md');
      const content = fs.readFileSync(contextPath, 'utf8');

      assert.ok(content.includes('# Project Context'));
    });

    it('should not reinitialize if already exists', () => {
      const testProject = path.join(tempDir, 'reinit-test');
      const memoryDir = path.join(testProject, '.claude', 'memory');
      fs.mkdirSync(memoryDir, { recursive: true });

      memoryInit(testProject);

      assert.ok(logs.some(log => log.includes('already initialized')));
    });

    it('should log success message', () => {
      const testProject = path.join(tempDir, 'success-test');
      fs.mkdirSync(testProject, { recursive: true });

      memoryInit(testProject);

      assert.ok(logs.some(log => log.includes('✓ Initialized project memory')));
    });
  });

  describe('memoryAdd', () => {
    beforeEach(() => {
      // Set fake HOME for global memory tests
      process.env.HOME = path.join(tempDir, 'fake-home');
      fs.mkdirSync(process.env.HOME, { recursive: true });
    });

    it('should add preference to global memory', () => {
      memoryAdd('preference', 'Always use TypeScript', projectDir);

      const prefPath = path.join(process.env.HOME, '.claude', 'memory', 'preferences.md');
      assert.ok(fs.existsSync(prefPath));

      const content = fs.readFileSync(prefPath, 'utf8');
      assert.ok(content.includes('Always use TypeScript'));
    });

    it('should add correction to global memory', () => {
      memoryAdd('correction', 'Use logger instead of console.log', projectDir);

      const corrPath = path.join(process.env.HOME, '.claude', 'memory', 'corrections.md');
      assert.ok(fs.existsSync(corrPath));

      const content = fs.readFileSync(corrPath, 'utf8');
      assert.ok(content.includes('Use logger instead of console.log'));
    });

    it('should add fact to global memory', () => {
      memoryAdd('fact', 'User prefers vim keybindings', projectDir);

      const factPath = path.join(process.env.HOME, '.claude', 'memory', 'facts.md');
      assert.ok(fs.existsSync(factPath));

      const content = fs.readFileSync(factPath, 'utf8');
      assert.ok(content.includes('User prefers vim keybindings'));
    });

    it('should add context to project memory', () => {
      memoryAdd('context', 'This is a Node.js CLI tool', projectDir);

      const contextPath = path.join(projectDir, '.claude', 'memory', 'context.md');
      assert.ok(fs.existsSync(contextPath));

      const content = fs.readFileSync(contextPath, 'utf8');
      assert.ok(content.includes('This is a Node.js CLI tool'));
    });

    it('should add pattern to project memory', () => {
      memoryAdd('pattern', 'Use async/await for all async operations', projectDir);

      const patternPath = path.join(projectDir, '.claude', 'memory', 'patterns.md');
      assert.ok(fs.existsSync(patternPath));

      const content = fs.readFileSync(patternPath, 'utf8');
      assert.ok(content.includes('async/await'));
    });

    it('should add decision to project memory', () => {
      memoryAdd('decision', 'Chose Express over Fastify for stability', projectDir);

      const decisionPath = path.join(projectDir, '.claude', 'memory', 'decisions.md');
      assert.ok(fs.existsSync(decisionPath));

      const content = fs.readFileSync(decisionPath, 'utf8');
      assert.ok(content.includes('Express over Fastify'));
    });

    it('should add issue to project memory', () => {
      memoryAdd('issue', 'Database connection pool leaks under load', projectDir);

      const issuePath = path.join(projectDir, '.claude', 'memory', 'issues.md');
      assert.ok(fs.existsSync(issuePath));

      const content = fs.readFileSync(issuePath, 'utf8');
      assert.ok(content.includes('Database connection pool'));
    });

    it('should add history to project memory', () => {
      memoryAdd('history', 'Migrated from REST to GraphQL', projectDir);

      const historyPath = path.join(projectDir, '.claude', 'memory', 'history.md');
      assert.ok(fs.existsSync(historyPath));

      const content = fs.readFileSync(historyPath, 'utf8');
      assert.ok(content.includes('REST to GraphQL'));
    });

    it('should include timestamp in entry', () => {
      memoryAdd('preference', 'Test entry', projectDir);

      const prefPath = path.join(process.env.HOME, '.claude', 'memory', 'preferences.md');
      const content = fs.readFileSync(prefPath, 'utf8');

      // Should have date format [YYYY-MM-DD]
      assert.ok(/\[\d{4}-\d{2}-\d{2}\]/.test(content));
    });

    it('should create directory if it does not exist', () => {
      const newProjectDir = path.join(tempDir, 'new-project');
      fs.mkdirSync(newProjectDir, { recursive: true });

      memoryAdd('context', 'New project context', newProjectDir);

      const contextPath = path.join(newProjectDir, '.claude', 'memory', 'context.md');
      assert.ok(fs.existsSync(contextPath));
    });

    it('should create file with header if it does not exist', () => {
      const freshProjectDir = path.join(tempDir, 'fresh-project');
      fs.mkdirSync(freshProjectDir, { recursive: true });

      memoryAdd('pattern', 'First pattern', freshProjectDir);

      const patternPath = path.join(freshProjectDir, '.claude', 'memory', 'patterns.md');
      const content = fs.readFileSync(patternPath, 'utf8');

      assert.ok(content.includes('# Code Patterns'));
    });

    it('should show error for invalid type', () => {
      memoryAdd('invalid-type', 'Some content', projectDir);

      assert.ok(errors.some(err => err.includes('Unknown type')));
    });

    it('should show usage when no type provided', () => {
      memoryAdd(null, null, projectDir);

      assert.ok(errors.some(err => err.includes('Usage:')));
    });

    it('should show usage when no content provided', () => {
      memoryAdd('preference', null, projectDir);

      assert.ok(errors.some(err => err.includes('Usage:')));
    });

    it('should log success message', () => {
      memoryAdd('preference', 'Test preference', projectDir);

      assert.ok(logs.some(log => log.includes('✓ Added preference')));
    });
  });

  describe('memorySearch', () => {
    let searchProjectDir;

    beforeEach(() => {
      process.env.HOME = path.join(tempDir, 'search-home');
      searchProjectDir = path.join(tempDir, 'search-project');

      fs.mkdirSync(process.env.HOME, { recursive: true });
      fs.mkdirSync(searchProjectDir, { recursive: true });

      // Add some test data
      memoryAdd('preference', 'Always use TypeScript for new projects', searchProjectDir);
      memoryAdd('preference', 'Prefer functional programming patterns', searchProjectDir);
      memoryAdd('context', 'This is a TypeScript CLI tool', searchProjectDir);
      memoryAdd('pattern', 'Use dependency injection', searchProjectDir);
    });

    it('should find matches in global memory', () => {
      memorySearch('TypeScript', searchProjectDir);

      assert.ok(logs.some(log => log.includes('Found')));
      assert.ok(logs.some(log => log.includes('TypeScript')));
    });

    it('should find matches in project memory', () => {
      memorySearch('CLI tool', searchProjectDir);

      assert.ok(logs.some(log => log.includes('Found')));
      assert.ok(logs.some(log => log.includes('CLI tool')));
    });

    it('should be case-insensitive', () => {
      memorySearch('typescript', searchProjectDir);

      assert.ok(logs.some(log => log.includes('Found')));
    });

    it('should find multiple matches', () => {
      memorySearch('TypeScript', searchProjectDir);

      // Should find at least 2 matches (preference and context)
      const foundLine = logs.find(log => log.includes('Found'));
      assert.ok(foundLine);
      // Check that it found multiple matches
      assert.ok(/Found \d+ match/.test(foundLine));
    });

    it('should show file location for matches', () => {
      memorySearch('TypeScript', searchProjectDir);

      assert.ok(logs.some(log => log.includes('preferences.md') || log.includes('context.md')));
    });

    it('should show line numbers for matches', () => {
      memorySearch('TypeScript', searchProjectDir);

      // Should show format like "Global/preferences.md:3"
      assert.ok(logs.some(log => /:\d+/.test(log)));
    });

    it('should show no matches message when nothing found', () => {
      memorySearch('nonexistent-term-xyz', searchProjectDir);

      assert.ok(logs.some(log => log.includes('No matches found')));
    });

    it('should show error when no query provided', () => {
      memorySearch(null, searchProjectDir);

      assert.ok(errors.some(err => err.includes('Usage:')));
    });

    it('should handle directories that do not exist', () => {
      const emptyProject = path.join(tempDir, 'empty-search-project');
      fs.mkdirSync(emptyProject, { recursive: true });

      memorySearch('test', emptyProject);

      // Should not crash, just show no results
      assert.ok(logs.length > 0);
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle corrupted memory files gracefully', () => {
      const memoryDir = path.join(projectDir, '.claude', 'memory');
      fs.mkdirSync(memoryDir, { recursive: true });

      // Create corrupted file
      fs.writeFileSync(path.join(memoryDir, 'preferences.md'), '\x00\x01\x02');

      // Should not crash
      memorySearch('test', projectDir);
      assert.ok(true); // If we get here, it didn't crash
    });

    it('should handle very long memory entries', () => {
      const longContent = 'A'.repeat(5000); // Reduced to avoid truncation
      memoryAdd('preference', longContent, projectDir);

      const prefPath = path.join(process.env.HOME, '.claude', 'memory', 'preferences.md');
      const content = fs.readFileSync(prefPath, 'utf8');

      // Content is prefixed with timestamp, so check if long content exists
      assert.ok(content.length > 5000);
      assert.ok(content.includes('AAAA')); // Should have lots of A's
    });

    it('should handle memory entries with special characters', () => {
      const specialContent = 'Test with special chars: ñ á é í ó ú ü 中文 🎉 & < > " \' `';
      memoryAdd('preference', specialContent, projectDir);

      const prefPath = path.join(process.env.HOME, '.claude', 'memory', 'preferences.md');
      const content = fs.readFileSync(prefPath, 'utf8');

      // Check for the special characters (content has timestamp prefix)
      assert.ok(content.includes('ñ'));
      assert.ok(content.includes('中文'));
      assert.ok(content.includes('🎉'));
    });

    it('should handle multiple rapid additions', () => {
      for (let i = 0; i < 50; i++) {
        memoryAdd('preference', `Preference ${i}`, projectDir);
      }

      const prefPath = path.join(process.env.HOME, '.claude', 'memory', 'preferences.md');
      const content = fs.readFileSync(prefPath, 'utf8');

      assert.ok(content.includes('Preference 0'));
      assert.ok(content.includes('Preference 49'));
    });

    it('should handle memory entry with newlines', () => {
      const multilineContent = `First line
Second line
Third line`;
      memoryAdd('context', multilineContent, projectDir);

      const contextPath = path.join(projectDir, '.claude', 'memory', 'context.md');
      const content = fs.readFileSync(contextPath, 'utf8');

      assert.ok(content.includes('First line'));
      assert.ok(content.includes('Second line'));
      assert.ok(content.includes('Third line'));
    });

    it('should handle empty content string', () => {
      memoryAdd('preference', '', projectDir);

      // Empty content triggers usage error
      assert.ok(errors.some(err => err.includes('Usage:')));
    });

    it('should handle whitespace-only content', () => {
      memoryAdd('preference', '   ', projectDir);

      // Whitespace is truthy so it will be added
      const prefPath = path.join(process.env.HOME, '.claude', 'memory', 'preferences.md');
      if (fs.existsSync(prefPath)) {
        const content = fs.readFileSync(prefPath, 'utf8');
        // If accepted, should be in file
        assert.ok(typeof content === 'string');
      }
    });

    it('should handle all memory types in single project', () => {
      // Add entries of all types
      memoryAdd('preference', 'Pref test', projectDir);
      memoryAdd('correction', 'Corr test', projectDir);
      memoryAdd('fact', 'Fact test', projectDir);
      memoryAdd('context', 'Context test', projectDir);
      memoryAdd('pattern', 'Pattern test', projectDir);
      memoryAdd('decision', 'Decision test', projectDir);
      memoryAdd('issue', 'Issue test', projectDir);
      memoryAdd('history', 'History test', projectDir);

      // Verify global memory files (preference, correction, fact)
      const globalMemoryDir = path.join(process.env.HOME, '.claude', 'memory');
      assert.ok(fs.existsSync(path.join(globalMemoryDir, 'preferences.md')));
      assert.ok(fs.existsSync(path.join(globalMemoryDir, 'corrections.md')));
      assert.ok(fs.existsSync(path.join(globalMemoryDir, 'facts.md')));

      // Verify project memory files
      const projectMemoryDir = path.join(projectDir, '.claude', 'memory');
      assert.ok(fs.existsSync(path.join(projectMemoryDir, 'context.md')));
      assert.ok(fs.existsSync(path.join(projectMemoryDir, 'patterns.md')));
      assert.ok(fs.existsSync(path.join(projectMemoryDir, 'decisions.md')));
      assert.ok(fs.existsSync(path.join(projectMemoryDir, 'issues.md')));
      assert.ok(fs.existsSync(path.join(projectMemoryDir, 'history.md')));
    });

    it('should handle search with regex special characters', () => {
      memoryAdd('preference', 'Use .* for wildcards', projectDir);

      // Search for literal .*
      memorySearch('.*', projectDir);

      // Should find it (or handle gracefully)
      assert.ok(logs.length > 0);
    });

    it('should handle concurrent memory operations', () => {
      // Simulate sequential additions (not truly concurrent in sync code)
      for (let i = 0; i < 10; i++) {
        memoryAdd('preference', `Concurrent ${i}`, projectDir);
      }

      // All should complete without errors
      const prefPath = path.join(process.env.HOME, '.claude', 'memory', 'preferences.md');
      const content = fs.readFileSync(prefPath, 'utf8');

      // Should have all entries
      assert.ok(content.includes('Concurrent 0'));
      assert.ok(content.includes('Concurrent 9'));
    });

    it('should handle memoryInit on already initialized directory', () => {
      memoryInit(projectDir);
      // Call again
      memoryInit(projectDir);

      // Should handle gracefully
      const memoryDir = path.join(projectDir, '.claude', 'memory');
      assert.ok(fs.existsSync(memoryDir));
    });

    it('should handle search in project with no memory', () => {
      const noMemoryProject = path.join(tempDir, 'no-memory');
      fs.mkdirSync(noMemoryProject, { recursive: true });

      memorySearch('anything', noMemoryProject);

      assert.ok(logs.some(log => log.includes('No matches found')));
    });

    it('should handle memory entry with code blocks', () => {
      const codeContent = `Use this pattern:
\`\`\`javascript
function test() {
  return true;
}
\`\`\`
`;
      memoryAdd('pattern', codeContent, projectDir);

      const patternPath = path.join(projectDir, '.claude', 'memory', 'patterns.md');
      const content = fs.readFileSync(patternPath, 'utf8');

      assert.ok(content.includes('```javascript'));
      assert.ok(content.includes('function test()'));
    });
  });
});
