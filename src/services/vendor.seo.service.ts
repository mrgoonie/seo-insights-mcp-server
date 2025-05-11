/**
 * @file vendor.seo.service.ts
 * @description Service for interacting with SEO APIs (Ahrefs)
 */

import axios from 'axios';
import { Logger } from '../utils/logger.util.js';
import { McpError, ErrorType } from '../utils/error.util.js';
import { config } from '../utils/config.util.js';
import { env } from '../env.js';
import fs from 'fs';
import path from 'path';

// In CommonJS, __dirname is available globally
// No need to derive it from import.meta.url

// Cache file path for storing signatures
const SIGNATURE_CACHE_FILE = path.join(
	__dirname,
	'../../.cache/signature_cache.json',
);

// Ensure cache directory exists
const cacheDir = path.dirname(SIGNATURE_CACHE_FILE);
if (!fs.existsSync(cacheDir)) {
	fs.mkdirSync(cacheDir, { recursive: true });
}

/**
 * Convert ISO 8601 format datetime string to timestamp
 * Example: "2025-04-12T14:59:18Z" -> 1744916358.0
 */
function isoToTimestamp(isoDateString: string): number {
	// Handle UTC time represented by "Z"
	if (isoDateString.endsWith('Z')) {
		isoDateString = isoDateString.slice(0, -1) + '+00:00';
	}
	const dt = new Date(isoDateString);
	return dt.getTime() / 1000;
}

/**
 * Save signature information to local cache file
 */
function saveSignatureToCache(
	signature: string,
	validUntil: string,
	overviewData: any,
	domain: string,
): boolean {
	const methodLogger = Logger.forContext(
		'services/vendor.seo.service.ts',
		'saveSignatureToCache',
	);

	try {
		// Read existing cache
		let cacheData: Record<string, any> = {};
		if (fs.existsSync(SIGNATURE_CACHE_FILE)) {
			try {
				const cacheContent = fs.readFileSync(
					SIGNATURE_CACHE_FILE,
					'utf8',
				);
				cacheData = JSON.parse(cacheContent);
			} catch (error) {
				methodLogger.warn(
					'Failed to parse cache file, creating new cache',
					error,
				);
			}
		}

		// Update cache for current domain
		cacheData[domain] = {
			signature,
			validUntil,
			overviewData,
			timestamp: Date.now() / 1000,
		};

		// Write to cache file
		fs.writeFileSync(
			SIGNATURE_CACHE_FILE,
			JSON.stringify(cacheData, null, 2),
		);
		return true;
	} catch (error) {
		methodLogger.error('Failed to save signature to cache', error);
		return false;
	}
}

/**
 * Load signature information for a specific domain from local cache file
 * Returns the signature and validUntil if cache is valid, otherwise null
 */
function loadSignatureFromCache(
	domain: string,
): [string | null, string | null, any | null] {
	const methodLogger = Logger.forContext(
		'services/vendor.seo.service.ts',
		'loadSignatureFromCache',
	);

	try {
		if (!fs.existsSync(SIGNATURE_CACHE_FILE)) {
			return [null, null, null];
		}

		const cacheContent = fs.readFileSync(SIGNATURE_CACHE_FILE, 'utf8');
		const cacheData = JSON.parse(cacheContent);

		// Check if cache exists for current domain
		if (!cacheData[domain]) {
			return [null, null, null];
		}

		const domainCache = cacheData[domain];

		// Check if signature is expired
		const validUntil = domainCache.validUntil;
		if (validUntil) {
			// Convert ISO date string to timestamp for comparison
			const validUntilTimestamp = isoToTimestamp(validUntil);
			const currentTime = Date.now() / 1000;

			if (currentTime < validUntilTimestamp) {
				return [
					domainCache.signature,
					validUntil,
					domainCache.overviewData,
				];
			}
		}

		return [null, null, null];
	} catch (error) {
		methodLogger.error('Failed to load signature from cache', error);
		return [null, null, null];
	}
}

/**
 * Get CapSolver token for solving Cloudflare Turnstile CAPTCHAs
 */
