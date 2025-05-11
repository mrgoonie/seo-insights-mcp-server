#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Logger } from './utils/logger.util.js';
import { config } from './utils/config.util.js';
import { VERSION, PACKAGE_NAME } from './utils/constants.util.js';
import { runCli } from './cli/index.js';
import express from 'express';
import { randomUUID } from 'crypto';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';

// Import tools and resources
import seoTools from './tools/seo.tool.js';
import { InMemoryEventStore } from '@modelcontextprotocol/sdk/examples/shared/inMemoryEventStore.js';

/**
 * SEO Insights MCP Server
 *
 * A project for building MCP servers that follow best practices.
 * Provides SEO tools for backlinks analysis, keyword research, and traffic analysis.
 * Demonstrates proper structure, logging, error handling, and MCP protocol integration.
 */

// Create file-level logger
const indexLogger = Logger.forContext('index.ts');

// Log initialization at debug level
indexLogger.debug('SEO Insights MCP server module loaded');

let serverInstance: McpServer | null = null;
let expressApp: express.Application | null = null;
let expressServer: ReturnType<express.Application['listen']> | null = null;

// Map to store transports by session ID for HTTP transport mode
const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

/**
 * Start the MCP server with the specified transport mode
 *
 * @param mode The transport mode to use (stdio or http)
 * @returns Promise that resolves to the server instance when started successfully
 */
