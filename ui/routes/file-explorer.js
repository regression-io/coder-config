/**
 * File Explorer Routes
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Scan a directory for .claude, .agent, .gemini folders
 * Returns folder object for FileExplorer
 */
function scanFolderForExplorer(dir, manager, label = null) {
  const home = os.homedir();
  const claudeDir = path.join(dir, '.claude');
  const agentDir = path.join(dir, '.agent');
  const geminiDir = path.join(dir, '.gemini');

  // Use label or generate from path
  if (!label) {
    if (dir === home) {
      label = '~';
    } else if (dir.startsWith(home + '/')) {
      label = '~' + dir.slice(home.length);
    } else {
      label = dir;
    }
  }

  const folder = {
    dir: dir,
    label,
    claudePath: claudeDir,
    agentPath: agentDir,
    geminiPath: geminiDir,
    exists: fs.existsSync(claudeDir),
    agentExists: fs.existsSync(agentDir),
    geminiExists: fs.existsSync(geminiDir),
    files: [],
    agentFiles: [],
    geminiFiles: [],
    appliedTemplate: null
  };

  // If none of the config folders exist, don't include
  if (!folder.exists && !folder.agentExists && !folder.geminiExists) {
    return null;
  }

  // Scan .claude folder
  if (folder.exists) {
    scanClaudeFolder(folder, claudeDir, manager);
  }

  // Scan .agent folder
  if (folder.agentExists) {
    scanAgentFolder(folder, agentDir);
  }

  // Scan .gemini folder
  if (folder.geminiExists) {
    scanGeminiFolder(folder, geminiDir, manager);
  }

  // Root CLAUDE.md
  const rootClaudeMd = path.join(dir, 'CLAUDE.md');
  if (fs.existsSync(rootClaudeMd)) {
    folder.files.push({
      name: 'CLAUDE.md (root)',
      path: rootClaudeMd,
      type: 'claudemd',
      size: fs.statSync(rootClaudeMd).size,
      isRoot: true
    });
  }

  // Root GEMINI.md
  const rootGeminiMd = path.join(dir, 'GEMINI.md');
  if (fs.existsSync(rootGeminiMd)) {
    folder.agentFiles.push({
      name: 'GEMINI.md (root)',
      path: rootGeminiMd,
      type: 'geminimd',
      size: fs.statSync(rootGeminiMd).size,
      isRoot: true
    });
  }

  // Root AGENTS.md (Codex CLI instruction file)
  const rootAgentsMd = path.join(dir, 'AGENTS.md');
  if (fs.existsSync(rootAgentsMd)) {
    folder.files.push({
      name: 'AGENTS.md (root)',
      path: rootAgentsMd,
      type: 'agentsmd',
      tool: 'codex',
      size: fs.statSync(rootAgentsMd).size,
      isRoot: true
    });
  }

  // Root AGENTS.override.md (Codex CLI local override, typically gitignored)
  const rootAgentsOverrideMd = path.join(dir, 'AGENTS.override.md');
  if (fs.existsSync(rootAgentsOverrideMd)) {
    folder.files.push({
      name: 'AGENTS.override.md (root)',
      path: rootAgentsOverrideMd,
      type: 'agentsmd',
      tool: 'codex',
      isOverride: true,
      size: fs.statSync(rootAgentsOverrideMd).size,
      isRoot: true
    });
  }

  // Global MCPs (~/.claude.json) - only for home directory
  if (dir === home) {
    const claudeJsonPath = path.join(home, '.claude.json');
    if (fs.existsSync(claudeJsonPath)) {
      const content = manager.loadJson(claudeJsonPath) || {};
      const mcpCount = Object.keys(content.mcpServers || {}).length;
      // Insert at the beginning of files array so it appears first
      folder.files.unshift({
        name: '.claude.json',
        path: claudeJsonPath,
        type: 'global-mcps',
        size: fs.statSync(claudeJsonPath).size,
        mcpCount,
        isGlobal: true
      });
    }
  }

  return folder;
}

/**
 * Scan .claude folder contents
 */
