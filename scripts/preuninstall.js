#!/usr/bin/env node
/**
 * Preuninstall script - cleans up system files on npm uninstall
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const home = os.homedir();

// 1. Stop and remove LaunchAgent
const launchAgentPath = path.join(home, 'Library', 'LaunchAgents', 'io.regression.coder-config.plist');
if (fs.existsSync(launchAgentPath)) {
  try {
    execSync(`launchctl unload "${launchAgentPath}" 2>/dev/null || true`);
    fs.unlinkSync(launchAgentPath);
    console.log('Removed LaunchAgent');
  } catch (e) {
    // Ignore errors
  }
}

// 2. Remove shell hooks from .zshrc and .bashrc
const shellFiles = [
  path.join(home, '.zshrc'),
  path.join(home, '.bashrc'),
];

const hookStart = '# coder-config workstream hooks';
const hookEnd = '# end coder-config workstream hooks';

for (const rcFile of shellFiles) {
  if (fs.existsSync(rcFile)) {
    try {
      let content = fs.readFileSync(rcFile, 'utf8');
      const startIdx = content.indexOf(hookStart);
      const endIdx = content.indexOf(hookEnd);
      
      if (startIdx !== -1 && endIdx !== -1) {
        // Remove the block including trailing newline
        let removeStart = startIdx;
        if (startIdx > 0 && content[startIdx - 1] === '\n') {
          removeStart = startIdx - 1;
        }
        content = content.slice(0, removeStart) + content.slice(endIdx + hookEnd.length);
        fs.writeFileSync(rcFile, content);
        console.log(`Removed hooks from ${path.basename(rcFile)}`);
      }
    } catch (e) {
      // Ignore errors
    }
  }
}

console.log('Cleanup complete');
