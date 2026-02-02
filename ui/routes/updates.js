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
 * Fetch npm version and verify it's installable
 * Uses multiple verification steps to ensure CDN has propagated
 * @param {string} channel - 'stable' or 'beta' (default: 'stable')
 */
function fetchNpmVersion(channel = 'stable') {
  return new Promise((resolve) => {
    // Step 1: Get version from registry (latest for stable, beta tag for beta)
    const tag = channel === 'beta' ? 'beta' : 'latest';
    const url = `https://registry.npmjs.org/coder-config/${tag}`;
    const req = https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const version = parsed.version;

          if (!version) {
            console.log('[update-check] npm registry response missing version');
            resolve(null);
            return;
          }

          // Step 2: Verify specific version endpoint is accessible
          // This is what npm install actually uses
          const versionUrl = `https://registry.npmjs.org/coder-config/${version}`;
          const verifyReq = https.get(versionUrl, (verifyRes) => {
            let verifyData = '';
            verifyRes.on('data', chunk => verifyData += chunk);
            verifyRes.on('end', () => {
              if (verifyRes.statusCode !== 200) {
                console.log(`[update-check] version ${version} not yet available (status ${verifyRes.statusCode})`);
                resolve(null);
                return;
              }

              try {
                const versionInfo = JSON.parse(verifyData);
                // Step 3: Verify the tarball URL is present and accessible
                const tarballUrl = versionInfo.dist?.tarball;
                if (!tarballUrl) {
                  console.log('[update-check] version info missing tarball URL');
                  resolve(null);
                  return;
                }

                // Step 4: HEAD request to tarball to verify CDN propagation
                const tarball = new URL(tarballUrl);
                const headReq = https.request({
                  hostname: tarball.hostname,
                  path: tarball.pathname,
                  method: 'HEAD'
                }, (headRes) => {
                  if (headRes.statusCode === 200) {
                    console.log(`[update-check] version ${version} verified available`);
                    resolve(version);
                  } else {
                    console.log(`[update-check] tarball not accessible (status ${headRes.statusCode})`);
                    resolve(null);
                  }
                });
                headReq.setTimeout(5000, () => {
                  console.log('[update-check] tarball verification timed out');
                  headReq.destroy();
                  resolve(null);
                });
                headReq.on('error', (e) => {
                  console.log('[update-check] tarball verification error:', e.message);
                  resolve(null);
                });
                headReq.end();
              } catch (e) {
                console.log('[update-check] failed to parse version info:', e.message);
                resolve(null);
              }
            });
          });
          verifyReq.setTimeout(5000, () => {
            console.log('[update-check] version verification timed out');
            verifyReq.destroy();
            resolve(null);
          });
          verifyReq.on('error', (e) => {
            console.log('[update-check] version verification error:', e.message);
            resolve(null);
          });
        } catch (e) {
          console.log('[update-check] failed to parse npm response:', e.message);
          resolve(null);
        }
      });
    });
    req.setTimeout(10000, () => {
      console.log('[update-check] npm registry request timed out');
      req.destroy();
      resolve(null);
    });
    req.on('error', (e) => {
      console.log('[update-check] npm registry error:', e.message);
      resolve(null);
    });
  });
}

/**
 * Check if source is newer version
 * Handles versions like: 0.46.1, 0.46.2-beta
 * Beta versions are considered older than same number stable (0.46.2-beta < 0.46.2)
 */
function isNewerVersion(source, installed) {
  if (!source || !installed) return false;
  if (source === installed) return false; // Exact match - no update needed

  // Parse version: "0.46.2-beta" -> { major: 0, minor: 46, patch: 2, beta: true }
  const parseVersion = (v) => {
    const isBeta = v.includes('-beta');
    const clean = v.replace('-beta', '');
    const parts = clean.split('.').map(n => parseInt(n, 10) || 0);
    return { major: parts[0], minor: parts[1], patch: parts[2], beta: isBeta };
  };

  const s = parseVersion(source);
  const i = parseVersion(installed);

  // Compare major.minor.patch first
  if (s.major !== i.major) return s.major > i.major;
  if (s.minor !== i.minor) return s.minor > i.minor;
  if (s.patch !== i.patch) return s.patch > i.patch;

  // Same version number - beta is older than stable
  // source=stable, installed=beta -> newer (true)
  // source=beta, installed=stable -> older (false)
  // source=beta, installed=beta -> same (false)
  if (!s.beta && i.beta) return true;
  return false;
}

/**
 * Pre-cache the npm package to verify it's actually installable
 * Returns true if package is cached and ready to install
 */
