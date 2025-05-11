/**
 * @file seo.cli.ts
 * @description CLI commands for SEO tools
 */

import { Command } from 'commander';
import { Logger } from '../utils/logger.util.js';
import seoController from '../controllers/seo.controller.js';
import { handleCliError } from '../utils/error.util.js';

/**
 * Register SEO CLI commands
 * @param program The Commander program instance
 */
function register(program: Command) {
	const cliLogger = Logger.forContext('cli/seo.cli.ts', 'register');
	cliLogger.debug(`Registering SEO CLI commands...`);

	// Get Backlinks Command
	program
		.command('get-backlinks')
		.description('Get backlinks for a domain')
		.requiredOption('--domain <domain>', 'Domain to get backlinks for')
		.action(async (options) => {
			const commandLogger = Logger.forContext(
				'cli/seo.cli.ts',
				'get-backlinks',
			);
			try {
				commandLogger.debug('CLI get-backlinks called', {
					domain: options.domain,
				});

				const result = await seoController.getBacklinks({
					domain: options.domain,
				});

				// Output the result to console
				console.log(result.content);

				// Display error information if available
				if (result.error) {
					console.error(`\nError: ${result.error}`);
				}
			} catch (error) {
				handleCliError(error);
			}
		});

	// Keyword Generator Command
	program
		.command('keyword-generator')
		.description('Get keyword ideas for a keyword')
		.requiredOption('--keyword <keyword>', 'Keyword to get ideas for')
		.option('--country <country>', 'Country code (e.g., "us", "uk")', 'us')
		.option('--search-engine <engine>', 'Search engine to use', 'Google')
		.action(async (options) => {
			const commandLogger = Logger.forContext(
				'cli/seo.cli.ts',
				'keyword-generator',
			);
			try {
				commandLogger.debug('CLI keyword-generator called', {
					keyword: options.keyword,
					country: options.country,
					searchEngine: options.searchEngine,
				});

				const result = await seoController.getKeywordIdeas({
					keyword: options.keyword,
					country: options.country,
					searchEngine: options.searchEngine,
				});

				// Output the result to console
				console.log(result.content);

				// Display error information if available
				if (result.error) {
					console.error(`\nError: ${result.error}`);
				}
			} catch (error) {
				handleCliError(error);
			}
		});

	// Keyword Difficulty Command
	program
		.command('keyword-difficulty')
		.description('Get keyword difficulty for a keyword')
		.requiredOption(
			'--keyword <keyword>',
			'Keyword to check difficulty for',
		)
		.option('--country <country>', 'Country code (e.g., "us", "uk")', 'us')
		.action(async (options) => {
			const commandLogger = Logger.forContext(
				'cli/seo.cli.ts',
				'keyword-difficulty',
			);
			try {
				commandLogger.debug('CLI keyword-difficulty called', {
					keyword: options.keyword,
					country: options.country,
				});

				const result = await seoController.getKeywordDifficulty({
					keyword: options.keyword,
					country: options.country,
				});

				// Output the result to console
				console.log(result.content);

				// Display error information if available
				if (result.error) {
					console.error(`\nError: ${result.error}`);
				}
			} catch (error) {
				handleCliError(error);
			}
		});

	// Get Traffic Command
	program
		.command('get-traffic')
		.description('Check the estimated search traffic for any website')
		.requiredOption(
			'--domain <domain>',
			'Domain or URL to check traffic for',
		)
		.option(
			'--mode <mode>',
			'Query mode: "subdomains" or "exact"',
			'subdomains',
		)
		.option(
			'--country <country>',
			'Country code (e.g., "us", "uk")',
			'None',
		)
		.action(async (options) => {
			const commandLogger = Logger.forContext(
				'cli/seo.cli.ts',
				'get-traffic',
			);
			try {
				commandLogger.debug('CLI get-traffic called', {
					domainOrUrl: options.domain,
					mode: options.mode,
					country: options.country,
				});

				if (options.mode !== 'subdomains' && options.mode !== 'exact') {
					throw new Error(
						'Mode must be either "subdomains" or "exact"',
					);
				}

				const result = await seoController.getTraffic({
					domainOrUrl: options.domain,
					mode: options.mode as 'subdomains' | 'exact',
					country: options.country,
				});

				// Output the result to console
				console.log(result.content);

				// Display error information if available
				if (result.error) {
					console.error(`\nError: ${result.error}`);
				}
			} catch (error) {
				handleCliError(error);
			}
		});

	cliLogger.debug('SEO CLI commands registered successfully');
}

export default { register };
