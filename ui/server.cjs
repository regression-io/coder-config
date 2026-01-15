#!/usr/bin/env node

/**
 * Claude Config Web UI Server
 * Serves the React UI and provides API endpoints
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const os = require('os');
const TerminalServer = require('./terminal-server.cjs');

class ConfigUIServer {
  constructor(port = 3333, projectDir = process.cwd(), manager = null) {
    this.port = port;
    this.projectDir = path.resolve(projectDir);
    // Manager is passed from CLI to avoid circular require
    this.manager = manager;
    this.distDir = path.join(__dirname, 'dist');
    this.terminalServer = new TerminalServer();
    this.configPath = path.join(os.homedir(), '.claude', 'config.json');
    this.config = this.loadConfig();
  }

  // Load user config from ~/.claude/config.json
  loadConfig() {
    const defaults = {
      toolsDir: path.join(os.homedir(), 'mcp-tools'),
      registryPath: path.join(os.homedir(), '.claude', 'registry.json'),
      ui: {
        port: 3333,
        openBrowser: true
      }
    };

    try {
      if (fs.existsSync(this.configPath)) {
        const userConfig = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
        return { ...defaults, ...userConfig };
      }
    } catch (e) {
      console.error('Error loading config:', e.message);
    }
    return defaults;
  }

  // Save user config
  saveConfig(config) {
    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2) + '\n');
      this.config = config;
      return { success: true };
    } catch (e) {
      return { error: e.message };
    }
  }

  browseDirectory(dirPath, type = 'directory') {
    try {
      // Expand ~ to home directory
      const expandedPath = dirPath.replace(/^~/, os.homedir());
      const resolvedPath = path.resolve(expandedPath);

      if (!fs.existsSync(resolvedPath)) {
        return { error: 'Directory not found', path: resolvedPath };
      }

      const stat = fs.statSync(resolvedPath);
      if (!stat.isDirectory()) {
        // If it's a file, return parent directory contents
        const parentDir = path.dirname(resolvedPath);
        return this.browseDirectory(parentDir, type);
      }

      const entries = fs.readdirSync(resolvedPath, { withFileTypes: true });
      const items = [];

      // Add parent directory option
      const parentDir = path.dirname(resolvedPath);
      if (parentDir !== resolvedPath) {
        items.push({
          name: '..',
          path: parentDir,
          type: 'directory',
          isParent: true
        });
      }

      for (const entry of entries) {
        // Skip hidden files unless it's a .claude directory
        if (entry.name.startsWith('.') && entry.name !== '.claude') continue;

        const fullPath = path.join(resolvedPath, entry.name);
        const isDir = entry.isDirectory();

        // For directory picker, show all dirs; for file picker, show dirs and matching files
        if (type === 'directory' && !isDir) continue;
        if (type === 'file' && !isDir && !entry.name.endsWith('.json')) continue;

        items.push({
          name: entry.name,
          path: fullPath,
          type: isDir ? 'directory' : 'file'
        });
      }

      // Sort: directories first, then alphabetically
      items.sort((a, b) => {
        if (a.isParent) return -1;
        if (b.isParent) return 1;
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

      return {
        path: resolvedPath,
        items,
        home: os.homedir()
      };
    } catch (e) {
      return { error: e.message };
    }
  }

  start() {
    const server = http.createServer((req, res) => this.handleRequest(req, res));

    // Attach WebSocket terminal server
    this.terminalServer.attach(server);

    server.listen(this.port, () => {
      console.log(`\n🚀 Claude Config UI running at http://localhost:${this.port}`);
      console.log(`📁 Project: ${this.projectDir}`);
      console.log(`💻 Terminal WebSocket: ws://localhost:${this.port}/ws/terminal\n`);
    });
  }

  async handleRequest(req, res) {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    try {
      // API Routes
      if (pathname.startsWith('/api/')) {
        return this.handleAPI(req, res, pathname, parsedUrl.query);
      }

      // Static files from dist/
      return this.serveStatic(req, res, pathname);
    } catch (error) {
      console.error('Server error:', error);
      res.writeHead(500);
      res.end(JSON.stringify({ error: error.message }));
    }
  }

  serveStatic(req, res, pathname) {
    // Default to index.html for SPA routing
    let filePath;

    if (pathname === '/' || pathname === '/index.html') {
      filePath = path.join(this.distDir, 'index.html');
    } else {
      filePath = path.join(this.distDir, pathname);
    }

    // Security check - prevent directory traversal
    if (!filePath.startsWith(this.distDir)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      // For SPA, return index.html for unknown routes
      filePath = path.join(this.distDir, 'index.html');
      if (!fs.existsSync(filePath)) {
        res.writeHead(404);
        res.end('Not Found - Run "npm run build" in the ui/ directory first');
        return;
      }
    }

    // Determine content type
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
    };

    const contentType = contentTypes[ext] || 'application/octet-stream';

    try {
      const content = fs.readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    } catch (error) {
      res.writeHead(500);
      res.end('Error reading file');
    }
  }

  async handleAPI(req, res, pathname, query) {
    res.setHeader('Content-Type', 'application/json');

    // Parse body for POST/PUT
    let body = {};
    if (req.method === 'POST' || req.method === 'PUT') {
      body = await this.parseBody(req);
    }

    // Routes
    switch (pathname) {
      // Project info
      case '/api/project':
        return this.json(res, {
          dir: this.projectDir,
          hierarchy: this.getHierarchy(),
          subprojects: this.getSubprojects()
        });

      // Switch to a different project context
      case '/api/switch-project':
        if (req.method === 'POST') {
          return this.json(res, this.switchProject(body.dir));
        }
        break;

      // Config hierarchy
      case '/api/configs':
        return this.json(res, this.getConfigs());

      // Update a specific config
      case '/api/config':
        if (req.method === 'PUT') {
          return this.json(res, this.updateConfig(body));
        }
        break;

      // MCP Registry
      case '/api/registry':
        if (req.method === 'GET') {
          return this.json(res, this.getRegistry());
        }
        if (req.method === 'PUT') {
          return this.json(res, this.updateRegistry(body));
        }
        break;

      // Rules
      case '/api/rules':
        return this.json(res, this.getRules());

      case '/api/rule':
        if (req.method === 'GET') {
          return this.json(res, this.getRule(query.path));
        }
        if (req.method === 'PUT') {
          return this.json(res, this.saveRule(body));
        }
        if (req.method === 'DELETE') {
          return this.json(res, this.deleteRule(query.path));
        }
        if (req.method === 'POST') {
          return this.json(res, this.createRule(body));
        }
        break;

      // Commands
      case '/api/commands':
        return this.json(res, this.getCommands());

      case '/api/command':
        if (req.method === 'GET') {
          return this.json(res, this.getCommand(query.path));
        }
        if (req.method === 'PUT') {
          return this.json(res, this.saveCommand(body));
        }
        if (req.method === 'DELETE') {
          return this.json(res, this.deleteCommand(query.path));
        }
        if (req.method === 'POST') {
          return this.json(res, this.createCommand(body));
        }
        break;

      // Templates
      case '/api/templates':
        return this.json(res, this.getTemplates());

      case '/api/apply-template':
        if (req.method === 'POST') {
          return this.json(res, this.applyTemplate(body.template, body.dir));
        }
        break;

      // Apply config
      case '/api/apply':
        if (req.method === 'POST') {
          return this.json(res, this.applyConfig(body.dir));
        }
        break;

      // Env files
      case '/api/env':
        if (req.method === 'GET') {
          return this.json(res, this.getEnv(query.dir));
        }
        if (req.method === 'PUT') {
          return this.json(res, this.saveEnv(body));
        }
        break;

      // File hashes for change detection
      case '/api/file-hashes':
        return this.json(res, this.getFileHashes());

      // Version check and update
      case '/api/version-check':
        return this.json(res, this.checkForUpdates());

      case '/api/update':
        if (req.method === 'POST') {
          return this.json(res, this.performUpdate(body.sourcePath));
        }
        break;

      case '/api/reload':
        if (req.method === 'POST') {
          // Just signal that files should be reloaded - no restart needed
          return this.json(res, { success: true, message: 'Reload triggered' });
        }
        break;

      // MCP Search
      case '/api/search/github':
        if (req.method === 'GET') {
          const results = await this.searchGithub(query.q);
          return this.json(res, results);
        }
        break;

      case '/api/search/npm':
        if (req.method === 'GET') {
          const results = await this.searchNpm(query.q);
          return this.json(res, results);
        }
        break;

      case '/api/mcp-tools':
        if (req.method === 'GET') {
          const toolsDir = query.dir || this.config.toolsDir;
          const tools = await this.scanMcpTools(toolsDir);
          return this.json(res, { dir: toolsDir, tools });
        }
        break;

      // Full .claude folder contents for file explorer
      case '/api/claude-folders':
        return this.json(res, this.getClaudeFolders());

      // All intermediate paths between home and project (for move/copy)
      case '/api/intermediate-paths':
        return this.json(res, this.getIntermediatePaths());

      // Generic file operations for .claude folders
      case '/api/claude-file':
        if (req.method === 'GET') {
          return this.json(res, this.getClaudeFile(query.path));
        }
        if (req.method === 'PUT') {
          return this.json(res, this.saveClaudeFile(body));
        }
        if (req.method === 'DELETE') {
          return this.json(res, this.deleteClaudeFile(query.path));
        }
        if (req.method === 'POST') {
          return this.json(res, this.createClaudeFile(body));
        }
        break;

      // Move/copy .claude files or folders
      case '/api/claude-move':
        if (req.method === 'POST') {
          return this.json(res, this.moveClaudeItem(body));
        }
        break;

      // Memory System
      case '/api/memory':
        return this.json(res, this.getMemory());

      case '/api/memory/file':
        if (req.method === 'GET') {
          return this.json(res, this.getMemoryFile(query.path));
        }
        if (req.method === 'PUT') {
          return this.json(res, this.saveMemoryFile(body));
        }
        break;

      case '/api/memory/entry':
        if (req.method === 'POST') {
          return this.json(res, this.addMemoryEntry(body));
        }
        break;

      case '/api/memory/init':
        if (req.method === 'POST') {
          return this.json(res, this.initProjectMemory(body.dir));
        }
        break;

      case '/api/memory/search':
        if (req.method === 'GET') {
          return this.json(res, this.searchMemory(query.q));
        }
        break;

      case '/api/memory/sync':
        return this.json(res, this.getSyncState());

      // Claude Code settings.json (permissions)
      case '/api/claude-settings':
        if (req.method === 'GET') {
          return this.json(res, this.getClaudeSettings());
        }
        if (req.method === 'PUT') {
          return this.json(res, this.saveClaudeSettings(body));
        }
        break;

      // User preferences (claude-config tool settings)
      case '/api/preferences':
        if (req.method === 'GET') {
          return this.json(res, { config: this.config, path: this.configPath });
        }
        if (req.method === 'PUT') {
          return this.json(res, this.saveConfig(body));
        }
        break;

      // Directory browser
      case '/api/browse':
        if (req.method === 'POST') {
          return this.json(res, this.browseDirectory(body.path, body.type));
        }
        break;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  }

  json(res, data) {
    res.writeHead(200);
    res.end(JSON.stringify(data, null, 2));
  }

  parseBody(req) {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          resolve(JSON.parse(body || '{}'));
        } catch (e) {
          resolve({});
        }
      });
      req.on('error', reject);
    });
  }

  // API Implementations

  getHierarchy() {
    const configs = this.manager.findAllConfigs(this.projectDir);
    return configs.map(c => ({
      dir: c.dir,
      label: c.dir === process.env.HOME ? '~' : path.relative(this.projectDir, c.dir) || '.',
      configPath: c.configPath
    }));
  }

  /**
   * Find all sub-projects (immediate subdirectories with .git/)
   */
  getSubprojects() {
    const subprojects = [];

    try {
      const entries = fs.readdirSync(this.projectDir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        // Skip hidden folders
        if (entry.name.startsWith('.')) continue;

        const fullPath = path.join(this.projectDir, entry.name);
        const hasGit = fs.existsSync(path.join(fullPath, '.git'));

        // Only count as project if it has .git
        if (hasGit) {
          const hasClaudeDir = fs.existsSync(path.join(fullPath, '.claude'));
          const hasPackageJson = fs.existsSync(path.join(fullPath, 'package.json'));
          const hasPyproject = fs.existsSync(path.join(fullPath, 'pyproject.toml'));
          const hasCargoToml = fs.existsSync(path.join(fullPath, 'Cargo.toml'));

          const configPath = path.join(fullPath, '.claude', 'mcps.json');
          const hasConfig = fs.existsSync(configPath);
          const config = hasConfig ? this.manager.loadJson(configPath) : null;

          subprojects.push({
            dir: fullPath,
            name: entry.name,
            relativePath: entry.name,
            hasConfig,
            markers: {
              claude: hasClaudeDir,
              git: hasGit,
              npm: hasPackageJson,
              python: hasPyproject,
              rust: hasCargoToml
            },
            mcpCount: config ? (config.include?.length || 0) + Object.keys(config.mcpServers || {}).length : 0
          });
        }
      }
    } catch (e) {
      // Permission denied or other errors - skip
    }

    return subprojects;
  }

  /**
   * Switch the project context to a different directory
   */
  switchProject(newDir) {
    if (!fs.existsSync(newDir)) {
      return { success: false, error: 'Directory not found' };
    }

    this.projectDir = path.resolve(newDir);
    return {
      success: true,
      dir: this.projectDir,
      hierarchy: this.getHierarchy(),
      subprojects: this.getSubprojects()
    };
  }

  getConfigs() {
    const configs = this.manager.findAllConfigs(this.projectDir);
    return configs.map(c => ({
      dir: c.dir,
      label: c.dir === process.env.HOME ? '~' : path.relative(this.projectDir, c.dir) || '.',
      config: this.manager.loadJson(c.configPath) || { include: [], mcpServers: {} }
    }));
  }

  updateConfig(body) {
    const { dir, config } = body;
    const configPath = path.join(dir, '.claude', 'mcps.json');

    // Ensure directory exists
    const claudeDir = path.join(dir, '.claude');
    if (!fs.existsSync(claudeDir)) {
      fs.mkdirSync(claudeDir, { recursive: true });
    }

    this.manager.saveJson(configPath, config);
    return { success: true, path: configPath };
  }

  getRegistry() {
    return this.manager.loadJson(this.manager.registryPath) || { mcpServers: {} };
  }

  updateRegistry(body) {
    this.manager.saveJson(this.manager.registryPath, body);
    return { success: true };
  }

  getRules() {
    const configs = this.manager.findAllConfigs(this.projectDir);
    return this.manager.collectFilesFromHierarchy(configs, 'rules');
  }

  getRule(fullPath) {
    if (fs.existsSync(fullPath)) {
      return { content: fs.readFileSync(fullPath, 'utf8'), path: fullPath };
    }
    return { error: 'Not found' };
  }

  saveRule(body) {
    const { path: filePath, content } = body;
    fs.writeFileSync(filePath, content);
    return { success: true };
  }

  createRule(body) {
    const { dir, name, content } = body;
    const rulesDir = path.join(dir, '.claude', 'rules');
    if (!fs.existsSync(rulesDir)) {
      fs.mkdirSync(rulesDir, { recursive: true });
    }
    const filePath = path.join(rulesDir, name.endsWith('.md') ? name : `${name}.md`);
    fs.writeFileSync(filePath, content || `# ${name}\n\n`);
    return { success: true, path: filePath };
  }

  deleteRule(fullPath) {
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return { success: true };
    }
    return { error: 'Not found' };
  }

  getCommands() {
    const configs = this.manager.findAllConfigs(this.projectDir);
    return this.manager.collectFilesFromHierarchy(configs, 'commands');
  }

  getCommand(fullPath) {
    if (fs.existsSync(fullPath)) {
      return { content: fs.readFileSync(fullPath, 'utf8'), path: fullPath };
    }
    return { error: 'Not found' };
  }

  saveCommand(body) {
    const { path: filePath, content } = body;
    fs.writeFileSync(filePath, content);
    return { success: true };
  }

  createCommand(body) {
    const { dir, name, content } = body;
    const commandsDir = path.join(dir, '.claude', 'commands');
    if (!fs.existsSync(commandsDir)) {
      fs.mkdirSync(commandsDir, { recursive: true });
    }
    const filePath = path.join(commandsDir, name.endsWith('.md') ? name : `${name}.md`);
    fs.writeFileSync(filePath, content || `# ${name}\n\n`);
    return { success: true, path: filePath };
  }

  deleteCommand(fullPath) {
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return { success: true };
    }
    return { error: 'Not found' };
  }

  getTemplates() {
    const templates = [];
    const categories = ['frameworks', 'languages', 'composites'];

    for (const category of categories) {
      const categoryPath = path.join(this.manager.templatesDir, category);
      if (!fs.existsSync(categoryPath)) continue;

      const items = fs.readdirSync(categoryPath).filter(f =>
        fs.statSync(path.join(categoryPath, f)).isDirectory()
      );

      for (const item of items) {
        const templateJson = this.manager.loadJson(path.join(categoryPath, item, 'template.json'));
        templates.push({
          name: item,
          category,
          fullName: `${category}/${item}`,
          description: templateJson?.description || '',
          includes: templateJson?.includes || [],
          mcpDefaults: templateJson?.mcpDefaults || []
        });
      }
    }

    return templates;
  }

  applyTemplate(templateName, dir) {
    const targetDir = dir || this.projectDir;
    const result = this.manager.applyTemplate(templateName, targetDir);
    return { success: result };
  }

  applyConfig(dir) {
    const targetDir = dir || this.projectDir;
    const result = this.manager.apply(targetDir);
    return { success: result };
  }

  getEnv(dir) {
    const envPath = path.join(dir || this.projectDir, '.claude', '.env');
    if (fs.existsSync(envPath)) {
      return { content: fs.readFileSync(envPath, 'utf8'), path: envPath };
    }
    return { content: '', path: envPath };
  }

  saveEnv(body) {
    const { dir, content } = body;
    const envPath = path.join(dir, '.claude', '.env');
    const claudeDir = path.dirname(envPath);
    if (!fs.existsSync(claudeDir)) {
      fs.mkdirSync(claudeDir, { recursive: true });
    }
    fs.writeFileSync(envPath, content);
    return { success: true };
  }

  // ===========================================================================
  // FILE CHANGE DETECTION
  // ===========================================================================

  getFileHashes() {
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
    const configs = this.manager.findAllConfigs(this.projectDir);
    for (const { configPath } of configs) {
      const hash = hashFile(configPath);
      if (hash) hashes[configPath] = hash;
    }

    // Hash registry
    const registryHash = hashFile(this.manager.registryPath);
    if (registryHash) hashes[this.manager.registryPath] = registryHash;

    // Hash all rules and commands in hierarchy
    const rules = this.manager.collectFilesFromHierarchy(configs, 'rules');
    const commands = this.manager.collectFilesFromHierarchy(configs, 'commands');

    for (const { fullPath } of [...rules, ...commands]) {
      const hash = hashFile(fullPath);
      if (hash) hashes[fullPath] = hash;
    }

    // Hash env files
    for (const { dir } of configs) {
      const envPath = path.join(dir, '.claude', '.env');
      const hash = hashFile(envPath);
      if (hash) hashes[envPath] = hash;
    }

    return { hashes };
  }

  // ===========================================================================
  // VERSION CHECK AND UPDATE
  // ===========================================================================

  checkForUpdates() {
    const homeDir = process.env.HOME || '';

    // Known source paths to check (common development locations)
    const sourcePaths = [
      path.join(homeDir, 'projects', 'claude-config'),
      path.join(homeDir, 'src', 'claude-config'),
      path.join(homeDir, 'dev', 'claude-config'),
      path.join(homeDir, 'code', 'claude-config'),
      // Also check if we're running from source directly
      path.dirname(__dirname)
    ];

    // Get current installed version
    const installedVersion = this.getVersionFromFile(
      path.join(this.manager.installDir, 'config-loader.js')
    );

    // Check each source path
    for (const sourcePath of sourcePaths) {
      const sourceLoaderPath = path.join(sourcePath, 'config-loader.js');
      if (fs.existsSync(sourceLoaderPath)) {
        const sourceVersion = this.getVersionFromFile(sourceLoaderPath);

        if (sourceVersion && this.isNewerVersion(sourceVersion, installedVersion)) {
          return {
            updateAvailable: true,
            installedVersion,
            sourceVersion,
            sourcePath,
            installDir: this.manager.installDir
          };
        }

        // Found source but same/older version
        if (sourceVersion) {
          return {
            updateAvailable: false,
            installedVersion,
            sourceVersion,
            sourcePath,
            installDir: this.manager.installDir
          };
        }
      }
    }

    return {
      updateAvailable: false,
      installedVersion,
      sourceVersion: null,
      sourcePath: null,
      installDir: this.manager.installDir,
      message: 'No source directory found'
    };
  }

  getVersionFromFile(filePath) {
    try {
      if (!fs.existsSync(filePath)) return null;
      const content = fs.readFileSync(filePath, 'utf8');
      const match = content.match(/const VERSION = ['"]([^'"]+)['"]/);
      return match ? match[1] : null;
    } catch (e) {
      return null;
    }
  }

  isNewerVersion(source, installed) {
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

  performUpdate(sourcePath) {
    try {
      const installDir = this.manager.installDir;

      // Validate source path
      if (!fs.existsSync(sourcePath)) {
        return { success: false, error: 'Source path not found' };
      }

      const sourceLoaderPath = path.join(sourcePath, 'config-loader.js');
      if (!fs.existsSync(sourceLoaderPath)) {
        return { success: false, error: 'config-loader.js not found in source' };
      }

      const updated = [];
      const errors = [];

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
          // Ensure dest directory exists
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
        this.copyDirRecursive(uiDistSourceDir, uiDistDestDir);
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

      // Copy templates (if they exist)
      const templatesSourceDir = path.join(sourcePath, 'templates');
      const templatesDestDir = path.join(installDir, 'templates');
      if (fs.existsSync(templatesSourceDir)) {
        this.copyDirRecursive(templatesSourceDir, templatesDestDir);
        updated.push('templates/');
      }

      // Make bin script executable
      const binPath = path.join(installDir, 'bin', 'claude-config');
      if (fs.existsSync(binPath)) {
        fs.chmodSync(binPath, '755');
      }

      // Get new version
      const newVersion = this.getVersionFromFile(path.join(installDir, 'config-loader.js'));

      return {
        success: true,
        updated,
        errors,
        newVersion
      };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  copyDirRecursive(src, dest) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        this.copyDirRecursive(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  // ===========================================================================
  // MCP SEARCH
  // ===========================================================================

  /**
   * Search GitHub for MCP servers
   */
  async searchGithub(query) {
    const https = require('https');

    if (!query) {
      return { results: [], error: 'Query required' };
    }

    const searchQuery = encodeURIComponent(`${query} mcp server in:name,description,topics`);
    const url = `https://api.github.com/search/repositories?q=${searchQuery}&per_page=20&sort=stars`;

    return new Promise((resolve) => {
      const req = https.get(url, {
        headers: {
          'User-Agent': 'claude-config-ui/1.0',
          'Accept': 'application/vnd.github.v3+json'
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.message) {
              resolve({ results: [], error: parsed.message });
              return;
            }
            const results = (parsed.items || []).map(repo => ({
              name: repo.name,
              fullName: repo.full_name,
              description: repo.description,
              url: repo.html_url,
              stars: repo.stargazers_count,
              topics: repo.topics || [],
              suggestedCommand: 'npx',
              suggestedArgs: this.inferMcpArgs(repo)
            }));
            resolve({ results });
          } catch (e) {
            resolve({ results: [], error: e.message });
          }
        });
      });
      req.on('error', (e) => resolve({ results: [], error: e.message }));
      req.setTimeout(10000, () => {
        req.destroy();
        resolve({ results: [], error: 'Request timeout' });
      });
    });
  }

  /**
   * Infer MCP args from GitHub repo
   */
  inferMcpArgs(repo) {
    const name = repo.name.toLowerCase();
    const fullName = repo.full_name.toLowerCase();

    // Check for official MCP packages
    if (fullName.includes('modelcontextprotocol/servers')) {
      const serverName = name.replace('server-', '');
      return ['-y', `@modelcontextprotocol/server-${serverName}`];
    }

    // Check for npm-style package names
    if (repo.topics && repo.topics.includes('npm')) {
      return ['-y', repo.full_name];
    }

    // Default to running from GitHub
    return ['-y', `github:${repo.full_name}`];
  }

  /**
   * Search npm for MCP packages
   */
  async searchNpm(query) {
    const https = require('https');

    if (!query) {
      return { results: [], error: 'Query required' };
    }

    const searchQuery = encodeURIComponent(`${query} mcp`);
    const url = `https://registry.npmjs.org/-/v1/search?text=${searchQuery}&size=20`;

    return new Promise((resolve) => {
      const req = https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            const results = (parsed.objects || []).map(obj => ({
              name: obj.package.name,
              description: obj.package.description,
              version: obj.package.version,
              url: `https://www.npmjs.com/package/${obj.package.name}`,
              keywords: obj.package.keywords || [],
              suggestedCommand: 'npx',
              suggestedArgs: ['-y', obj.package.name]
            }));
            resolve({ results });
          } catch (e) {
            resolve({ results: [], error: e.message });
          }
        });
      });
      req.on('error', (e) => resolve({ results: [], error: e.message }));
      req.setTimeout(10000, () => {
        req.destroy();
        resolve({ results: [], error: 'Request timeout' });
      });
    });
  }

  /**
   * Get full .claude folder contents for each hierarchy level
   * Returns tree structure suitable for file explorer
   */
  getClaudeFolders() {
    // Only get paths that have .claude folders
    const configs = this.manager.findAllConfigs(this.projectDir);
    const home = os.homedir();
    const folders = [];

    for (const c of configs) {
      const dir = c.dir;
      const claudeDir = path.join(dir, '.claude');
      // Use actual path with ~ for home
      let label = dir;
      if (dir === home) {
        label = '~';
      } else if (dir.startsWith(home + '/')) {
        label = '~' + dir.slice(home.length);
      }
      const folder = {
        dir: dir,
        label,
        claudePath: claudeDir,
        exists: fs.existsSync(claudeDir),
        files: []
      };

      if (folder.exists) {
        // Check for mcps.json
        const mcpsPath = path.join(claudeDir, 'mcps.json');
        if (fs.existsSync(mcpsPath)) {
          const content = this.manager.loadJson(mcpsPath) || {};
          folder.files.push({
            name: 'mcps.json',
            path: mcpsPath,
            type: 'mcps',
            size: fs.statSync(mcpsPath).size,
            mcpCount: (content.include?.length || 0) + Object.keys(content.mcpServers || {}).length
          });
        }

        // Check for settings.json
        const settingsPath = path.join(claudeDir, 'settings.json');
        if (fs.existsSync(settingsPath)) {
          folder.files.push({
            name: 'settings.json',
            path: settingsPath,
            type: 'settings',
            size: fs.statSync(settingsPath).size
          });
        }

        // Check for commands folder
        const commandsDir = path.join(claudeDir, 'commands');
        if (fs.existsSync(commandsDir)) {
          const commands = fs.readdirSync(commandsDir)
            .filter(f => f.endsWith('.md'))
            .map(f => ({
              name: f,
              path: path.join(commandsDir, f),
              type: 'command',
              size: fs.statSync(path.join(commandsDir, f)).size
            }));
          if (commands.length > 0) {
            folder.files.push({
              name: 'commands',
              path: commandsDir,
              type: 'folder',
              children: commands
            });
          }
        }

        // Check for rules folder
        const rulesDir = path.join(claudeDir, 'rules');
        if (fs.existsSync(rulesDir)) {
          const rules = fs.readdirSync(rulesDir)
            .filter(f => f.endsWith('.md'))
            .map(f => ({
              name: f,
              path: path.join(rulesDir, f),
              type: 'rule',
              size: fs.statSync(path.join(rulesDir, f)).size
            }));
          if (rules.length > 0) {
            folder.files.push({
              name: 'rules',
              path: rulesDir,
              type: 'folder',
              children: rules
            });
          }
        }

        // Check for CLAUDE.md inside .claude folder
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

      // Also check for CLAUDE.md at project root
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

      folders.push(folder);
    }

    return folders;
  }

  /**
   * Get all intermediate paths between home and project
   * For use in move/copy dialogs
   */
  getIntermediatePaths() {
    const home = os.homedir();
    const paths = [];
    let current = this.projectDir;

    // Walk up from project to home
    while (current && current !== path.dirname(current)) {
      const claudeDir = path.join(current, '.claude');
      // Use actual path with ~ for home
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
        isProject: current === this.projectDir
      });

      if (current === home) break;
      current = path.dirname(current);
    }

    return paths;
  }

  /**
   * Get contents of a specific .claude file
   */
  getClaudeFile(filePath) {
    if (!filePath || !fs.existsSync(filePath)) {
      return { error: 'File not found', path: filePath };
    }

    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      return { error: 'Path is a directory', path: filePath };
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const ext = path.extname(filePath);

    // Parse JSON files
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
  saveClaudeFile(body) {
    const { path: filePath, content } = body;
    if (!filePath) {
      return { error: 'Path is required' };
    }

    // Ensure parent directory exists
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
  deleteClaudeFile(filePath) {
    if (!filePath || !fs.existsSync(filePath)) {
      return { error: 'File not found', path: filePath };
    }

    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      fs.rmSync(filePath, { recursive: true });
    } else {
      fs.unlinkSync(filePath);
    }

    return { success: true, path: filePath };
  }

  /**
   * Create a new .claude file
   */
  createClaudeFile(body) {
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
      case 'claudemd':
        filePath = path.join(dir, '.claude', 'CLAUDE.md');
        break;
      default:
        filePath = path.join(dir, '.claude', name);
    }

    // Ensure parent directory exists
    const parentDir = path.dirname(filePath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    if (fs.existsSync(filePath)) {
      return { error: 'File already exists', path: filePath };
    }

    fs.writeFileSync(filePath, initialContent, 'utf8');
    return { success: true, path: filePath };
  }

  /**
   * Move or copy a .claude file/folder to another location
   */
  moveClaudeItem(body) {
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
    } else {
      targetPath = path.join(targetClaudeDir, sourceName);
    }

    // Ensure target directory exists
    const targetParent = path.dirname(targetPath);
    if (!fs.existsSync(targetParent)) {
      fs.mkdirSync(targetParent, { recursive: true });
    }

    // Handle existing target
    if (fs.existsSync(targetPath)) {
      if (!merge) {
        return { error: 'Target already exists', targetPath, needsMerge: true };
      }

      // Merge JSON files
      if (targetPath.endsWith('.json')) {
        const sourceContent = this.manager.loadJson(sourcePath) || {};
        const targetContent = this.manager.loadJson(targetPath) || {};

        // Deep merge for mcps.json
        if (sourceName === 'mcps.json') {
          const merged = {
            ...targetContent,
            ...sourceContent,
            include: [...new Set([...(targetContent.include || []), ...(sourceContent.include || [])])],
            mcpServers: { ...(targetContent.mcpServers || {}), ...(sourceContent.mcpServers || {}) }
          };
          fs.writeFileSync(targetPath, JSON.stringify(merged, null, 2));
        } else {
          // Simple merge for other JSON
          const merged = { ...targetContent, ...sourceContent };
          fs.writeFileSync(targetPath, JSON.stringify(merged, null, 2));
        }
      } else {
        // For non-JSON, just overwrite
        fs.copyFileSync(sourcePath, targetPath);
      }
    } else {
      // Copy to target
      fs.copyFileSync(sourcePath, targetPath);
    }

    // Delete source if moving
    if (mode === 'move') {
      fs.unlinkSync(sourcePath);
    }

    return { success: true, sourcePath, targetPath, mode };
  }

  /**
   * Scan a directory for MCP tool projects
   * Looks for pyproject.toml or package.json with MCP indicators
   */
  async scanMcpTools(toolsDir) {
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

        // Check for Python MCP (pyproject.toml)
        const pyprojectPath = path.join(projectPath, 'pyproject.toml');
        if (fs.existsSync(pyprojectPath)) {
          tool.type = 'python';
          try {
            const content = fs.readFileSync(pyprojectPath, 'utf8');
            // Extract description from pyproject.toml
            const descMatch = content.match(/description\s*=\s*"([^"]+)"/);
            if (descMatch) tool.description = descMatch[1];
            // Check for mcp/fastmcp dependency
            if (content.includes('mcp') || content.includes('fastmcp')) {
              tool.framework = 'fastmcp';
            }
          } catch (e) {}
        }

        // Check for Node MCP (package.json)
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

        // Check for mcp_server.py (common FastMCP pattern)
        const mcpServerPath = path.join(projectPath, 'mcp_server.py');
        if (fs.existsSync(mcpServerPath)) {
          tool.type = 'python';
          tool.framework = tool.framework || 'fastmcp';
          tool.entryPoint = 'mcp_server.py';
        }

        // Only include if it looks like an MCP project
        if (tool.type) {
          tools.push(tool);
        }
      }
    } catch (e) {
      console.error('Error scanning MCP tools:', e.message);
    }

    return tools;
  }

  // ==================== Memory System ====================

  /**
   * Get all memory files (global + project + sync)
   */
  getMemory() {
    const home = os.homedir();
    const globalMemoryDir = path.join(home, '.claude', 'memory');
    const projectMemoryDir = path.join(this.projectDir, '.claude', 'memory');
    const syncDir = path.join(home, '.claude', 'sync');
    const templatesDir = path.join(home, '.claude', 'templates', 'project-memory');

    const result = {
      global: {
        dir: globalMemoryDir,
        files: []
      },
      project: {
        dir: projectMemoryDir,
        files: [],
        initialized: false
      },
      sync: {
        dir: syncDir,
        state: null,
        history: []
      },
      templates: {
        dir: templatesDir,
        available: fs.existsSync(templatesDir)
      }
    };

    // Global memory files
    const globalFiles = ['index.md', 'preferences.md', 'corrections.md', 'facts.md'];
    for (const file of globalFiles) {
      const filePath = path.join(globalMemoryDir, file);
      result.global.files.push({
        name: file,
        path: filePath,
        exists: fs.existsSync(filePath),
        type: file.replace('.md', '')
      });
    }

    // Project memory files
    const projectFiles = ['context.md', 'patterns.md', 'decisions.md', 'issues.md', 'history.md'];
    result.project.initialized = fs.existsSync(projectMemoryDir);
    for (const file of projectFiles) {
      const filePath = path.join(projectMemoryDir, file);
      result.project.files.push({
        name: file,
        path: filePath,
        exists: fs.existsSync(filePath),
        type: file.replace('.md', '')
      });
    }

    // Sync state
    const stateJsonPath = path.join(syncDir, 'state.json');
    const stateMdPath = path.join(syncDir, 'state.md');
    if (fs.existsSync(stateJsonPath)) {
      try {
        result.sync.state = JSON.parse(fs.readFileSync(stateJsonPath, 'utf8'));
        result.sync.stateMd = fs.existsSync(stateMdPath) ? fs.readFileSync(stateMdPath, 'utf8') : null;
      } catch (e) {
        result.sync.state = null;
      }
    }

    // Sync history
    const historyDir = path.join(syncDir, 'history');
    if (fs.existsSync(historyDir)) {
      try {
        const files = fs.readdirSync(historyDir)
          .filter(f => f.endsWith('.json'))
          .sort()
          .reverse()
          .slice(0, 10);
        result.sync.history = files.map(f => ({
          name: f,
          path: path.join(historyDir, f)
        }));
      } catch (e) {}
    }

    return result;
  }

  /**
   * Get a specific memory file content
   */
  getMemoryFile(filePath) {
    if (!filePath) {
      return { error: 'Path required' };
    }

    // Security: only allow files within .claude directories
    const home = os.homedir();
    const normalizedPath = path.resolve(filePath);
    const isGlobalMemory = normalizedPath.startsWith(path.join(home, '.claude'));
    const isProjectMemory = normalizedPath.startsWith(path.join(this.projectDir, '.claude'));

    if (!isGlobalMemory && !isProjectMemory) {
      return { error: 'Access denied: path must be within .claude directory' };
    }

    if (!fs.existsSync(normalizedPath)) {
      return { content: '', exists: false };
    }

    try {
      const content = fs.readFileSync(normalizedPath, 'utf8');
      return { content, exists: true, path: normalizedPath };
    } catch (e) {
      return { error: e.message };
    }
  }

  /**
   * Save a memory file
   */
  saveMemoryFile(body) {
    const { path: filePath, content } = body;

    if (!filePath) {
      return { error: 'Path required' };
    }

    // Security check
    const home = os.homedir();
    const normalizedPath = path.resolve(filePath);
    const isGlobalMemory = normalizedPath.startsWith(path.join(home, '.claude'));
    const isProjectMemory = normalizedPath.startsWith(path.join(this.projectDir, '.claude'));

    if (!isGlobalMemory && !isProjectMemory) {
      return { error: 'Access denied: path must be within .claude directory' };
    }

    try {
      // Ensure directory exists
      const dir = path.dirname(normalizedPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(normalizedPath, content, 'utf8');
      return { success: true, path: normalizedPath };
    } catch (e) {
      return { error: e.message };
    }
  }

  /**
   * Add a memory entry to the appropriate file
   * Types: preference, correction, fact, pattern, decision, issue, history
   */
  addMemoryEntry(body) {
    const { type, content, scope = 'global' } = body;

    if (!type || !content) {
      return { error: 'Type and content required' };
    }

    // Map type to file
    const typeToFile = {
      // Global types
      preference: { file: 'preferences.md', dir: 'global' },
      correction: { file: 'corrections.md', dir: 'global' },
      fact: { file: 'facts.md', dir: 'global' },
      // Project types
      pattern: { file: 'patterns.md', dir: 'project' },
      decision: { file: 'decisions.md', dir: 'project' },
      issue: { file: 'issues.md', dir: 'project' },
      history: { file: 'history.md', dir: 'project' },
      context: { file: 'context.md', dir: 'project' }
    };

    const mapping = typeToFile[type];
    if (!mapping) {
      return { error: `Unknown type: ${type}. Valid types: ${Object.keys(typeToFile).join(', ')}` };
    }

    // Determine target directory
    const home = os.homedir();
    let targetDir;
    if (mapping.dir === 'global' || scope === 'global') {
      targetDir = path.join(home, '.claude', 'memory');
    } else {
      targetDir = path.join(this.projectDir, '.claude', 'memory');
    }

    const targetPath = path.join(targetDir, mapping.file);

    try {
      // Ensure directory exists
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // Read existing content or create new
      let existing = '';
      if (fs.existsSync(targetPath)) {
        existing = fs.readFileSync(targetPath, 'utf8');
      } else {
        // Create with header
        existing = `# ${type.charAt(0).toUpperCase() + type.slice(1)}s\n\n`;
      }

      // Format entry with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const entry = `\n## [${timestamp}]\n${content}\n`;

      // Append entry
      fs.writeFileSync(targetPath, existing + entry, 'utf8');

      return { success: true, path: targetPath, type };
    } catch (e) {
      return { error: e.message };
    }
  }

  /**
   * Initialize project memory from templates
   */
  initProjectMemory(dir) {
    const targetDir = dir || this.projectDir;
    const home = os.homedir();
    const templatesDir = path.join(home, '.claude', 'templates', 'project-memory');
    const memoryDir = path.join(targetDir, '.claude', 'memory');

    // Check if templates exist
    if (!fs.existsSync(templatesDir)) {
      // Create default templates
      const defaultTemplates = {
        'context.md': `# Project Context\n\n## Overview\n[Describe what this project does]\n\n## Tech Stack\n- \n\n## Key Conventions\n- \n`,
        'patterns.md': `# Code Patterns\n\n## Common Patterns\n[Document recurring patterns in this codebase]\n`,
        'decisions.md': `# Architecture Decisions\n\n## ADRs\n[Record important decisions and their rationale]\n`,
        'issues.md': `# Known Issues\n\n## Current Issues\n[Track bugs, limitations, and workarounds]\n`,
        'history.md': `# Session History\n\n[Chronological log of significant work]\n`
      };

      try {
        fs.mkdirSync(templatesDir, { recursive: true });
        for (const [file, content] of Object.entries(defaultTemplates)) {
          fs.writeFileSync(path.join(templatesDir, file), content, 'utf8');
        }
      } catch (e) {
        return { error: `Failed to create templates: ${e.message}` };
      }
    }

    // Check if memory already exists
    if (fs.existsSync(memoryDir)) {
      return { error: 'Project memory already exists', dir: memoryDir };
    }

    try {
      // Copy templates to project
      fs.mkdirSync(memoryDir, { recursive: true });
      const templateFiles = fs.readdirSync(templatesDir);

      for (const file of templateFiles) {
        const src = path.join(templatesDir, file);
        const dest = path.join(memoryDir, file);
        if (fs.statSync(src).isFile()) {
          fs.copyFileSync(src, dest);
        }
      }

      return { success: true, dir: memoryDir, files: templateFiles };
    } catch (e) {
      return { error: e.message };
    }
  }

  /**
   * Search memory files for a query
   */
  searchMemory(query) {
    if (!query) {
      return { results: [] };
    }

    const home = os.homedir();
    const searchDirs = [
      path.join(home, '.claude', 'memory'),
      path.join(this.projectDir, '.claude', 'memory')
    ];

    const results = [];
    const queryLower = query.toLowerCase();

    for (const dir of searchDirs) {
      if (!fs.existsSync(dir)) continue;

      try {
        const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));

        for (const file of files) {
          const filePath = path.join(dir, file);
          const content = fs.readFileSync(filePath, 'utf8');

          if (content.toLowerCase().includes(queryLower)) {
            // Find matching lines
            const lines = content.split('\n');
            const matches = [];

            for (let i = 0; i < lines.length; i++) {
              if (lines[i].toLowerCase().includes(queryLower)) {
                matches.push({
                  line: i + 1,
                  text: lines[i].trim().substring(0, 200)
                });
              }
            }

            if (matches.length > 0) {
              results.push({
                file,
                path: filePath,
                scope: dir.includes(this.projectDir) ? 'project' : 'global',
                matches: matches.slice(0, 5) // Limit matches per file
              });
            }
          }
        }
      } catch (e) {}
    }

    return { query, results };
  }

  // ==================== Claude Code Settings (Permissions) ====================

  /**
   * Get Claude Code settings from ~/.claude/settings.json
   */
  getClaudeSettings() {
    const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');

    try {
      if (!fs.existsSync(settingsPath)) {
        return {
          path: settingsPath,
          exists: false,
          settings: { permissions: { allow: [], ask: [], deny: [] } }
        };
      }

      const content = fs.readFileSync(settingsPath, 'utf8');
      const settings = JSON.parse(content);

      // Ensure permissions structure exists
      if (!settings.permissions) {
        settings.permissions = { allow: [], ask: [], deny: [] };
      }
      if (!settings.permissions.allow) settings.permissions.allow = [];
      if (!settings.permissions.ask) settings.permissions.ask = [];
      if (!settings.permissions.deny) settings.permissions.deny = [];

      return {
        path: settingsPath,
        exists: true,
        settings
      };
    } catch (e) {
      return {
        path: settingsPath,
        error: e.message
      };
    }
  }

  /**
   * Save Claude Code settings to ~/.claude/settings.json
   */
  saveClaudeSettings(body) {
    const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');
    const { settings, permissions } = body;

    try {
      // Ensure .claude directory exists
      const claudeDir = path.dirname(settingsPath);
      if (!fs.existsSync(claudeDir)) {
        fs.mkdirSync(claudeDir, { recursive: true });
      }

      // If full settings object provided, use it
      // Otherwise, just update permissions
      let finalSettings = {};

      // Load existing settings if they exist
      if (fs.existsSync(settingsPath)) {
        try {
          finalSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        } catch (e) {
          finalSettings = {};
        }
      }

      // Update with new data
      if (settings) {
        finalSettings = { ...finalSettings, ...settings };
      }
      if (permissions) {
        finalSettings.permissions = permissions;
      }

      fs.writeFileSync(settingsPath, JSON.stringify(finalSettings, null, 2) + '\n', 'utf8');

      return {
        success: true,
        path: settingsPath,
        settings: finalSettings
      };
    } catch (e) {
      return {
        success: false,
        error: e.message
      };
    }
  }

  /**
   * Get sync state
   */
  getSyncState() {
    const home = os.homedir();
    const syncDir = path.join(home, '.claude', 'sync');

    const result = {
      dir: syncDir,
      state: null,
      stateMd: null,
      history: []
    };

    // Read state.json
    const stateJsonPath = path.join(syncDir, 'state.json');
    if (fs.existsSync(stateJsonPath)) {
      try {
        result.state = JSON.parse(fs.readFileSync(stateJsonPath, 'utf8'));
      } catch (e) {}
    }

    // Read state.md
    const stateMdPath = path.join(syncDir, 'state.md');
    if (fs.existsSync(stateMdPath)) {
      try {
        result.stateMd = fs.readFileSync(stateMdPath, 'utf8');
      } catch (e) {}
    }

    // Read history
    const historyDir = path.join(syncDir, 'history');
    if (fs.existsSync(historyDir)) {
      try {
        const files = fs.readdirSync(historyDir)
          .filter(f => f.endsWith('.json'))
          .sort()
          .reverse()
          .slice(0, 10);

        result.history = files.map(f => {
          const filePath = path.join(historyDir, f);
          try {
            return {
              name: f,
              path: filePath,
              data: JSON.parse(fs.readFileSync(filePath, 'utf8'))
            };
          } catch (e) {
            return { name: f, path: filePath, error: e.message };
          }
        });
      } catch (e) {}
    }

    return result;
  }
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  const port = parseInt(args.find(a => a.startsWith('--port='))?.split('=')[1] || '3333');
  const dir = args.find(a => !a.startsWith('--')) || process.cwd();

  // Create manager instance when running standalone
  const ClaudeConfigManager = require('../config-loader.js');
  const manager = new ClaudeConfigManager();

  const server = new ConfigUIServer(port, dir, manager);
  server.start();
}

module.exports = ConfigUIServer;
