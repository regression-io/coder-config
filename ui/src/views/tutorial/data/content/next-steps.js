export const nextStepsContent = {
  'next-steps': {
    title: 'Next Steps',
    content: `
You've finished the Coder Config tutorial. At this point you know how to add projects, write rules, configure MCP servers, set up permissions, use the memory system, install plugins, work with workstreams, and sync across multiple tools.

That covers the core functionality. Here's how to go deeper.

### Explore on Your Own

The best way to learn is to use Coder Config on real projects. Add your main development project, write some rules, install a plugin or two. Pay attention to where Claude surprises you—either by not knowing something it should, or by doing something you'd prefer it didn't. Those moments are opportunities to refine your configuration.

### The Documentation

When you need details on specific features, check **Docs & Help** in the sidebar. It has comprehensive reference material for every part of Coder Config—command syntax, configuration file formats, MCP protocol details.

### Creating Your Own

Once you understand how plugins work, consider creating your own. Your team's conventions, your company's patterns, integrations with your internal tools—these make great plugins that you can share with colleagues.

Same goes for MCP servers. If you have internal systems that Claude should be able to access, you can build custom MCP servers. The protocol is documented, and templates exist to help you get started.

### Community and Feedback

Coder Config is actively developed. If you find bugs, want features, or have suggestions, the GitHub repository is the place to go. Issues and discussions welcome.

### Command Line Reference

For those who prefer the terminal, Coder Config has a full CLI:

\`\`\`bash
coder-config ui              # Start the web interface
coder-config ui stop         # Stop the daemon
coder-config apply           # Apply config to current project
coder-config mcp add <name>  # Add an MCP server
coder-config workstream use  # Activate a workstream
coder-config --help          # See all commands
\`\`\`

Everything you can do in the UI, you can do from the command line. Some power users prefer it.

### Thank You

Thanks for using Coder Config. The goal is to make AI coding assistants work the way you want them to, without the friction of scattered configuration files and forgotten context. Hopefully this tool helps.

Happy coding.
    `
  },
};
