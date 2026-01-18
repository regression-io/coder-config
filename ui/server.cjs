#!/usr/bin/env node

/**
 * Claude Config Web UI Server
 * Thin wrapper that delegates to route modules
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const os = require('os');
const { spawn } = require('child_process');
const TerminalServer = require('./terminal-server.cjs');

// Route modules
const routes = require('./routes');

class ConfigUIServer {
  constructor(port = 3333, projectDir = null, manager = null) {
    this.port = port;
    this.manager = manager;
    this.distDir = path.join(__dirname, 'dist');
    this.terminalServer = new TerminalServer();
    this.configPath = path.join(os.homedir(), '.claude-config', 'config.json');
    this.config = this.loadConfig();
    this.serverVersion = this.getPackageVersion();
    this.serverStartTime = Date.now();

    // Determine project directory
    if (projectDir) {
      this.projectDir = path.resolve(projectDir);
    } else {
      const activeProject = this.getActiveProjectFromRegistry();
      this.projectDir = activeProject?.path || process.cwd();
    }
    this.projectDir = path.resolve(this.projectDir);
  }

  // ==================== Core Methods ====================

  getActiveProjectFromRegistry() {
    if (!this.manager) return null;
    try {
      const registry = this.manager.loadProjectsRegistry();
      if (registry.activeProjectId && registry.projects) {
        return registry.projects.find(p => p.id === registry.activeProjectId);
      }
    } catch (e) {}
    return null;
  }

  loadConfig() {
    const defaults = {
      toolsDir: path.join(os.homedir(), 'mcp-tools'),
      registryPath: path.join(os.homedir(), '.claude', 'registry.json'),
      ui: { port: 3333, openBrowser: true },
      enabledTools: ['claude']
    };

    try {
      const oldConfigPath = path.join(os.homedir(), '.claude', 'config.json');
      if (!fs.existsSync(this.configPath) && fs.existsSync(oldConfigPath)) {
        const dir = path.dirname(this.configPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.copyFileSync(oldConfigPath, this.configPath);
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

  saveConfig(config) {
    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2) + '\n');
      this.config = config;
      return { success: true };
    } catch (e) {
      return { error: e.message };
    }
  }

  getPackageVersion() {
    try {
      const pkgPath = path.join(__dirname, '..', 'package.json');
      return JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version;
    } catch (e) {
      return 'unknown';
    }
  }

  getChangelog() {
    try {
      const changelogPath = path.join(__dirname, '..', 'CHANGELOG.md');
      if (fs.existsSync(changelogPath)) {
        return { success: true, content: fs.readFileSync(changelogPath, 'utf8') };
      }
      return { success: false, error: 'Changelog not found' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  browseDirectory(dirPath, type = 'directory') {
    try {
      const expandedPath = dirPath.replace(/^~/, os.homedir());
      const resolvedPath = path.resolve(expandedPath);

      if (!fs.existsSync(resolvedPath)) {
        return { error: 'Directory not found', path: resolvedPath };
      }

      const stat = fs.statSync(resolvedPath);
      if (!stat.isDirectory()) {
        return this.browseDirectory(path.dirname(resolvedPath), type);
      }

      const entries = fs.readdirSync(resolvedPath, { withFileTypes: true });
      const items = [];

      const parentDir = path.dirname(resolvedPath);
      if (parentDir !== resolvedPath) {
        items.push({ name: '..', path: parentDir, type: 'directory', isParent: true });
      }

      for (const entry of entries) {
        if (entry.name.startsWith('.') && entry.name !== '.claude') continue;

        const fullPath = path.join(resolvedPath, entry.name);
        const isDir = entry.isDirectory();

        if (type === 'directory' && !isDir) continue;
        if (type === 'file' && !isDir && !entry.name.endsWith('.json')) continue;

        items.push({ name: entry.name, path: fullPath, type: isDir ? 'directory' : 'file' });
      }

      items.sort((a, b) => {
        if (a.isParent) return -1;
        if (b.isParent) return 1;
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

      return { path: resolvedPath, items, home: os.homedir() };
    } catch (e) {
      return { error: e.message };
    }
  }

  getHierarchy() {
    const configs = this.manager.findAllConfigs(this.projectDir);
    return configs.map(c => ({
      dir: c.dir,
      label: c.dir === process.env.HOME ? '~' : path.relative(this.projectDir, c.dir) || '.',
      configPath: c.configPath
    }));
  }

  getToolsInfo() {
    const toolPaths = this.manager.getToolPaths();
    const detected = this.manager.detectInstalledTools();
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

  switchProject(newDir) {
    if (!fs.existsSync(newDir)) {
      return { success: false, error: 'Directory not found' };
    }
    this.projectDir = path.resolve(newDir);
    return {
      success: true,
      dir: this.projectDir,
      hierarchy: this.getHierarchy(),
      subprojects: routes.subprojects.getSubprojectsForDir(this.manager, this.config, this.projectDir)
    };
  }

  applyConfig(dir) {
    return routes.configs.applyConfig(dir, this.projectDir, this.config, this.manager);
  }

  getClaudeFolders() {
    const configs = this.manager.findAllConfigs(this.projectDir);
    const home = os.homedir();
    const folders = [];

    for (const c of configs) {
      const folder = routes.fileExplorer.scanFolderForExplorer(c.dir, this.manager);
      if (folder) folders.push(folder);
    }

    // Add subprojects
    const addSubprojectsRecursive = (parentDir, depth = 0) => {
      if (depth > 3) return;
      const subprojects = routes.subprojects.getSubprojectsForDir(this.manager, this.config, parentDir);
      for (const sub of subprojects) {
        if (folders.some(f => f.dir === sub.dir)) continue;
        let subFolder = routes.fileExplorer.scanFolderForExplorer(sub.dir, this.manager, sub.name);
        if (!subFolder) {
          subFolder = {
            dir: sub.dir, label: sub.name,
            claudePath: path.join(sub.dir, '.claude'),
            agentPath: path.join(sub.dir, '.agent'),
            geminiPath: path.join(sub.dir, '.gemini'),
            exists: false, agentExists: false, geminiExists: false,
            files: [], agentFiles: [], geminiFiles: [],
            appliedTemplate: null
          };
        }
        subFolder.appliedTemplate = this.manager.getAppliedTemplate(sub.dir);
        subFolder.isSubproject = true;
        subFolder.hasConfig = sub.hasConfig;
        subFolder.mcpCount = sub.mcpCount || 0;
        subFolder.isManual = sub.isManual || false;
        subFolder.parentDir = parentDir;
        subFolder.depth = depth + 1;
        folders.push(subFolder);
        addSubprojectsRecursive(sub.dir, depth + 1);
      }
    };

    addSubprojectsRecursive(this.projectDir);
    return folders;
  }

  // ==================== HTTP Server ====================

  start() {
    const server = http.createServer((req, res) => this.handleRequest(req, res));
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

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    try {
      if (pathname.startsWith('/api/')) {
        return this.handleAPI(req, res, pathname, parsedUrl.query);
      }
      return this.serveStatic(req, res, pathname);
    } catch (error) {
      console.error('Server error:', error);
      res.writeHead(500);
      res.end(JSON.stringify({ error: error.message }));
    }
  }

  serveStatic(req, res, pathname) {
    let filePath = pathname === '/' || pathname === '/index.html'
      ? path.join(this.distDir, 'index.html')
      : path.join(this.distDir, pathname);

    if (!filePath.startsWith(this.distDir)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    if (!fs.existsSync(filePath)) {
      filePath = path.join(this.distDir, 'index.html');
      if (!fs.existsSync(filePath)) {
        res.writeHead(404);
        res.end('Not Found - Run "npm run build" in the ui/ directory first');
        return;
      }
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentTypes = {
      '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
      '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2'
    };

    try {
      const content = fs.readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'application/octet-stream' });
      res.end(content);
    } catch (error) {
      res.writeHead(500);
      res.end('Error reading file');
    }
  }

  async handleAPI(req, res, pathname, query) {
    res.setHeader('Content-Type', 'application/json');

    let body = {};
    if (req.method === 'POST' || req.method === 'PUT') {
      body = await this.parseBody(req);
    }

    // Route dispatch
    switch (pathname) {
      // Project info
      case '/api/project':
        return this.json(res, {
          dir: this.projectDir,
          hierarchy: this.getHierarchy(),
          subprojects: routes.subprojects.getSubprojectsForDir(this.manager, this.config, this.projectDir)
        });

      case '/api/subprojects':
        const subDir = query.dir ? path.resolve(query.dir.replace(/^~/, os.homedir())) : this.projectDir;
        return this.json(res, { subprojects: routes.subprojects.getSubprojectsForDir(this.manager, this.config, subDir) });

      case '/api/subprojects/add':
        if (req.method === 'POST') {
          return this.json(res, routes.subprojects.addManualSubproject(this.config, c => this.saveConfig(c), body.projectDir, body.subprojectDir));
        }
        break;

      case '/api/subprojects/remove':
        if (req.method === 'POST') {
          return this.json(res, routes.subprojects.removeManualSubproject(this.config, c => this.saveConfig(c), body.projectDir, body.subprojectDir));
        }
        break;

      case '/api/subprojects/hide':
        if (req.method === 'POST') {
          return this.json(res, routes.subprojects.hideSubproject(this.config, c => this.saveConfig(c), body.projectDir, body.subprojectDir));
        }
        break;

      case '/api/subprojects/unhide':
        if (req.method === 'POST') {
          return this.json(res, routes.subprojects.unhideSubproject(this.config, c => this.saveConfig(c), body.projectDir, body.subprojectDir));
        }
        break;

      case '/api/subprojects/hidden':
        const hiddenDir = query.dir ? path.resolve(query.dir.replace(/^~/, os.homedir())) : this.projectDir;
        return this.json(res, { hidden: routes.subprojects.getHiddenSubprojects(this.config, hiddenDir) });

      case '/api/switch-project':
        if (req.method === 'POST') return this.json(res, this.switchProject(body.dir));
        break;

      case '/api/configs':
        return this.json(res, routes.configs.getConfigs(this.manager, this.projectDir));

      case '/api/config':
        if (req.method === 'PUT') {
          return this.json(res, routes.configs.updateConfig(body, this.manager, dir => this.applyConfig(dir)));
        }
        break;

      case '/api/version':
        return this.json(res, {
          version: this.serverVersion,
          currentVersion: this.getPackageVersion(),
          startTime: this.serverStartTime,
          needsRestart: this.serverVersion !== this.getPackageVersion()
        });

      case '/api/changelog':
        return this.json(res, this.getChangelog());

      case '/api/restart':
        if (req.method === 'POST') {
          this.json(res, { success: true, message: 'Server restarting...' });
          setTimeout(() => {
            const child = spawn(process.argv[0], process.argv.slice(1), {
              detached: true, stdio: 'ignore', cwd: process.cwd(), env: process.env
            });
            child.unref();
            process.exit(0);
          }, 500);
          return;
        }
        break;

      case '/api/registry':
        if (req.method === 'GET') return this.json(res, routes.registry.getRegistry(this.manager));
        if (req.method === 'PUT') return this.json(res, routes.registry.updateRegistry(this.manager, body));
        break;

      case '/api/plugins':
        if (req.method === 'GET') {
          // Ensure default marketplace is installed on first access
          await routes.plugins.ensureDefaultMarketplace();
          return this.json(res, routes.plugins.getPluginsWithEnabledState(this.manager, this.projectDir));
        }
        break;

      case '/api/plugins/install':
        if (req.method === 'POST') return this.json(res, await routes.plugins.installPlugin(body.pluginId, body.marketplace, body.scope, body.projectDir));
        break;

      case '/api/plugins/uninstall':
        if (req.method === 'POST') return this.json(res, await routes.plugins.uninstallPlugin(body.pluginId));
        break;

      case '/api/plugins/enabled':
        if (req.method === 'GET') {
          const targetDir = query.dir || this.projectDir;
          return this.json(res, routes.plugins.getEnabledPluginsForDir(this.manager, targetDir));
        }
        if (req.method === 'POST') {
          return this.json(res, routes.plugins.setPluginEnabled(this.manager, body.dir, body.pluginId, body.enabled));
        }
        break;

      case '/api/plugins/marketplaces':
        if (req.method === 'GET') return this.json(res, routes.plugins.getMarketplaces());
        if (req.method === 'POST') return this.json(res, await routes.plugins.addMarketplace(body.name, body.repo));
        break;

      case '/api/plugins/marketplaces/refresh':
        if (req.method === 'POST') return this.json(res, await routes.plugins.refreshMarketplace(body.name));
        break;

      case '/api/rules':
        return this.json(res, routes.rules.getRules(this.manager, this.projectDir));

      case '/api/rule':
        if (req.method === 'GET') return this.json(res, routes.rules.getRule(query.path));
        if (req.method === 'PUT') return this.json(res, routes.rules.saveRule(body));
        if (req.method === 'DELETE') return this.json(res, routes.rules.deleteRule(query.path));
        if (req.method === 'POST') return this.json(res, routes.rules.createRule(body, this.projectDir));
        break;

      case '/api/commands':
        return this.json(res, routes.commands.getCommands(this.manager, this.projectDir));

      case '/api/command':
        if (req.method === 'GET') return this.json(res, routes.commands.getCommand(query.path));
        if (req.method === 'PUT') return this.json(res, routes.commands.saveCommand(body));
        if (req.method === 'DELETE') return this.json(res, routes.commands.deleteCommand(query.path));
        if (req.method === 'POST') return this.json(res, routes.commands.createCommand(body, this.projectDir));
        break;

      case '/api/apply':
        if (req.method === 'POST') return this.json(res, this.applyConfig(body.dir));
        break;

      case '/api/env':
        if (req.method === 'GET') return this.json(res, routes.env.getEnv(query.dir, this.projectDir));
        if (req.method === 'PUT') return this.json(res, routes.env.saveEnv(body));
        break;

      case '/api/file-hashes':
        return this.json(res, routes.fileExplorer.getFileHashes(this.manager, this.projectDir));

      case '/api/version-check':
        return this.json(res, await routes.updates.checkForUpdates(this.manager, __dirname));

      case '/api/update':
        if (req.method === 'POST') return this.json(res, await routes.updates.performUpdate(body, this.manager));
        break;

      case '/api/reload':
        if (req.method === 'POST') return this.json(res, { success: true, message: 'Reload triggered' });
        break;

      case '/api/search/github':
        if (req.method === 'GET') return this.json(res, await routes.search.searchGithub(query.q));
        break;

      case '/api/search/npm':
        if (req.method === 'GET') return this.json(res, await routes.search.searchNpm(query.q));
        break;

      case '/api/mcp-tools':
        if (req.method === 'GET') {
          const toolsDir = query.dir || this.config.toolsDir;
          return this.json(res, { dir: toolsDir, tools: await routes.fileExplorer.scanMcpTools(toolsDir) });
        }
        break;

      case '/api/claude-folders':
        return this.json(res, this.getClaudeFolders());

      case '/api/intermediate-paths':
        return this.json(res, routes.fileExplorer.getIntermediatePaths(this.projectDir));

      case '/api/claude-file':
        if (req.method === 'GET') return this.json(res, routes.fileExplorer.getClaudeFile(query.path));
        if (req.method === 'PUT') return this.json(res, routes.fileExplorer.saveClaudeFile(body));
        if (req.method === 'DELETE') return this.json(res, routes.fileExplorer.deleteClaudeFile(query.path));
        if (req.method === 'POST') return this.json(res, routes.fileExplorer.createClaudeFile(body));
        break;

      case '/api/claude-move':
        if (req.method === 'POST') return this.json(res, routes.fileExplorer.moveClaudeItem(body, this.manager));
        break;

      case '/api/claude-rename':
        if (req.method === 'POST') return this.json(res, routes.fileExplorer.renameClaudeFile(body));
        break;

      case '/api/init-claude-folder':
        if (req.method === 'POST') return this.json(res, routes.fileExplorer.initClaudeFolder(body.dir));
        break;

      case '/api/delete-claude-folder':
        if (req.method === 'POST') return this.json(res, routes.fileExplorer.deleteClaudeFolder(body.dir));
        break;

      case '/api/init-claude-folder-batch':
        if (req.method === 'POST') return this.json(res, routes.fileExplorer.initClaudeFolderBatch(body.dirs));
        break;

      case '/api/sync/preview':
        if (req.method === 'POST') return this.json(res, routes.toolSync.getSyncPreview(body.dir || this.projectDir, body.source, body.target));
        break;

      case '/api/sync/rules':
        if (req.method === 'POST') return this.json(res, routes.toolSync.syncRules(body.dir || this.projectDir, body.source, body.target, body.files));
        break;

      case '/api/memory':
        return this.json(res, routes.memory.getMemory(this.projectDir));

      case '/api/memory/file':
        if (req.method === 'GET') return this.json(res, routes.memory.getMemoryFile(query.path, this.projectDir));
        if (req.method === 'PUT') return this.json(res, routes.memory.saveMemoryFile(body, this.projectDir));
        break;

      case '/api/memory/entry':
        if (req.method === 'POST') return this.json(res, routes.memory.addMemoryEntry(body, this.projectDir));
        break;

      case '/api/memory/init':
        if (req.method === 'POST') return this.json(res, routes.memory.initProjectMemory(body.dir, this.projectDir));
        break;

      case '/api/memory/search':
        if (req.method === 'GET') return this.json(res, routes.memory.searchMemory(query.q, this.projectDir));
        break;

      case '/api/memory/sync':
        return this.json(res, routes.memory.getSyncState());

      case '/api/claude-settings':
        if (req.method === 'GET') return this.json(res, routes.settings.getClaudeSettings());
        if (req.method === 'PUT') return this.json(res, routes.settings.saveClaudeSettings(body));
        break;

      case '/api/gemini-settings':
        if (req.method === 'GET') return this.json(res, routes.settings.getGeminiSettings());
        if (req.method === 'PUT') return this.json(res, routes.settings.saveGeminiSettings(body));
        break;

      case '/api/preferences':
        if (req.method === 'GET') return this.json(res, { config: this.config, path: this.configPath });
        if (req.method === 'PUT') return this.json(res, this.saveConfig(body));
        break;

      case '/api/tools':
        if (req.method === 'GET') return this.json(res, this.getToolsInfo());
        break;

      case '/api/browse':
        if (req.method === 'POST') return this.json(res, this.browseDirectory(body.path, body.type));
        break;

      case '/api/projects':
        if (req.method === 'GET') return this.json(res, routes.projects.getProjects(this.manager, this.projectDir));
        if (req.method === 'POST') return this.json(res, routes.projects.addProject(this.manager, body.path, body.name));
        break;

      case '/api/projects/active':
        if (req.method === 'GET') return this.json(res, routes.projects.getActiveProject(this.manager, this.projectDir, () => this.getHierarchy(), () => routes.subprojects.getSubprojectsForDir(this.manager, this.config, this.projectDir)));
        if (req.method === 'PUT') {
          const result = routes.projects.setActiveProject(this.manager, body.id, () => this.getHierarchy(), () => routes.subprojects.getSubprojectsForDir(this.manager, this.config, this.projectDir));
          if (result.success) this.projectDir = result.project.path;
          return this.json(res, result);
        }
        break;

      case '/api/workstreams':
        if (req.method === 'GET') return this.json(res, routes.workstreams.getWorkstreams(this.manager));
        if (req.method === 'POST') return this.json(res, routes.workstreams.createWorkstream(this.manager, body));
        break;

      case '/api/workstreams/active':
        if (req.method === 'GET') return this.json(res, routes.workstreams.getActiveWorkstream(this.manager));
        if (req.method === 'PUT') return this.json(res, routes.workstreams.setActiveWorkstream(this.manager, body.id));
        break;

      case '/api/workstreams/inject':
        if (req.method === 'GET') return this.json(res, routes.workstreams.injectWorkstream(this.manager));
        break;

      case '/api/workstreams/detect':
        if (req.method === 'POST') return this.json(res, routes.workstreams.detectWorkstream(this.manager, body.dir || this.projectDir));
        break;

      case '/api/workstreams/hook-status':
        if (req.method === 'GET') return this.json(res, routes.workstreams.getWorkstreamHookStatus());
        break;

      case '/api/workstreams/install-hook':
        if (req.method === 'POST') return this.json(res, routes.workstreams.installWorkstreamHook());
        break;

      case '/api/activity':
        if (req.method === 'GET') return this.json(res, routes.activity.getActivitySummary(this.manager));
        if (req.method === 'DELETE') return this.json(res, routes.activity.clearActivity(this.manager, body.olderThanDays || 30));
        break;

      case '/api/activity/log':
        if (req.method === 'POST') return this.json(res, routes.activity.logActivity(this.manager, body.files, body.sessionId));
        break;

      case '/api/activity/suggestions':
        if (req.method === 'GET') return this.json(res, routes.activity.getWorkstreamSuggestions(this.manager));
        break;

      case '/api/smart-sync/status':
        if (req.method === 'GET') return this.json(res, routes.smartSync.getSmartSyncStatus(this.manager));
        break;

      case '/api/smart-sync/detect':
        if (req.method === 'POST') return this.json(res, routes.smartSync.smartSyncDetect(this.manager, body.projects));
        break;

      case '/api/smart-sync/nudge':
        if (req.method === 'POST') return this.json(res, routes.smartSync.smartSyncCheckNudge(this.manager, body.projects));
        break;

      case '/api/smart-sync/action':
        if (req.method === 'POST') return this.json(res, routes.smartSync.smartSyncHandleAction(this.manager, body.nudgeKey, body.action, body.context));
        break;

      case '/api/smart-sync/settings':
        if (req.method === 'PUT') return this.json(res, routes.smartSync.smartSyncUpdateSettings(this.manager, body));
        break;

      case '/api/smart-sync/remember':
        if (req.method === 'POST') return this.json(res, routes.smartSync.smartSyncRememberChoice(this.manager, body.projectPath, body.workstreamId, body.choice));
        break;
    }

    // Dynamic routes
    if (pathname.startsWith('/api/workstreams/') && !pathname.includes('/active') && !pathname.includes('/inject') && !pathname.includes('/detect')) {
      const parts = pathname.split('/');
      const workstreamId = parts[3];
      const action = parts[4];

      if (workstreamId) {
        if (req.method === 'PUT' && !action) return this.json(res, routes.workstreams.updateWorkstream(this.manager, workstreamId, body));
        if (req.method === 'DELETE' && !action) return this.json(res, routes.workstreams.deleteWorkstream(this.manager, workstreamId));
        if (req.method === 'POST' && action === 'add-project') return this.json(res, routes.workstreams.addProjectToWorkstream(this.manager, workstreamId, body.projectPath));
        if (req.method === 'POST' && action === 'remove-project') return this.json(res, routes.workstreams.removeProjectFromWorkstream(this.manager, workstreamId, body.projectPath));
      }
    }

    if (pathname.startsWith('/api/projects/') && req.method === 'DELETE') {
      const projectId = pathname.split('/').pop();
      if (projectId && projectId !== 'active') {
        return this.json(res, routes.projects.removeProject(this.manager, projectId));
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
        try { resolve(JSON.parse(body || '{}')); }
        catch (e) { resolve({}); }
      });
      req.on('error', reject);
    });
  }
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  let port = 3333;
  let dir = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--port=')) port = parseInt(arg.split('=')[1]) || 3333;
    else if (arg === '--port' || arg === '-p') port = parseInt(args[++i]) || 3333;
    else if (arg.startsWith('--dir=')) dir = arg.split('=')[1] || null;
    else if (arg === '--dir' || arg === '-d') dir = args[++i] || null;
    else if (!arg.startsWith('-') && fs.existsSync(arg) && fs.statSync(arg).isDirectory()) dir = arg;
  }

  dir = dir || process.cwd();

  const ClaudeConfigManager = require('../config-loader.js');
  const manager = new ClaudeConfigManager();
  const server = new ConfigUIServer(port, dir, manager);
  server.start();
}

module.exports = ConfigUIServer;