async function getCapsolverToken(siteUrl: string): Promise<string | null> {
	const methodLogger = Logger.forContext(
		'services/vendor.seo.service.ts',
		'getCapsolverToken',
	);

	const apiKey = config.get('CAPSOLVER_API_KEY') || env.CAPSOLVER_API_KEY;
	if (!apiKey) {
		methodLogger.error('CAPSOLVER_API_KEY is not set');
		return null;
	}

	try {
		const payload = {
			clientKey: apiKey,
			task: {
				type: 'AntiTurnstileTaskProxyLess',
				websiteKey: '0x4AAAAAAAAzi9ITzSN9xKMi', // site key for ahrefs.com
				websiteURL: siteUrl,
				metadata: {
					action: '',
				},
			},
		};

		// Create task
		const createTaskResponse = await axios.post(
			'https://api.capsolver.com/createTask',
			payload,
		);
		const taskId = createTaskResponse.data?.taskId;

		if (!taskId) {
			methodLogger.error(
				'Failed to create CapSolver task',
				createTaskResponse.data,
			);
			return null;
		}

		// Poll for result
		let attempts = 0;
		const maxAttempts = 30; // 30 seconds timeout

		while (attempts < maxAttempts) {
			await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second delay

			const getTaskPayload = { clientKey: apiKey, taskId };
			const taskResponse = await axios.post(
				'https://api.capsolver.com/getTaskResult',
				getTaskPayload,
			);

			const status = taskResponse.data?.status;
			if (status === 'ready') {
				const token = taskResponse.data?.solution?.token;
				return token;
			}

			if (status === 'failed' || taskResponse.data?.errorId) {
				methodLogger.error('CapSolver task failed', taskResponse.data);
				return null;
			}

			attempts++;
		}

		methodLogger.error('CapSolver task timed out');
		return null;
	} catch (error) {
		methodLogger.error('Error getting CapSolver token', error);
		return null;
	}
}

/**
 * Get signature and validUntil parameters for Ahrefs API
 */
async function getSignatureAndOverview(
	token: string,
	domain: string,
): Promise<[string | null, string | null, any | null]> {
	const methodLogger = Logger.forContext(
		'services/vendor.seo.service.ts',
		'getSignatureAndOverview',
	);

	try {
		const url = 'https://ahrefs.com/v4/stGetFreeBacklinksOverview';
		const payload = {
			captcha: token,
			mode: 'subdomains',
			url: domain,
		};

		const headers = {
			'Content-Type': 'application/json',
		};

		const response = await axios.post(url, payload, { headers });

		if (response.status !== 200) {
			methodLogger.error('Failed to get signature', {
				status: response.status,
			});
			return [null, null, null];
		}

		const data = response.data;

		// Assuming data format is always ['Ok', {signature object}]
		if (Array.isArray(data) && data.length > 1) {
			const secondElement = data[1];
			const signature = secondElement?.signedInput?.signature;
			const validUntil = secondElement?.signedInput?.input?.validUntil;
			const overviewData = secondElement?.data;

			if (signature && validUntil) {
				// Save the new signature to cache
				saveSignatureToCache(
					signature,
					validUntil,
					overviewData,
					domain,
				);
				return [signature, validUntil, overviewData];
			}
		}

		methodLogger.error('Invalid response format from Ahrefs API', { data });
		return [null, null, null];
	} catch (error) {
		methodLogger.error('Error getting signature and overview', error);
		return [null, null, null];
	}
}

/**
 * Format backlinks data from Ahrefs API response
 */
function formatBacklinks(backlinksData: any): any[] {
	if (
		backlinksData &&
		Array.isArray(backlinksData) &&
		backlinksData.length > 1 &&
		backlinksData[1]?.topBacklinks?.backlinks
	) {
		const backlinks = backlinksData[1].topBacklinks.backlinks;

		// Only keep necessary fields
		const simplifiedBacklinks = backlinks.map((backlink: any) => ({
			anchor: backlink.anchor || '',
			domainRating: backlink.domainRating || 0,
			title: backlink.title || '',
			urlFrom: backlink.urlFrom || '',
			urlTo: backlink.urlTo || '',
			edu: backlink.edu || false,
			gov: backlink.gov || false,
		}));

		return simplifiedBacklinks;
	}

	return [];
}

