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
async function generateRules(manager, projects, useClaude = false) {
  if (!manager) return { error: 'Manager not available' };
  if (!projects || projects.length === 0) {
    return { error: 'No projects provided' };
  }

  try {
    let rules;
    if (useClaude) {
      rules = await manager.generateRulesWithClaude(projects);
    } else {
      rules = manager.generateRulesFromRepos(projects);
    }
    return { success: true, rules };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Add trigger folder to workstream
 */
function addTriggerFolder(manager, workstreamId, folderPath) {
  if (!manager) return { error: 'Manager not available' };
  if (!workstreamId || !folderPath) {
    return { error: 'Workstream ID and folder path are required' };
  }
  const ws = manager.workstreamAddTrigger(workstreamId, folderPath);
  if (!ws) {
    return { error: 'Workstream not found' };
  }
  return { success: true, workstream: ws };
}

/**
 * Remove trigger folder from workstream
 */
function removeTriggerFolder(manager, workstreamId, folderPath) {
  if (!manager) return { error: 'Manager not available' };
  if (!workstreamId || !folderPath) {
    return { error: 'Workstream ID and folder path are required' };
  }
  const ws = manager.workstreamRemoveTrigger(workstreamId, folderPath);
  if (!ws) {
    return { error: 'Workstream not found' };
  }
  return { success: true, workstream: ws };
}

/**
 * Set auto-activate for workstream
 */
function setAutoActivate(manager, workstreamId, value) {
  if (!manager) return { error: 'Manager not available' };
  if (!workstreamId) {
    return { error: 'Workstream ID is required' };
  }
  const ws = manager.workstreamSetAutoActivate(workstreamId, value);
  if (!ws) {
    return { error: 'Workstream not found' };
  }
  return { success: true, workstream: ws };
}

/**
 * Get global settings
 */
function getGlobalSettings(manager) {
  if (!manager) return { error: 'Manager not available' };
  const settings = manager.loadSettings();
  return { settings };
}

/**
 * Set global auto-activate setting
 */
function setGlobalAutoActivate(manager, value) {
  if (!manager) return { error: 'Manager not available' };
  const settings = manager.setGlobalAutoActivate(value);
  return { success: true, settings };
}

/**
 * Check folder for matching workstreams
 */
function checkFolder(manager, folderPath) {
  if (!manager) return { error: 'Manager not available' };
  // Capture the result without console output
  const result = manager.workstreamCheckFolder(folderPath || process.cwd(), true);
  // Parse the JSON that was logged
  return result;
}

/**
 * Get CD hook status
 */
function getCdHookStatus(manager) {
  if (!manager) return { error: 'Manager not available' };
  const status = manager.workstreamCdHookStatus();
  return status;
}

/**
 * Install CD hook
 */
function installCdHook(manager) {
  if (!manager) return { error: 'Manager not available' };
  try {
    manager.workstreamInstallCdHook();
    return { success: true, message: 'CD hook installed' };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Uninstall CD hook
 */
function uninstallCdHook(manager) {
  if (!manager) return { error: 'Manager not available' };
  try {
    manager.workstreamUninstallCdHook();
    return { success: true, message: 'CD hook uninstalled' };
  } catch (error) {
    return { error: error.message };
  }
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
  // Folder auto-activation
  addTriggerFolder,
  removeTriggerFolder,
  setAutoActivate,
  getGlobalSettings,
  setGlobalAutoActivate,
  checkFolder,
  getCdHookStatus,
  installCdHook,
  uninstallCdHook,
};