function scanClaudeFolder(folder, claudeDir, manager) {
  // mcps.json
  const mcpsPath = path.join(claudeDir, 'mcps.json');
  if (fs.existsSync(mcpsPath)) {
    const content = manager.loadJson(mcpsPath) || {};
    folder.files.push({
      name: 'mcps.json',
      path: mcpsPath,
      type: 'mcps',
      size: fs.statSync(mcpsPath).size,
      mcpCount: (content.include?.length || 0) + Object.keys(content.mcpServers || {}).length
    });
  }

  // settings.json
  const settingsPath = path.join(claudeDir, 'settings.json');
  if (fs.existsSync(settingsPath)) {
    folder.files.push({
      name: 'settings.json',
      path: settingsPath,
      type: 'settings',
      size: fs.statSync(settingsPath).size
    });
  }

  // commands folder
  addSubfolder(folder.files, claudeDir, 'commands', '.md', 'command');

  // rules folder
  addSubfolder(folder.files, claudeDir, 'rules', '.md', 'rule');

  // workflows folder
  addSubfolder(folder.files, claudeDir, 'workflows', '.md', 'workflow');

  // memory folder
  addSubfolder(folder.files, claudeDir, 'memory', '.md', 'memory');

  // skills folder
  addSkillsFolder(folder.files, claudeDir);

  // agents folder (.claude/agents/*.md)
  addSubfolder(folder.files, claudeDir, 'agents', '.md', 'agentsmd');

  // .env file
  const envPath = path.join(claudeDir, '.env');
  if (fs.existsSync(envPath)) {
    folder.files.push({
      name: '.env',
      path: envPath,
      type: 'env',
      size: fs.statSync(envPath).size
    });
  }

  // CLAUDE.md inside .claude
  const claudeMdPath = path.join(claudeDir, 'CLAUDE.md');
  if (fs.existsSync(claudeMdPath)) {
    folder.files.push({
      name: 'CLAUDE.md',
      path: claudeMdPath,
      type: 'claudemd',
      size: fs.statSync(claudeMdPath).size
    });
  }
}

/**
 * Scan .agent folder contents
 */
function scanAgentFolder(folder, agentDir) {
  // rules folder
  addSubfolder(folder.agentFiles, agentDir, 'rules', '.md', 'rule');
}

/**
 * Scan .gemini folder contents
 */
function scanGeminiFolder(folder, geminiDir, manager) {
  // settings.json
  const geminiSettingsPath = path.join(geminiDir, 'settings.json');
  if (fs.existsSync(geminiSettingsPath)) {
    const content = manager.loadJson(geminiSettingsPath) || {};
    folder.geminiFiles.push({
      name: 'settings.json',
      path: geminiSettingsPath,
      type: 'settings',
      size: fs.statSync(geminiSettingsPath).size,
      mcpCount: Object.keys(content.mcpServers || {}).length
    });
  }

  // GEMINI.md
  const geminiMdPath = path.join(geminiDir, 'GEMINI.md');
  if (fs.existsSync(geminiMdPath)) {
    folder.geminiFiles.push({
      name: 'GEMINI.md',
      path: geminiMdPath,
      type: 'geminimd',
      size: fs.statSync(geminiMdPath).size
    });
  }

  // commands folder (Gemini uses TOML)
  const commandsDir = path.join(geminiDir, 'commands');
  if (fs.existsSync(commandsDir)) {
    const commands = fs.readdirSync(commandsDir)
      .filter(f => f.endsWith('.toml') || f.endsWith('.md'))
      .map(f => ({
        name: f,
        path: path.join(commandsDir, f),
        type: 'command',
        size: fs.statSync(path.join(commandsDir, f)).size
      }));
    if (commands.length > 0) {
      folder.geminiFiles.push({
        name: 'commands',
        path: commandsDir,
        type: 'folder',
        children: commands
      });
    }
  }
}

/**
 * Helper to add subfolder contents
 */
