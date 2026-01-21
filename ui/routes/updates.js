/**
 * Updates Routes
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

/**
 * Get version from file (checks both config-loader.js and lib/constants.js)
 */
function getVersionFromFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;

    // First try the file directly
    let content = fs.readFileSync(filePath, 'utf8');
    let match = content.match(/const VERSION = ['"]([^'"]+)['"]/);
    if (match) return match[1];

    // If not found and this is config-loader.js, check lib/constants.js
    if (filePath.endsWith('config-loader.js')) {
      const constantsPath = path.join(path.dirname(filePath), 'lib', 'constants.js');
      if (fs.existsSync(constantsPath)) {
        content = fs.readFileSync(constantsPath, 'utf8');
        match = content.match(/const VERSION = ['"]([^'"]+)['"]/);
        if (match) return match[1];
      }
    }

    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Fetch npm version
 */
function fetchNpmVersion() {
  return new Promise((resolve) => {
    const url = 'https://registry.npmjs.org/@regression-io/claude-config/latest';
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.version || null);
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

/**
 * Check if source is newer version
 */
function isNewerVersion(source, installed) {
  if (!source || !installed) return false;

  const parseVersion = (v) => v.split('.').map(n => parseInt(n, 10) || 0);
  const s = parseVersion(source);
  const i = parseVersion(installed);

  for (let j = 0; j < Math.max(s.length, i.length); j++) {
    const sv = s[j] || 0;
    const iv = i[j] || 0;
    if (sv > iv) return true;
    if (sv < iv) return false;
  }
  return false;
}

/**
 * Check for updates
 */
async function checkForUpdates(manager, dirname) {
  // Get current installed version
  const installedVersion = getVersionFromFile(
    path.join(dirname, '..', 'config-loader.js')
  );

  // Check npm for latest version
  const npmVersion = await fetchNpmVersion();

  if (npmVersion && isNewerVersion(npmVersion, installedVersion)) {
    return {
      updateAvailable: true,
      installedVersion,
      latestVersion: npmVersion,
      sourceVersion: npmVersion, // legacy alias for v0.37.0 compatibility
      updateMethod: 'npm',
      installDir: manager.installDir
    };
  }

  // No update available from npm
  return {
    updateAvailable: false,
    installedVersion,
    latestVersion: npmVersion || installedVersion,
    sourceVersion: npmVersion || installedVersion, // legacy alias for v0.37.0 compatibility
    installDir: manager.installDir
  };
}

/**
 * Perform npm update
 */
async function performNpmUpdate() {
  try {
    // Use npm install @latest instead of npm update for reliable updates
    execSync('npm install -g @regression-io/claude-config@latest', {
      stdio: 'pipe',
      timeout: 120000
    });

    // Get the new version from npm registry since we just updated
    const newVersion = await fetchNpmVersion();

    return {
      success: true,
      updateMethod: 'npm',
      newVersion: newVersion || 'latest',
      message: 'Updated via npm. Please restart the UI to use the new version.'
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Copy directory recursively
 */
function copyDirRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Perform local update
 */
function performLocalUpdate(sourcePath, manager) {
  try {
    const installDir = manager.installDir;

    if (!fs.existsSync(sourcePath)) {
      return { success: false, error: 'Source path not found' };
    }

    const sourceLoaderPath = path.join(sourcePath, 'config-loader.js');
    if (!fs.existsSync(sourceLoaderPath)) {
      return { success: false, error: 'config-loader.js not found in source' };
    }

    const updated = [];

    // Copy core files
    const filesToCopy = [
      { src: 'config-loader.js', dest: 'config-loader.js' },
      { src: 'shared/mcp-registry.json', dest: 'shared/mcp-registry.json' },
      { src: 'shell/claude-config.zsh', dest: 'shell/claude-config.zsh' },
      { src: 'bin/claude-config', dest: 'bin/claude-config' }
    ];

    for (const { src, dest } of filesToCopy) {
      const srcPath = path.join(sourcePath, src);
      const destPath = path.join(installDir, dest);

      if (fs.existsSync(srcPath)) {
        const destDir = path.dirname(destPath);
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        fs.copyFileSync(srcPath, destPath);
        updated.push(src);
      }
    }

    // Copy UI dist files
    const uiDistSourceDir = path.join(sourcePath, 'ui', 'dist');
    const uiDistDestDir = path.join(installDir, 'ui', 'dist');
    if (fs.existsSync(uiDistSourceDir)) {
      copyDirRecursive(uiDistSourceDir, uiDistDestDir);
      updated.push('ui/dist/');
    }

    // Copy UI server files
    const uiServerFiles = ['server.cjs', 'terminal-server.cjs'];
    for (const file of uiServerFiles) {
      const uiServerSrc = path.join(sourcePath, 'ui', file);
      const uiServerDest = path.join(installDir, 'ui', file);
      if (fs.existsSync(uiServerSrc)) {
        const uiDir = path.dirname(uiServerDest);
        if (!fs.existsSync(uiDir)) {
          fs.mkdirSync(uiDir, { recursive: true });
        }
        fs.copyFileSync(uiServerSrc, uiServerDest);
        updated.push('ui/' + file);
      }
    }

    // Copy templates
    const templatesSourceDir = path.join(sourcePath, 'templates');
    const templatesDestDir = path.join(installDir, 'templates');
    if (fs.existsSync(templatesSourceDir)) {
      copyDirRecursive(templatesSourceDir, templatesDestDir);
      updated.push('templates/');
    }

    // Make bin script executable
    const binPath = path.join(installDir, 'bin', 'claude-config');
    if (fs.existsSync(binPath)) {
      fs.chmodSync(binPath, '755');
    }

    const newVersion = getVersionFromFile(path.join(installDir, 'config-loader.js'));

    return {
      success: true,
      updateMethod: 'local',
      updated,
      newVersion
    };

  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Perform update
 */
async function performUpdate(options, manager) {
  const { updateMethod, sourcePath } = options;

  if (updateMethod === 'npm') {
    return await performNpmUpdate();
  }

  if (sourcePath) {
    return performLocalUpdate(sourcePath, manager);
  }

  return { success: false, error: 'No update method specified' };
}

module.exports = {
  getVersionFromFile,
  fetchNpmVersion,
  isNewerVersion,
  checkForUpdates,
  performUpdate,
  performNpmUpdate,
  performLocalUpdate,
};
