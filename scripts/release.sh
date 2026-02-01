#!/bin/bash
# Stable release script
# Usage: npm run release              # Interactive, prompts for version
#        npm run release -- 0.46.0    # Specific version
#        npm run release -- --minor   # Bump minor version
#        npm run release -- --major   # Bump major version

set -e

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version.split('-')[0]")

# Parse current version
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"

# Determine new version
if [ -n "$1" ]; then
  case "$1" in
    --major)
      MAJOR=$((MAJOR + 1))
      MINOR=0
      PATCH=0
      NEW_VERSION="$MAJOR.$MINOR.$PATCH"
      ;;
    --minor)
      MINOR=$((MINOR + 1))
      PATCH=0
      NEW_VERSION="$MAJOR.$MINOR.$PATCH"
      ;;
    --patch)
      PATCH=$((PATCH + 1))
      NEW_VERSION="$MAJOR.$MINOR.$PATCH"
      ;;
    *)
      # Assume it's a version number
      NEW_VERSION="$1"
      ;;
  esac
else
  # Interactive mode
  echo ""
  echo "Current version: $CURRENT_VERSION"
  echo ""
  echo "Enter new version (or press Enter for patch bump):"
  read -r INPUT_VERSION

  if [ -z "$INPUT_VERSION" ]; then
    PATCH=$((PATCH + 1))
    NEW_VERSION="$MAJOR.$MINOR.$PATCH"
  else
    NEW_VERSION="$INPUT_VERSION"
  fi
fi

# Validate version format
if ! [[ "$NEW_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Invalid version format: $NEW_VERSION"
  echo "Expected format: X.Y.Z (e.g., 0.46.0)"
  exit 1
fi

TAG="v$NEW_VERSION"

echo ""
echo "📦 Releasing: $CURRENT_VERSION -> $NEW_VERSION"
echo ""

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
  echo "⚠️  You have uncommitted changes:"
  git status --short
  echo ""
  echo "Commit them first, or press Enter to continue anyway:"
  read -r
fi

# Update version in package.json
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.version = '$NEW_VERSION';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"

# Sync version to other files
npm run version:sync

# Stage version files
git add package.json lib/constants.js ui/package.json

# Commit (skip hooks)
SKIP_AUTO_PUSH=1 git commit -m "release: v$NEW_VERSION"

# Create tag
git tag "$TAG"

# Push commit and tag
echo ""
echo "🚀 Pushing $TAG..."
git push && git push --tags

echo ""
echo "✅ Released $TAG"
echo ""
echo "CI will publish to npm with 'latest' tag."
echo "Users will get this version with: npm install -g coder-config"