function addSubfolder(filesArray, parentDir, folderName, extension, fileType) {
  const dir = path.join(parentDir, folderName);
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir)
      .filter(f => f.endsWith(extension))
      .map(f => ({
        name: f,
        path: path.join(dir, f),
        type: fileType,
        size: fs.statSync(path.join(dir, f)).size
      }));
    if (files.length > 0) {
      filesArray.push({
        name: folderName,
        path: dir,
        type: 'folder',
        children: files
      });
    }
  }
}

/**
 * Helper to add skills folder contents (nested directory structure)
 */
function addSkillsFolder(filesArray, parentDir) {
  const dir = path.join(parentDir, 'skills');
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const children = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillMdPath = path.join(dir, entry.name, 'SKILL.md');
    if (fs.existsSync(skillMdPath)) {
      children.push({
        name: entry.name,
        path: skillMdPath,
        type: 'skill',
        size: fs.statSync(skillMdPath).size
      });
    }
  }
  if (children.length > 0) {
    filesArray.push({ name: 'skills', path: dir, type: 'folder', children });
  }
}

/**
 * Get all intermediate paths between home and project
 */
function getIntermediatePaths(projectDir) {
  const home = os.homedir();
  const paths = [];
  let current = projectDir;

  while (current && current !== path.dirname(current)) {
    const claudeDir = path.join(current, '.claude');
    let label = current;
    if (current === home) {
      label = '~';
    } else if (current.startsWith(home + '/')) {
      label = '~' + current.slice(home.length);
    }
    paths.unshift({
      dir: current,
      label,
      hasClaudeFolder: fs.existsSync(claudeDir),
      isHome: current === home,
      isProject: current === projectDir
    });

    if (current === home) break;
    current = path.dirname(current);
  }

  return paths;
}

/**
 * Get contents of a specific .claude file
 */
function getClaudeFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return { error: 'File not found', path: filePath };
  }

  const stat = fs.statSync(filePath);
  if (stat.isDirectory()) {
    return { error: 'Path is a directory', path: filePath };
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const ext = path.extname(filePath);

  if (ext === '.json') {
    try {
      return { path: filePath, content, parsed: JSON.parse(content) };
    } catch (e) {
      return { path: filePath, content, parseError: e.message };
    }
  }

  return { path: filePath, content };
}

/**
 * Save content to a .claude file
 */
function saveClaudeFile(body) {
  const { path: filePath, content } = body;
  if (!filePath) {
    return { error: 'Path is required' };
  }

  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filePath, content, 'utf8');
  return { success: true, path: filePath };
}

/**
 * Delete a .claude file or folder
 */
function deleteClaudeFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return { error: 'File not found', path: filePath };
  }

  const stat = fs.statSync(filePath);
  if (stat.isDirectory()) {
    fs.rmSync(filePath, { recursive: true });
  } else {
    fs.unlinkSync(filePath);

    // Skills: remove parent directory if it's now empty
    if (filePath.includes('/skills/') && path.basename(filePath) === 'SKILL.md') {
      const skillDir = path.dirname(filePath);
      try {
        const remaining = fs.readdirSync(skillDir);
        if (remaining.length === 0) {
          fs.rmdirSync(skillDir);
        }
      } catch (e) { /* ignore */ }
    }
  }

  return { success: true, path: filePath };
}

/**
 * Create a new .claude file
 */
