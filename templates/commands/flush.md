# Flush Context to Resumable Doc

Save all current session context to a resumable document in the current project's `.claude/` directory.

## Instructions

1. Create a comprehensive summary of the current session including:
   - **Task Summary**: What the user asked for and the overall goal
   - **Current State**: Where we are in the task (completed, in-progress, blocked)
   - **Key Decisions Made**: Important choices and their rationale
   - **Files Modified**: List of files created or changed
   - **Pending Work**: What still needs to be done
   - **Important Context**: Any critical information needed to continue

2. Determine the project root (where `.git/` or `.claude/` exists) and write this summary to: `<project-root>/.claude/session-context.md`
   - If `.claude/` directory doesn't exist, create it
   - This keeps the context local to this specific project

3. Confirm to the user that context has been saved to the project directory and will be available on the next session in this project.

## Output Format

Write the file in this format:

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