async function preCachePackage(version) {
  return new Promise((resolve) => {
    try {
      console.log(`[update-check] pre-caching coder-config@${version}...`);
      execSync(`npm cache add coder-config@${version}`, {
        stdio: 'pipe',
        timeout: 60000
      });
      console.log(`[update-check] pre-cache successful for ${version}`);
      resolve(true);
    } catch (error) {
      console.log(`[update-check] pre-cache failed: ${error.message}`);
      resolve(false);
    }
  });
}

/**
 * Check for updates
 * Only reports update available if package is pre-cached and ready to install
 * @param {object} manager - Config manager instance
 * @param {string} dirname - Directory name
 * @param {string} channel - 'stable' or 'beta' (default: 'stable')
 */
async function checkForUpdates(manager, dirname, channel = 'stable') {
  // Get current installed version
  const installedVersion = getVersionFromFile(
    path.join(dirname, '..', 'config-loader.js')
  );

  // Check npm for versions
  // Beta channel should also see stable releases (stable is always preferred if newer)
  const betaVersion = channel === 'beta' ? await fetchNpmVersion('beta') : null;
  const stableVersion = await fetchNpmVersion('stable');

  console.log(`[update-check] installed: ${installedVersion}, stable: ${stableVersion}, beta: ${betaVersion}`);

  // Determine which version to offer (prefer stable if it's newer than both)
  let targetVersion = null;
  let targetChannel = channel;

  if (channel === 'beta') {
    // On beta channel: prefer stable if newer, otherwise beta
    if (stableVersion && isNewerVersion(stableVersion, installedVersion)) {
      // Stable is newer than installed - check if it's also newer than beta
      if (!betaVersion || isNewerVersion(stableVersion, betaVersion)) {
        targetVersion = stableVersion;
        targetChannel = 'stable';
      } else {
        targetVersion = betaVersion;
        targetChannel = 'beta';
      }
    } else if (betaVersion && isNewerVersion(betaVersion, installedVersion)) {
      targetVersion = betaVersion;
      targetChannel = 'beta';
    }
  } else {
    // On stable channel: only offer stable
    if (stableVersion && isNewerVersion(stableVersion, installedVersion)) {
      targetVersion = stableVersion;
      targetChannel = 'stable';
    }
  }

  if (targetVersion) {
    // Pre-cache the package before showing notification
    const cached = await preCachePackage(targetVersion);

    if (!cached) {
      console.log('[update-check] update found but not yet installable, skipping notification');
      return {
        updateAvailable: false,
        installedVersion,
        latestVersion: installedVersion,
        sourceVersion: installedVersion,
        installDir: manager.installDir
      };
    }

    console.log(`[update-check] update available: ${targetVersion} (${targetChannel})`);
    return {
      updateAvailable: true,
      installedVersion,
      latestVersion: targetVersion,
      sourceVersion: targetVersion,
      updateMethod: 'npm',
      channel: targetChannel,
      installDir: manager.installDir
    };
  }

  // No update available
  return {
    updateAvailable: false,
    installedVersion,
    latestVersion: stableVersion || installedVersion,
    sourceVersion: stableVersion || installedVersion,
    installDir: manager.installDir
  };
}

/**
 * Perform npm update
 * @param {string} targetVersion - Target version to install
 * @param {string} channel - 'stable' or 'beta' (default: 'stable')
 */
async function performNpmUpdate(targetVersion, channel = 'stable') {
  const maxRetries = 3;
  const retryDelayMs = 5000;
  // Tag is hardcoded to prevent injection - only 'beta' or 'latest'
  const tag = channel === 'beta' ? 'beta' : 'latest';

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Use npm install with appropriate tag (tag is validated above)
      execSync(`npm install -g coder-config@${tag}`, {
        stdio: 'pipe',
        timeout: 120000
      });

      return {
        success: true,
        updateMethod: 'npm',
        newVersion: targetVersion || 'latest',
        message: 'Updated via npm. Server will restart automatically.'
      };
    } catch (error) {
      const isEtarget = error.message.includes('ETARGET') || error.message.includes('No matching version');

      // Retry on ETARGET (CDN propagation delay) if we have retries left
      if (isEtarget && attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelayMs));
        continue;
      }

      // Final attempt failed or non-retryable error
      if (isEtarget) {
        return {
          success: false,
          error: `Version not yet available on npm CDN. Please try again in a minute. (${error.message})`
        };
      }
      return { success: false, error: error.message };
    }
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
      { src: 'shell/coder-config.zsh', dest: 'shell/coder-config.zsh' },
      { src: 'bin/coder-config', dest: 'bin/coder-config' }
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
  const { updateMethod, sourcePath, targetVersion, channel } = options;

  if (updateMethod === 'npm') {
    return await performNpmUpdate(targetVersion, channel);
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
