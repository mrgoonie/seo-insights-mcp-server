import { Command } from 'commander';
import { Logger } from '../utils/logger.util.js';
import { VERSION, CLI_NAME } from '../utils/constants.util.js';

import screenshotOneCli from './screenshotone.cli.js';

/**
 * CLI entry point for the ScreenshotOne MCP Server
 * Handles command registration, parsing, and execution
 */

// Package description
const DESCRIPTION =
	'A Model Context Protocol (MCP) server for ScreenshotOne, to help AI assistants take screenshots of webpages';

/**
 * Run the CLI with the provided arguments
 *
 * @param args Command line arguments to process
 * @returns Promise that resolves when CLI command execution completes
 */
export async function runCli(args: string[]) {
	const cliLogger = Logger.forContext('cli/index.ts', 'runCli');
	cliLogger.debug('Initializing CLI with arguments', args);

	const program = new Command();

	program.name(CLI_NAME).description(DESCRIPTION).version(VERSION);

	// Register CLI commands
	cliLogger.debug('Registering CLI commands...');
	screenshotOneCli.register(program);
	cliLogger.debug('CLI commands registered successfully');

	// Handle unknown commands
	program.on('command:*', (operands) => {
		cliLogger.error(`Unknown command: ${operands[0]}`);
		console.log('');
		program.help();
		process.exit(1);
	});

	// Parse arguments; default to help if no command provided
	cliLogger.debug('Parsing CLI arguments');
	await program.parseAsync(args.length ? args : ['--help'], { from: 'user' });
	cliLogger.debug('CLI command execution completed');
}
