/**
 * Memory system commands
 */

const fs = require('fs');
const path = require('path');

/**
 * Show memory status and contents
 */
function memoryList(projectDir = process.cwd()) {
  const homeDir = process.env.HOME || '';
  const globalMemoryDir = path.join(homeDir, '.claude', 'memory');
  const projectMemoryDir = path.join(projectDir, '.claude', 'memory');

  console.log('\n📝 Memory System\n');

  console.log('Global (~/.claude/memory/):');
  if (fs.existsSync(globalMemoryDir)) {
    const files = ['preferences.md', 'corrections.md', 'facts.md'];
    for (const file of files) {
      const filePath = path.join(globalMemoryDir, file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#')).length;
        console.log(`  ✓ ${file} (${lines} entries)`);
      } else {
        console.log(`  ○ ${file} (not created)`);
      }
    }
  } else {
    console.log('  Not initialized');
  }

  console.log(`\nProject (${projectDir}/.claude/memory/):`);
  if (fs.existsSync(projectMemoryDir)) {
    const files = ['context.md', 'patterns.md', 'decisions.md', 'issues.md', 'history.md'];
    for (const file of files) {
      const filePath = path.join(projectMemoryDir, file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#')).length;
        console.log(`  ✓ ${file} (${lines} entries)`);
      } else {
        console.log(`  ○ ${file} (not created)`);
      }
    }
  } else {
    console.log('  Not initialized. Run: coder-config memory init');
  }
  console.log();
}

/**
 * Initialize project memory
 */
function memoryInit(projectDir = process.cwd()) {
  const memoryDir = path.join(projectDir, '.claude', 'memory');

  if (fs.existsSync(memoryDir)) {
    console.log('Project memory already initialized at', memoryDir);
    return;
  }

  fs.mkdirSync(memoryDir, { recursive: true });

  const files = {
    'context.md': '# Project Context\n\n<!-- Project overview and key information -->\n',
    'patterns.md': '# Code Patterns\n\n<!-- Established patterns in this codebase -->\n',
    'decisions.md': '# Architecture Decisions\n\n<!-- Key decisions and their rationale -->\n',
    'issues.md': '# Known Issues\n\n<!-- Current issues and workarounds -->\n',
    'history.md': '# Session History\n\n<!-- Notable changes and milestones -->\n'
  };

  for (const [file, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(memoryDir, file), content);
  }

  console.log(`✓ Initialized project memory at ${memoryDir}`);
  console.log('\nCreated:');
  for (const file of Object.keys(files)) {
    console.log(`  ${file}`);
  }
}

/**
 * Add entry to memory
 */
function memoryAdd(type, content, projectDir = process.cwd()) {
  if (!type || !content) {
    console.error('Usage: coder-config memory add <type> "<content>"');
    console.log('\nTypes:');
    console.log('  Global:  preference, correction, fact');
    console.log('  Project: context, pattern, decision, issue, history');
    return;
  }

  const homeDir = process.env.HOME || '';
  const timestamp = new Date().toISOString().split('T')[0];

  const typeMap = {
    preference: { dir: path.join(homeDir, '.claude', 'memory'), file: 'preferences.md' },
    correction: { dir: path.join(homeDir, '.claude', 'memory'), file: 'corrections.md' },
    fact: { dir: path.join(homeDir, '.claude', 'memory'), file: 'facts.md' },
    context: { dir: path.join(projectDir, '.claude', 'memory'), file: 'context.md' },
    pattern: { dir: path.join(projectDir, '.claude', 'memory'), file: 'patterns.md' },
    decision: { dir: path.join(projectDir, '.claude', 'memory'), file: 'decisions.md' },
    issue: { dir: path.join(projectDir, '.claude', 'memory'), file: 'issues.md' },
    history: { dir: path.join(projectDir, '.claude', 'memory'), file: 'history.md' }
  };

  const target = typeMap[type];
  if (!target) {
    console.error(`Unknown type: ${type}`);
    console.log('Valid types: preference, correction, fact, context, pattern, decision, issue, history');
    return;
  }

  if (!fs.existsSync(target.dir)) {
    fs.mkdirSync(target.dir, { recursive: true });
  }

  const filePath = path.join(target.dir, target.file);

  if (!fs.existsSync(filePath)) {
    const headers = {
      'preferences.md': '# Preferences\n',
      'corrections.md': '# Corrections\n',
      'facts.md': '# Facts\n',
      'context.md': '# Project Context\n',
      'patterns.md': '# Code Patterns\n',
      'decisions.md': '# Architecture Decisions\n',
      'issues.md': '# Known Issues\n',
      'history.md': '# Session History\n'
    };
    fs.writeFileSync(filePath, headers[target.file] || '');
  }

  const entry = `\n- [${timestamp}] ${content}\n`;
  fs.appendFileSync(filePath, entry);

  console.log(`✓ Added ${type} to ${target.file}`);
}

/**
 * Search memory files
 */
function memorySearch(query, projectDir = process.cwd()) {
  if (!query) {
    console.error('Usage: coder-config memory search <query>');
    return;
  }

  const homeDir = process.env.HOME || '';
  const searchDirs = [
    { label: 'Global', dir: path.join(homeDir, '.claude', 'memory') },
    { label: 'Project', dir: path.join(projectDir, '.claude', 'memory') }
  ];

  const results = [];
  const queryLower = query.toLowerCase();

  for (const { label, dir } of searchDirs) {
    if (!fs.existsSync(dir)) continue;

    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.md')) continue;
      const filePath = path.join(dir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes(queryLower)) {
          results.push({
            location: `${label}/${file}`,
            line: i + 1,
            content: lines[i].trim()
          });
        }
      }
    }
  }

  if (results.length === 0) {
    console.log(`No matches found for "${query}"`);
    return;
  }

  console.log(`\n🔍 Found ${results.length} match(es) for "${query}":\n`);
  for (const r of results) {
    console.log(`  ${r.location}:${r.line}`);
    console.log(`    ${r.content}\n`);
  }
}

module.exports = {
  memoryList,
  memoryInit,
  memoryAdd,
  memorySearch,
};
