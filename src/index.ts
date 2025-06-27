#!/usr/bin/env node

/**
 * Hello World MCP Server
 *
 * A basic MCP server that demonstrates the Model Context Protocol
 * with a simple hello world message and current time functionality.
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
 * Generates a personalized hello world message
 */
function generateHelloMessage(): string {
  const greetings = [
    'Hello from your friendly MCP server!',
    'Greetings! Your MCP server is working perfectly.',
    'Hi there! This is a sample message from your MCP server.',
    'Welcome! Your Model Context Protocol server is operational.',
    'Hello! This MCP server is ready to assist you.',
  ];

  const randomIndex = Math.floor(Math.random() * greetings.length);
  return greetings[randomIndex];
}

/**
 * Gets the current system time in a formatted string
 */
function getCurrentTimeFormatted(): string {
  try {
    const now = new Date();
    return now.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
    });
  } catch (error) {
    log('error', 'Failed to format current time', {
      error: error instanceof Error ? error.message : String(error),
    });
    return new Date().toISOString(); // Fallback to ISO string
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
      {
        name: 'get_current_time',
        description: 'Get the current system time in a formatted string',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'server_info',
        description: 'Get information about this MCP server',
        inputSchema: {
          type: 'object',
          properties: {},
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
          let message = generateHelloMessage();

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

        case 'get_current_time': {
          const timeString = getCurrentTimeFormatted();

          log('info', 'Generated current time', { timeString });

          return {
            content: [
              {
                type: 'text',
                text: `The current time is: ${timeString}`,
              },
            ],
          };
        }

        case 'server_info': {
          const serverInfo = {
            name: SERVER_NAME,
            version: SERVER_VERSION,
            description:
              'A hello-world MCP server demonstrating basic functionality',
            capabilities: ['tools'],
            protocol: 'Model Context Protocol (MCP)',
            uptime: process.uptime(),
            nodeVersion: process.version,
            platform: process.platform,
            architecture: process.arch,
          };

          log('info', 'Generated server info', { uptime: serverInfo.uptime });

          return {
            content: [
              {
                type: 'text',
                text: `Server Information:\n${JSON.stringify(
                  serverInfo,
                  null,
                  2
                )}`,
              },
            ],
          };
        }

        default: {
          const errorMessage = `Unknown tool: ${name}`;
          log('warn', errorMessage, {
            availableTools: ['say_hello', 'get_current_time', 'server_info'],
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
    log('info', 'Available tools: say_hello, get_current_time, server_info');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', 'Failed to start server', { error: errorMessage });
    process.exit(1);
  }
}

/**
 * Handle graceful shutdown
 */
function setupGracefulShutdown(): void {
  const handleShutdown = (signal: string) => {
    log('info', `Received ${signal}, shutting down gracefully...`);

    // Close server connections
    if (server) {
      log('info', 'Closing server connections...');
    }

    log('info', 'Shutdown complete');
    process.exit(0);
  };

  // Handle various shutdown signals
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
  process.on('SIGUSR1', () => handleShutdown('SIGUSR1'));
  process.on('SIGUSR2', () => handleShutdown('SIGUSR2'));
}

/**
 * Handle uncaught exceptions and unhandled rejections
 */
function setupErrorHandling(): void {
  process.on('uncaughtException', (error) => {
    log('error', 'Uncaught exception occurred', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    log('error', 'Unhandled promise rejection', { reason, promise });
    process.exit(1);
  });
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  try {
    // Set up error handling and graceful shutdown
    setupErrorHandling();
    setupGracefulShutdown();

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
