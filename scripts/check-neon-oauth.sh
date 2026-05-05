#!/bin/bash

# Script to detect and stop Neon OAuth server processes
# Run this if you're experiencing redirects to localhost:42883

echo "🔍 Checking for Neon OAuth server processes..."

# Check for processes on port 42883
echo ""
echo "📊 Processes using port 42883:"
lsof -i :42883 2>/dev/null || echo "  No processes found on port 42883"

# Check for Neon-related processes
echo ""
echo "📊 Neon-related processes:"
ps aux | grep -i neon | grep -v grep || echo "  No Neon processes found"

# Check for MCP server processes
echo ""
echo "📊 MCP server processes:"
ps aux | grep -i mcp | grep -v grep || echo "  No MCP processes found"

# Check environment variables
echo ""
echo "📊 Environment variables:"
echo "  NEXTAUTH_URL: ${NEXTAUTH_URL:0:50}..."
if [[ "$NEXTAUTH_URL" == *"42883"* ]] || [[ "$NEXTAUTH_URL" == *"neon.tech"* ]]; then
  echo "  ❌ WARNING: NEXTAUTH_URL contains Neon OAuth server reference!"
else
  echo "  ✅ NEXTAUTH_URL looks OK"
fi

echo ""
echo "💡 To stop Neon OAuth server processes:"
echo "  pkill -f neon"
echo "  pkill -f 'mcp.*neon'"
echo "  lsof -ti :42883 | xargs kill -9"
