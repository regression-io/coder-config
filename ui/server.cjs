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
const { spawn } = require('child_process');
const TerminalServer = require('./terminal-server.cjs');

class ConfigUIServer {
  constructor(port = 3333, projectDir = null, manager = null) {
    this.port = port;
    // Manager is passed from CLI to avoid circular require
    this.manager = manager;
    this.distDir = path.join(__dirname, 'dist');
    this.terminalServer = new TerminalServer();
    this.configPath = path.join(os.homedir(), '.claude-config', 'config.json');
    this.config = this.loadConfig();

    // Store server version at startup for change detection
    this.serverVersion = this.getPackageVersion();
    this.serverStartTime = Date.now();

    // Determine project directory: explicit arg > active project from registry > cwd
    if (projectDir) {
      this.projectDir = path.resolve(projectDir);
    } else {
      const activeProject = this.getActiveProjectFromRegistry();
      this.projectDir = activeProject?.path || process.cwd();
    }
    this.projectDir = path.resolve(this.projectDir);
  }

  // Get active project from registry
  getActiveProjectFromRegistry() {
    if (!this.manager) return null;
    try {
      const registry = this.manager.loadProjectsRegistry();
      if (registry.activeProjectId && registry.projects) {
        return registry.projects.find(p => p.id === registry.activeProjectId);
      }
    } catch (e) {
      // Registry doesn't exist yet
    }
    return null;
  }

