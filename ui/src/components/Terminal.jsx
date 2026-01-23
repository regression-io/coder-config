import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';

/**
 * Embedded terminal component using xterm.js
 * Connects to the server via WebSocket for PTY access
 */
export default function Terminal({
  cwd,
  initialCommand,
  env = {},
  onExit,
  onReady,
  className = '',
  height = '400px'
}) {
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);
  const wsRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [sessionId, setSessionId] = useState(null);

  // Initialize terminal
  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return;

    // Create xterm instance
    const term = new XTerm({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 13,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#d4d4d4',
        cursorAccent: '#1e1e1e',
        selectionBackground: '#264f78',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#ffffff'
      },
      allowProposedApi: true
    });

    // Add fit addon
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    fitAddonRef.current = fitAddon;

    // Add web links addon
    const webLinksAddon = new WebLinksAddon();
    term.loadAddon(webLinksAddon);

    // Open terminal in container
    term.open(terminalRef.current);
    xtermRef.current = term;

    // Initial fit and focus
    setTimeout(() => {
      fitAddon.fit();
      term.focus();
    }, 0);

    // Connect to WebSocket
    connectWebSocket(term);

    // Cleanup
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      term.dispose();
      xtermRef.current = null;
    };
  }, []);

  // Connect to WebSocket terminal server
  const connectWebSocket = useCallback((term) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.hostname;
    // Use port 3333 for the API server (WebSocket is on the same server)
    const wsPort = 3333;

    const params = new URLSearchParams();
    if (cwd) params.set('cwd', cwd);
    if (initialCommand) params.set('cmd', initialCommand);

    // Add extra env vars with env_ prefix
    if (env && typeof env === 'object') {
      for (const [key, value] of Object.entries(env)) {
        params.set(`env_${key}`, value);
      }
    }

    const wsUrl = `${protocol}//${wsHost}:${wsPort}/ws/terminal?${params.toString()}`;

    console.log('Connecting to terminal WebSocket:', wsUrl);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Terminal WebSocket connected');
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        switch (msg.type) {
          case 'session':
            setSessionId(msg.sessionId);
            if (onReady) onReady(msg.sessionId);
            break;

          case 'output':
            term.write(msg.data);
            break;

          case 'exit':
            term.write('\r\n\x1b[33m[Process exited]\x1b[0m\r\n');
            if (onExit) onExit(msg.exitCode, msg.signal);
            break;

          case 'error':
            term.write(`\r\n\x1b[31m[Error: ${msg.message}]\x1b[0m\r\n`);
            term.write('\x1b[33mTip: The terminal requires a working shell. Try running the command manually.\x1b[0m\r\n');
            break;
        }
      } catch (e) {
        // Raw data, write directly
        term.write(event.data);
      }
    };

    ws.onclose = () => {
      console.log('Terminal WebSocket closed');
      setConnected(false);
      term.write('\r\n\x1b[31m[Disconnected]\x1b[0m\r\n');
    };

    ws.onerror = (err) => {
      console.error('Terminal WebSocket error:', err);
      term.write('\r\n\x1b[31m[Connection error]\x1b[0m\r\n');
    };

    // Send terminal input to server
    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'input', data }));
      }
    });

    // Handle resize
    term.onResize(({ cols, rows }) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'resize', cols, rows }));
      }
    });
  }, [cwd, initialCommand, env, onReady, onExit]);

  // Handle container resize
  useEffect(() => {
    const handleResize = () => {
      if (fitAddonRef.current && xtermRef.current) {
        fitAddonRef.current.fit();
      }
    };

    window.addEventListener('resize', handleResize);

    // ResizeObserver for container size changes
    const resizeObserver = new ResizeObserver(handleResize);
    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  }, []);

  // Send command to terminal
  const sendCommand = useCallback((command) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'input', data: command + '\r' }));
    }
  }, []);

  // Kill terminal process
  const kill = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'kill' }));
    }
  }, []);

  // Focus terminal
  const focus = useCallback(() => {
    if (xtermRef.current) {
      xtermRef.current.focus();
    }
  }, []);

  // Clear terminal
  const clear = useCallback(() => {
    if (xtermRef.current) {
      xtermRef.current.clear();
    }
  }, []);

  // Copy terminal content to clipboard
  const copyToClipboard = useCallback(() => {
    if (xtermRef.current) {
      const term = xtermRef.current;
      // Get all content from the terminal buffer
      const buffer = term.buffer.active;
      let content = '';
      for (let i = 0; i < buffer.length; i++) {
        const line = buffer.getLine(i);
        if (line) {
          content += line.translateToString(true) + '\n';
        }
      }
      navigator.clipboard.writeText(content.trim()).then(() => {
        // Flash the copy button to indicate success
        const btn = document.getElementById('terminal-copy-btn');
        if (btn) {
          btn.classList.add('bg-green-600');
          setTimeout(() => btn.classList.remove('bg-green-600'), 500);
        }
      });
    }
  }, []);

  return (
    <div className={`relative ${className}`} style={{ height }}>
      {/* Connection status and copy button */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
        <button
          id="terminal-copy-btn"
          onClick={copyToClipboard}
          className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
          title="Copy terminal output"
        >
          Copy
        </button>
        <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-xs text-gray-400">
          {connected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      {/* Terminal container */}
      <div
        ref={terminalRef}
        className="w-full h-full rounded-lg overflow-hidden"
        style={{ backgroundColor: '#1e1e1e' }}
        onClick={focus}
      />
    </div>
  );
}

// Export utility functions for parent components
Terminal.sendCommand = (terminalInstance, command) => {
  if (terminalInstance && terminalInstance.sendCommand) {
    terminalInstance.sendCommand(command);
  }
};
