#!/usr/bin/env node

/**
 * MCP Server Entry Point
 *
 * Main entry point for the MCP server application.
 * This file is responsible for starting the server and handling application lifecycle.
 */

import { startServer } from './server.js';
import { log } from './utils.js';

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
