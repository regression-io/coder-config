#!/bin/bash
# Activity Tracking Hook for Claude Code
# Install: Add to ~/.claude/hooks/post-response.sh
#
# This hook tracks file activity to help suggest workstreams based on usage patterns.
# It extracts file paths from Claude's response and logs them to the activity tracker.

# Exit silently if claude-config isn't available
if ! command -v claude-config &> /dev/null; then
  exit 0
fi

# Generate session ID from current terminal session
SESSION_ID="${CLAUDE_SESSION_ID:-$(date +%Y%m%d)-$$}"

# The hook receives the response as stdin
# We extract file paths mentioned in tool calls (Read, Edit, Write, Grep, Glob results)
response=$(cat)

# Extract file paths from the response
# Look for patterns like:
# - "file_path": "/path/to/file"
# - Read file: /path/to/file
# - Edit file: /path/to/file
# - paths from glob/grep results

files=$(echo "$response" | grep -oE '(/[a-zA-Z0-9_/.~-]+\.[a-zA-Z0-9]+)' | sort -u | head -50)

if [ -n "$files" ]; then
  # Convert to JSON array
  json_files="["
  first=true
  while IFS= read -r file; do
    # Skip common non-file patterns
    [[ "$file" == *"/api/"* ]] && continue
    [[ "$file" == *"/ws/"* ]] && continue
    [[ "$file" == *".com"* ]] && continue
    [[ "$file" == *".org"* ]] && continue

    if [ "$first" = true ]; then
      first=false
    else
      json_files+=","
    fi
    json_files+="\"$file\""
  done <<< "$files"
  json_files+="]"

  # Log to activity tracker via API (run in background to not block)
  curl -s -X POST "http://localhost:3333/api/activity/log" \
    -H "Content-Type: application/json" \
    -d "{\"files\": $json_files, \"sessionId\": \"$SESSION_ID\"}" > /dev/null 2>&1 &
fi

# Pass through the response unchanged
echo "$response"
