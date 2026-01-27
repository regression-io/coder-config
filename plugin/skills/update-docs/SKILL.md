---
name: update-docs
description: Update the docs with the current state of the system, especially README.md and CHANGELOG.md. Use before committing significant changes or when documentation is stale.
---

# Update Documentation

Keep README.md and CHANGELOG.md in sync with the current state of the codebase.

## When to Use

- Before committing significant changes
- After completing a feature or fix
- When user asks to update docs
- Before creating a PR
- When documentation is visibly stale

## Process

### Step 1: Assess Current State

1. Read the current README.md and CHANGELOG.md
2. Check recent git commits to understand what changed
3. Review any new or modified files that affect documentation

### Step 2: Update CHANGELOG.md

Follow [Keep a Changelog](https://keepachangelog.com/) format:

```markdown
## [Version] - YYYY-MM-DD

### Added
- New features

### Changed
- Changes to existing functionality

### Fixed
- Bug fixes

### Removed
- Removed features
```

**Guidelines:**
- Group changes by type (Added, Changed, Fixed, Removed)
- Write from the user's perspective
- Be concise but descriptive
- Include issue/PR numbers if applicable

### Step 3: Update README.md

Check and update:
- [ ] Project description still accurate?
- [ ] Installation instructions current?
- [ ] Usage examples working?
- [ ] Configuration options complete?
- [ ] Any new features need documentation?

**Don't:**
- Add verbose explanations for simple things
- Duplicate what's obvious from the code
- Include temporary or WIP notes

### Step 4: Verify

- Ensure no broken links
- Check code examples are syntactically correct
- Verify version numbers are consistent

## Notes

- README should be scannable - use headers, lists, code blocks
- CHANGELOG is for users, not developers - focus on impact
- Keep both concise - link to detailed docs if needed
