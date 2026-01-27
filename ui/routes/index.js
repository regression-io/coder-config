/**
 * Routes Index - Aggregates all route modules
 */

const projects = require('./projects');
const workstreams = require('./workstreams');
const loops = require('./loops');
const activity = require('./activity');
const subprojects = require('./subprojects');
const registry = require('./registry');
const rules = require('./rules');
const commands = require('./commands');
const plugins = require('./plugins');
const updates = require('./updates');
const search = require('./search');
const toolSync = require('./tool-sync');
const fileExplorer = require('./file-explorer');
const memory = require('./memory');
const settings = require('./settings');
const sessions = require('./sessions');
const env = require('./env');
const configs = require('./configs');
const mcpDiscovery = require('./mcp-discovery');

module.exports = {
  projects,
  workstreams,
  loops,
  activity,
  subprojects,
  registry,
  rules,
  commands,
  plugins,
  updates,
  search,
  toolSync,
  fileExplorer,
  memory,
  settings,
  sessions,
  env,
  configs,
  mcpDiscovery,
};
