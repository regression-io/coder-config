# Flush Context to Resumable Doc

Save all current session context to a resumable document.

## Instructions

### Step 1: Find or Create .claude Directory

Check for `.claude/` directory:

1. **If `.claude/` exists in current directory**: Use it directly
2. **If no `.claude/` in current directory**: Search parent directories for the first `.claude/` folder
   - If found in a parent: Ask the user which to use:
     - "Use parent project at `<parent-path>`" (saves to parent's `.claude/session-context.md`)
     - "Create `.claude/` here" (creates `.claude/` in current directory)
   - If no `.claude/` found anywhere: Ask the user:
     - "Create `.claude/` in current directory?"
     - If yes, create it. If no, abort.

3. **If creating new `.claude/`**: After creating, ask if they want to run `/init` to set up project configuration (CLAUDE.md, rules, etc.)

### Step 2: Create Session Summary

Create a comprehensive summary including:
- **Task Summary**: What the user asked for and the overall goal
- **Current State**: Where we are in the task (completed, in-progress, blocked)
- **Key Decisions Made**: Important choices and their rationale
- **Files Modified**: List of files created or changed
- **Pending Work**: What still needs to be done
- **Important Context**: Any critical information needed to continue

### Step 3: Write and Confirm

Write the summary to `<chosen-directory>/.claude/session-context.md` and confirm to the user.

## Output Format

```markdown
# Session Context - [Date]

## Task Summary
[What the user wanted to accomplish]

## Current State
[in-progress | completed | blocked]
[Brief status description]

## Key Decisions
- [Decision 1]: [Rationale]
- [Decision 2]: [Rationale]

## Files Modified
- `path/to/file1` - [what was changed]
- `path/to/file2` - [what was changed]

## Pending Work
- [ ] [Task 1]
- [ ] [Task 2]

## Important Context
[Any critical information needed to continue this work]
```
