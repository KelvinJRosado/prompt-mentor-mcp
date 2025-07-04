/**
 * MCP Server implementation
 *
 * This module contains the core server setup, request handlers,
 * and server lifecycle management for the MCP server.
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
import {
  SERVER_NAME,
  SERVER_VERSION,
  log,
  validateServerState,
  validateToolParams,
} from './utils.js';
import { createGeminiClient, testConnectivity } from './gemini.js';

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
    validateServerState(server);

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
        name: 'test_gemini',
        description: 'Test connectivity to the Gemini API',
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
      validateServerState(server);

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

        case 'test_gemini': {
          const apiKey = process.env.GEMINI_API_KEY;

          // TODO: Remove this
          log('info', `API KEY: ${apiKey}`, {
            success: true,
          });

          if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
            throw new McpError(
              ErrorCode.InvalidParams,
              'GEMINI_API_KEY environment variable is required and must be a non-empty string'
            );
          }

          log('info', 'Testing Gemini API connectivity using environment key');

          const message = await testConnectivity(apiKey);

          if (!message || typeof message !== 'string') {
            throw new McpError(
              ErrorCode.InternalError,
              'Gemini API did not return a valid response'
            );
          }

          log('info', 'Gemini connectivity test completed', {
            success: true,
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
            availableTools: ['say_hello', 'test_gemini'],
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
export async function startServer(): Promise<void> {
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

    log('info', 'Available tools: say_hello, test_gemini');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', 'Failed to start server', { error: errorMessage });
    process.exit(1);
  }
}
