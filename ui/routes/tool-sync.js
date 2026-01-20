/**
 * Tool Sync Routes (Claude <-> Gemini <-> Antigravity)
 */

const fs = require('fs');
const path = require('path');

/**
 * Get the folder name for a tool
 */
function getToolFolder(tool) {
  const folders = {
    claude: '.claude',
    gemini: '.gemini',
    antigravity: '.agent'
  };
  return folders[tool] || '.claude';
}

/**
 * Get preview of files that would be synced between tools
 */
function getSyncPreview(projectDir, source = 'claude', target = 'antigravity') {
  const sourceFolder = getToolFolder(source);
  const targetFolder = getToolFolder(target);
  const sourceRulesDir = path.join(projectDir, sourceFolder, 'rules');
  const targetRulesDir = path.join(projectDir, targetFolder, 'rules');

  const result = {
    source: { tool: source, folder: sourceFolder, rulesDir: sourceRulesDir },
    target: { tool: target, folder: targetFolder, rulesDir: targetRulesDir },
    files: [],
    sourceExists: fs.existsSync(sourceRulesDir),
    targetExists: fs.existsSync(targetRulesDir),
  };

  if (!result.sourceExists) {
    return { ...result, error: `Source rules folder not found: ${sourceRulesDir}` };
  }

  // Get source files
  const sourceFiles = fs.readdirSync(sourceRulesDir).filter(f => f.endsWith('.md'));

  // Get target files for comparison
  const targetFiles = result.targetExists
    ? fs.readdirSync(targetRulesDir).filter(f => f.endsWith('.md'))
    : [];

  for (const file of sourceFiles) {
    const sourcePath = path.join(sourceRulesDir, file);
    const targetPath = path.join(targetRulesDir, file);
    const sourceContent = fs.readFileSync(sourcePath, 'utf8');
    const existsInTarget = targetFiles.includes(file);

    let status = 'new';
    let targetContent = null;

    if (existsInTarget) {
      targetContent = fs.readFileSync(targetPath, 'utf8');
      status = sourceContent === targetContent ? 'identical' : 'different';
    }

    result.files.push({
      name: file,
      sourcePath,
      targetPath,
      status,
      sourceSize: sourceContent.length,
      targetSize: targetContent?.length || 0,
    });
  }

  return result;
}

/**
 * Sync rules between tools
 */
function syncRules(projectDir, source = 'claude', target = 'antigravity', files = null) {
  const sourceFolder = getToolFolder(source);
  const targetFolder = getToolFolder(target);
  const sourceRulesDir = path.join(projectDir, sourceFolder, 'rules');
  const targetRulesDir = path.join(projectDir, targetFolder, 'rules');

  if (!fs.existsSync(sourceRulesDir)) {
    return { success: false, error: `Source rules folder not found: ${sourceRulesDir}` };
  }

  // Create target rules directory if it doesn't exist
  if (!fs.existsSync(targetRulesDir)) {
    fs.mkdirSync(targetRulesDir, { recursive: true });
  }

  // Get files to sync
  const sourceFiles = fs.readdirSync(sourceRulesDir).filter(f => f.endsWith('.md'));
  const filesToSync = files ? sourceFiles.filter(f => files.includes(f)) : sourceFiles;

  const results = {
    success: true,
    synced: [],
    skipped: [],
    errors: [],
  };

  for (const file of filesToSync) {
    try {
      const sourcePath = path.join(sourceRulesDir, file);
      const targetPath = path.join(targetRulesDir, file);
      const content = fs.readFileSync(sourcePath, 'utf8');
      fs.writeFileSync(targetPath, content);
      results.synced.push(file);
    } catch (err) {
      results.errors.push({ file, error: err.message });
    }
  }

  if (results.errors.length > 0) {
    results.success = results.synced.length > 0;
  }

  return results;
}

module.exports = {
  getSyncPreview,
  syncRules,
};
