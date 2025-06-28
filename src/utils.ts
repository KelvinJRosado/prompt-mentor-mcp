/**
 * Utility functions for the MCP server
 *
 * This module contains helper functions for logging, validation,
 * and other common operations used throughout the server.
 */

import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

/**
 * Server configuration constants
 */
export const SERVER_NAME = 'prompt-mentor-mcp';
export const SERVER_VERSION = '1.0.0';

/**
 * Utility function for logging to stderr (MCP servers should not use stdout for logging)
 */
export function log(
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
export function validateServerState(server: any): void {
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
export function validateToolParams(toolName: string, params: any): void {
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