function createClaudeFile(body) {
  const { dir, name, type, content = '' } = body;
  if (!dir || !name) {
    return { error: 'Dir and name are required' };
  }

  let filePath;
  let initialContent = content;

  switch (type) {
    case 'mcps':
      filePath = path.join(dir, '.claude', 'mcps.json');
      initialContent = content || JSON.stringify({ include: [], mcpServers: {} }, null, 2);
      break;
    case 'settings':
      filePath = path.join(dir, '.claude', 'settings.json');
      initialContent = content || JSON.stringify({}, null, 2);
      break;
    case 'command':
      filePath = path.join(dir, '.claude', 'commands', name);
      break;
    case 'rule':
      filePath = path.join(dir, '.claude', 'rules', name);
      break;
    case 'workflow':
      filePath = path.join(dir, '.claude', 'workflows', name);
      break;
    case 'memory':
      filePath = path.join(dir, '.claude', 'memory', name);
      break;
    case 'skill':
      filePath = path.join(dir, '.claude', 'skills', name, 'SKILL.md');
      break;
    case 'claudemd':
      filePath = path.join(dir, '.claude', 'CLAUDE.md');
      break;
    case 'agentsmd':
      filePath = path.join(dir, 'AGENTS.md');
      initialContent = content || '# Project Instructions\n\nInstructions for Codex CLI.\n';
      break;
    case 'agentsoverridemd':
      filePath = path.join(dir, 'AGENTS.override.md');
      initialContent = content || '# Local Overrides\n\nLocal instructions that override AGENTS.md (gitignored).\n';
      break;
    default:
      filePath = path.join(dir, '.claude', name);
  }

  const parentDir = path.dirname(filePath);
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
  }

  if (fs.existsSync(filePath)) {
    return { error: 'File already exists', path: filePath };
  }

  fs.writeFileSync(filePath, initialContent, 'utf8');

  // Auto-add AGENTS.override.md to .gitignore when created
  if (type === 'agentsoverridemd') {
    const gitignorePath = path.join(dir, '.gitignore');
    const entry = 'AGENTS.override.md';
    let gitignore = '';
    if (fs.existsSync(gitignorePath)) {
      gitignore = fs.readFileSync(gitignorePath, 'utf8');
    }
    if (!gitignore.split('\n').some(line => line.trim() === entry)) {
      const separator = gitignore && !gitignore.endsWith('\n') ? '\n' : '';
      fs.writeFileSync(gitignorePath, gitignore + separator + entry + '\n', 'utf8');
    }
  }

  return { success: true, path: filePath, content: initialContent };
}

/**
 * Rename a .claude file
 */
function renameClaudeFile(body) {
  const { oldPath, newName } = body;
  if (!oldPath || !newName) {
    return { error: 'oldPath and newName are required' };
  }

  if (!fs.existsSync(oldPath)) {
    return { error: 'File not found', path: oldPath };
  }

  // Skills: rename the parent directory instead of the file
  const isSkill = oldPath.includes('/skills/') && path.basename(oldPath) === 'SKILL.md';
  if (isSkill) {
    const skillDir = path.dirname(oldPath);
    const skillsDir = path.dirname(skillDir);
    const newSkillDir = path.join(skillsDir, newName);
    if (fs.existsSync(newSkillDir)) {
      return { error: 'A skill with that name already exists', path: newSkillDir };
    }
    fs.renameSync(skillDir, newSkillDir);
    const newPath = path.join(newSkillDir, 'SKILL.md');
    return { success: true, oldPath, newPath };
  }

  const dir = path.dirname(oldPath);
  const newPath = path.join(dir, newName.endsWith('.md') ? newName : `${newName}.md`);

  if (fs.existsSync(newPath)) {
    return { error: 'A file with that name already exists', path: newPath };
  }

  fs.renameSync(oldPath, newPath);
  return { success: true, oldPath, newPath };
}

/**
 * Initialize a .claude folder in a directory
 */
function initClaudeFolder(dir) {
  if (!dir) {
    return { error: 'dir is required' };
  }

  const absDir = path.resolve(dir.replace(/^~/, os.homedir()));
  if (!fs.existsSync(absDir)) {
    return { error: 'Directory not found', dir: absDir };
  }

  const claudeDir = path.join(absDir, '.claude');
  if (fs.existsSync(claudeDir)) {
    return { error: '.claude folder already exists', dir: claudeDir };
  }

  fs.mkdirSync(claudeDir, { recursive: true });
  fs.writeFileSync(
    path.join(claudeDir, 'mcps.json'),
    JSON.stringify({ mcpServers: {} }, null, 2)
  );

  return { success: true, dir: claudeDir };
}

/**
 * Delete a .claude folder
 */
function deleteClaudeFolder(dir) {
  if (!dir) {
    return { error: 'dir is required' };
  }

  const absDir = path.resolve(dir.replace(/^~/, os.homedir()));
  const claudeDir = path.join(absDir, '.claude');

  if (!fs.existsSync(claudeDir)) {
    return { error: '.claude folder not found', dir: claudeDir };
  }

  fs.rmSync(claudeDir, { recursive: true, force: true });
  return { success: true, dir: claudeDir };
}

