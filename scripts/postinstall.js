#!/usr/bin/env node

/**
 * Post-install script for claude-config
 * Sets up default configuration if not present
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const home = os.homedir();
const claudeDir = path.join(home, '.claude');
const configPath = path.join(claudeDir, 'config.json');

// Default configuration
const defaultConfig = {
  toolsDir: path.join(home, 'mcp-tools'),
  registryPath: path.join(claudeDir, 'registry.json'),
  ui: {
    port: 3333,
    openBrowser: true
  }
};

// Create ~/.claude if it doesn't exist
if (!fs.existsSync(claudeDir)) {
  fs.mkdirSync(claudeDir, { recursive: true });
  console.log('Created ~/.claude directory');
}

// Create config.json if it doesn't exist
if (!fs.existsSync(configPath)) {
  fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2) + '\n');
  console.log('Created ~/.claude/config.json with defaults');
  console.log(`  Tools directory: ${defaultConfig.toolsDir}`);
}

// Create default registry if it doesn't exist
const registryPath = path.join(claudeDir, 'registry.json');
if (!fs.existsSync(registryPath)) {
  const defaultRegistry = {
    mcpServers: {}
  };
  fs.writeFileSync(registryPath, JSON.stringify(defaultRegistry, null, 2) + '\n');
  console.log('Created ~/.claude/registry.json');
}

console.log('\nClaude Config installed successfully!');
console.log('Run "claude-config" to start the UI.\n');