/**
 * Get backlinks list for a domain
 */
async function getBacklinks(domain: string): Promise<any> {
	const methodLogger = Logger.forContext(
		'services/vendor.seo.service.ts',
		'getBacklinks',
	);

	methodLogger.info(`Getting backlinks for domain: ${domain}`);

	try {
		// Try to get signature from cache
		let [signature, validUntil, overviewData] =
			loadSignatureFromCache(domain);

		// If no valid signature in cache, get a new one
		if (!signature || !validUntil) {
			methodLogger.info('No valid signature in cache, getting a new one');
			// Step 1: Get token
			const siteUrl = `https://ahrefs.com/backlink-checker/?input=${domain}&mode=subdomains`;
			methodLogger.debug(`Using site URL: ${siteUrl}`);
			const token = await getCapsolverToken(siteUrl);

			if (!token) {
				throw new McpError(
					`Failed to get verification token for domain: ${domain}`,
					ErrorType.API_ERROR,
					500,
				);
			}

			// Step 2: Get signature and validUntil
			[signature, validUntil, overviewData] =
				await getSignatureAndOverview(token, domain);

			if (!signature || !validUntil) {
				throw new McpError(
					`Failed to get signature for domain: ${domain}`,
					ErrorType.API_ERROR,
					500,
				);
			}
		}

		// Step 3: Get backlinks list
		const url = 'https://ahrefs.com/v4/stGetFreeBacklinksList';
		const payload = {
			reportType: 'TopBacklinks',
			signedInput: {
				signature,
				input: {
					validUntil,
					mode: 'subdomains',
					url: `${domain}/`,
				},
			},
		};

		const headers = {
			'Content-Type': 'application/json',
		};

		const response = await axios.post(url, payload, { headers });

		if (response.status !== 200) {
			throw new McpError(
				`Failed to get backlinks for domain: ${domain}`,
				ErrorType.API_ERROR,
				response.status,
			);
		}

		const backlinks = formatBacklinks(response.data);

		return {
			overview: overviewData,
			backlinks,
		};
	} catch (error) {
		if (error instanceof McpError) {
			throw error;
		}

		throw new McpError(
			`Failed to get backlinks for domain: ${domain}`,
			ErrorType.UNEXPECTED_ERROR,
			500,
			{ cause: error },
		);
	}
}

/**
 * Format keyword ideas from Ahrefs API response
 */
function formatKeywordIdeas(keywordData: any): any[] {
	if (!keywordData || !Array.isArray(keywordData) || keywordData.length < 2) {
		return [];
	}

	const data = keywordData[1];
	const result = [];

	// Process regular keyword ideas
	if (data?.allIdeas?.results) {
		const allIdeas = data.allIdeas.results;

		for (const idea of allIdeas) {
			const simplifiedIdea = {
				keyword: idea.keyword || 'No keyword',
				country: idea.country || '-',
				difficulty: idea.difficultyLabel || 'Unknown',
				volume: idea.volumeLabel || 'Unknown',
				updatedAt: idea.updatedAt || '-',
			};

			result.push({
				label: 'keyword ideas',
				value: simplifiedIdea,
			});
		}
	}

	// Process question keyword ideas
	if (data?.questionIdeas?.results) {
		const questionIdeas = data.questionIdeas.results;

		for (const idea of questionIdeas) {
			const simplifiedIdea = {
				keyword: idea.keyword || 'No keyword',
				country: idea.country || '-',
				difficulty: idea.difficultyLabel || 'Unknown',
				volume: idea.volumeLabel || 'Unknown',
				updatedAt: idea.updatedAt || '-',
			};

			result.push({
				label: 'question ideas',
				value: simplifiedIdea,
			});
		}
	}

	return result;
}

/**
 * Get keyword ideas for a keyword
 */