  // Load user config from ~/.claude-config/config.json
  loadConfig() {
    const defaults = {
      toolsDir: path.join(os.homedir(), 'mcp-tools'),
      registryPath: path.join(os.homedir(), '.claude', 'registry.json'),
      ui: {
        port: 3333,
        openBrowser: true
      },
      // Enabled AI coding tools (generates configs for each)
      enabledTools: ['claude']  // Options: 'claude', 'antigravity'
    };

    try {
      // Migrate from old location if needed
      const oldConfigPath = path.join(os.homedir(), '.claude', 'config.json');
      if (!fs.existsSync(this.configPath) && fs.existsSync(oldConfigPath)) {
        // Migrate old config to new location
        const dir = path.dirname(this.configPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.copyFileSync(oldConfigPath, this.configPath);
        console.log('Migrated config from ~/.claude/config.json to ~/.claude-config/config.json');
      }

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

  // Get version from package.json
  getPackageVersion() {
    try {
      const pkgPath = path.join(__dirname, '..', 'package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      return pkg.version;
    } catch (e) {
      return 'unknown';
    }
  }

  // Get current version (fresh read for comparison)
  getCurrentVersion() {
    return this.getPackageVersion();
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

  // ==================== Projects Registry ====================

  /**
   * Get all registered projects with status info
   */
  getProjects() {
    if (!this.manager) {
      return { projects: [], activeProjectId: null, error: 'Manager not available' };
    }

    const registry = this.manager.loadProjectsRegistry();

    // Enrich with status info
    const projects = registry.projects.map(p => ({
      ...p,
      exists: fs.existsSync(p.path),
      hasClaudeConfig: fs.existsSync(path.join(p.path, '.claude')),
      isActive: p.id === registry.activeProjectId
    }));

    // Sort: active first, then by lastOpened
    projects.sort((a, b) => {
      if (a.isActive) return -1;
      if (b.isActive) return 1;
      if (a.lastOpened && b.lastOpened) {
        return new Date(b.lastOpened) - new Date(a.lastOpened);
      }
      return 0;
    });

    return {
      projects,
      activeProjectId: registry.activeProjectId,
      currentDir: this.projectDir
    };
  }

  /**
   * Get active project details
   */
  getActiveProject() {
    if (!this.manager) return { error: 'Manager not available' };

    const registry = this.manager.loadProjectsRegistry();
    const activeProject = registry.projects.find(p => p.id === registry.activeProjectId);

    return {
      project: activeProject || null,
      dir: this.projectDir,
      hierarchy: this.getHierarchy(),
      subprojects: this.getSubprojects()
    };
  }

  /**
   * Add a project to the registry
   */
  addProject(projectPath, name = null) {
    if (!this.manager) return { error: 'Manager not available' };

    const absPath = path.resolve(projectPath.replace(/^~/, os.homedir()));

    if (!fs.existsSync(absPath)) {
      return { error: 'Path not found', path: absPath };
    }

    const registry = this.manager.loadProjectsRegistry();

    // Check for duplicate
    if (registry.projects.some(p => p.path === absPath)) {
      return { error: 'Project already registered', path: absPath };
    }

    // Auto-create .claude folder with blank mcps.json if it doesn't exist
    const claudeDir = path.join(absPath, '.claude');
    const mcpsFile = path.join(claudeDir, 'mcps.json');
    let claudeCreated = false;

    if (!fs.existsSync(claudeDir)) {
      fs.mkdirSync(claudeDir, { recursive: true });
      claudeCreated = true;
    }

    if (!fs.existsSync(mcpsFile)) {
      fs.writeFileSync(mcpsFile, JSON.stringify({ mcpServers: {} }, null, 2));
      claudeCreated = true;
    }

    const project = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      name: name || path.basename(absPath),
      path: absPath,
      addedAt: new Date().toISOString(),
      lastOpened: null
    };

    registry.projects.push(project);

    // If first project, make it active
    if (!registry.activeProjectId) {
      registry.activeProjectId = project.id;
      this.projectDir = absPath;
    }

    this.manager.saveProjectsRegistry(registry);

    return { success: true, project, claudeCreated };
  }

  /**
   * Remove a project from the registry
   */
  removeProject(projectId) {
    if (!this.manager) return { error: 'Manager not available' };

    const registry = this.manager.loadProjectsRegistry();
    const idx = registry.projects.findIndex(p => p.id === projectId);

    if (idx === -1) {
      return { error: 'Project not found' };
    }

    const removed = registry.projects.splice(idx, 1)[0];

    // If removing active project, switch to first remaining
    if (registry.activeProjectId === projectId) {
      registry.activeProjectId = registry.projects[0]?.id || null;
      if (registry.projects[0]) {
        this.projectDir = registry.projects[0].path;
      }
    }

    this.manager.saveProjectsRegistry(registry);

    return { success: true, removed };
  }

  /**
   * Set active project and switch server context
   */
  setActiveProject(projectId) {
    if (!this.manager) return { error: 'Manager not available' };

    const registry = this.manager.loadProjectsRegistry();
    const project = registry.projects.find(p => p.id === projectId);

    if (!project) {
      return { error: 'Project not found' };
    }

    if (!fs.existsSync(project.path)) {
      return { error: 'Project path no longer exists', path: project.path };
    }

    // Update registry
    registry.activeProjectId = projectId;
    project.lastOpened = new Date().toISOString();
    this.manager.saveProjectsRegistry(registry);

    // Switch server context
    this.projectDir = project.path;

    return {
      success: true,
      project,
      dir: this.projectDir,
      hierarchy: this.getHierarchy(),
      subprojects: this.getSubprojects()
    };
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

      // Get subprojects for a specific directory
      case '/api/subprojects':
        const subDir = query.dir ? path.resolve(query.dir.replace(/^~/, os.homedir())) : this.projectDir;
        return this.json(res, { subprojects: this.getSubprojectsForDir(subDir) });

      // Add manual sub-project
      case '/api/subprojects/add':
        if (req.method === 'POST') {
          return this.json(res, this.addManualSubproject(body.projectDir, body.subprojectDir));
        }
        break;

      // Remove manual sub-project
      case '/api/subprojects/remove':
        if (req.method === 'POST') {
          return this.json(res, this.removeManualSubproject(body.projectDir, body.subprojectDir));
        }
        break;

      // Hide a sub-project
      case '/api/subprojects/hide':
        if (req.method === 'POST') {
          return this.json(res, this.hideSubproject(body.projectDir, body.subprojectDir));
        }
        break;

      // Unhide a sub-project
      case '/api/subprojects/unhide':
        if (req.method === 'POST') {
          return this.json(res, this.unhideSubproject(body.projectDir, body.subprojectDir));
        }
        break;

      // Get hidden sub-projects
      case '/api/subprojects/hidden':
        const hiddenDir = query.dir ? path.resolve(query.dir.replace(/^~/, os.homedir())) : this.projectDir;
        return this.json(res, { hidden: this.getHiddenSubprojects(hiddenDir) });

      // Detect template for a directory
      case '/api/detect-template':
        const detectDir = query.dir ? path.resolve(query.dir.replace(/^~/, os.homedir())) : null;
        if (!detectDir) {
          return this.json(res, { detected: false, error: 'Missing dir parameter' });
        }
        return this.json(res, this.detectTemplate(detectDir));

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

      // Server version (for update detection)
      case '/api/version':
        return this.json(res, {
          version: this.serverVersion,
          currentVersion: this.getCurrentVersion(),
          startTime: this.serverStartTime,
          needsRestart: this.serverVersion !== this.getCurrentVersion()
        });

      // Restart server
      case '/api/restart':
        if (req.method === 'POST') {
          // Send response first, then restart
          this.json(res, { success: true, message: 'Server restarting...' });
          setTimeout(() => {
            // Spawn new process with same args
            const args = process.argv.slice(1);
            const child = spawn(process.argv[0], args, {
              detached: true,
              stdio: 'ignore',
              cwd: process.cwd(),
              env: process.env
            });
            child.unref();
            process.exit(0);
          }, 500);
          return;
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

      // Claude Code Plugins
      case '/api/plugins':
        if (req.method === 'GET') {
          return this.json(res, this.getPlugins());
        }
        break;

      case '/api/plugins/install':
        if (req.method === 'POST') {
          return this.json(res, await this.installPlugin(body.pluginId, body.marketplace, body.scope, body.projectDir));
        }
        break;

      case '/api/plugins/uninstall':
        if (req.method === 'POST') {
          return this.json(res, await this.uninstallPlugin(body.pluginId));
        }
        break;

      case '/api/plugins/marketplaces':
        if (req.method === 'GET') {
          return this.json(res, this.getMarketplaces());
        }
        if (req.method === 'POST') {
          return this.json(res, await this.addMarketplace(body.name, body.repo));
        }
        break;

      case '/api/plugins/marketplaces/refresh':
        if (req.method === 'POST') {
          return this.json(res, await this.refreshMarketplace(body.name));
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

      // Mark template as applied (for migration, doesn't copy files)
      case '/api/mark-template':
        if (req.method === 'POST') {
          return this.json(res, this.markTemplateApplied(body.template, body.dir));
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
        const versionInfo = await this.checkForUpdates();
        return this.json(res, versionInfo);

      case '/api/update':
        if (req.method === 'POST') {
          const updateResult = await this.performUpdate(body);
          return this.json(res, updateResult);
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

      case '/api/claude-rename':
        if (req.method === 'POST') {
          return this.json(res, this.renameClaudeFile(body));
        }
        break;

      case '/api/init-claude-folder':
        if (req.method === 'POST') {
          return this.json(res, this.initClaudeFolder(body.dir));
        }
        break;

      case '/api/delete-claude-folder':
        if (req.method === 'POST') {
          return this.json(res, this.deleteClaudeFolder(body.dir));
        }
        break;

      case '/api/init-claude-folder-batch':
        if (req.method === 'POST') {
          return this.json(res, this.initClaudeFolderBatch(body.dirs));
        }
        break;

      case '/api/apply-template-batch':
        if (req.method === 'POST') {
          return this.json(res, this.applyTemplateBatch(body.templateId, body.dirs));
        }
        break;

      // Tool Sync (Claude <-> Antigravity)
      case '/api/sync/preview':
        if (req.method === 'POST') {
          return this.json(res, this.getSyncPreview(body.dir, body.source, body.target));
        }
        break;

      case '/api/sync/rules':
        if (req.method === 'POST') {
          return this.json(res, this.syncRules(body.dir, body.source, body.target, body.files));
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

      // Gemini CLI settings.json
      case '/api/gemini-settings':
        if (req.method === 'GET') {
          return this.json(res, this.getGeminiSettings());
        }
        if (req.method === 'PUT') {
          return this.json(res, this.saveGeminiSettings(body));
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

      // AI Tool detection and configuration
      case '/api/tools':
        if (req.method === 'GET') {
          return this.json(res, this.getToolsInfo());
        }
        break;

      // Directory browser
      case '/api/browse':
        if (req.method === 'POST') {
          return this.json(res, this.browseDirectory(body.path, body.type));
        }
        break;

      // Projects registry (for project switching)
      case '/api/projects':
        if (req.method === 'GET') {
          return this.json(res, this.getProjects());
        }
        if (req.method === 'POST') {
          return this.json(res, this.addProject(body.path, body.name));
        }
        break;

      case '/api/projects/active':
        if (req.method === 'GET') {
          return this.json(res, this.getActiveProject());
        }
        if (req.method === 'PUT') {
          return this.json(res, this.setActiveProject(body.id));
        }
        break;
    }

    // Dynamic route for project deletion: DELETE /api/projects/:id
    if (pathname.startsWith('/api/projects/') && req.method === 'DELETE') {
      const projectId = pathname.split('/').pop();
      if (projectId && projectId !== 'active') {
        return this.json(res, this.removeProject(projectId));
      }
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
   * Get information about available AI coding tools
   */
  getToolsInfo() {
    const toolPaths = this.manager.getToolPaths();
    const detected = this.manager.detectInstalledTools();

    // Get enabled tools from config
    const enabledTools = this.config.enabledTools || ['claude'];

    return {
      tools: Object.entries(toolPaths).map(([id, config]) => ({
        id,
        name: config.name,
        icon: config.icon,
        color: config.color,
        globalConfig: config.globalConfig,
        projectFolder: config.projectFolder,
        projectRules: config.projectRules,
        projectInstructions: config.projectInstructions,
        supportsEnvInterpolation: config.supportsEnvInterpolation,
        detected: detected[id] || { installed: false },
        enabled: enabledTools.includes(id)
      })),
      enabledTools
    };
  }

  /**
   * Find all sub-projects (immediate subdirectories with .git/)
   */
  getSubprojects() {
    return this.getSubprojectsForDir(this.projectDir);
  }

  /**
   * Find all sub-projects in a specific directory
   */
  getSubprojectsForDir(dir) {
    const subprojects = [];

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        // Skip hidden folders
        if (entry.name.startsWith('.')) continue;

        const fullPath = path.join(dir, entry.name);
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

    // Add manual sub-projects from config
    const manualSubprojects = this.config.manualSubprojects?.[dir] || [];
    for (const subDir of manualSubprojects) {
      // Skip if already detected via git
      if (subprojects.some(p => p.dir === subDir)) continue;
      // Skip if doesn't exist
      if (!fs.existsSync(subDir)) continue;

      const name = path.basename(subDir);
      const hasGit = fs.existsSync(path.join(subDir, '.git'));
      const hasClaudeDir = fs.existsSync(path.join(subDir, '.claude'));
      const hasPackageJson = fs.existsSync(path.join(subDir, 'package.json'));
      const hasPyproject = fs.existsSync(path.join(subDir, 'pyproject.toml'));
      const hasCargoToml = fs.existsSync(path.join(subDir, 'Cargo.toml'));

      const configPath = path.join(subDir, '.claude', 'mcps.json');
      const hasConfig = fs.existsSync(configPath);
      const config = hasConfig ? this.manager.loadJson(configPath) : null;

      // Calculate relative path from project root
      let relativePath = path.relative(dir, subDir);
      if (relativePath.startsWith('..')) {
        // External path - show abbreviated absolute path
        relativePath = subDir.replace(os.homedir(), '~');
      }

      subprojects.push({
        dir: subDir,
        name,
        relativePath,
        hasConfig,
        isManual: true,  // Flag to indicate manually added
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

    // Filter out hidden sub-projects
    const hiddenList = this.config.hiddenSubprojects?.[dir] || [];
    return subprojects.filter(sub => !hiddenList.includes(sub.dir));
  }

  /**
   * Add a manual sub-project
   */
  addManualSubproject(projectDir, subprojectDir) {
    const resolvedProject = path.resolve(projectDir.replace(/^~/, os.homedir()));
    const resolvedSubproject = path.resolve(subprojectDir.replace(/^~/, os.homedir()));

    if (!fs.existsSync(resolvedSubproject)) {
      return { success: false, error: 'Directory not found' };
    }

    // Initialize manualSubprojects if needed
    if (!this.config.manualSubprojects) {
      this.config.manualSubprojects = {};
    }
    if (!this.config.manualSubprojects[resolvedProject]) {
      this.config.manualSubprojects[resolvedProject] = [];
    }

    // Avoid duplicates
    if (!this.config.manualSubprojects[resolvedProject].includes(resolvedSubproject)) {
      this.config.manualSubprojects[resolvedProject].push(resolvedSubproject);
      this.saveConfig(this.config);
    }

    return { success: true, subprojects: this.getSubprojectsForDir(resolvedProject) };
  }

  /**
   * Remove a manual sub-project
   */
  removeManualSubproject(projectDir, subprojectDir) {
    const resolvedProject = path.resolve(projectDir.replace(/^~/, os.homedir()));
    const resolvedSubproject = path.resolve(subprojectDir.replace(/^~/, os.homedir()));

    if (this.config.manualSubprojects?.[resolvedProject]) {
      this.config.manualSubprojects[resolvedProject] =
        this.config.manualSubprojects[resolvedProject].filter(d => d !== resolvedSubproject);

      // Clean up empty arrays
      if (this.config.manualSubprojects[resolvedProject].length === 0) {
        delete this.config.manualSubprojects[resolvedProject];
      }
      this.saveConfig(this.config);
    }

    return { success: true, subprojects: this.getSubprojectsForDir(resolvedProject) };
  }

  /**
   * Hide a sub-project (works for both auto-detected and manual)
   */
  hideSubproject(projectDir, subprojectDir) {
    const resolvedProject = path.resolve(projectDir.replace(/^~/, os.homedir()));
    const resolvedSubproject = path.resolve(subprojectDir.replace(/^~/, os.homedir()));

    if (!this.config.hiddenSubprojects) {
      this.config.hiddenSubprojects = {};
    }
    if (!this.config.hiddenSubprojects[resolvedProject]) {
      this.config.hiddenSubprojects[resolvedProject] = [];
    }

    if (!this.config.hiddenSubprojects[resolvedProject].includes(resolvedSubproject)) {
      this.config.hiddenSubprojects[resolvedProject].push(resolvedSubproject);
      this.saveConfig(this.config);
    }

    return { success: true, subprojects: this.getSubprojectsForDir(resolvedProject) };
  }

  /**
   * Unhide a sub-project
   */
  unhideSubproject(projectDir, subprojectDir) {
    const resolvedProject = path.resolve(projectDir.replace(/^~/, os.homedir()));
    const resolvedSubproject = path.resolve(subprojectDir.replace(/^~/, os.homedir()));

    if (this.config.hiddenSubprojects?.[resolvedProject]) {
      this.config.hiddenSubprojects[resolvedProject] =
        this.config.hiddenSubprojects[resolvedProject].filter(d => d !== resolvedSubproject);

      if (this.config.hiddenSubprojects[resolvedProject].length === 0) {
        delete this.config.hiddenSubprojects[resolvedProject];
      }
      this.saveConfig(this.config);
    }

    return { success: true, subprojects: this.getSubprojectsForDir(resolvedProject) };
  }

  /**
   * Get hidden sub-projects for a project
   */
  getHiddenSubprojects(projectDir) {
    const resolvedProject = path.resolve(projectDir.replace(/^~/, os.homedir()));
    const hidden = this.config.hiddenSubprojects?.[resolvedProject] || [];

    // Return with metadata
    return hidden.map(dir => ({
      dir,
      name: path.basename(dir),
      exists: fs.existsSync(dir)
    }));
  }

  /**
   * Detect the best matching template for a directory based on project markers
   */
  detectTemplate(dir) {
    const resolvedDir = path.resolve(dir.replace(/^~/, os.homedir()));
    if (!fs.existsSync(resolvedDir)) {
      return { detected: false, error: 'Directory not found' };
    }

    // Detect project markers
    const markers = {
      npm: fs.existsSync(path.join(resolvedDir, 'package.json')),
      python: fs.existsSync(path.join(resolvedDir, 'pyproject.toml')) ||
              fs.existsSync(path.join(resolvedDir, 'requirements.txt')) ||
              fs.existsSync(path.join(resolvedDir, 'setup.py')),
      rust: fs.existsSync(path.join(resolvedDir, 'Cargo.toml')),
      go: fs.existsSync(path.join(resolvedDir, 'go.mod')),
      ruby: fs.existsSync(path.join(resolvedDir, 'Gemfile')),
    };

    // Check for framework-specific markers
    let framework = null;
    let confidence = 'low';

    if (markers.npm) {
      try {
        const pkg = JSON.parse(fs.readFileSync(path.join(resolvedDir, 'package.json'), 'utf8'));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };

        if (deps.react) {
          framework = deps.typescript ? 'react-ts' : 'react-js';
          confidence = 'high';
        } else if (deps.next) {
          framework = deps.typescript ? 'react-ts' : 'react-js'; // Next.js uses React
          confidence = 'high';
        } else if (deps.vue) {
          framework = 'languages/javascript';
          confidence = 'medium';
        } else if (deps.express || deps.fastify || deps.koa) {
          framework = deps.typescript ? 'languages/typescript' : 'languages/javascript';
          confidence = 'medium';
        } else if (deps.typescript) {
          framework = 'languages/typescript';
          confidence = 'medium';
        } else {
          framework = 'languages/javascript';
          confidence = 'low';
        }
      } catch (e) {
        framework = 'languages/javascript';
        confidence = 'low';
      }
    } else if (markers.python) {
      // Check for FastAPI or other frameworks
      const hasRequirements = fs.existsSync(path.join(resolvedDir, 'requirements.txt'));
      const hasPyproject = fs.existsSync(path.join(resolvedDir, 'pyproject.toml'));

      if (hasRequirements) {
        try {
          const reqs = fs.readFileSync(path.join(resolvedDir, 'requirements.txt'), 'utf8').toLowerCase();
          if (reqs.includes('fastapi')) {
            framework = 'fastapi';
            confidence = 'high';
          } else if (reqs.includes('django')) {
            framework = 'languages/python';
            confidence = 'medium';
          } else if (reqs.includes('flask')) {
            framework = 'languages/python';
            confidence = 'medium';
          } else if (reqs.includes('mcp')) {
            framework = 'mcp-python';
            confidence = 'high';
          }
        } catch (e) {}
      }

      if (!framework && hasPyproject) {
        try {
          const pyproject = fs.readFileSync(path.join(resolvedDir, 'pyproject.toml'), 'utf8').toLowerCase();
          if (pyproject.includes('fastapi')) {
            framework = 'fastapi';
            confidence = 'high';
          } else if (pyproject.includes('mcp')) {
            framework = 'mcp-python';
            confidence = 'high';
          }
        } catch (e) {}
      }

      if (!framework) {
        // Check if it looks like a CLI app
        const hasMain = fs.existsSync(path.join(resolvedDir, '__main__.py')) ||
                       fs.existsSync(path.join(resolvedDir, 'cli.py')) ||
                       fs.existsSync(path.join(resolvedDir, 'main.py'));
        if (hasMain) {
          framework = 'python-cli';
          confidence = 'medium';
        } else {
          framework = 'languages/python';
          confidence = 'low';
        }
      }
    } else if (markers.rust) {
      framework = 'languages/rust';
      confidence = 'medium';
    } else if (markers.go) {
      framework = 'languages/go';
      confidence = 'medium';
    }

    if (!framework) {
      return { detected: false, reason: 'No recognizable project markers found' };
    }

    // Find matching template
    const templates = this.getTemplates();
    let matchedTemplate = null;

    // First try exact match on framework name (e.g., "fastapi" -> "frameworks/fastapi")
    matchedTemplate = templates.find(t =>
      t.fullName === `frameworks/${framework}` || t.name === framework
    );

    // If framework is a language (e.g., "languages/javascript"), match it directly
    if (!matchedTemplate && framework.startsWith('languages/')) {
      matchedTemplate = templates.find(t => t.fullName === framework);
    }

    // Last resort: find a framework template that includes this language
    // (only if we still have no match)
    if (!matchedTemplate && framework.startsWith('languages/')) {
      matchedTemplate = templates.find(t =>
        t.includes && t.includes.includes(framework) && t.category === 'frameworks'
      );
    }

    if (!matchedTemplate) {
      return {
        detected: false,
        reason: `No template found for detected framework: ${framework}`,
        suggestedFramework: framework,
        markers
      };
    }

    return {
      detected: true,
      template: matchedTemplate,
      confidence,
      reason: `Detected ${framework} project`,
      markers
    };
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

  // ==================== Claude Code Plugins ====================

  getPluginsDir() {
    return path.join(os.homedir(), '.claude', 'plugins');
  }

  getPlugins() {
    const pluginsDir = this.getPluginsDir();
    const installedPath = path.join(pluginsDir, 'installed_plugins.json');
    const marketplacesPath = path.join(pluginsDir, 'known_marketplaces.json');

    // Load installed plugins
    let installed = {};
    if (fs.existsSync(installedPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(installedPath, 'utf8'));
        installed = data.plugins || {};
      } catch (e) {}
    }

    // Load marketplaces and their plugins
    const marketplaces = [];
    const allPlugins = [];
    const categories = new Set();

    if (fs.existsSync(marketplacesPath)) {
      try {
        const known = JSON.parse(fs.readFileSync(marketplacesPath, 'utf8'));
        for (const [name, info] of Object.entries(known)) {
          const marketplace = {
            name,
            source: info.source,
            installLocation: info.installLocation,
            lastUpdated: info.lastUpdated,
            plugins: [],
            externalPlugins: []
          };

          // Load marketplace manifest for internal plugins
          const manifestPath = path.join(info.installLocation, '.claude-plugin', 'marketplace.json');
          if (fs.existsSync(manifestPath)) {
            try {
              const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
              marketplace.description = manifest.description;
              marketplace.owner = manifest.owner;
              marketplace.plugins = (manifest.plugins || []).map(p => {
                if (p.category) categories.add(p.category);
                const plugin = {
                  ...p,
                  marketplace: name,
                  sourceType: 'internal',
                  installed: !!installed[`${p.name}@${name}`],
                  installedInfo: installed[`${p.name}@${name}`]?.[0] || null
                };
                allPlugins.push(plugin);
                return plugin;
              });
            } catch (e) {}
          }

          // Load external plugins by scanning external_plugins directory
          const externalDir = path.join(info.installLocation, 'external_plugins');
          if (fs.existsSync(externalDir)) {
            try {
              const externals = fs.readdirSync(externalDir, { withFileTypes: true })
                .filter(d => d.isDirectory())
                .map(d => d.name);

              for (const pluginName of externals) {
                const pluginManifestPath = path.join(externalDir, pluginName, '.claude-plugin', 'plugin.json');
                if (fs.existsSync(pluginManifestPath)) {
                  try {
                    const pluginManifest = JSON.parse(fs.readFileSync(pluginManifestPath, 'utf8'));
                    if (pluginManifest.category) categories.add(pluginManifest.category);
                    const plugin = {
                      name: pluginManifest.name || pluginName,
                      description: pluginManifest.description || '',
                      version: pluginManifest.version || '1.0.0',
                      author: pluginManifest.author,
                      category: pluginManifest.category || 'external',
                      homepage: pluginManifest.homepage,
                      mcpServers: pluginManifest.mcpServers,
                      lspServers: pluginManifest.lspServers,
                      commands: pluginManifest.commands,
                      marketplace: name,
                      sourceType: 'external',
                      installed: !!installed[`${pluginManifest.name || pluginName}@${name}`],
                      installedInfo: installed[`${pluginManifest.name || pluginName}@${name}`]?.[0] || null
                    };
                    marketplace.externalPlugins.push(plugin);
                    allPlugins.push(plugin);
                  } catch (e) {}
                }
              }
            } catch (e) {}
          }

          marketplaces.push(marketplace);
        }
      } catch (e) {}
    }

    return {
      installed,
      marketplaces,
      allPlugins,
      categories: Array.from(categories).sort(),
      pluginsDir
    };
  }

  getMarketplaces() {
    const pluginsDir = this.getPluginsDir();
    const marketplacesPath = path.join(pluginsDir, 'known_marketplaces.json');

    if (fs.existsSync(marketplacesPath)) {
      try {
        return JSON.parse(fs.readFileSync(marketplacesPath, 'utf8'));
      } catch (e) {}
    }
    return {};
  }

  async installPlugin(pluginId, marketplace, scope = 'user', projectDir = null) {
    // Use claude CLI to install
    const args = ['plugin', 'install', `${pluginId}@${marketplace}`];
    if (scope && scope !== 'user') {
      args.push('--scope', scope);
    }
    return new Promise((resolve) => {
      const proc = spawn('claude', args, {
        cwd: projectDir || os.homedir(),
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe']  // Don't wait for stdin
      });

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data) => { stdout += data.toString(); });
      proc.stderr?.on('data', (data) => { stderr += data.toString(); });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, message: stdout || 'Plugin installed' });
        } else {
          resolve({ success: false, error: stderr || stdout || 'Installation failed' });
        }
      });

      proc.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });
    });
  }

  async uninstallPlugin(pluginId) {
    // Use claude CLI to uninstall
    return new Promise((resolve) => {
      const proc = spawn('claude', ['plugin', 'uninstall', pluginId], {
        cwd: os.homedir(),
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe']  // Don't wait for stdin
      });

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data) => { stdout += data.toString(); });
      proc.stderr?.on('data', (data) => { stderr += data.toString(); });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, message: stdout || 'Plugin uninstalled' });
        } else {
          resolve({ success: false, error: stderr || stdout || 'Uninstallation failed' });
        }
      });

