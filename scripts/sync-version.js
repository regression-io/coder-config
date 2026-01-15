#!/usr/bin/env node

/**
 * Sync version from package.json to all version locations
 * This ensures version is consistent across the codebase
 *
 * Usage:
 *   node sync-version.js           # Sync current version
 *   node sync-version.js --bump    # Bump patch version then sync
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const packageJsonPath = path.join(rootDir, 'package.json');
const configLoaderPath = path.join(rootDir, 'config-loader.js');
const uiPackageJsonPath = path.join(rootDir, 'ui', 'package.json');

// Read version from package.json (source of truth)
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
let version = packageJson.version;

// Check for --bump flag
const shouldBump = process.argv.includes('--bump');

if (shouldBump) {
  // Bump patch version
  const parts = version.split('.');
  parts[2] = parseInt(parts[2], 10) + 1;
  version = parts.join('.');

  // Update package.json with new version
  packageJson.version = version;
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
  console.log(`Bumped version: ${packageJson.version.replace(/\.\d+$/, `.${parseInt(parts[2]) - 1}`)} -> ${version}`);
} else {
  console.log(`Syncing version: ${version}`);
}

// Update config-loader.js
let configLoader = fs.readFileSync(configLoaderPath, 'utf8');
const versionRegex = /const VERSION = ['"][^'"]+['"]/;

if (versionRegex.test(configLoader)) {
  const oldVersion = configLoader.match(versionRegex)[0];
  configLoader = configLoader.replace(versionRegex, `const VERSION = '${version}'`);
  fs.writeFileSync(configLoaderPath, configLoader, 'utf8');
  console.log(`  config-loader.js: ${oldVersion} -> const VERSION = '${version}'`);
} else {
  console.error('Warning: Could not find VERSION constant in config-loader.js');
}

// Update ui/package.json
if (fs.existsSync(uiPackageJsonPath)) {
  const uiPackageJson = JSON.parse(fs.readFileSync(uiPackageJsonPath, 'utf8'));
  if (uiPackageJson.version !== version) {
    const oldVersion = uiPackageJson.version;
    uiPackageJson.version = version;
    fs.writeFileSync(uiPackageJsonPath, JSON.stringify(uiPackageJson, null, 2) + '\n', 'utf8');
    console.log(`  ui/package.json: ${oldVersion} -> ${version}`);
  }
}

console.log('Version sync complete!');