async function getKeywordIdeas(
	keyword: string,
	country: string = 'us',
	searchEngine: string = 'Google',
): Promise<any> {
	const methodLogger = Logger.forContext(
		'services/vendor.seo.service.ts',
		'getKeywordIdeas',
	);

	methodLogger.info(
		`Getting keyword ideas for: ${keyword}, country: ${country}, search engine: ${searchEngine}`,
	);

	try {
		// Step 1: Get token
		const siteUrl = `https://ahrefs.com/keyword-generator/?country=${country}&input=${encodeURIComponent(
			keyword,
		)}`;
		methodLogger.debug(`Using site URL: ${siteUrl}`);
		const token = await getCapsolverToken(siteUrl);

		if (!token) {
			throw new McpError(
				`Failed to get verification token for keyword: ${keyword}`,
				ErrorType.API_ERROR,
				500,
			);
		}

		// Step 2: Get keyword ideas
		const url = 'https://ahrefs.com/v4/stGetFreeKeywordIdeas';
		const payload = {
			withQuestionIdeas: true,
			captcha: token,
			searchEngine,
			country,
			keyword: ['Some', keyword],
		};

		const headers = {
			'Content-Type': 'application/json',
		};

		const response = await axios.post(url, payload, { headers });

		if (response.status !== 200) {
			throw new McpError(
				`Failed to get keyword ideas for keyword: ${keyword}`,
				ErrorType.API_ERROR,
				response.status,
			);
		}

		return formatKeywordIdeas(response.data);
	} catch (error) {
		if (error instanceof McpError) {
			throw error;
		}

		throw new McpError(
			`Failed to get keyword ideas for keyword: ${keyword}`,
			ErrorType.UNEXPECTED_ERROR,
			500,
			{ cause: error },
		);
	}
}

/**
 * Get keyword difficulty for a keyword
 */
async function getKeywordDifficulty(
	keyword: string,
	country: string = 'us',
): Promise<any> {
	const methodLogger = Logger.forContext(
		'services/vendor.seo.service.ts',
		'getKeywordDifficulty',
	);

	methodLogger.info(
		`Getting keyword difficulty for: ${keyword}, country: ${country}`,
	);

	try {
		// Step 1: Get token
		const siteUrl = `https://ahrefs.com/keyword-difficulty/?country=${country}&input=${encodeURIComponent(
			keyword,
		)}`;
		methodLogger.debug(`Using site URL: ${siteUrl}`);
		const token = await getCapsolverToken(siteUrl);

		if (!token) {
			throw new McpError(
				`Failed to get verification token for keyword: ${keyword}`,
				ErrorType.API_ERROR,
				500,
			);
		}

		// Step 2: Get keyword difficulty
		const url =
			'https://ahrefs.com/v4/stGetFreeSerpOverviewForKeywordDifficultyChecker';
		const payload = {
			captcha: token,
			country,
			keyword,
		};

		const headers = {
			accept: '*/*',
			'content-type': 'application/json; charset=utf-8',
			referer: `https://ahrefs.com/keyword-difficulty/?country=${country}&input=${encodeURIComponent(
				keyword,
			)}`,
		};

		const response = await axios.post(url, payload, { headers });

		if (response.status !== 200) {
			throw new McpError(
				`Failed to get keyword difficulty for keyword: ${keyword}`,
				ErrorType.API_ERROR,
				response.status,
			);
		}

		const data = response.data;

		// Check response data format
		if (!Array.isArray(data) || data.length < 2 || data[0] !== 'Ok') {
			throw new McpError(
				`Invalid response format from Ahrefs API for keyword: ${keyword}`,
				ErrorType.API_ERROR,
				500,
			);
		}

		// Extract valid data
		const kdData = data[1];

		// Format result
		const result: any = {
			difficulty: kdData.difficulty || 0,
			shortage: kdData.shortage || 0,
			lastUpdate: kdData.lastUpdate || '',
			serp: {
				results: [],
			},
		};

		// Process SERP results
		if (kdData.serp?.results) {
			const serpResults = [];

			for (const item of kdData.serp.results) {
				// Only process organic search results
				if (item.content && item.content[0] === 'organic') {
					const organicData = item.content[1];

					if (organicData.link && organicData.link[0] === 'Some') {
						const linkData = organicData.link[1];
						const resultItem: any = {
							title: linkData.title || '',
							url: linkData.url?.[1]?.url || '',
							position: item.pos || 0,
						};

						// Add metrics data if available
						if (linkData.metrics) {
							const metrics = linkData.metrics;
							Object.assign(resultItem, {
								domainRating: metrics.domainRating || 0,
								urlRating: metrics.urlRating || 0,
								traffic: metrics.traffic || 0,
								keywords: metrics.keywords || 0,
								topKeyword: metrics.topKeyword || '',
								topVolume: metrics.topVolume || 0,
							});
						}

						serpResults.push(resultItem);
					}
				}
			}

			result.serp.results = serpResults;
		}

		return result;
	} catch (error) {
		if (error instanceof McpError) {
			throw error;
		}

		throw new McpError(
			`Failed to get keyword difficulty for keyword: ${keyword}`,
			ErrorType.UNEXPECTED_ERROR,
			500,
			{ cause: error },
		);
	}
}

