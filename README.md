# Repo MCP Server

An MCP (Model Context Protocol) server that exposes your repository to AI clients that support MCP, allowing them to read, write, and navigate your codebase.

## Features

- **File Operations**: Read, write, delete files
- **Directory Operations**: List contents, create directories
- **Search**: Find text within files with optional file pattern filtering
- **File Information**: Get metadata about files and directories
- **Security**: Path traversal protection to keep operations within the repository

## Setup

### 1. Clone this repo:

```bash
git clone https://github.com/Centinol-alt/repo-mcp
```

### 2. Install and Build

In this repo's root, run:

```bash
chmod +x setup.sh
./setup.sh
```

### 3. Configure Your MCP Client

#### For Claude Desktop

Add this configuration to your Claude Desktop config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "repo": {
      "command": "node",
      "args": ["/path/to/your/repo/mcp-server/dist/index.js"],
      "env": {
        "REPO_PATH": "/path/to/your/repo"
      }
    }
  }
}
```

Replace `/path/to/your/repo` with the actual path to your repository.

#### For Other MCP Clients

Use the server command: `node /path/to/your/repo/mcp-server/dist/index.js`

## Available Tools

- `read_file` - Read file contents
- `write_file` - Write content to a file
- `list_directory` - List directory contents
- `create_directory` - Create a new directory
- `delete_file` - Delete a file
- `search_files` - Search for text within files
- `get_file_info` - Get file/directory metadata

## Environment Variables

- `REPO_PATH` - Path to your repository (defaults to parent directory of the server)

## Security

The server includes path traversal protection to ensure all operations stay within your repository boundaries. Files outside the repository cannot be accessed.

## Usage Examples

Once connected to an MCP client, you can ask the AI to:

- "Show me the structure of this project"
- "Read the main application file"
- "Find all TODO comments in the codebase"
- "Create a new component file with this functionality"
- "Refactor this function across multiple files"
- "Add error handling to all API endpoints"

## Troubleshooting

1. **Server won't start**: Check that Node.js is installed and the build completed successfully
2. **Client can't connect**: Verify the path in your MCP client configuration is correct
3. **Permission errors**: Ensure the server has read/write permissions to your repository
4. **Path not found errors**: Check that `REPO_PATH` is set correctly

## Development

To modify the server:

1. Edit `src/index.ts`
2. Run `npm run build`
3. Restart your MCP client
