/**
 * @file seo.controller.ts
 * @description Controller for SEO operations
 */

import seoService from '../services/vendor.seo.service.js';
import { Logger } from '../utils/logger.util.js';
import { ControllerResponse } from '../types/common.types.js';
import { handleControllerError } from '../utils/error-handler.util.js';
import {
	BacklinksParams,
	KeywordGeneratorParams,
	KeywordDifficultyParams,
	TrafficCheckerParams,
} from '../tools/seo.types.js';

/**
 * @namespace SeoController
 * @description Controller responsible for handling SEO operations.
 *              It orchestrates calls to the SEO service, applies defaults,
 *              and formats the response.
 */

/**
 * @function getBacklinks
 * @description Get backlinks for a domain
 * @memberof SeoController
 * @param {BacklinksParams} params - Parameters including domain
 * @returns {Promise<ControllerResponse>} A promise that resolves to the standard controller response
 */
async function getBacklinks(
	params: BacklinksParams,
): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/seo.controller.ts',
		'getBacklinks',
	);

	methodLogger.debug('Getting backlinks with params:', params);

	try {
		// Validate required parameters
		if (!params.domain) {
			throw new Error('Domain is required for getting backlinks');
		}

		// Call the service with the parameters
		const response = await seoService.getBacklinks(params.domain);

		methodLogger.debug('Got backlinks response from service');

		return {
			content: JSON.stringify(response, null, 2),
		};
	} catch (error) {
		// Use the standardized error handler with return
		return handleControllerError(error, {
			entityType: 'Backlinks',
			operation: 'retrieving',
			source: 'controllers/seo.controller.ts@getBacklinks',
			additionalInfo: {
				domain: params.domain,
			},
		});
	}
}

/**
 * @function getKeywordIdeas
 * @description Get keyword ideas for a keyword
 * @memberof SeoController
 * @param {KeywordGeneratorParams} params - Parameters including keyword, country, and search engine
 * @returns {Promise<ControllerResponse>} A promise that resolves to the standard controller response
 */
async function getKeywordIdeas(
	params: KeywordGeneratorParams,
): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/seo.controller.ts',
		'getKeywordIdeas',
	);

	methodLogger.debug('Getting keyword ideas with params:', params);

	try {
		// Validate required parameters
		if (!params.keyword) {
			throw new Error('Keyword is required for getting keyword ideas');
		}

		// Apply defaults
		const country = params.country || 'us';
		const searchEngine = params.searchEngine || 'Google';

		// Call the service with the parameters
		const response = await seoService.getKeywordIdeas(
			params.keyword,
			country,
			searchEngine,
		);

		methodLogger.debug('Got keyword ideas response from service');

		return {
			content: JSON.stringify(response, null, 2),
		};
	} catch (error) {
		// Use the standardized error handler with return
		return handleControllerError(error, {
			entityType: 'Keyword Ideas',
			operation: 'retrieving',
			source: 'controllers/seo.controller.ts@getKeywordIdeas',
			additionalInfo: {
				keyword: params.keyword,
				country: params.country,
			},
		});
	}
}

/**
 * @function getKeywordDifficulty
 * @description Get keyword difficulty for a keyword
 * @memberof SeoController
 * @param {KeywordDifficultyParams} params - Parameters including keyword and country
 * @returns {Promise<ControllerResponse>} A promise that resolves to the standard controller response
 */
async function getKeywordDifficulty(
	params: KeywordDifficultyParams,
): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/seo.controller.ts',
		'getKeywordDifficulty',
	);

	methodLogger.debug('Getting keyword difficulty with params:', params);

	try {
		// Validate required parameters
		if (!params.keyword) {
			throw new Error(
				'Keyword is required for getting keyword difficulty',
			);
		}

		// Apply defaults
		const country = params.country || 'us';

		// Call the service with the parameters
		const response = await seoService.getKeywordDifficulty(
			params.keyword,
			country,
		);

		methodLogger.debug('Got keyword difficulty response from service');

		return {
			content: JSON.stringify(response, null, 2),
		};
	} catch (error) {
		// Use the standardized error handler with return
		return handleControllerError(error, {
			entityType: 'Keyword Difficulty',
			operation: 'retrieving',
			source: 'controllers/seo.controller.ts@getKeywordDifficulty',
			additionalInfo: {
				keyword: params.keyword,
				country: params.country,
			},
		});
	}
}

/**
 * @function getTraffic
 * @description Get traffic data for a domain or URL
 * @memberof SeoController
 * @param {TrafficCheckerParams} params - Parameters including domain/URL, mode, and country
 * @returns {Promise<ControllerResponse>} A promise that resolves to the standard controller response
 */
async function getTraffic(
	params: TrafficCheckerParams,
): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/seo.controller.ts',
		'getTraffic',
	);

	methodLogger.debug('Getting traffic data with params:', params);

	try {
		// Validate required parameters
		if (!params.domainOrUrl) {
			throw new Error(
				'Domain or URL is required for getting traffic data',
			);
		}

		// Apply defaults
		const mode = params.mode || 'subdomains';
		const country = params.country || 'None';

		// Call the service with the parameters
		const response = await seoService.checkTraffic(
			params.domainOrUrl,
			mode,
			country,
		);

		methodLogger.debug('Got traffic data response from service');

		return {
			content: JSON.stringify(response, null, 2),
		};
	} catch (error) {
		// Use the standardized error handler with return
		return handleControllerError(error, {
			entityType: 'Traffic Data',
			operation: 'retrieving',
			source: 'controllers/seo.controller.ts@getTraffic',
			additionalInfo: {
				domainOrUrl: params.domainOrUrl,
				mode: params.mode,
			},
		});
	}
}

export default {
	getBacklinks,
	getKeywordIdeas,
	getKeywordDifficulty,
	getTraffic,
};
