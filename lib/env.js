/**
 * Environment variable commands
 */

const fs = require('fs');
const path = require('path');

/**
 * List environment variables
 */
function envList(projectDir = process.cwd()) {
  const envPath = path.join(projectDir, '.claude', '.env');

  console.log(`\n🔐 Environment Variables (${projectDir}/.claude/.env)\n`);

  if (!fs.existsSync(envPath)) {
    console.log('  No .env file found.');
    console.log('  Create with: coder-config env set <KEY> <value>\n');
    return;
  }

  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'));

  if (lines.length === 0) {
    console.log('  No variables set.\n');
    return;
  }

  for (const line of lines) {
    const [key] = line.split('=');
    if (key) {
      console.log(`  ${key}=****`);
    }
  }
  console.log(`\n  Total: ${lines.length} variable(s)\n`);
}

/**
 * Set environment variable
 */
function envSet(key, value, projectDir = process.cwd()) {
  if (!key || value === undefined) {
    console.error('Usage: coder-config env set <KEY> <value>');
    return;
  }

  const claudeDir = path.join(projectDir, '.claude');
  const envPath = path.join(claudeDir, '.env');

  if (!fs.existsSync(claudeDir)) {
    fs.mkdirSync(claudeDir, { recursive: true });
  }

  let lines = [];
  if (fs.existsSync(envPath)) {
    lines = fs.readFileSync(envPath, 'utf8').split('\n');
  }

  const keyUpper = key.toUpperCase();
  let found = false;
  lines = lines.map(line => {
    if (line.startsWith(`${keyUpper}=`)) {
      found = true;
      return `${keyUpper}=${value}`;
    }
    return line;
  });

  if (!found) {
    lines.push(`${keyUpper}=${value}`);
  }

  fs.writeFileSync(envPath, lines.filter(l => l.trim()).join('\n') + '\n');

  console.log(`✓ Set ${keyUpper} in .claude/.env`);
}

/**
 * Unset environment variable
 */
function envUnset(key, projectDir = process.cwd()) {
  if (!key) {
    console.error('Usage: coder-config env unset <KEY>');
    return;
  }

  const envPath = path.join(projectDir, '.claude', '.env');

  if (!fs.existsSync(envPath)) {
    console.log('No .env file found.');
    return;
  }

  const keyUpper = key.toUpperCase();
  let lines = fs.readFileSync(envPath, 'utf8').split('\n');
  const originalLength = lines.length;

  lines = lines.filter(line => !line.startsWith(`${keyUpper}=`));

  if (lines.length === originalLength) {
    console.log(`Variable ${keyUpper} not found.`);
    return;
  }

  fs.writeFileSync(envPath, lines.filter(l => l.trim()).join('\n') + '\n');
  console.log(`✓ Removed ${keyUpper} from .claude/.env`);
}

module.exports = {
  envList,
  envSet,
  envUnset,
};