export async function startServer(mode: 'stdio' | 'http' = 'stdio') {
	const serverLogger = Logger.forContext('index.ts', 'startServer');

	// Load configuration
	serverLogger.info('Starting MCP server initialization...');
	config.load();
	serverLogger.info('Configuration loaded successfully');

	// Enable debug logging if DEBUG is set to true
	if (config.getBoolean('DEBUG')) {
		serverLogger.debug('Debug mode enabled');
	}

	// Log the DEBUG value to verify configuration loading
	serverLogger.debug(`DEBUG environment variable: ${process.env.DEBUG}`);
	serverLogger.debug(
		`IPAPI_API_TOKEN value exists: ${Boolean(process.env.IPAPI_API_TOKEN)}`,
	);
	serverLogger.debug(`Config DEBUG value: ${config.get('DEBUG')}`);

	serverLogger.info(`Initializing SEO Insights MCP server v${VERSION}`);
	serverInstance = new McpServer({
		name: PACKAGE_NAME,
		version: VERSION,
	});

	// Register tools and resources
	serverLogger.info('Registering tools and resources...');
	seoTools.register(serverInstance);
	serverLogger.debug('Registered SEO tools');
	serverLogger.info('All tools and resources registered successfully');

	if (mode === 'stdio') {
		// Configure STDIO transport
		serverLogger.info('Using STDIO transport for MCP communication');
		const stdioTransport = new StdioServerTransport();

		// Connect the McpServer instance to the transport
		serverLogger.info('Connecting MCP Server to STDIO transport...');
		try {
			await serverInstance.connect(stdioTransport);
			serverLogger.info(
				'MCP Server connected to STDIO transport successfully',
			);
		} catch (err) {
			serverLogger.error(
				'Failed to connect MCP Server to STDIO transport',
				err,
			);
			process.exit(1); // Exit if connection fails - crucial error
		}
	} else if (mode === 'http') {
		// Configure HTTP transport with Express
		const host = config.getString('MCP_HTTP_HOST');
		const port = config.getNumber('MCP_HTTP_PORT', 8080);
		const path = config.getString('MCP_HTTP_PATH', '/mcp');

		serverLogger.info(
			`Using Streamable HTTP transport with Express for MCP communication on ${host}:${port}${path}`,
		);

		// Create Express app
		expressApp = express();
		expressApp.use(express.json());

		// Set up MCP endpoint
		expressApp.post(path, async (req, res) => {
			serverLogger.info(`[Express] Received POST request to ${path}`);
			try {
				// Check for existing session ID
				const sessionId = req.headers['mcp-session-id'] as
					| string
					| undefined;
				let transport: StreamableHTTPServerTransport;

				if (sessionId && transports[sessionId]) {
					// Reuse existing transport
					serverLogger.info(
						`[Express] Reusing existing transport for session ${sessionId}`,
					);
					transport = transports[sessionId];
				} else {
					// Either no session ID or invalid session ID provided
					// Create a new transport with a new session ID
					if (sessionId) {
						serverLogger.warn(
							`[Express] Invalid session ID provided: ${sessionId}, creating new session`,
						);
					} else if (isInitializeRequest(req.body)) {
						serverLogger.info(
							'[Express] Handling new initialization request',
						);
					} else {
						serverLogger.warn(
							'[Express] No session ID provided, creating new session',
						);
					}

					const eventStore = new InMemoryEventStore();
					let newSessionId: string | null = null;
					transport = new StreamableHTTPServerTransport({
						sessionIdGenerator: () => {
							newSessionId = randomUUID();
							return newSessionId;
						},
						eventStore, // Enable resumability
						onsessioninitialized: (sessionId) => {
							// Store the transport by session ID when session is initialized
							serverLogger.info(
								`[Express] Session initialized with ID: ${sessionId}`,
							);
							transports[sessionId] = transport;

							// Set the session ID in the response headers
							res.setHeader('mcp-session-id', sessionId);
						},
					});

					// Set up onclose handler to clean up transport when closed
					transport.onclose = () => {
						const sid = transport.sessionId;
						if (sid && transports[sid]) {
							serverLogger.info(
								`[Express] Transport closed for session ${sid}, removing from transports map`,
							);
							delete transports[sid];
						}
					};

					// Connect the transport to the MCP server BEFORE handling the request
					if (serverInstance) {
						await serverInstance.connect(transport);
						serverLogger.info(
							'[Express] Connected new transport to MCP server',
						);
					} else {
						serverLogger.error(
							'[Express] Cannot connect transport - serverInstance is null',
						);
						res.status(500).json({
							jsonrpc: '2.0',
							error: {
								code: -32603,
								message:
									'Internal server error - MCP server not initialized',
							},
							id: null,
						});
						return;
					}
				}

				// If this is a new transport and we have a session ID, make sure it's in the response headers
				// Do this BEFORE handling the request to ensure headers can be set
				if (
					transport.sessionId &&
					!res.getHeader('mcp-session-id') &&
					!res.headersSent
				) {
					res.setHeader('mcp-session-id', transport.sessionId);
					serverLogger.info(
						`[Express] Added session ID to response headers: ${transport.sessionId}`,
					);
				}

				// Handle the request with the transport
				await transport.handleRequest(req, res, req.body);
			} catch (error) {
				serverLogger.error(
					'[Express] Error handling MCP request:',
					error,
				);
				if (!res.headersSent) {
					res.status(500).json({
						jsonrpc: '2.0',
						error: {
							code: -32603,
							message: 'Internal server error',
						},
						id: null,
					});
				}
			}
		});

		expressApp.get('/', (_req, res) => {
			res.send('Hello World!');
		});

		// Handle GET requests for SSE streams
		expressApp.get(path, async (req, res) => {
			const sessionId = req.headers['mcp-session-id'] as
				| string
				| undefined;
			if (!sessionId || !transports[sessionId]) {
				serverLogger.warn(
					`[Express] Invalid or missing session ID for GET request: ${sessionId}`,
				);
				res.status(400).send('Invalid or missing session ID');
				return;
			}

			// Check for Last-Event-ID header for resumability
			const lastEventId = req.headers['last-event-id'] as
				| string
				| undefined;
			if (lastEventId) {
				serverLogger.info(
					`[Express] Client reconnecting with Last-Event-ID: ${lastEventId}`,
				);
			} else {
				serverLogger.info(
					`[Express] Establishing new SSE stream for session ${sessionId}`,
				);
			}

			const transport = transports[sessionId];
			await transport.handleRequest(req, res);
		});

		// Handle DELETE requests for session termination
		expressApp.delete(path, async (req, res) => {
			const sessionId = req.headers['mcp-session-id'] as
				| string
				| undefined;
			if (!sessionId || !transports[sessionId]) {
				serverLogger.warn(
					`[Express] Invalid or missing session ID for DELETE request: ${sessionId}`,
				);
				res.status(400).send('Invalid or missing session ID');
				return;
			}

			serverLogger.info(
				`[Express] Received session termination request for session ${sessionId}`,
			);

			try {
				const transport = transports[sessionId];
				await transport.handleRequest(req, res);
			} catch (error) {
				serverLogger.error(
					'[Express] Error handling session termination:',
					error,
				);
				if (!res.headersSent) {
					res.status(500).send(
						'Error processing session termination',
					);
				}
			}
		});

		// Start the Express server
		if (host) {
			expressServer = expressApp.listen(port, host, () => {
				serverLogger.info(
					`[Express] MCP Server listening on ${host}:${port}${path}`,
				);
			});
		} else {
			expressServer = expressApp.listen(port, () => {
				serverLogger.info(
					`[Express] MCP Server listening on ${port}${path}`,
				);
			});
		}
	} else {
		serverLogger.error(`Invalid transport mode specified: ${mode}`);
		process.exit(1);
	}

	return serverInstance;
}

