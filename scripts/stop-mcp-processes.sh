#!/bin/bash

# Script to stop all MCP (Model Context Protocol) processes that might interfere with local development
# This includes Neon MCP servers and any MCP remote clients

echo "🔍 Checking for MCP processes..."

# Check for processes on Neon MCP server port
echo ""
echo "📊 Processes using Neon MCP server port (42883):"
lsof -i :42883 2>/dev/null || echo "  No processes found on port 42883"

# Check for MCP-related processes
echo ""
echo "📊 MCP-related processes:"
ps aux | grep -i mcp | grep -v grep || echo "  No MCP processes found"

# Check for Neon-related processes
echo ""
echo "📊 Neon-related processes:"
ps aux | grep -i neon | grep -v grep || echo "  No Neon processes found"

# Kill MCP remote processes
echo ""
echo "🛑 Killing MCP remote processes..."
pkill -f "mcp-remote" 2>/dev/null && echo "  ✅ Killed mcp-remote processes" || echo "  No mcp-remote processes found"

# Kill Neon MCP processes
echo ""
echo "🛑 Killing Neon MCP processes..."
pkill -f "neon.*mcp" 2>/dev/null && echo "  ✅ Killed Neon MCP processes" || echo "  No Neon MCP processes found"

# Kill all MCP server processes
echo ""
echo "🛑 Killing all MCP server processes..."
pkill -f "mcp-server" 2>/dev/null && echo "  ✅ Killed MCP server processes" || echo "  No MCP server processes found"

# Kill processes on Neon MCP port
echo ""
echo "🛑 Killing processes on port 42883..."
lsof -ti :42883 | xargs kill -9 2>/dev/null && echo "  ✅ Killed processes on port 42883" || echo "  No processes on port 42883"

echo ""
echo "✅ MCP cleanup complete!"
echo ""
echo "💡 If this issue persists:"
echo "  1. Check for Cursor/VS Code MCP extensions and disable them"
echo "  2. Check for global npm scripts: npm list -g | grep mcp"
echo "  3. Check shell startup scripts (~/.bashrc, ~/.zshrc, etc.)"
echo "  4. Run this script regularly: bun scripts/stop-mcp-processes.sh"