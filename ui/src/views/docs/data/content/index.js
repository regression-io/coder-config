// Aggregate all documentation content from per-section files
import { gettingStartedContent } from './getting-started';
import { projectsContent } from './projects';
import { fileExplorerContent } from './file-explorer';
import { workstreamsContent } from './workstreams';
import { loopsContent } from './loops';
import { pluginsContent } from './plugins';
import { mcpRegistryContent } from './mcp-registry';
import { memoryContent } from './memory';
import { sessionsContent } from './sessions';
import { claudeSettingsContent } from './claude-settings';
import { geminiSettingsContent } from './gemini-settings';
import { codexSettingsContent } from './codex-settings';
import { antigravitySettingsContent } from './antigravity-settings';
import { cliContent } from './cli';
import { multiToolContent } from './multi-tool';
import { keyboardContent } from './keyboard';
import { troubleshootingContent } from './troubleshooting';

const docContent = {
  ...gettingStartedContent,
  ...projectsContent,
  ...fileExplorerContent,
  ...workstreamsContent,
  ...loopsContent,
  ...pluginsContent,
  ...mcpRegistryContent,
  ...memoryContent,
  ...sessionsContent,
  ...claudeSettingsContent,
  ...geminiSettingsContent,
  ...codexSettingsContent,
  ...antigravitySettingsContent,
  ...cliContent,
  ...multiToolContent,
  ...keyboardContent,
  ...troubleshootingContent,
};

export default docContent;
