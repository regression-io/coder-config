export const troubleshootingContent = {
  'common-issues': {
    title: 'Common Issues',
    content: `
## Common Issues

### UI won't start

**Symptom**: \`coder-config ui\` shows "Started daemon" but the UI doesn't open.

**Solution**:
\`\`\`bash
coder-config ui stop
coder-config ui --foreground
\`\`\`

Check for errors in the output.

### Port already in use

**Symptom**: Error about port 3333 being in use.

**Solution**:
\`\`\`bash
coder-config ui --port 3334
\`\`\`

Or find and stop the process using port 3333.

### MCPs not loading

**Symptom**: MCPs show in config but aren't available in Claude Code.

**Solution**:
1. Run \`coder-config apply\` to regenerate .mcp.json
2. Restart Claude Code
3. Check environment variables are set

### npm install fails

**Symptom**: Errors during \`npm install -g\`

**Solution**:
\`\`\`bash
npm cache clean --force
npm install -g coder-config
\`\`\`
    `
  },
  'getting-help': {
    title: 'Getting Help',
    content: `
## Getting Help

### Documentation

This documentation is available in the app under **Docs & Help**.

### GitHub Issues

Report bugs and request features:
https://github.com/regression-io/coder-config/issues

### Version Info

\`\`\`bash
coder-config --version
\`\`\`

### Debug Info

When reporting issues, include:
- coder-config version
- Node.js version (\`node --version\`)
- Operating system
- Error messages or logs
    `
  },
};