/**
 * Initialize .claude folders in batch
 */
function initClaudeFolderBatch(dirs) {
  if (!dirs || !Array.isArray(dirs) || dirs.length === 0) {
    return { error: 'dirs array is required' };
  }

  const results = [];
  let successCount = 0;

  for (const dir of dirs) {
    const result = initClaudeFolder(dir);
    results.push({ dir, ...result });
    if (result.success) {
      successCount++;
    }
  }

  return {
    success: true,
    count: successCount,
    results
  };
}

/**
 * Move or copy a .claude file/folder
 */
function moveClaudeItem(body, manager) {
  const { sourcePath, targetDir, mode = 'copy', merge = false } = body;
  if (!sourcePath || !targetDir) {
    return { error: 'sourcePath and targetDir are required' };
  }

  if (!fs.existsSync(sourcePath)) {
    return { error: 'Source not found', path: sourcePath };
  }

  const sourceName = path.basename(sourcePath);
  const targetClaudeDir = path.join(targetDir, '.claude');
  let targetPath;

  // Determine target path based on source type
  if (sourceName === 'mcps.json' || sourceName === 'settings.json' || sourceName === 'CLAUDE.md') {
    targetPath = path.join(targetClaudeDir, sourceName);
  } else if (sourcePath.includes('/commands/')) {
    targetPath = path.join(targetClaudeDir, 'commands', sourceName);
  } else if (sourcePath.includes('/rules/')) {
    targetPath = path.join(targetClaudeDir, 'rules', sourceName);
  } else if (sourcePath.includes('/workflows/')) {
    targetPath = path.join(targetClaudeDir, 'workflows', sourceName);
  } else if (sourcePath.includes('/skills/') && sourceName === 'SKILL.md') {
    const skillName = path.basename(path.dirname(sourcePath));
    targetPath = path.join(targetClaudeDir, 'skills', skillName, 'SKILL.md');
  } else {
    targetPath = path.join(targetClaudeDir, sourceName);
  }

  // Ensure target directory exists
  const targetParent = path.dirname(targetPath);
  if (!fs.existsSync(targetParent)) {
    fs.mkdirSync(targetParent, { recursive: true });
  }

  const isDirectory = fs.statSync(sourcePath).isDirectory();

  // Handle existing target
  if (fs.existsSync(targetPath)) {
    if (!merge) {
      return { error: 'Target already exists', targetPath, needsMerge: true };
    }

    if (targetPath.endsWith('.json')) {
      const sourceContent = manager.loadJson(sourcePath) || {};
      const targetContent = manager.loadJson(targetPath) || {};

      if (sourceName === 'mcps.json') {
        const merged = {
          ...targetContent,
          ...sourceContent,
          include: [...new Set([...(targetContent.include || []), ...(sourceContent.include || [])])],
          mcpServers: { ...(targetContent.mcpServers || {}), ...(sourceContent.mcpServers || {}) }
        };
        fs.writeFileSync(targetPath, JSON.stringify(merged, null, 2));
      } else {
        const merged = { ...targetContent, ...sourceContent };
        fs.writeFileSync(targetPath, JSON.stringify(merged, null, 2));
      }
    } else if (isDirectory) {
      fs.cpSync(sourcePath, targetPath, { recursive: true });
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  } else if (isDirectory) {
    fs.cpSync(sourcePath, targetPath, { recursive: true });
  } else {
    fs.copyFileSync(sourcePath, targetPath);
  }

  if (mode === 'move') {
    fs.rmSync(sourcePath, { recursive: true });
  }

  return { success: true, sourcePath, targetPath, mode };
}

/**
 * Scan directory for MCP tool projects
 */
async function scanMcpTools(toolsDir) {
  const tools = [];

  try {
    if (!fs.existsSync(toolsDir)) {
      return tools;
    }

    const entries = fs.readdirSync(toolsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const projectPath = path.join(toolsDir, entry.name);
      const tool = { name: entry.name, path: projectPath, type: null };

      // Check for Python MCP
      const pyprojectPath = path.join(projectPath, 'pyproject.toml');
      if (fs.existsSync(pyprojectPath)) {
        tool.type = 'python';
        try {
          const content = fs.readFileSync(pyprojectPath, 'utf8');
          const descMatch = content.match(/description\s*=\s*"([^"]+)"/);
          if (descMatch) tool.description = descMatch[1];
          if (content.includes('mcp') || content.includes('fastmcp')) {
            tool.framework = 'fastmcp';
          }
        } catch (e) {}
      }

      // Check for Node MCP
      const packagePath = path.join(projectPath, 'package.json');
      if (fs.existsSync(packagePath)) {
        tool.type = tool.type || 'node';
        try {
          const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
          tool.description = tool.description || pkg.description;
          if (pkg.dependencies?.['@modelcontextprotocol/sdk'] || pkg.name?.includes('mcp')) {
            tool.framework = 'mcp-sdk';
          }
        } catch (e) {}
      }

      // Check for mcp_server.py
      const mcpServerPath = path.join(projectPath, 'mcp_server.py');
      if (fs.existsSync(mcpServerPath)) {
        tool.type = 'python';
        tool.framework = tool.framework || 'fastmcp';
        tool.entryPoint = 'mcp_server.py';
      }

      if (tool.type) {
        tools.push(tool);
      }
    }
  } catch (e) {
    console.error('Error scanning MCP tools:', e.message);
  }

  return tools;
}

