# scripts/release.ps1
$ErrorActionPreference = 'Stop' # Exit immediately if a command exits with a non-zero status.

Write-Host "Optimizing new version submission flow (PowerShell compatible)..."

# 1. Ensure clean git working directory
Write-Host "Checking for uncommitted changes..."
$gitStatus = git status --porcelain
if ($gitStatus) {
  Write-Host "Error: Uncommitted changes detected. Please commit or stash them before running the release script."
  exit 1
}

# 2. Bump version, create commit and tag
Write-Host "Bumping version and creating tag..."
# `bun pm version patch` automatically creates a commit and a tag like vX.Y.Z
# We need to capture the new version string.
$newVersionOutput = bun pm version patch
$NEW_VERSION = ($newVersionOutput | Select-Object -Last 1).Trim() # Assumes the last line is the version, e.g., "v1.0.1"
Write-Host "Version bumped to $NEW_VERSION"

# 3. Generate CHANGELOG.md
Write-Host "Generating CHANGELOG.md..."
bun run changelog

# 4. Stage CHANGELOG.md
Write-Host "Staging CHANGELOG.md..."
git add CHANGELOG.md

# 5. Amend the previous commit to include CHANGELOG.md
# git commit --amend automatically takes the last commit message if --no-edit is used
Write-Host "Amending previous commit to include CHANGELOG.md..."
git commit --amend --no-edit

# 6. Force update the tag to point to the amended commit (important!)
# `git commit --amend` creates a new commit SHA. We need to update the tag to point to this new SHA.
Write-Host "Updating Git tag $NEW_VERSION to new commit SHA..."
git tag -f $NEW_VERSION HEAD

# 7. Run the project build (dist/ is ignored, so it's not committed)
Write-Host "Running project build..."
bun run build

Write-Host "Release process complete for version $NEW_VERSION."
Write-Host "You can now push your changes with: git push --follow-tags"
