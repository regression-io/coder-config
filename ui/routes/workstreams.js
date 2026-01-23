/**
 * Workstreams Routes
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Get all workstreams
 */
function getWorkstreams(manager) {
  if (!manager) return { error: 'Manager not available' };
  const data = manager.loadWorkstreams();
  return {
    workstreams: data.workstreams,
    activeId: data.activeId,
    lastUsedByProject: data.lastUsedByProject || {}
  };
}

/**
 * Get active workstream
 */
function getActiveWorkstream(manager) {
  if (!manager) return { error: 'Manager not available' };
  const active = manager.workstreamActive();
  return { workstream: active };
}

/**
 * Set active workstream
 */
function setActiveWorkstream(manager, id) {
  if (!manager) return { error: 'Manager not available' };
  const ws = manager.workstreamUse(id);
  if (!ws) {
    return { error: 'Workstream not found' };
  }
  return { success: true, workstream: ws };
}

/**
 * Create a new workstream
 */
function createWorkstream(manager, body) {
  if (!manager) return { error: 'Manager not available' };
  const { name, projects = [], rules = '' } = body;

  if (!name) {
    return { error: 'Name is required' };
  }

  const ws = manager.workstreamCreate(name, projects, rules);
  if (!ws) {
    return { error: 'Failed to create workstream (name may already exist)' };
  }

  return { success: true, workstream: ws };
}

/**
 * Update a workstream
 */
function updateWorkstream(manager, id, updates) {
  if (!manager) return { error: 'Manager not available' };
  const ws = manager.workstreamUpdate(id, updates);
  if (!ws) {
    return { error: 'Workstream not found' };
  }
  return { success: true, workstream: ws };
}

/**
 * Delete a workstream
 */
function deleteWorkstream(manager, id) {
  if (!manager) return { error: 'Manager not available' };
  const success = manager.workstreamDelete(id);
  if (!success) {
    return { error: 'Workstream not found' };
  }
  return { success: true };
}

/**
 * Add project to workstream
 */
function addProjectToWorkstream(manager, workstreamId, projectPath) {
  if (!manager) return { error: 'Manager not available' };
  const ws = manager.workstreamAddProject(workstreamId, projectPath);
  if (!ws) {
    return { error: 'Workstream not found' };
  }
  return { success: true, workstream: ws };
}

/**
 * Remove project from workstream
 */
function removeProjectFromWorkstream(manager, workstreamId, projectPath) {
  if (!manager) return { error: 'Manager not available' };
  const ws = manager.workstreamRemoveProject(workstreamId, projectPath);
  if (!ws) {
    return { error: 'Workstream not found' };
  }
  return { success: true, workstream: ws };
}

/**
 * Inject active workstream rules (for hooks)
 */
function injectWorkstream(manager) {
  if (!manager) return { error: 'Manager not available' };
  const output = manager.workstreamInject(true);
  return { rules: output };
}

/**
 * Detect workstream from directory
 */
function detectWorkstream(manager, dir, projectDir) {
  if (!manager) return { error: 'Manager not available' };
  const ws = manager.workstreamDetect(dir || projectDir);
  return { workstream: ws };
}

/**
 * Count how many workstreams include a given project path
 */
function countWorkstreamsForProject(manager, projectPath) {
  if (!manager) return { error: 'Manager not available' };
  const count = manager.countWorkstreamsForProject(projectPath);
  return { count };
}

/**
 * Check if workstream hook is installed
 */
function getWorkstreamHookStatus() {
  const hookPath = path.join(os.homedir(), '.claude', 'hooks', 'pre-prompt.sh');
  const hookDir = path.dirname(hookPath);

  const status = {
    hookPath,
    dirExists: fs.existsSync(hookDir),
    fileExists: fs.existsSync(hookPath),
    isInstalled: false,
    content: null
  };

  if (status.fileExists) {
    try {
      const content = fs.readFileSync(hookPath, 'utf8');
      status.content = content;
      status.isInstalled = content.includes('workstream inject');
    } catch (e) {
      status.error = e.message;
    }
  }

  return status;
}

/**
 * Install workstream hook
 */
function installWorkstreamHook() {
  const hookDir = path.join(os.homedir(), '.claude', 'hooks');
  const hookPath = path.join(hookDir, 'pre-prompt.sh');

  const hookCode = `
# Workstream rule injection (added by coder-config)
# Supports both CODER_WORKSTREAM (preferred) and CLAUDE_WORKSTREAM (legacy)
if [ -n "$CODER_WORKSTREAM" ] || [ -n "$CLAUDE_WORKSTREAM" ]; then
  if command -v coder-config &> /dev/null; then
    coder-config workstream inject --silent
  fi
fi
`;

  try {
    if (!fs.existsSync(hookDir)) {
      fs.mkdirSync(hookDir, { recursive: true });
    }

    let content = '';
    let alreadyInstalled = false;

    if (fs.existsSync(hookPath)) {
      content = fs.readFileSync(hookPath, 'utf8');
      if (content.includes('workstream inject')) {
        alreadyInstalled = true;
      }
    } else {
      content = '#!/bin/bash\n';
    }

    if (alreadyInstalled) {
      return { success: true, message: 'Hook already installed', path: hookPath };
    }

    content += hookCode;
    fs.writeFileSync(hookPath, content);
    fs.chmodSync(hookPath, '755');

    return { success: true, message: 'Hook installed successfully', path: hookPath };
  } catch (e) {
    return { error: e.message };
  }
}

/**
 * Generate rules from repos
 */
function generateRules(manager, projects) {
  if (!manager) return { error: 'Manager not available' };
  if (!projects || projects.length === 0) {
    return { error: 'No projects provided' };
  }
  const rules = manager.generateRulesFromRepos(projects);
  return { success: true, rules };
}

module.exports = {
  getWorkstreams,
  getActiveWorkstream,
  setActiveWorkstream,
  createWorkstream,
  updateWorkstream,
  deleteWorkstream,
  addProjectToWorkstream,
  removeProjectFromWorkstream,
  injectWorkstream,
  detectWorkstream,
  countWorkstreamsForProject,
  getWorkstreamHookStatus,
  installWorkstreamHook,
  generateRules,
};