/**
 * Main entry point - this will run when executed directly
 * Determines whether to run in CLI or server mode based on command-line arguments
 */
async function main() {
	const mainLogger = Logger.forContext('index.ts', 'main');

	// Load configuration
	config.load();

	// Log the DEBUG value to verify configuration loading
	mainLogger.debug(`DEBUG environment variable: ${process.env.DEBUG}`);
	mainLogger.debug(
		`IPAPI_API_TOKEN value exists: ${Boolean(process.env.IPAPI_API_TOKEN)}`,
	);
	mainLogger.debug(`Config DEBUG value: ${config.get('DEBUG')}`);

	// Parse command line arguments
	const args = process.argv.slice(2);
	let transportMode: 'stdio' | 'http' = 'stdio';
	let cliMode = false;

	// Check for --transport flag
	const transportIndex = args.indexOf('--transport');
	if (transportIndex !== -1 && args.length > transportIndex + 1) {
		const transportValue = args[transportIndex + 1];
		if (transportValue === 'http') {
			transportMode = 'http';
			mainLogger.info('HTTP transport mode selected');
			// Remove the transport arguments
			args.splice(transportIndex, 2);
		}
	}

	// Check if any arguments remain (CLI mode)
	if (args.length > 0) {
		cliMode = true;
	}

	// Determine mode based on arguments
	if (cliMode) {
		// CLI mode: Pass arguments to CLI runner
		mainLogger.info('Starting in CLI mode');
		await runCli(args);
		mainLogger.info('CLI execution completed');
	} else {
		// MCP Server mode: Start server with specified transport
		mainLogger.info(
			`Starting in server mode with ${transportMode} transport`,
		);
		await startServer(transportMode);
		mainLogger.info('Server is now running');
	}

	// Set up graceful shutdown
	process.on('SIGINT', async () => {
		mainLogger.info('Received SIGINT signal. Shutting down server...');

		// Close all active transports to properly clean up resources
		for (const sessionId in transports) {
			try {
				mainLogger.info(`Closing transport for session ${sessionId}`);
				await transports[sessionId].close();
				delete transports[sessionId];
			} catch (error) {
				mainLogger.error(
					`Error closing transport for session ${sessionId}:`,
					error,
				);
			}
		}

		// Close Express server if it exists
		if (expressServer) {
			expressServer.close(() => {
				mainLogger.info('Express server closed successfully');
			});
		}

		mainLogger.info('Server shutdown complete');
		process.exit(0);
	});
}

// If this file is being executed directly (not imported), run the main function
if (require.main === module) {
	main().catch((err) => {
		indexLogger.error('Unhandled error in main process', err);
		process.exit(1);
	});
}

// Export key utilities for library users
export { config };
export { Logger };
export { VERSION, PACKAGE_NAME } from './utils/constants.util.js';
