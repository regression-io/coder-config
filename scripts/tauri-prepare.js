#!/usr/bin/env node

/**
 * Tauri Build Preparation Script
 *
 * Prepares the Node.js server bundle for Tauri packaging:
 * 1. Downloads Node.js binary for target platform
 * 2. Copies server files to bundle location
 * 3. Installs production dependencies
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { spawnSync } = require('child_process');
const os = require('os');

const ROOT_DIR = path.join(__dirname, '..');
const SRC_TAURI = path.join(ROOT_DIR, 'src-tauri');
const BINARIES_DIR = path.join(SRC_TAURI, 'binaries');
const SERVER_DIR = path.join(SRC_TAURI, 'server');

// Node.js version to bundle (LTS)
const NODE_VERSION = '20.18.1';

// Target triple to Node.js platform mapping
const TARGET_TO_NODE_PLATFORM = {
  'aarch64-apple-darwin': 'darwin-arm64',
  'x86_64-apple-darwin': 'darwin-x64',
  'aarch64-pc-windows-msvc': 'win-arm64',
  'x86_64-pc-windows-msvc': 'win-x64',
  'aarch64-unknown-linux-gnu': 'linux-arm64',
  'x86_64-unknown-linux-gnu': 'linux-x64',
};

// Parse --target argument from CLI
function getTargetFromArgs() {
  const args = process.argv.slice(2);
  const targetIdx = args.indexOf('--target');
  if (targetIdx !== -1 && args[targetIdx + 1]) {
    return args[targetIdx + 1];
  }
  return null;
}

// Get target triple from env or args, fallback to host detection
function getTauriTarget() {
  // Check command line --target
  const argTarget = getTargetFromArgs();
  if (argTarget) {
    console.log(`Using target from --target: ${argTarget}`);
    return argTarget;
  }

  // Check environment variables
  const envTarget = process.env.TAURI_TARGET || process.env.TARGET;
  if (envTarget) {
    console.log(`Using target from environment: ${envTarget}`);
    return envTarget;
  }

  // Fallback to host platform detection
  const platform = os.platform();
  const arch = os.arch();

  if (platform === 'darwin') {
    return arch === 'arm64' ? 'aarch64-apple-darwin' : 'x86_64-apple-darwin';
  } else if (platform === 'win32') {
    return arch === 'arm64' ? 'aarch64-pc-windows-msvc' : 'x86_64-pc-windows-msvc';
  } else if (platform === 'linux') {
    return arch === 'arm64' ? 'aarch64-unknown-linux-gnu' : 'x86_64-unknown-linux-gnu';
  }

  throw new Error(`Unsupported platform: ${platform}-${arch}`);
}

// Platform detection for Node.js download
function getPlatform(tauriTarget) {
  const nodePlatform = TARGET_TO_NODE_PLATFORM[tauriTarget];
  if (!nodePlatform) {
    throw new Error(`Unknown target: ${tauriTarget}`);
  }
  return nodePlatform;
}

// Download a file
async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading: ${url}`);

    const file = fs.createWriteStream(dest);

    const request = (reqUrl) => {
      https.get(reqUrl, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          // Follow redirect
          request(response.headers.location);
          return;
        }

        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}: ${reqUrl}`));
          return;
        }

        const total = parseInt(response.headers['content-length'], 10);
        let downloaded = 0;

        response.on('data', (chunk) => {
          downloaded += chunk.length;
          if (total) {
            const pct = Math.round((downloaded / total) * 100);
            process.stdout.write(`\r  Progress: ${pct}%`);
          }
        });

        response.pipe(file);

        file.on('finish', () => {
          file.close();
          console.log('\n  Download complete');
          resolve();
        });
      }).on('error', (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
    };

    request(url);
  });
}

// Extract tar.gz using spawn (safe from injection)
function extractArchive(archivePath, destDir) {
  console.log(`Extracting to: ${destDir}`);

  // Use spawnSync with array arguments (safe from shell injection)
  const result = spawnSync('tar', ['-xzf', archivePath, '-C', destDir], {
    stdio: 'inherit'
  });

  if (result.status !== 0) {
    throw new Error(`Failed to extract archive: ${result.stderr || 'unknown error'}`);
  }
}

// Download Node.js binary
async function downloadNode() {
  const tauriTarget = getTauriTarget();
  const platform = getPlatform(tauriTarget);
  const ext = platform.startsWith('win') ? 'zip' : 'tar.gz';
  const nodeDir = `node-v${NODE_VERSION}-${platform}`;
  const archiveName = `${nodeDir}.${ext}`;
  const url = `https://nodejs.org/dist/v${NODE_VERSION}/${archiveName}`;

  console.log(`\n=== Downloading Node.js ${NODE_VERSION} for ${platform} ===`);

  // Create directories
  if (!fs.existsSync(BINARIES_DIR)) {
    fs.mkdirSync(BINARIES_DIR, { recursive: true });
  }

  const archivePath = path.join(BINARIES_DIR, archiveName);
  const extractDir = BINARIES_DIR;

  // Download if not already present
  if (!fs.existsSync(archivePath)) {
    await downloadFile(url, archivePath);
  } else {
    console.log('  Archive already exists, skipping download');
  }

  // Extract
  extractArchive(archivePath, extractDir);

  // Move node binary to expected location with Tauri naming convention
  const sourceDir = path.join(extractDir, nodeDir);
  const isWindows = platform.startsWith('win');
  const sourceNode = path.join(sourceDir, isWindows ? 'node.exe' : 'bin/node');

  // Tauri sidecar naming: <name>-<target-triple>[.exe]
  const destNodeName = `node-server-${tauriTarget}${isWindows ? '.exe' : ''}`;
  const destNode = path.join(BINARIES_DIR, destNodeName);

  if (fs.existsSync(sourceNode)) {
    fs.copyFileSync(sourceNode, destNode);
    fs.chmodSync(destNode, 0o755);
    console.log(`  Node binary copied to: ${destNodeName}`);
  }

  // Clean up extracted directory (keep archive for caching)
  fs.rmSync(sourceDir, { recursive: true, force: true });

  return destNode;
}

// Copy server files
function copyServerFiles() {
  console.log('\n=== Copying server files ===');

  // Create server directory
  if (fs.existsSync(SERVER_DIR)) {
    fs.rmSync(SERVER_DIR, { recursive: true });
  }
  fs.mkdirSync(SERVER_DIR, { recursive: true });

  // Files to copy (individual files)
  const filesToCopy = [
    'cli.js',
    'config-loader.js',
    'package.json',
    'ui/server.cjs',
    'ui/terminal-server.cjs',
  ];

  // Directories to copy (recursive)
  const dirsToCopy = [
    'lib',
    'ui/routes',
    'ui/dist',
    'shared',
  ];

  // Copy individual files
  for (const file of filesToCopy) {
    const src = path.join(ROOT_DIR, file);
    const dest = path.join(SERVER_DIR, file);
    if (fs.existsSync(src)) {
      // Ensure destination directory exists
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
      console.log(`  Copied: ${file}`);
    }
  }

  // Copy directories
  for (const dir of dirsToCopy) {
    const src = path.join(ROOT_DIR, dir);
    const dest = path.join(SERVER_DIR, dir);
    if (fs.existsSync(src)) {
      copyDirSync(src, dest);
      console.log(`  Copied: ${dir}/`);
    }
  }
}

// Recursive directory copy
function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Install production dependencies
function installDependencies() {
  console.log('\n=== Installing production dependencies ===');

  const result = spawnSync('npm', ['install', '--production', '--ignore-scripts'], {
    cwd: SERVER_DIR,
    stdio: 'inherit',
    shell: true
  });

  if (result.status !== 0) {
    console.warn('  Warning: npm install may have had issues');
  }

  // Note: node-pty needs to be rebuilt for the target platform
  // This is handled by npm rebuild during the Tauri build
  console.log('  Dependencies installed');
}

// Create a wrapper script for the sidecar
function createWrapperScript() {
  console.log('\n=== Creating wrapper script ===');

  const wrapperPath = path.join(SERVER_DIR, 'start-server.js');
  const wrapperContent = `#!/usr/bin/env node
// Wrapper script to start the server
// Used by Tauri sidecar
process.chdir(__dirname);
require('./cli.js');
`;

  fs.writeFileSync(wrapperPath, wrapperContent);
  fs.chmodSync(wrapperPath, 0o755);
  console.log('  Wrapper script created');
}

// Main
async function main() {
  console.log('=== Coder Config Tauri Build Preparation ===\n');

  try {
    // Check if we're building for distribution or just development
    const args = process.argv.slice(2);
    const skipNodeDownload = args.includes('--skip-node');

    if (!skipNodeDownload) {
      await downloadNode();
    }

    copyServerFiles();
    installDependencies();
    createWrapperScript();

    console.log('\n=== Build preparation complete! ===');
    console.log('Run `npm run tauri:build` to create the app bundle.');

  } catch (error) {
    console.error('Build preparation failed:', error);
    process.exit(1);
  }
}

main();
