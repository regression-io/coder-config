export const loopsContent = {
  'loops-overview': {
    title: 'Ralph Loops Overview',
    content: `
## Ralph Loops

Ralph Loops enable **autonomous development** - Claude Code runs continuously until a task is completed, without requiring manual intervention between iterations.

### The Problem

Complex development tasks often require multiple Claude sessions:
- Start task, Claude makes progress
- Review output, provide more context
- Continue, hit a blocker
- Clarify requirements, continue again
- Repeat until done

This back-and-forth is tedious and breaks your flow.

### The Solution

A Ralph Loop automates this workflow:

1. **Clarify** - Claude asks questions to understand requirements
2. **Plan** - Claude creates an implementation plan (you approve)
3. **Execute** - Claude implements the plan autonomously

The loop continues until the task is complete or budget limits are reached.

### Key Features

- **Three-phase workflow** - Ensures requirements are clear before implementation
- **Iteration limits** - Prevents runaway loops (default: 50 iterations)
- **Cost budgets** - Caps spending (default: $10)
- **Phase gates** - Manual plan approval before execution
- **Graceful pausing** - Stop at any time, resume later
    `
  },
  'creating-loops': {
    title: 'Creating Loops',
    content: `
## Creating Loops

### Via UI

1. Go to **Ralph Loops** in the sidebar
2. Click **New Loop**
3. Describe the task you want completed
4. Optionally select a workstream context
5. Click **Create Loop**

### Via CLI

\`\`\`bash
# Create a loop with a task description
coder-config loop create "Add user authentication with JWT tokens"

# Create within a workstream context
coder-config loop create "Fix API rate limiting" --workstream "Backend Services"
\`\`\`

### Task Description Tips

Be specific about what you want accomplished:

**Good task descriptions:**
- "Add user authentication using JWT tokens with refresh token support"
- "Refactor the payment module to use the new Stripe API v3"
- "Create unit tests for the user service with 80% coverage"

**Less effective:**
- "Fix the bug" (which bug?)
- "Make it better" (what specifically?)
- "Add features" (which features?)

### Starting a Loop

After creation, start the loop:

\`\`\`bash
coder-config loop start <loop-id>
\`\`\`

Then run Claude with the loop context:

\`\`\`bash
export CODER_LOOP_ID=<loop-id>
claude --continue "Your task description"
\`\`\`
    `
  },
  'loop-phases': {
    title: 'Loop Phases',
    content: `
## Loop Phases

Every Ralph Loop progresses through three phases:

### Phase 1: Clarify

**Purpose:** Ensure requirements are fully understood before planning.

In this phase, Claude:
- Asks clarifying questions about the task
- Identifies ambiguities or missing information
- Documents Q&A in \`clarifications.md\`

**Advances when:** Claude determines requirements are clear (max 5 clarification iterations by default).

### Phase 2: Plan

**Purpose:** Create a detailed implementation plan.

In this phase, Claude:
- Analyzes the clarified requirements
- Creates a step-by-step implementation plan
- Saves the plan to \`plan.md\`

**Advances when:** You approve the plan (or auto-approve is enabled).

To approve a plan:
\`\`\`bash
coder-config loop approve <loop-id>
\`\`\`

Or click the approve button in the UI.

### Phase 3: Execute

**Purpose:** Implement the plan.

In this phase, Claude:
- Follows the implementation plan step by step
- Makes code changes, runs tests, etc.
- Continues until the task is complete

**Completes when:** Claude sets \`taskComplete=true\` in the loop state.

### Phase Indicators

In the UI, phases are color-coded:
- **Blue** - Clarify phase
- **Purple** - Plan phase
- **Green** - Execute phase
    `
  },
  'loop-controls': {
    title: 'Loop Controls',
    content: `
## Controlling Loops

### Start / Resume

\`\`\`bash
coder-config loop start <loop-id>
\`\`\`

Starts a pending loop or resumes a paused one.

### Pause

\`\`\`bash
coder-config loop pause <loop-id>
\`\`\`

Pauses at the next safe point. The loop can be resumed later.

### Resume

\`\`\`bash
coder-config loop resume <loop-id>
\`\`\`

Same as \`start\` - continues a paused loop.

### Cancel

\`\`\`bash
coder-config loop cancel <loop-id>
\`\`\`

Stops the loop permanently. Can be deleted after cancellation.

### Approve Plan

\`\`\`bash
coder-config loop approve <loop-id>
\`\`\`

Approves the plan (when in plan phase), advancing to execute phase.

### Mark Complete

\`\`\`bash
coder-config loop complete <loop-id>
\`\`\`

Manually marks a loop as complete.

### Delete

\`\`\`bash
coder-config loop delete <loop-id>
\`\`\`

Deletes the loop and all its data.

### Status Commands

\`\`\`bash
# Show current active loop
coder-config loop status

# Show specific loop details
coder-config loop status <loop-id>

# List all loops
coder-config loop list

# Show completed loops history
coder-config loop history
\`\`\`
    `
  },
  'loop-configuration': {
    title: 'Loop Configuration',
    content: `
## Configuration

Configure default limits for all new loops:

### Via UI

1. Go to **Ralph Loops**
2. Click **Config** button
3. Adjust settings
4. Click **Save**

### Via CLI

\`\`\`bash
# View current configuration
coder-config loop config

# Set max iterations (default: 50)
coder-config loop config --max-iterations 100

# Set max cost budget (default: $10)
coder-config loop config --max-cost 25.00

# Enable auto-approve for plans
coder-config loop config --auto-approve-plan

# Disable auto-approve
coder-config loop config --no-auto-approve-plan
\`\`\`

### Configuration Options

| Setting | Default | Description |
|---------|---------|-------------|
| Max Iterations | 50 | Loop pauses after this many iterations |
| Max Cost | $10.00 | Loop pauses when estimated cost exceeds this |
| Auto-Approve Plan | false | Skip manual plan approval |
| Max Clarify Iterations | 5 | Max questions before auto-advancing to plan |

### Safety Mechanisms

**Iteration Limits:** Prevents infinite loops. When reached, the loop pauses with reason "max_iterations".

**Cost Budgets:** Estimates token costs per iteration. Pauses with reason "budget" when exceeded.

**Phase Gates:** By default, you must manually approve plans. This ensures you review the approach before Claude starts implementing.

### Data Storage

Loop data is stored in:
\`\`\`
~/.coder-config/loops/
├── loops.json           # Loop registry
├── history.json         # Completed loops
└── <loop-id>/
    ├── state.json       # Current state
    ├── plan.md          # Implementation plan
    ├── clarifications.md # Q&A from clarify phase
    └── iterations/      # Per-iteration logs
\`\`\`
    `
  },
};
