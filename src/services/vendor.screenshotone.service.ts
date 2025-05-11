/**
 * @file vendor.screenshotone.service.ts
 * @description Service for interacting with the ScreenshotOne API
 */

import axios from 'axios';
import { Logger } from '../utils/logger.util.js';
import { McpError, ErrorType } from '../utils/error.util.js';

const BASE_URL = 'https://api.screenshotone.com';
const TAKE_ENDPOINT = '/take';

/**
 * Normalizes a URL to ensure it has a protocol prefix
 * @param url The URL to normalize
 * @returns The normalized URL with protocol prefix
 */
function normalizeUrl(url: string): string {
	if (!url) return url;

	// Convert to lowercase for consistent handling
	const lowercaseUrl = url.toLowerCase();

	// Check if URL already has a protocol prefix
	if (
		lowercaseUrl.startsWith('http://') ||
		lowercaseUrl.startsWith('https://')
	) {
		return url; // Return original URL with original casing
	}

	// Add https:// prefix
	return `https://${url}`;
}

/**
 * @namespace ScreenshotOneService
 * @description Service responsible for making requests to the ScreenshotOne API
 */

/**
 * @function takeScreenshot
 * @description Takes a screenshot using ScreenshotOne API
 * @memberof ScreenshotOneService
 * @param {Record<string, any>} options - Options for the screenshot
 * @param {string} accessKey - ScreenshotOne API access key
 * @returns {Promise<any>} Response from the ScreenshotOne API
 * @throws {McpError} If the API request fails
 */
async function takeScreenshot(
	options: Record<string, any>,
	accessKey: string,
): Promise<any> {
	const methodLogger = Logger.forContext(
		'services/vendor.screenshotone.service.ts',
		'takeScreenshot',
	);

	try {
		methodLogger.debug('Taking screenshot with options:', {
			...options,
			access_key: '[REDACTED]',
		});

		// Normalize URL if present
		if (options.url) {
			options.url = normalizeUrl(options.url);
			methodLogger.debug('Using normalized URL:', { url: options.url });
		}

		// Determine if we should use GET or POST based on options
		// If HTML is provided, we must use POST
		if (options.html) {
			// Use POST with JSON body for HTML content
			const response = await axios.post(
				`${BASE_URL}${TAKE_ENDPOINT}`,
				{ ...options, access_key: accessKey },
				{
					headers: {
						'Content-Type': 'application/json',
					},
					responseType:
						options.response_type === 'json'
							? 'json'
							: 'arraybuffer',
				},
			);

			methodLogger.debug('Successfully received screenshot response');
			return response;
		} else {
			// Use GET for URL-based screenshots
			// Build query parameters
			const params = new URLSearchParams();

			// Add access key
			params.append('access_key', accessKey);

			// Add all other options
			Object.entries(options).forEach(([key, value]) => {
				if (value !== undefined && value !== null) {
					if (Array.isArray(value)) {
						// Handle array parameters
						value.forEach((item) => {
							params.append(key, item.toString());
						});
					} else if (typeof value === 'boolean') {
						// Handle boolean parameters
						params.append(key, value ? 'true' : 'false');
					} else {
						// Handle all other parameter types
						params.append(key, value.toString());
					}
				}
			});

			const response = await axios.get(`${BASE_URL}${TAKE_ENDPOINT}`, {
				params,
				responseType:
					options.response_type === 'json' ? 'json' : 'arraybuffer',
			});

			methodLogger.debug('Successfully received screenshot response');
			return response;
		}
	} catch (error) {
		methodLogger.error('Error taking screenshot:', error);

		// Handle API error responses
		if (axios.isAxiosError(error) && error.response) {
			const { status, data } = error.response;

			// Try to parse error message from API response
			let errorMessage = 'Unknown error from ScreenshotOne API';
			let errorCode = 'screenshot_api_error';

			// Log the full error response for debugging
			methodLogger.error('ScreenshotOne API error response:', {
				status,
				requestUrl: error.config?.url,
				requestParams: error.config?.params,
			});

			// Handle Buffer data
			if (data instanceof Buffer) {
				try {
					const jsonString = data.toString('utf-8');
					const parsedData = JSON.parse(jsonString);
					methodLogger.error('Decoded error response:', parsedData);

					if (parsedData.error_message) {
						errorMessage = parsedData.error_message;
					}
					if (parsedData.error_code) {
						errorCode = parsedData.error_code;
					}

					// Include detailed error information if available
					if (
						parsedData.error_details &&
						parsedData.error_details.length > 0
					) {
						const details = parsedData.error_details
							.map((detail: any) => detail.message)
							.join('; ');
						errorMessage = `${errorMessage}: ${details}`;
					}
				} catch (parseError) {
					methodLogger.error(
						'Failed to parse error response buffer',
						parseError,
					);
					errorMessage = `ScreenshotOne API error: ${data.toString(
						'utf-8',
					)}`;
				}
			} else if (data && typeof data === 'object') {
				if (data.error) {
					errorMessage = data.error.message || errorMessage;
					errorCode = data.error.code || errorCode;
				} else {
					// Try to extract error message from the response data itself
					errorMessage = `ScreenshotOne API error: ${JSON.stringify(
						data,
					)}`;
				}
			}

			throw new McpError(errorMessage, ErrorType.API_ERROR, status, {
				errorCode,
				source: 'services/vendor.screenshotone.service.ts@takeScreenshot',
			});
		}

		// Handle other errors
		throw new McpError(
			'Failed to take screenshot',
			ErrorType.UNEXPECTED_ERROR,
			500,
			{
				errorCode: 'screenshot_service_error',
				source: 'services/vendor.screenshotone.service.ts@takeScreenshot',
				cause: error,
			},
		);
	}
}

export default {
	takeScreenshot,
};
