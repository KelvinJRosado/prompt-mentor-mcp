#!/usr/bin/env node

/**
 * Hello World MCP Server
 *
 * A basic MCP server that demonstrates the Model Context Protocol
 * with a simple hello world message functionality.
 *
 * This server follows DXT specifications and includes proper error handling,
 * logging, and defensive programming practices.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
  CallToolRequest,
} from '@modelcontextprotocol/sdk/types.js';

/**
 * Server configuration constants
 */
const SERVER_NAME = 'prompt-mentor-mcp';
const SERVER_VERSION = '1.0.0';

/**
 * Utility function for logging to stderr (MCP servers should not use stdout for logging)
 */
function log(
  level: 'info' | 'warn' | 'error',
  message: string,
  data?: any
): void {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${SERVER_NAME}: ${message}`;

  if (data) {
    console.error(logMessage, JSON.stringify(data, null, 2));
  } else {
    console.error(logMessage);
  }
}

/**
 * Validates that the server is properly initialized
 */
function validateServerState(): void {
  if (!server) {
    throw new McpError(
      ErrorCode.InternalError,
      'Server not properly initialized'
    );
  }
}

/**
 * Validates tool call parameters
 */
function validateToolParams(toolName: string, params: any): void {
  if (!toolName || typeof toolName !== 'string') {
    throw new McpError(
      ErrorCode.InvalidParams,
      'Tool name must be a non-empty string'
    );
  }

  if (params && typeof params !== 'object') {
    throw new McpError(
      ErrorCode.InvalidParams,
      'Tool parameters must be an object'
    );
  }
}

/**
 * Create and configure the MCP server
 */
const server = new Server(
  {
    name: SERVER_NAME,
    version: SERVER_VERSION,
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * Handle tool listing requests
 * Returns the list of available tools that this server provides
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  try {
    validateServerState();

    log('info', 'Received tools list request');

    const tools = [
      {
        name: 'say_hello',
        description: 'Get a friendly hello message from the server',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Optional name to personalize the greeting',
            },
          },
        },
      },
    ];

    log('info', `Returning ${tools.length} available tools`);
    return { tools };
  } catch (error) {
    log('error', 'Failed to list tools', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error instanceof McpError
      ? error
      : new McpError(ErrorCode.InternalError, 'Failed to retrieve tools list');
  }
});

/**
 * Handle tool execution requests
 * Executes the requested tool with the provided parameters
 */
server.setRequestHandler(
  CallToolRequestSchema,
  async (request: CallToolRequest) => {
    try {
      validateServerState();

      const { name, arguments: args } = request.params;

      log('info', `Received tool call request`, { toolName: name, args });

      // Validate input parameters
      validateToolParams(name, args);

      // Execute the requested tool
      switch (name) {
        case 'say_hello': {
          const personName = args?.name;
          let message = 'Hello from your friendly MCP server!';

          if (
            personName &&
            typeof personName === 'string' &&
            personName.trim()
          ) {
            message += ` Nice to meet you, ${personName.trim()}!`;
          }

          log('info', 'Generated hello message', {
            personName,
            messageLength: message.length,
          });

          return {
            content: [
              {
                type: 'text',
                text: message,
              },
            ],
          };
        }

        default: {
          const errorMessage = `Unknown tool: ${name}`;
          log('warn', errorMessage, {
            availableTools: ['say_hello'],
          });

          throw new McpError(ErrorCode.MethodNotFound, errorMessage);
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const toolName = request.params?.name || 'unknown';

      log('error', `Tool execution failed`, {
        toolName,
        error: errorMessage,
        args: request.params?.arguments,
      });

      // Re-throw McpErrors as-is, wrap other errors
      if (error instanceof McpError) {
        throw error;
      }

      throw new McpError(
        ErrorCode.InternalError,
        `Tool execution failed: ${errorMessage}`
      );
    }
  }
);

/**
 * Start the MCP server
 */
async function startServer(): Promise<void> {
  try {
    log('info', 'Starting MCP server...');

    // Create transport for stdio communication
    const transport = new StdioServerTransport();

    // Connect the server to the transport
    await server.connect(transport);

    log(
      'info',
      `${SERVER_NAME} v${SERVER_VERSION} is running and ready to accept requests`
    );
    log('info', 'Available tools: say_hello');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', 'Failed to start server', { error: errorMessage });
    process.exit(1);
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  try {
    // Start the server
    await startServer();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', 'Application startup failed', { error: errorMessage });
    process.exit(1);
  }
}

// Start the application
main().catch((error) => {
  console.error('Fatal error during startup:', error);
  process.exit(1);
});
