/**
 * API client for Claude Config UI
 * Communicates with the local server at /api/*
 */

const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Project info
  async getProject() {
    return request('/project');
  },

  // Get subprojects for a specific directory
  async getSubprojects(dir) {
    return request(`/subprojects?dir=${encodeURIComponent(dir)}`);
  },

  // Add a manual sub-project
  async addManualSubproject(projectDir, subprojectDir) {
    return request('/subprojects/add', {
      method: 'POST',
      body: { projectDir, subprojectDir },
    });
  },

  // Remove a manual sub-project
  async removeManualSubproject(projectDir, subprojectDir) {
    return request('/subprojects/remove', {
      method: 'POST',
      body: { projectDir, subprojectDir },
    });
  },

  // Hide a sub-project
  async hideSubproject(projectDir, subprojectDir) {
    return request('/subprojects/hide', {
      method: 'POST',
      body: { projectDir, subprojectDir },
    });
  },

  // Unhide a sub-project
  async unhideSubproject(projectDir, subprojectDir) {
    return request('/subprojects/unhide', {
      method: 'POST',
      body: { projectDir, subprojectDir },
    });
  },

  // Get hidden sub-projects
  async getHiddenSubprojects(projectDir) {
    return request(`/subprojects/hidden?dir=${encodeURIComponent(projectDir)}`);
  },

  async switchProject(dir) {
    return request('/switch-project', {
      method: 'POST',
      body: { dir },
    });
  },

  // Projects registry (for project switching in UI)
  async getProjects() {
    return request('/projects');
  },

  async addProject(path, name = null) {
    return request('/projects', {
      method: 'POST',
      body: { path, name },
    });
  },

  async removeProject(id) {
    return request(`/projects/${id}`, {
      method: 'DELETE',
    });
  },

  async setActiveProject(id) {
    return request('/projects/active', {
      method: 'PUT',
      body: { id },
    });
  },

  // Configs
  async getConfigs() {
    return request('/configs');
  },

  async updateConfig(dir, config) {
    return request('/config', {
      method: 'PUT',
      body: { dir, config },
    });
  },

  // Registry
  async getRegistry() {
    return request('/registry');
  },

  async updateRegistry(registry) {
    return request('/registry', {
      method: 'PUT',
      body: registry,
    });
  },

  // Rules
  async getRules() {
    return request('/rules');
  },

  async getRule(path) {
    return request(`/rule?path=${encodeURIComponent(path)}`);
  },

  async saveRule(path, content) {
    return request('/rule', {
      method: 'PUT',
      body: { path, content },
    });
  },

  async createRule(dir, name, content = '') {
    return request('/rule', {
      method: 'POST',
      body: { dir, name, content },
    });
  },

  async deleteRule(path) {
    return request(`/rule?path=${encodeURIComponent(path)}`, {
      method: 'DELETE',
    });
  },

  // Commands
  async getCommands() {
    return request('/commands');
  },

  async getCommand(path) {
    return request(`/command?path=${encodeURIComponent(path)}`);
  },

  async saveCommand(path, content) {
    return request('/command', {
      method: 'PUT',
      body: { path, content },
    });
  },

  async createCommand(dir, name, content = '') {
    return request('/command', {
      method: 'POST',
      body: { dir, name, content },
    });
  },

  async deleteCommand(path) {
    return request(`/command?path=${encodeURIComponent(path)}`, {
      method: 'DELETE',
    });
  },

  // Templates
  async getTemplates() {
    return request('/templates');
  },

  async applyTemplate(template, dir) {
    return request('/apply-template', {
      method: 'POST',
      body: { template, dir },
    });
  },

  // Apply config
  async applyConfig(dir) {
    return request('/apply', {
      method: 'POST',
      body: { dir },
    });
  },

  // Environment
  async getEnv(dir) {
    return request(`/env?dir=${encodeURIComponent(dir)}`);
  },

  async saveEnv(dir, content) {
    return request('/env', {
      method: 'PUT',
      body: { dir, content },
    });
  },

  // File hashes for change detection
  async getFileHashes() {
    return request('/file-hashes');
  },

  // Version check
  async checkVersion() {
    return request('/version-check');
  },

  async performUpdate(options) {
    return request('/update', {
      method: 'POST',
      body: options,
    });
  },

  // Reload
  async reload() {
    return request('/reload', {
      method: 'POST',
    });
  },

  // MCP Search
  async searchGithub(query) {
    return request(`/search/github?q=${encodeURIComponent(query)}`);
  },

  async searchNpm(query) {
    return request(`/search/npm?q=${encodeURIComponent(query)}`);
  },

  // MCP Tools repository
  async getMcpTools(dir) {
    const params = dir ? `?dir=${encodeURIComponent(dir)}` : '';
    return request(`/mcp-tools${params}`);
  },

  // File Explorer - .claude folder management
  async getClaudeFolders() {
    return request('/claude-folders');
  },

  async getIntermediatePaths() {
    return request('/intermediate-paths');
  },

  async getClaudeFile(path) {
    return request(`/claude-file?path=${encodeURIComponent(path)}`);
  },

  async saveClaudeFile(path, content) {
    return request('/claude-file', {
      method: 'PUT',
      body: { path, content },
    });
  },

  async deleteClaudeFile(path) {
    return request(`/claude-file?path=${encodeURIComponent(path)}`, {
      method: 'DELETE',
    });
  },

  async createClaudeFile(dir, name, type, content = '') {
    return request('/claude-file', {
      method: 'POST',
      body: { dir, name, type, content },
    });
  },

  // Create .claude folder for a directory (e.g., sub-project)
  async initClaudeFolder(dir) {
    return request('/init-claude-folder', {
      method: 'POST',
      body: { dir },
    });
  },

  // Delete .claude folder from a directory
  async deleteClaudeFolder(dir) {
    return request('/delete-claude-folder', {
      method: 'POST',
      body: { dir },
    });
  },

  // Batch init .claude folders for multiple directories
  async initClaudeFolderBatch(dirs) {
    return request('/init-claude-folder-batch', {
      method: 'POST',
      body: { dirs },
    });
  },

  // Apply template to multiple projects
  async applyTemplateToProjects(templateId, dirs) {
    return request('/apply-template-batch', {
      method: 'POST',
      body: { templateId, dirs },
    });
  },

  // Tool Sync (Claude <-> Antigravity)
  async getSyncPreview(dir, source = 'claude', target = 'antigravity') {
    return request('/sync/preview', {
      method: 'POST',
      body: { dir, source, target },
    });
  },

  async syncRules(dir, source = 'claude', target = 'antigravity', files = null) {
    return request('/sync/rules', {
      method: 'POST',
      body: { dir, source, target, files },
    });
  },

  async moveClaudeItem(sourcePath, targetDir, mode = 'copy', merge = false) {
    return request('/claude-move', {
      method: 'POST',
      body: { sourcePath, targetDir, mode, merge },
    });
  },

  async renameClaudeFile(oldPath, newName) {
    return request('/claude-rename', {
      method: 'POST',
      body: { oldPath, newName },
    });
  },

  // Memory System
  async getMemory() {
    return request('/memory');
  },

  async getMemoryFile(path) {
    return request(`/memory/file?path=${encodeURIComponent(path)}`);
  },

  async saveMemoryFile(path, content) {
    return request('/memory/file', {
      method: 'PUT',
      body: { path, content },
    });
  },

  async addMemoryEntry(type, content, scope = 'global') {
    return request('/memory/entry', {
      method: 'POST',
      body: { type, content, scope },
    });
  },

  async initProjectMemory(dir) {
    return request('/memory/init', {
      method: 'POST',
      body: { dir },
    });
  },

  async searchMemory(query) {
    return request(`/memory/search?q=${encodeURIComponent(query)}`);
  },

  async getSyncState() {
    return request('/memory/sync');
  },

  // Claude Code settings.json (full settings including permissions)
  async getClaudeSettings() {
    return request('/claude-settings');
  },

  async saveClaudeSettings(settings) {
    return request('/claude-settings', {
      method: 'PUT',
      body: { settings },
    });
  },

  // Gemini CLI settings.json
  async getGeminiSettings() {
    return request('/gemini-settings');
  },

  async saveGeminiSettings(settings) {
    return request('/gemini-settings', {
      method: 'PUT',
      body: settings,
    });
  },

  // User preferences/config
  async getConfig() {
    return request('/preferences');
  },

  async saveConfig(config) {
    return request('/preferences', {
      method: 'PUT',
      body: config,
    });
  },

  async browse(path, type = 'directory') {
    return request('/browse', {
      method: 'POST',
      body: { path, type },
    });
  },

  // Mark template as applied (for migration)
  async markTemplateApplied(template, dir) {
    return request('/mark-template', {
      method: 'POST',
      body: { template, dir },
    });
  },

  // Server version (for update detection)
  async getVersion() {
    return request('/version');
  },

  // Restart server
  async restartServer() {
    return request('/restart', {
      method: 'POST',
    });
  },
};

export default api;