/**
 * Get file hashes for change detection
 */
function getFileHashes(manager, projectDir, config = {}) {
  const hashes = {};
  const crypto = require('crypto');

  const hashFile = (filePath) => {
    try {
      if (!fs.existsSync(filePath)) return null;
      const content = fs.readFileSync(filePath);
      return crypto.createHash('md5').update(content).digest('hex');
    } catch (e) {
      return null;
    }
  };

  // Hash all config files in hierarchy
  const configs = manager.findAllConfigs(projectDir);
  for (const { configPath } of configs) {
    const hash = hashFile(configPath);
    if (hash) hashes[configPath] = hash;
  }

  // Hash registry
  const registryHash = hashFile(manager.registryPath);
  if (registryHash) hashes[manager.registryPath] = registryHash;

  // Hash all rules and commands
  const rules = manager.collectFilesFromHierarchy(configs, 'rules');
  const commands = manager.collectFilesFromHierarchy(configs, 'commands');

  for (const { fullPath } of [...rules, ...commands]) {
    const hash = hashFile(fullPath);
    if (hash) hashes[fullPath] = hash;
  }

  // Hash skills
  for (const { dir } of configs) {
    const skillsDir = path.join(dir, '.claude', 'skills');
    try {
      if (fs.existsSync(skillsDir)) {
        const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          const skillMdPath = path.join(skillsDir, entry.name, 'SKILL.md');
          const hash = hashFile(skillMdPath);
          if (hash) hashes[skillMdPath] = hash;
        }
      }
    } catch (e) { /* ignore */ }
  }

  // Hash env files
  for (const { dir } of configs) {
    const envPath = path.join(dir, '.claude', '.env');
    const hash = hashFile(envPath);
    if (hash) hashes[envPath] = hash;
  }

  // Hash subprojects list (detect new/removed subprojects)
  try {
    const subprojectDirs = [];
    const entries = fs.readdirSync(projectDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
      const fullPath = path.join(projectDir, entry.name);
      const hasGit = fs.existsSync(path.join(fullPath, '.git'));
      const hasClaude = fs.existsSync(path.join(fullPath, '.claude'));
      if (hasGit) {
        // Include both path and whether it has .claude config
        subprojectDirs.push(`${fullPath}:${hasClaude}`);
      }
    }
    // Also include manual subprojects
    const manualSubprojects = config.manualSubprojects?.[projectDir] || [];
    for (const subDir of manualSubprojects) {
      if (fs.existsSync(subDir)) {
        const hasClaude = fs.existsSync(path.join(subDir, '.claude'));
        subprojectDirs.push(`manual:${subDir}:${hasClaude}`);
      }
    }
    subprojectDirs.sort();
    const subprojectsHash = crypto.createHash('md5').update(subprojectDirs.join('\n')).digest('hex');
    hashes['__subprojects__'] = subprojectsHash;
  } catch (e) {
    // Ignore errors scanning for subprojects
  }

  return { hashes };
}

