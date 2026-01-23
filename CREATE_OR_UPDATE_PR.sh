#!/bin/bash

# Script to create or update PR with the description from PR_DESCRIPTION.md

BRANCH="claude/redmine-due-date-today-z4tqC"
BASE_BRANCH="main"
TITLE="feat: Add due date field to Redmine issue creation"
DESCRIPTION_FILE="PR_DESCRIPTION.md"

echo "=========================================="
echo "Create or Update Pull Request"
echo "=========================================="
echo ""
echo "Branch: $BRANCH"
echo "Base: $BASE_BRANCH"
echo "Title: $TITLE"
echo ""

# Check if PR description file exists
if [ ! -f "$DESCRIPTION_FILE" ]; then
    echo "ERROR: $DESCRIPTION_FILE not found!"
    exit 1
fi

# Read the description
DESCRIPTION=$(cat "$DESCRIPTION_FILE")

echo "Description preview:"
echo "----------------------------------------"
cat "$DESCRIPTION_FILE"
echo "----------------------------------------"
echo ""

# Check if gh CLI is available
if command -v gh &> /dev/null; then
    echo "GitHub CLI detected. Attempting to create/update PR..."
    echo ""
    
    # Check if PR already exists
    PR_NUMBER=$(gh pr list --head "$BRANCH" --json number --jq '.[0].number' 2>/dev/null)
    
    if [ -n "$PR_NUMBER" ]; then
        echo "PR #$PR_NUMBER already exists. Updating description..."
        gh pr edit "$PR_NUMBER" --body-file "$DESCRIPTION_FILE"
        echo "✓ PR #$PR_NUMBER updated successfully!"
        gh pr view "$PR_NUMBER" --web
    else
        echo "Creating new PR..."
        gh pr create --base "$BASE_BRANCH" --head "$BRANCH" --title "$TITLE" --body-file "$DESCRIPTION_FILE"
        echo "✓ PR created successfully!"
    fi
else
    echo "GitHub CLI (gh) not found."
    echo ""
    echo "To create/update the PR manually:"
    echo "1. Go to: https://github.com/prabhuvikas/Cap-screen/pulls"
    echo "2. Click 'New pull request' or find existing PR for branch: $BRANCH"
    echo "3. Set title to: $TITLE"
    echo "4. Copy the content from PR_DESCRIPTION.md as the description"
    echo ""
    echo "Or install GitHub CLI:"
    echo "  https://cli.github.com/"
fi

echo ""
echo "=========================================="
