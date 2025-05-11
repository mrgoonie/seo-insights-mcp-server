/**
 * @file seo.tool.ts
 * @description SEO tools for the MCP server
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../utils/logger.util.js';
import {
	BacklinksParamsSchema,
	BacklinksParams,
	KeywordGeneratorParamsSchema,
	KeywordGeneratorParams,
	KeywordDifficultyParamsSchema,
	KeywordDifficultyParams,
	TrafficCheckerParamsSchema,
	TrafficCheckerParams,
} from './seo.types.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import seoController from '../controllers/seo.controller.js';

/**
 * @function handleGetBacklinks
 * @description MCP Tool handler to get backlinks for a domain
 * @param {BacklinksParams} args - Arguments provided to the tool
 * @returns Formatted response for the MCP
 */
async function handleGetBacklinks(args: BacklinksParams) {
	const methodLogger = Logger.forContext(
		'tools/seo.tool.ts',
		'handleGetBacklinks',
	);
	methodLogger.debug(`Getting backlinks with params:`, args);

	try {
		// Call the controller with the arguments
		const result = await seoController.getBacklinks(args);
		methodLogger.debug(`Got the response from the controller`);

		// Format the response for the MCP tool
		return {
			content: [
				{
					type: 'text' as const,
					text: result.content,
				},
			],
		};
	} catch (error) {
		methodLogger.error(`Error getting backlinks`, error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * @function handleKeywordGenerator
 * @description MCP Tool handler to get keyword ideas
 * @param {KeywordGeneratorParams} args - Arguments provided to the tool
 * @returns Formatted response for the MCP
 */
async function handleKeywordGenerator(args: KeywordGeneratorParams) {
	const methodLogger = Logger.forContext(
		'tools/seo.tool.ts',
		'handleKeywordGenerator',
	);
	methodLogger.debug(`Getting keyword ideas with params:`, args);

	try {
		// Call the controller with the arguments
		const result = await seoController.getKeywordIdeas(args);
		methodLogger.debug(`Got the response from the controller`);

		// Format the response for the MCP tool
		return {
			content: [
				{
					type: 'text' as const,
					text: result.content,
				},
			],
		};
	} catch (error) {
		methodLogger.error(`Error getting keyword ideas`, error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * @function handleKeywordDifficulty
 * @description MCP Tool handler to get keyword difficulty
 * @param {KeywordDifficultyParams} args - Arguments provided to the tool
 * @returns Formatted response for the MCP
 */
async function handleKeywordDifficulty(args: KeywordDifficultyParams) {
	const methodLogger = Logger.forContext(
		'tools/seo.tool.ts',
		'handleKeywordDifficulty',
	);
	methodLogger.debug(`Getting keyword difficulty with params:`, args);

	try {
		// Call the controller with the arguments
		const result = await seoController.getKeywordDifficulty(args);
		methodLogger.debug(`Got the response from the controller`);

		// Format the response for the MCP tool
		return {
			content: [
				{
					type: 'text' as const,
					text: result.content,
				},
			],
		};
	} catch (error) {
		methodLogger.error(`Error getting keyword difficulty`, error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * @function handleGetTraffic
 * @description MCP Tool handler to get traffic data
 * @param {TrafficCheckerParams} args - Arguments provided to the tool
 * @returns Formatted response for the MCP
 */
async function handleGetTraffic(args: TrafficCheckerParams) {
	const methodLogger = Logger.forContext(
		'tools/seo.tool.ts',
		'handleGetTraffic',
	);
	methodLogger.debug(`Getting traffic data with params:`, args);

	try {
		// Call the controller with the arguments
		const result = await seoController.getTraffic(args);
		methodLogger.debug(`Got the response from the controller`);

		// Format the response for the MCP tool
		return {
			content: [
				{
					type: 'text' as const,
					text: result.content,
				},
			],
		};
	} catch (error) {
		methodLogger.error(`Error getting traffic data`, error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * @function register
 * @description Registers the SEO tools with the MCP server
 * @param {McpServer} server - The MCP server instance
 */
function register(server: McpServer) {
	const methodLogger = Logger.forContext('tools/seo.tool.ts', 'register');
	methodLogger.debug(`Registering SEO tools...`);

	// Register get backlinks tool
	server.tool(
		'get_backlinks_list',
		`Get backlinks list for the specified domain.
		Returns backlinks data including anchor text, domain rating, and URLs.`,
		BacklinksParamsSchema.shape,
		handleGetBacklinks,
	);

	// Register keyword generator tool
	server.tool(
		'keyword_generator',
		`Get keyword ideas for the specified keyword.
		Returns a list of related keywords with volume and difficulty metrics.`,
		KeywordGeneratorParamsSchema.shape,
		handleKeywordGenerator,
	);

	// Register keyword difficulty tool
	server.tool(
		'keyword_difficulty',
		`Get keyword difficulty for the specified keyword.
		Returns difficulty score and SERP analysis.`,
		KeywordDifficultyParamsSchema.shape,
		handleKeywordDifficulty,
	);

	// Register get traffic tool
	server.tool(
		'get_traffic',
		`Check the estimated search traffic for any website.
		Returns traffic data, top pages, keywords, and countries.`,
		TrafficCheckerParamsSchema.shape,
		handleGetTraffic,
	);

	methodLogger.debug('Successfully registered SEO tools.');
}

export default { register };