/**
 * Check traffic for a domain or URL
 */
async function checkTraffic(
	domainOrUrl: string,
	mode: 'subdomains' | 'exact' = 'subdomains',
	country: string = 'None',
): Promise<any> {
	const methodLogger = Logger.forContext(
		'services/vendor.seo.service.ts',
		'checkTraffic',
	);

	methodLogger.info(
		`Checking traffic for: ${domainOrUrl}, mode: ${mode}, country: ${country}`,
	);

	try {
		// Step 1: Get token
		const siteUrl = `https://ahrefs.com/traffic-checker/?input=${domainOrUrl}&mode=${mode}`;
		methodLogger.debug(`Using site URL: ${siteUrl}`);
		const token = await getCapsolverToken(siteUrl);

		if (!token) {
			throw new McpError(
				`Failed to get verification token for domain: ${domainOrUrl}`,
				ErrorType.API_ERROR,
				500,
			);
		}

		// Step 2: Check traffic
		const url = 'https://ahrefs.com/v4/stGetFreeTrafficOverview';

		// Convert parameters to JSON string, then pass as a single input parameter
		const params = {
			input: JSON.stringify({
				captcha: token,
				country,
				protocol: 'None',
				mode,
				url: domainOrUrl,
			}),
		};

		const headers = {
			accept: '*/*',
			'content-type': 'application/json',
			referer: `https://ahrefs.com/traffic-checker/?input=${domainOrUrl}&mode=${mode}`,
		};

		const response = await axios.get(url, { params, headers });

		if (response.status !== 200) {
			throw new McpError(
				`Failed to check traffic for domain: ${domainOrUrl}`,
				ErrorType.API_ERROR,
				response.status,
			);
		}

		const data = response.data;

		// Check response data format
		if (!Array.isArray(data) || data.length < 2 || data[0] !== 'Ok') {
			throw new McpError(
				`Invalid response format from Ahrefs API for domain: ${domainOrUrl}`,
				ErrorType.API_ERROR,
				500,
			);
		}

		// Extract valid data
		const trafficData = data[1];

		// Format result
		const result = {
			traffic_history: trafficData.traffic_history || [],
			traffic: {
				trafficMonthlyAvg: trafficData.traffic?.trafficMonthlyAvg || 0,
				costMontlyAvg: trafficData.traffic?.costMontlyAvg || 0,
			},
			top_pages: trafficData.top_pages || [],
			top_countries: trafficData.top_countries || [],
			top_keywords: trafficData.top_keywords || [],
		};

		return result;
	} catch (error) {
		if (error instanceof McpError) {
			throw error;
		}

		throw new McpError(
			`Failed to check traffic for domain: ${domainOrUrl}`,
			ErrorType.UNEXPECTED_ERROR,
			500,
			{ cause: error },
		);
	}
}

export default {
	getBacklinks,
	getKeywordIdeas,
	getKeywordDifficulty,
	checkTraffic,
};
