/**
 * WebSocket Terminal Server
 * Provides PTY-based terminal sessions over WebSocket
 */

const WebSocket = require('ws');
const os = require('os');
let pty;

try {
  pty = require('node-pty');
} catch (e) {
  console.warn('node-pty not available, terminal features disabled');
  pty = null;
}

class TerminalServer {
  constructor() {
    this.sessions = new Map(); // sessionId -> { pty, ws }
    this.wss = null;
  }

  /**
   * Attach WebSocket server to an existing HTTP server
   */
  attach(httpServer) {
    if (!pty) {
      console.warn('Terminal server disabled: node-pty not available');
      return;
    }

    this.wss = new WebSocket.Server({
      server: httpServer,
      path: '/ws/terminal'
    });

    this.wss.on('connection', (ws, req) => {
      const sessionId = this.generateSessionId();
      console.log(`Terminal session ${sessionId} connected`);

      // Parse query params for initial command, cwd, and env
      const url = new URL(req.url, 'http://localhost');
      const cwd = url.searchParams.get('cwd') || process.cwd();
      const cmd = url.searchParams.get('cmd') || null;
      const delayedCmd = url.searchParams.get('delayedCmd') || null;
      const delayedCmdDelay = parseInt(url.searchParams.get('delayedCmdDelay') || '2000', 10);

      // Parse additional env vars from query (env_KEY=VALUE format)
      const extraEnv = {};
      for (const [key, value] of url.searchParams.entries()) {
        if (key.startsWith('env_')) {
          extraEnv[key.substring(4)] = value;
        }
      }

      // Create PTY with error handling
      let ptyProcess;
      try {
        const shell = process.env.SHELL || (os.platform() === 'win32' ? 'powershell.exe' : 'bash');
        ptyProcess = pty.spawn(shell, [], {
          name: 'xterm-256color',
          cols: 80,
          rows: 24,
          cwd: cwd,
          env: {
            ...process.env,
            ...extraEnv,
            TERM: 'xterm-256color',
            COLORTERM: 'truecolor',
          }
        });
      } catch (err) {
        console.error('Failed to spawn PTY:', err.message);
        ws.send(JSON.stringify({ type: 'error', message: 'Failed to start terminal: ' + err.message }));
        ws.close();
        return;
      }

      this.sessions.set(sessionId, { pty: ptyProcess, ws });

      // Send session ID to client
      ws.send(JSON.stringify({ type: 'session', sessionId }));

      // If initial command provided, execute it after a short delay
      if (cmd) {
        setTimeout(() => {
          ptyProcess.write(cmd + '\r');

          // If delayed command provided, send it when claude is ready
          // Watch for claude's input prompt in output
          if (delayedCmd) {
            let delayedCmdSent = false;
            let outputBuffer = '';
            let bannerSeen = false;

            const checkReady = (data) => {
              if (delayedCmdSent) return;
              outputBuffer += data;

              // First wait for the Claude Code banner to appear
              if (!bannerSeen && outputBuffer.includes('Claude Code')) {
                bannerSeen = true;
              }

              // After banner, look for the actual input prompt
              if (bannerSeen) {
                const lines = outputBuffer.split('\n');
                const lastFewLines = lines.slice(-5).join('\n');

                // Look for prompt indicators
                // Claude Code prompt can have escape codes between ❯ and text
                // Also look for the "Try" suggestion or input prompt marker
                if (lastFewLines.match(/[>\❯][\s\x1b\[\]0-9;]*[a-zA-T]/m) ||
                    lastFewLines.includes('> Try') ||
                    lastFewLines.includes(']133;B')) {  // Terminal prompt marker
                  delayedCmdSent = true;
                  // Wait for Claude to be fully ready
                  setTimeout(() => {
                    ptyProcess.write(delayedCmd);
                    setTimeout(() => {
                      ptyProcess.write('\r');
                    }, 2000);
                  }, 2000);
                }
              }
            };

            // Listen for output to detect readiness
            ptyProcess.onData(checkReady);

            // Fallback timeout in case detection fails
            setTimeout(() => {
              if (!delayedCmdSent) {
                delayedCmdSent = true;
                ptyProcess.write(delayedCmd);
                setTimeout(() => {
                  ptyProcess.write('\r');
                }, 2000);
              }
            }, delayedCmdDelay);
          }
        }, 500);
      }

      // PTY output -> WebSocket
      ptyProcess.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'output', data }));
        }
      });

      // PTY exit
      ptyProcess.onExit(({ exitCode, signal }) => {
        console.log(`Terminal session ${sessionId} exited (code: ${exitCode}, signal: ${signal})`);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'exit', exitCode, signal }));
        }
        this.sessions.delete(sessionId);
      });

      // WebSocket messages -> PTY
      ws.on('message', (message) => {
        try {
          const msg = JSON.parse(message.toString());

          switch (msg.type) {
            case 'input':
              ptyProcess.write(msg.data);
              break;

            case 'resize':
              if (msg.cols && msg.rows) {
                ptyProcess.resize(msg.cols, msg.rows);
              }
              break;

            case 'kill':
              ptyProcess.kill();
              break;
          }
        } catch (e) {
          console.error('Terminal message parse error:', e);
        }
      });

      // WebSocket close
      ws.on('close', () => {
        console.log(`Terminal session ${sessionId} WebSocket closed`);
        const session = this.sessions.get(sessionId);
        if (session) {
          session.pty.kill();
          this.sessions.delete(sessionId);
        }
      });

      // WebSocket error
      ws.on('error', (err) => {
        console.error(`Terminal session ${sessionId} error:`, err);
      });
    });

    console.log('Terminal WebSocket server attached at /ws/terminal');
  }

  generateSessionId() {
    return Math.random().toString(36).substring(2, 15);
  }

  /**
   * Close all sessions and the WebSocket server
   */
  close() {
    for (const [sessionId, session] of this.sessions) {
      session.pty.kill();
      session.ws.close();
    }
    this.sessions.clear();

    if (this.wss) {
      this.wss.close();
    }
  }
}

module.exports = TerminalServer;