/**
 * Discover instruction file hierarchy for a project directory.
 * Walks from dir up to root (or home), finding CLAUDE.md, GEMINI.md, AGENTS.md at each level.
 * Returns the chain of discovered files in priority order.
 */
function getInstructionHierarchy(dir) {
  const home = os.homedir();
  const hierarchy = { dir: path.resolve(dir), claude: [], gemini: [], codex: [] };

  // Walk from dir up to HOME (don't traverse above home directory)
  let current = path.resolve(dir);
  const seen = new Set();

  while (current && !seen.has(current)) {
    seen.add(current);

    // CLAUDE.md — check root and .claude/ subfolder
    for (const candidate of [
      path.join(current, 'CLAUDE.md'),
      path.join(current, '.claude', 'CLAUDE.md'),
    ]) {
      if (fs.existsSync(candidate)) {
        const rel = current === home ? '~' : (current.startsWith(home + '/') ? '~' + current.slice(home.length) : current);
        hierarchy.claude.push({ path: candidate, dir: rel, size: fs.statSync(candidate).size });
      }
    }

    // GEMINI.md — check root and .gemini/ subfolder
    for (const candidate of [
      path.join(current, 'GEMINI.md'),
      path.join(current, '.gemini', 'GEMINI.md'),
    ]) {
      if (fs.existsSync(candidate)) {
        const rel = current === home ? '~' : (current.startsWith(home + '/') ? '~' + current.slice(home.length) : current);
        hierarchy.gemini.push({ path: candidate, dir: rel, size: fs.statSync(candidate).size });
      }
    }

    // AGENTS.md — check root (Codex walks directories looking for AGENTS.md or AGENTS.override.md)
    for (const candidate of [
      path.join(current, 'AGENTS.override.md'),
      path.join(current, 'AGENTS.md'),
    ]) {
      if (fs.existsSync(candidate)) {
        const rel = current === home ? '~' : (current.startsWith(home + '/') ? '~' + current.slice(home.length) : current);
        hierarchy.codex.push({ path: candidate, dir: rel, name: path.basename(candidate), size: fs.statSync(candidate).size });
      }
    }

    // Stop at HOME directory (don't walk above it)
    if (current === home) break;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  // Always check home directory last (global scope)
  if (!seen.has(home)) {
    const globalClaudeMd = path.join(home, '.claude', 'CLAUDE.md');
    if (fs.existsSync(globalClaudeMd)) {
      hierarchy.claude.push({ path: globalClaudeMd, dir: '~/.claude', size: fs.statSync(globalClaudeMd).size });
    }
    const globalGeminiMd = path.join(home, '.gemini', 'GEMINI.md');
    if (fs.existsSync(globalGeminiMd)) {
      hierarchy.gemini.push({ path: globalGeminiMd, dir: '~/.gemini', size: fs.statSync(globalGeminiMd).size });
    }
    const globalAgentsMd = path.join(home, '.codex', 'AGENTS.md');
    if (fs.existsSync(globalAgentsMd)) {
      hierarchy.codex.push({ path: globalAgentsMd, dir: '~/.codex', name: 'AGENTS.md', size: fs.statSync(globalAgentsMd).size });
    }
  }

  return hierarchy;
}

module.exports = {
  scanFolderForExplorer,
  getIntermediatePaths,
  getClaudeFile,
  saveClaudeFile,
  deleteClaudeFile,
  createClaudeFile,
  renameClaudeFile,
  initClaudeFolder,
  deleteClaudeFolder,
  initClaudeFolderBatch,
  moveClaudeItem,
  scanMcpTools,
  getFileHashes,
  getInstructionHierarchy,
};
