import React, { useRef, useEffect } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';
import { useTheme } from '@/components/ThemeProvider';

/**
 * Monaco-based JSON editor with MCP intellisense
 */
export default function ConfigEditor({
  value,
  onChange,
  registry = {},
  height = "400px",
  readOnly = false
}) {
  const monaco = useMonaco();
  const editorRef = useRef(null);
  const { resolvedTheme } = useTheme();

  // Configure Monaco with MCP schema when registry is available
  useEffect(() => {
    if (!monaco || !registry.mcpServers) return;

    const mcpNames = Object.keys(registry.mcpServers);

    // Define JSON schema for mcps.json config files
    const schema = {
      uri: "http://claude-config/mcps-schema.json",
      fileMatch: ["*"],
      schema: {
        type: "object",
        properties: {
          include: {
            type: "array",
            description: "MCPs to include from the registry",
            items: {
              type: "string",
              enum: mcpNames,
              enumDescriptions: mcpNames.map(name => {
                const mcp = registry.mcpServers[name];
                return `${mcp.command} ${(mcp.args || []).slice(0, 2).join(' ')}`;
              })
            }
          },
          mcpServers: {
            type: "object",
            description: "Custom MCP server definitions",
            additionalProperties: {
              type: "object",
              properties: {
                command: {
                  type: "string",
                  description: "Command to run the MCP server (e.g., 'npx', 'node', 'python')"
                },
                args: {
                  type: "array",
                  items: { type: "string" },
                  description: "Arguments to pass to the command"
                },
                env: {
                  type: "object",
                  additionalProperties: { type: "string" },
                  description: "Environment variables for the MCP server"
                }
              },
              required: ["command"]
            }
          },
          template: {
            type: ["string", "null"],
            description: "Template name to inherit rules and commands from"
          }
        }
      }
    };

    // Configure JSON language with schema
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      schemas: [schema],
      allowComments: true,
      trailingCommas: "warning"
    });

    // Add custom completions for include array
    const completionProvider = monaco.languages.registerCompletionItemProvider('json', {
      provideCompletionItems: (model, position) => {
        const textUntilPosition = model.getValueInRange({
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column
        });

        // Check if we're inside the "include" array
        const inIncludeArray = /"include"\s*:\s*\[[^\]]*$/.test(textUntilPosition);

        if (inIncludeArray) {
          const suggestions = mcpNames.map(name => {
            const mcp = registry.mcpServers[name];
            return {
              label: name,
              kind: monaco.languages.CompletionItemKind.Value,
              insertText: `"${name}"`,
              detail: mcp.command,
              documentation: {
                value: `**${name}**\n\n\`${mcp.command} ${(mcp.args || []).join(' ')}\`\n\n${mcp.env ? 'Requires: ' + Object.keys(mcp.env).join(', ') : ''}`
              },
              sortText: `0${name}` // Sort MCPs first
            };
          });

          return { suggestions };
        }

        return { suggestions: [] };
      },
      triggerCharacters: ['"', '[', ',', ' ']
    });

    return () => {
      completionProvider.dispose();
    };
  }, [monaco, registry]);

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;

    // Configure editor settings
    editor.updateOptions({
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      lineNumbers: 'on',
      renderLineHighlight: 'line',
      automaticLayout: true,
      tabSize: 2,
      formatOnPaste: true,
      formatOnType: true,
      quickSuggestions: {
        strings: true,
        comments: false,
        other: true
      },
      suggestOnTriggerCharacters: true,
      acceptSuggestionOnEnter: 'on',
      wordBasedSuggestions: 'off'
    });
  };

  const handleChange = (newValue) => {
    if (onChange) {
      onChange(newValue);
    }
  };

  return (
    <div className="border border-gray-300 dark:border-slate-700 rounded-lg overflow-hidden">
      <Editor
        height={height}
        defaultLanguage="json"
        value={value}
        onChange={handleChange}
        onMount={handleEditorDidMount}
        theme={resolvedTheme === 'dark' ? 'vs-dark' : 'vs-light'}
        options={{
          readOnly,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          lineNumbers: 'on',
          fontSize: 13,
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
          padding: { top: 12, bottom: 12 },
          renderLineHighlight: 'line',
          cursorBlinking: 'smooth',
          smoothScrolling: true,
          bracketPairColorization: { enabled: true },
          guides: {
            bracketPairs: true,
            indentation: true
          }
        }}
        loading={
          <div className="h-full flex items-center justify-center text-gray-500">
            Loading editor...
          </div>
        }
      />
    </div>
  );
}

/**
 * Markdown/text editor for rules and commands
 */
export function MarkdownEditor({
  value,
  onChange,
  height = "400px",
  readOnly = false
}) {
  const { resolvedTheme } = useTheme();

  const handleEditorDidMount = (editor) => {
    editor.updateOptions({
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      lineNumbers: 'on',
      wordWrap: 'on',
      automaticLayout: true,
      tabSize: 2
    });
  };

  return (
    <div className="border border-gray-300 dark:border-slate-700 rounded-lg overflow-hidden">
      <Editor
        height={height}
        defaultLanguage="markdown"
        value={value}
        onChange={onChange}
        onMount={handleEditorDidMount}
        theme={resolvedTheme === 'dark' ? 'vs-dark' : 'vs-light'}
        options={{
          readOnly,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          lineNumbers: 'on',
          fontSize: 13,
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
          padding: { top: 12, bottom: 12 },
          wordWrap: 'on',
          renderLineHighlight: 'line',
          cursorBlinking: 'smooth',
          smoothScrolling: true
        }}
        loading={
          <div className="h-full flex items-center justify-center text-gray-500">
            Loading editor...
          </div>
        }
      />
    </div>
  );
}
