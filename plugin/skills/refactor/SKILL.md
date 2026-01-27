---
name: refactor
description: Refactor large files into smaller sub-components. Do not create more large files. Refactor into modular, focused units.
---

# Refactor Large Files

Break down large files into smaller, focused modules while preserving functionality.

## When to Use

- File exceeds ~300-500 lines
- File has multiple unrelated responsibilities
- File is hard to navigate or understand
- User asks to refactor or modularize
- Before adding more code to an already large file

## Process

### Step 1: Analyze the File

1. Identify distinct responsibilities/concerns
2. Map dependencies between functions/classes
3. Find natural boundaries for splitting

Questions to ask:
- What are the main "topics" in this file?
- Which functions call each other?
- What could be tested independently?
- Are there clear layers (API, business logic, data)?

### Step 2: Plan the Split

Create a refactoring plan:

```
Original: src/bigfile.js (800 lines)

Split into:
├── src/bigfile.js (100 lines) - Main entry, re-exports
├── src/bigfile/
│   ├── api.js - API/handler functions
│   ├── utils.js - Helper functions
│   ├── types.js - Type definitions
│   └── constants.js - Constants/config
```

**Guidelines:**
- Each new file should have ONE clear purpose
- Keep related code together
- Preserve the public API (re-export from original if needed)
- New files should be <200 lines ideally

### Step 3: Execute Incrementally

1. Create new files one at a time
2. Move code, update imports
3. Test after each move
4. Keep the original file as an index/entry point

### Step 4: Clean Up

- Remove dead code
- Update imports throughout codebase
- Verify no circular dependencies
- Run tests

## Anti-patterns to Avoid

- **Don't** create files with just 1-2 functions (too granular)
- **Don't** split by arbitrary line count (split by responsibility)
- **Don't** create new large files while refactoring
- **Don't** change functionality while refactoring (separate concerns)

## Example

Before:
```
lib/api.js (600 lines)
  - HTTP handlers
  - Validation logic
  - Database queries
  - Response formatting
```

After:
```
lib/api.js (50 lines) - Entry point, re-exports
lib/api/handlers.js - HTTP route handlers
lib/api/validation.js - Input validation
lib/api/queries.js - Database operations
lib/api/responses.js - Response formatting
```
