#!/bin/bash

echo "Setting up Repo MCP Server..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed. Please install npm first."
    exit 1
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Build the project
echo "Building the project..."
npm run build

# Make the server executable
chmod +x dist/index.js

echo "Setup complete!"
echo ""
echo "To start the server manually:"
echo "  npm start"
echo ""
echo "To configure with Claude Desktop, add this to your config:"
echo "{"
echo "  \"mcpServers\": {"
echo "    \"repo\": {"
echo "      \"command\": \"node\","
echo "      \"args\": [\"$(pwd)/dist/index.js\"],"
echo "      \"env\": {"
echo "        \"REPO_PATH\": \"$(dirname $(pwd))\""
echo "      }"
echo "    }"
echo "  }"
echo "}"