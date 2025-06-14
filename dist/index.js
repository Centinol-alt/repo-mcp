#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
class RepoMCPServer {
    constructor() {
        this.server = new Server({
            name: 'repo-mcp-server',
            version: '1.0.0',
        });
        // Default to parent directory of the server, or use REPO_PATH env var
        this.repoPath = process.env.REPO_PATH || path.resolve(__dirname, '../../');
        this.setupToolHandlers();
        this.setupErrorHandling();
    }
    setupErrorHandling() {
        this.server.onerror = (error) => console.error('[MCP Error]', error);
        process.on('SIGINT', async () => {
            await this.server.close();
            process.exit(0);
        });
    }
    setupToolHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: [
                {
                    name: 'read_file',
                    description: 'Read the contents of a file',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            path: {
                                type: 'string',
                                description: 'Path to the file relative to repository root',
                            },
                        },
                        required: ['path'],
                    },
                },
                {
                    name: 'write_file',
                    description: 'Write content to a file',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            path: {
                                type: 'string',
                                description: 'Path to the file relative to repository root',
                            },
                            content: {
                                type: 'string',
                                description: 'Content to write to the file',
                            },
                        },
                        required: ['path', 'content'],
                    },
                },
                {
                    name: 'list_directory',
                    description: 'List contents of a directory',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            path: {
                                type: 'string',
                                description: 'Path to directory relative to repository root (empty for root)',
                            },
                        },
                        required: ['path'],
                    },
                },
                {
                    name: 'create_directory',
                    description: 'Create a new directory',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            path: {
                                type: 'string',
                                description: 'Path to directory to create relative to repository root',
                            },
                        },
                        required: ['path'],
                    },
                },
                {
                    name: 'delete_file',
                    description: 'Delete a file',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            path: {
                                type: 'string',
                                description: 'Path to file to delete relative to repository root',
                            },
                        },
                        required: ['path'],
                    },
                },
                {
                    name: 'search_files',
                    description: 'Search for text within files',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            query: {
                                type: 'string',
                                description: 'Text to search for',
                            },
                            file_pattern: {
                                type: 'string',
                                description: 'File pattern to search within (e.g., "*.js", "*.py")',
                            },
                            max_results: {
                                type: 'number',
                                description: 'Maximum number of results to return',
                                default: 20,
                            },
                        },
                        required: ['query'],
                    },
                },
                {
                    name: 'get_file_info',
                    description: 'Get information about a file or directory',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            path: {
                                type: 'string',
                                description: 'Path to file or directory relative to repository root',
                            },
                        },
                        required: ['path'],
                    },
                },
            ],
        }));
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            try {
                const { name, arguments: args } = request.params;
                if (!args) {
                    throw new Error('No arguments provided');
                }
                switch (name) {
                    case 'read_file':
                        return await this.readFile(args.path);
                    case 'write_file':
                        return await this.writeFile(args.path, args.content);
                    case 'list_directory':
                        return await this.listDirectory(args.path);
                    case 'create_directory':
                        return await this.createDirectory(args.path);
                    case 'delete_file':
                        return await this.deleteFile(args.path);
                    case 'search_files':
                        return await this.searchFiles(args.query, args.file_pattern, args.max_results);
                    case 'get_file_info':
                        return await this.getFileInfo(args.path);
                    default:
                        throw new Error(`Unknown tool: ${name}`);
                }
            }
            catch (error) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
                        },
                    ],
                };
            }
        });
    }
    getAbsolutePath(relativePath) {
        const fullPath = path.resolve(this.repoPath, relativePath);
        // Security check: ensure path is within repository
        if (!fullPath.startsWith(this.repoPath)) {
            throw new Error('Access denied: Path outside repository');
        }
        return fullPath;
    }
    async readFile(relativePath) {
        const fullPath = this.getAbsolutePath(relativePath);
        if (!await fs.pathExists(fullPath)) {
            throw new Error(`File not found: ${relativePath}`);
        }
        const content = await fs.readFile(fullPath, 'utf-8');
        return {
            content: [
                {
                    type: 'text',
                    text: content,
                },
            ],
        };
    }
    async writeFile(relativePath, content) {
        const fullPath = this.getAbsolutePath(relativePath);
        const dir = path.dirname(fullPath);
        // Create directory if it doesn't exist
        await fs.ensureDir(dir);
        await fs.writeFile(fullPath, content, 'utf-8');
        return {
            content: [
                {
                    type: 'text',
                    text: `Successfully wrote to ${relativePath}`,
                },
            ],
        };
    }
    async listDirectory(relativePath) {
        const fullPath = this.getAbsolutePath(relativePath || '.');
        if (!await fs.pathExists(fullPath)) {
            throw new Error(`Directory not found: ${relativePath}`);
        }
        const items = await fs.readdir(fullPath, { withFileTypes: true });
        const result = items.map(item => ({
            name: item.name,
            type: item.isDirectory() ? 'directory' : 'file',
            path: path.join(relativePath || '', item.name).replace(/\\/g, '/'),
        }));
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(result, null, 2),
                },
            ],
        };
    }
    async createDirectory(relativePath) {
        const fullPath = this.getAbsolutePath(relativePath);
        await fs.ensureDir(fullPath);
        return {
            content: [
                {
                    type: 'text',
                    text: `Successfully created directory: ${relativePath}`,
                },
            ],
        };
    }
    async deleteFile(relativePath) {
        const fullPath = this.getAbsolutePath(relativePath);
        if (!await fs.pathExists(fullPath)) {
            throw new Error(`File not found: ${relativePath}`);
        }
        await fs.remove(fullPath);
        return {
            content: [
                {
                    type: 'text',
                    text: `Successfully deleted: ${relativePath}`,
                },
            ],
        };
    }
    async searchFiles(query, filePattern, maxResults = 20) {
        const results = [];
        const searchInDirectory = async (dirPath, relativePath = '') => {
            if (results.length >= maxResults)
                return;
            const items = await fs.readdir(dirPath, { withFileTypes: true });
            for (const item of items) {
                if (results.length >= maxResults)
                    break;
                const itemPath = path.join(dirPath, item.name);
                const itemRelativePath = path.join(relativePath, item.name).replace(/\\/g, '/');
                if (item.isDirectory()) {
                    // Skip common directories that shouldn't be searched
                    if (!['node_modules', '.git', 'dist', 'build', '.next'].includes(item.name)) {
                        await searchInDirectory(itemPath, itemRelativePath);
                    }
                }
                else if (item.isFile()) {
                    // Check file pattern if provided
                    if (filePattern) {
                        const pattern = filePattern.replace(/\*/g, '.*');
                        const regex = new RegExp(pattern + '$');
                        if (!regex.test(item.name))
                            continue;
                    }
                    try {
                        const content = await fs.readFile(itemPath, 'utf-8');
                        const lines = content.split('\n');
                        lines.forEach((line, index) => {
                            if (results.length >= maxResults)
                                return;
                            if (line.toLowerCase().includes(query.toLowerCase())) {
                                results.push({
                                    file: itemRelativePath,
                                    line: index + 1,
                                    content: line.trim(),
                                });
                            }
                        });
                    }
                    catch (error) {
                        // Skip files that can't be read as text
                    }
                }
            }
        };
        await searchInDirectory(this.repoPath);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(results, null, 2),
                },
            ],
        };
    }
    async getFileInfo(relativePath) {
        const fullPath = this.getAbsolutePath(relativePath);
        if (!await fs.pathExists(fullPath)) {
            throw new Error(`Path not found: ${relativePath}`);
        }
        const stats = await fs.stat(fullPath);
        const info = {
            path: relativePath,
            type: stats.isDirectory() ? 'directory' : 'file',
            size: stats.size,
            created: stats.birthtime.toISOString(),
            modified: stats.mtime.toISOString(),
            permissions: '0' + (stats.mode & parseInt('777', 8)).toString(8),
        };
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(info, null, 2),
                },
            ],
        };
    }
    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('Repo MCP server running on stdio');
    }
}
const server = new RepoMCPServer();
server.run().catch(console.error);
//# sourceMappingURL=index.js.map