      proc.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });
    });
  }

  async addMarketplace(name, repo) {
    // Use claude CLI to add marketplace
    return new Promise((resolve) => {
      const proc = spawn('claude', ['plugin', 'marketplace', 'add', repo], {
        cwd: os.homedir(),
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data) => { stdout += data.toString(); });
      proc.stderr?.on('data', (data) => { stderr += data.toString(); });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, message: stdout || 'Marketplace added' });
        } else {
          resolve({ success: false, error: stderr || stdout || 'Failed to add marketplace' });
        }
      });

      proc.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });
    });
  }

  async refreshMarketplace(name) {
    // Use claude CLI to refresh/update marketplace
    return new Promise((resolve) => {
      const proc = spawn('claude', ['plugin', 'marketplace', 'update', name], {
        cwd: os.homedir(),
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data) => { stdout += data.toString(); });
      proc.stderr?.on('data', (data) => { stderr += data.toString(); });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, message: stdout || 'Marketplace refreshed' });
        } else {
          resolve({ success: false, error: stderr || stdout || 'Failed to refresh marketplace' });
        }
      });

      proc.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });
    });
  }

  // ==================== End Plugins ====================

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

  // Mark template as applied without copying files (for migration)
  markTemplateApplied(templateName, dir) {
    const targetDir = dir || this.projectDir;
    this.manager.trackAppliedTemplate(targetDir, templateName);
    return { success: true, template: templateName };
  }

  applyConfig(dir) {
    const targetDir = dir || this.projectDir;
    const enabledTools = this.config.enabledTools || ['claude'];

    // Use multi-tool apply
    const results = this.manager.applyForTools(targetDir, enabledTools);

    // Build response with details for each tool
    const toolResults = {};
    let anySuccess = false;

    for (const [tool, success] of Object.entries(results)) {
      toolResults[tool] = success;
      if (success) anySuccess = true;
    }

    return {
      success: anySuccess,
      tools: toolResults,
      enabledTools
    };
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

  async checkForUpdates() {
    // Get current installed version from the actual package location (parent of ui/)
    const installedVersion = this.getVersionFromFile(
      path.join(__dirname, '..', 'config-loader.js')
    );

    // Check npm for latest version
    const npmVersion = await this.fetchNpmVersion();

    if (npmVersion && this.isNewerVersion(npmVersion, installedVersion)) {
      return {
        updateAvailable: true,
        installedVersion,
        latestVersion: npmVersion,
        updateMethod: 'npm',
        installDir: this.manager.installDir
      };
    }

    // Also check local dev paths as fallback
    const homeDir = process.env.HOME || '';
    const sourcePaths = [
      path.join(homeDir, 'projects', 'claude-config'),
      path.join(homeDir, 'reg', 'my', 'claude-config'),
      path.join(homeDir, 'src', 'claude-config'),
      path.join(homeDir, 'dev', 'claude-config'),
      path.join(homeDir, 'code', 'claude-config'),
      path.dirname(__dirname)
    ];

    for (const sourcePath of sourcePaths) {
      const sourceLoaderPath = path.join(sourcePath, 'config-loader.js');
      if (fs.existsSync(sourceLoaderPath)) {
        const sourceVersion = this.getVersionFromFile(sourceLoaderPath);

        if (sourceVersion && this.isNewerVersion(sourceVersion, installedVersion)) {
          return {
            updateAvailable: true,
            installedVersion,
            latestVersion: sourceVersion,
            updateMethod: 'local',
            sourcePath,
            installDir: this.manager.installDir
          };
        }
      }
    }

    return {
      updateAvailable: false,
      installedVersion,
      latestVersion: npmVersion || installedVersion,
      installDir: this.manager.installDir
    };
  }

  fetchNpmVersion() {
    const https = require('https');
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

  async performUpdate(options = {}) {
    const { updateMethod, sourcePath } = options;

    // npm update
    if (updateMethod === 'npm') {
      return this.performNpmUpdate();
    }

    // Local update from source path
    if (sourcePath) {
      return this.performLocalUpdate(sourcePath);
    }

    return { success: false, error: 'No update method specified' };
  }

  performNpmUpdate() {
    return new Promise((resolve) => {
      const { execSync } = require('child_process');
      try {
        // Run npm update globally
        execSync('npm update -g @regression-io/claude-config', {
          stdio: 'pipe',
          timeout: 120000
        });

        // Get new version after update
        const newVersion = this.getVersionFromFile(
          path.join(this.manager.installDir, 'config-loader.js')
        );

        resolve({
          success: true,
          updateMethod: 'npm',
          newVersion,
          message: 'Updated via npm. Please restart the UI to use the new version.'
        });
      } catch (error) {
        resolve({ success: false, error: error.message });
      }
    });
  }

  performLocalUpdate(sourcePath) {
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
        updateMethod: 'local',
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

  // ===========================================================================
  // TOOL SYNC (Claude <-> Antigravity)
  // ===========================================================================

  /**
   * Get preview of files that would be synced between tools
   * @param {string} dir - Project directory
   * @param {string} source - Source tool ('claude' or 'antigravity')
   * @param {string} target - Target tool ('claude' or 'antigravity')
   */
  getSyncPreview(dir, source = 'claude', target = 'antigravity') {
    const projectDir = dir || this.projectDir;
    const sourceFolder = source === 'claude' ? '.claude' : '.agent';
    const targetFolder = target === 'claude' ? '.claude' : '.agent';
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
   * @param {string} dir - Project directory
   * @param {string} source - Source tool ('claude' or 'antigravity')
   * @param {string} target - Target tool ('claude' or 'antigravity')
   * @param {string[]} files - Specific files to sync (optional, syncs all if not provided)
   */
  syncRules(dir, source = 'claude', target = 'antigravity', files = null) {
    const projectDir = dir || this.projectDir;
    const sourceFolder = source === 'claude' ? '.claude' : '.agent';
    const targetFolder = target === 'claude' ? '.claude' : '.agent';
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

  /**
   * Get full .claude and .agent folder contents for each hierarchy level
   * Returns tree structure suitable for file explorer
   * Supports both Claude Code and Antigravity
   */
  getClaudeFolders() {
    // Only get paths that have .claude folders
    const configs = this.manager.findAllConfigs(this.projectDir);
    const home = os.homedir();
    const folders = [];

    for (const c of configs) {
      const dir = c.dir;
      const claudeDir = path.join(dir, '.claude');
      const agentDir = path.join(dir, '.agent');
      const geminiDir = path.join(dir, '.gemini');
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

      // Get applied templates
      folder.appliedTemplate = this.manager.getAppliedTemplate(dir);

      // Scan .claude folder
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

        // Check for workflows folder
        const workflowsDir = path.join(claudeDir, 'workflows');
        if (fs.existsSync(workflowsDir)) {
          const workflows = fs.readdirSync(workflowsDir)
            .filter(f => f.endsWith('.md'))
            .map(f => ({
              name: f,
              path: path.join(workflowsDir, f),
              type: 'workflow',
              size: fs.statSync(path.join(workflowsDir, f)).size
            }));
          if (workflows.length > 0) {
            folder.files.push({
              name: 'workflows',
              path: workflowsDir,
              type: 'folder',
              children: workflows
            });
          }
        }

        // Check for memory folder
        const memoryDir = path.join(claudeDir, 'memory');
        if (fs.existsSync(memoryDir)) {
          const memoryFiles = fs.readdirSync(memoryDir)
            .filter(f => f.endsWith('.md'))
            .map(f => ({
              name: f,
              path: path.join(memoryDir, f),
              type: 'memory',
              size: fs.statSync(path.join(memoryDir, f)).size
            }));
          if (memoryFiles.length > 0) {
            folder.files.push({
              name: 'memory',
              path: memoryDir,
              type: 'folder',
              children: memoryFiles
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

      // Scan .agent folder (Antigravity)
      if (folder.agentExists) {
        // Check for rules folder
        const agentRulesDir = path.join(agentDir, 'rules');
        if (fs.existsSync(agentRulesDir)) {
          const rules = fs.readdirSync(agentRulesDir)
            .filter(f => f.endsWith('.md'))
            .map(f => ({
              name: f,
              path: path.join(agentRulesDir, f),
              type: 'rule',
              size: fs.statSync(path.join(agentRulesDir, f)).size
            }));
          if (rules.length > 0) {
            folder.agentFiles.push({
              name: 'rules',
              path: agentRulesDir,
              type: 'folder',
              children: rules
            });
          }
        }
      }

      // Scan .gemini folder (Gemini CLI)
      if (folder.geminiExists) {
        // Check for settings.json (contains mcpServers for Gemini CLI)
        const geminiSettingsPath = path.join(geminiDir, 'settings.json');
        if (fs.existsSync(geminiSettingsPath)) {
          const content = this.manager.loadJson(geminiSettingsPath) || {};
          folder.geminiFiles.push({
            name: 'settings.json',
            path: geminiSettingsPath,
            type: 'settings',
            size: fs.statSync(geminiSettingsPath).size,
            mcpCount: Object.keys(content.mcpServers || {}).length
          });
        }

        // Check for GEMINI.md inside .gemini folder
        const geminiMdPath = path.join(geminiDir, 'GEMINI.md');
        if (fs.existsSync(geminiMdPath)) {
          folder.geminiFiles.push({
            name: 'GEMINI.md',
            path: geminiMdPath,
            type: 'geminimd',
            size: fs.statSync(geminiMdPath).size
          });
        }

        // Check for commands folder (Gemini CLI uses TOML)
        const geminiCommandsDir = path.join(geminiDir, 'commands');
        if (fs.existsSync(geminiCommandsDir)) {
          const commands = fs.readdirSync(geminiCommandsDir)
            .filter(f => f.endsWith('.toml') || f.endsWith('.md'))
            .map(f => ({
              name: f,
              path: path.join(geminiCommandsDir, f),
              type: 'command',
              size: fs.statSync(path.join(geminiCommandsDir, f)).size
            }));
          if (commands.length > 0) {
            folder.geminiFiles.push({
              name: 'commands',
              path: geminiCommandsDir,
              type: 'folder',
              children: commands
            });
          }
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

      // Check for GEMINI.md at project root (Antigravity)
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

      folders.push(folder);
    }

    // Also add all sub-projects (even unconfigured ones), including nested sub-projects
    const addSubprojectsRecursive = (parentDir, depth = 0) => {
      if (depth > 3) return; // Prevent infinite recursion

      const subprojects = this.getSubprojectsForDir(parentDir);
      for (const sub of subprojects) {
        // Skip if already added
        if (folders.some(f => f.dir === sub.dir)) continue;

        let subFolder = this.scanFolderForExplorer(sub.dir, sub.name);

        // If no config folders exist, still show the sub-project (so user can init it)
        if (!subFolder) {
          subFolder = {
            dir: sub.dir,
            label: sub.name,
            claudePath: path.join(sub.dir, '.claude'),
            agentPath: path.join(sub.dir, '.agent'),
            geminiPath: path.join(sub.dir, '.gemini'),
            exists: false,
            agentExists: false,
            geminiExists: false,
            files: [],
            agentFiles: [],
            geminiFiles: [],
            appliedTemplate: null
          };
        }

        // Always get applied templates for sub-projects
        subFolder.appliedTemplate = this.manager.getAppliedTemplate(sub.dir);
        subFolder.isSubproject = true;
        subFolder.hasConfig = sub.hasConfig;
        subFolder.mcpCount = sub.mcpCount || 0;
        subFolder.isManual = sub.isManual || false;
        subFolder.parentDir = parentDir; // Track parent for hierarchy
        subFolder.depth = depth + 1; // Depth relative to project root (home=0, project=0, subproject=1, sub-sub=2)
        folders.push(subFolder);

        // Recursively add sub-projects of this sub-project
        addSubprojectsRecursive(sub.dir, depth + 1);
      }
    };

    addSubprojectsRecursive(this.projectDir);

    return folders;
  }

  /**
   * Scan a directory for .claude, .agent, .gemini folders
   * Returns folder object for FileExplorer
   */
  scanFolderForExplorer(dir, label = null) {
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
      appliedTemplate: this.manager.getAppliedTemplate(dir)
    };

    // If none of the config folders exist, don't include
    if (!folder.exists && !folder.agentExists && !folder.geminiExists) {
      return null;
    }

    // Scan .claude folder
    if (folder.exists) {
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

      const settingsPath = path.join(claudeDir, 'settings.json');
      if (fs.existsSync(settingsPath)) {
        folder.files.push({
          name: 'settings.json',
          path: settingsPath,
          type: 'settings',
          size: fs.statSync(settingsPath).size
        });
      }

      // Commands
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

      // Rules
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

      // Workflows
      const workflowsDir = path.join(claudeDir, 'workflows');
      if (fs.existsSync(workflowsDir)) {
        const workflows = fs.readdirSync(workflowsDir)
          .filter(f => f.endsWith('.md'))
          .map(f => ({
            name: f,
            path: path.join(workflowsDir, f),
            type: 'workflow',
            size: fs.statSync(path.join(workflowsDir, f)).size
          }));
        if (workflows.length > 0) {
          folder.files.push({
            name: 'workflows',
            path: workflowsDir,
            type: 'folder',
            children: workflows
          });
        }
      }

      // Memory
      const memoryDir = path.join(claudeDir, 'memory');
      if (fs.existsSync(memoryDir)) {
        const memoryFiles = fs.readdirSync(memoryDir)
          .filter(f => f.endsWith('.md'))
          .map(f => ({
            name: f,
            path: path.join(memoryDir, f),
            type: 'memory',
            size: fs.statSync(path.join(memoryDir, f)).size
          }));
        if (memoryFiles.length > 0) {
          folder.files.push({
            name: 'memory',
            path: memoryDir,
            type: 'folder',
            children: memoryFiles
          });
        }
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

    // Scan .agent folder
    if (folder.agentExists) {
      const agentRulesDir = path.join(agentDir, 'rules');
      if (fs.existsSync(agentRulesDir)) {
        const rules = fs.readdirSync(agentRulesDir)
          .filter(f => f.endsWith('.md'))
          .map(f => ({
            name: f,
            path: path.join(agentRulesDir, f),
            type: 'rule',
            size: fs.statSync(path.join(agentRulesDir, f)).size
          }));
        if (rules.length > 0) {
          folder.agentFiles.push({
            name: 'rules',
            path: agentRulesDir,
            type: 'folder',
            children: rules
          });
        }
      }
    }

    // Scan .gemini folder
    if (folder.geminiExists) {
      const geminiSettingsPath = path.join(geminiDir, 'settings.json');
      if (fs.existsSync(geminiSettingsPath)) {
        const content = this.manager.loadJson(geminiSettingsPath) || {};
        folder.geminiFiles.push({
          name: 'settings.json',
          path: geminiSettingsPath,
          type: 'settings',
          size: fs.statSync(geminiSettingsPath).size,
          mcpCount: Object.keys(content.mcpServers || {}).length
        });
      }

      const geminiMdPath = path.join(geminiDir, 'GEMINI.md');
      if (fs.existsSync(geminiMdPath)) {
        folder.geminiFiles.push({
          name: 'GEMINI.md',
          path: geminiMdPath,
          type: 'geminimd',
          size: fs.statSync(geminiMdPath).size
        });
      }
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

    return folder;
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
      case 'workflow':
        filePath = path.join(dir, '.claude', 'workflows', name);
        break;
      case 'memory':
        filePath = path.join(dir, '.claude', 'memory', name);
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
    return { success: true, path: filePath, content: initialContent };
  }

  /**
   * Rename a .claude file (rule, command, etc.)
   */
  renameClaudeFile(body) {
    const { oldPath, newName } = body;
    if (!oldPath || !newName) {
      return { error: 'oldPath and newName are required' };
    }

    if (!fs.existsSync(oldPath)) {
      return { error: 'File not found', path: oldPath };
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
   * Initialize a .claude folder in a directory (e.g., for a sub-project)
   */
  initClaudeFolder(dir) {
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

    // Create .claude folder with mcps.json
    fs.mkdirSync(claudeDir, { recursive: true });
    fs.writeFileSync(
      path.join(claudeDir, 'mcps.json'),
      JSON.stringify({ mcpServers: {} }, null, 2)
    );

    return { success: true, dir: claudeDir };
  }

  /**
   * Delete a .claude folder from a directory
   */
  deleteClaudeFolder(dir) {
    if (!dir) {
      return { error: 'dir is required' };
    }

    const absDir = path.resolve(dir.replace(/^~/, os.homedir()));
    const claudeDir = path.join(absDir, '.claude');

    if (!fs.existsSync(claudeDir)) {
      return { error: '.claude folder not found', dir: claudeDir };
    }

    // Recursively delete the .claude folder
    fs.rmSync(claudeDir, { recursive: true, force: true });

    return { success: true, dir: claudeDir };
  }

  /**
   * Initialize .claude folders in multiple directories (batch)
   */
  initClaudeFolderBatch(dirs) {
    if (!dirs || !Array.isArray(dirs) || dirs.length === 0) {
      return { error: 'dirs array is required' };
    }

    const results = [];
    let successCount = 0;

    for (const dir of dirs) {
      const result = this.initClaudeFolder(dir);
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
   * Apply a template to multiple projects (batch)
   */
  applyTemplateBatch(templateId, dirs) {
    if (!templateId) {
      return { error: 'templateId is required' };
    }
    if (!dirs || !Array.isArray(dirs) || dirs.length === 0) {
      return { error: 'dirs array is required' };
    }

    // Load templates
    const templates = this.getTemplates();
    const template = templates.find(t => t.id === templateId);
    if (!template) {
      return { error: 'Template not found', templateId };
    }

    const results = [];
    let successCount = 0;

    for (const dir of dirs) {
      // Ensure .claude folder exists
      const absDir = path.resolve(dir.replace(/^~/, os.homedir()));
      const claudeDir = path.join(absDir, '.claude');

      if (!fs.existsSync(claudeDir)) {
        fs.mkdirSync(claudeDir, { recursive: true });
      }

      try {
        // Apply the template to this directory
        const result = this.applyTemplateToDir(template, absDir);
        results.push({ dir, success: true, ...result });
        successCount++;
      } catch (error) {
        results.push({ dir, success: false, error: error.message });
      }
    }

    return {
      success: true,
      count: successCount,
      results
    };
  }

  /**
   * Apply a template to a single directory (helper)
   */
  applyTemplateToDir(template, absDir) {
    const claudeDir = path.join(absDir, '.claude');

    // Apply MCPs from template
    if (template.mcps && template.mcps.length > 0) {
      const mcpsPath = path.join(claudeDir, 'mcps.json');
      let currentConfig = { include: [], mcpServers: {} };

      if (fs.existsSync(mcpsPath)) {
        try {
          currentConfig = JSON.parse(fs.readFileSync(mcpsPath, 'utf-8'));
        } catch (e) {
          // Start fresh if parse fails
        }
      }

      // Add template MCPs to include list
      const include = new Set(currentConfig.include || []);
      for (const mcpName of template.mcps) {
        include.add(mcpName);
      }
      currentConfig.include = Array.from(include);

      fs.writeFileSync(mcpsPath, JSON.stringify(currentConfig, null, 2));
    }

    // Apply rules from template
    if (template.rules && template.rules.length > 0) {
      const rulesDir = path.join(claudeDir, 'rules');
      if (!fs.existsSync(rulesDir)) {
        fs.mkdirSync(rulesDir, { recursive: true });
      }

      for (const rule of template.rules) {
        const rulePath = path.join(rulesDir, rule.name);
        if (!fs.existsSync(rulePath)) {
          fs.writeFileSync(rulePath, rule.content);
        }
      }
    }

    // Apply commands from template
    if (template.commands && template.commands.length > 0) {
      const commandsDir = path.join(claudeDir, 'commands');
      if (!fs.existsSync(commandsDir)) {
        fs.mkdirSync(commandsDir, { recursive: true });
      }

      for (const command of template.commands) {
        const commandPath = path.join(commandsDir, command.name);
        if (!fs.existsSync(commandPath)) {
          fs.writeFileSync(commandPath, command.content);
        }
      }
    }

    return { applied: true };
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
    } else if (sourcePath.includes('/workflows/')) {
      targetPath = path.join(targetClaudeDir, 'workflows', sourceName);
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
   * Get Gemini CLI settings from ~/.gemini/settings.json
   */
  getGeminiSettings() {
    const settingsPath = path.join(os.homedir(), '.gemini', 'settings.json');

    try {
      if (!fs.existsSync(settingsPath)) {
        return {
          path: settingsPath,
          exists: false,
          settings: {}
        };
      }

      const content = fs.readFileSync(settingsPath, 'utf8');
      const settings = JSON.parse(content);

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
   * Save Gemini CLI settings to ~/.gemini/settings.json
   */
  saveGeminiSettings(body) {
    const settingsPath = path.join(os.homedir(), '.gemini', 'settings.json');

    try {
      // Ensure .gemini directory exists
      const geminiDir = path.dirname(settingsPath);
      if (!fs.existsSync(geminiDir)) {
        fs.mkdirSync(geminiDir, { recursive: true });
      }

      // Load existing settings if they exist (to preserve mcpServers)
      let finalSettings = {};
      if (fs.existsSync(settingsPath)) {
        try {
          finalSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        } catch (e) {
          finalSettings = {};
        }
      }

      // Merge with new settings (preserves mcpServers which is managed separately)
      finalSettings = { ...finalSettings, ...body };

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

  // Parse flags properly (support both --flag=value and --flag value formats)
  let port = 3333;
  let dir = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--port=')) {
      port = parseInt(arg.split('=')[1]) || 3333;
    } else if (arg === '--port' || arg === '-p') {
      port = parseInt(args[++i]) || 3333;
    } else if (arg.startsWith('--dir=')) {
      dir = arg.split('=')[1] || null;
    } else if (arg === '--dir' || arg === '-d') {
      dir = args[++i] || null;
    } else if (!arg.startsWith('-') && fs.existsSync(arg) && fs.statSync(arg).isDirectory()) {
      // Only treat as directory if it actually exists and is a directory
      dir = arg;
    }
  }

  // Default to cwd if no dir specified
  dir = dir || process.cwd();

  // Create manager instance when running standalone
  const ClaudeConfigManager = require('../config-loader.js');
  const manager = new ClaudeConfigManager();

  const server = new ConfigUIServer(port, dir, manager);
  server.start();
}

module.exports = ConfigUIServer;
