/**
 * @file screenshotone.controller.ts
 * @description Controller for the ScreenshotOne API operations
 */

import screenshotOneService from '../services/vendor.screenshotone.service.js';
import { Logger } from '../utils/logger.util.js';
import { ControllerResponse } from '../types/common.types.js';
import { handleControllerError } from '../utils/error-handler.util.js';
import { ScreenshotOptions } from '../tools/screenshotone.types.js';
import { config } from '../utils/config.util.js';
import { env } from '../env';
import {
	getCurrentStorage,
	uploadFileBuffer,
} from '../libs/cloud-storage/storage-upload.js';

/**
 * @namespace ScreenshotOneController
 * @description Controller responsible for handling ScreenshotOne operations.
 *              It orchestrates calls to the ScreenshotOne service, applies defaults,
 *              maps options, and formats the response.
 */

/**
 * @function takeScreenshot
 * @description Takes a screenshot using ScreenshotOne API
 * @memberof ScreenshotOneController
 * @param {ScreenshotOptions} options - Screenshot options including URL/HTML and access key
 * @returns {Promise<ControllerResponse>} A promise that resolves to the standard controller response
 * @throws {McpError} Throws an McpError (handled by `handleControllerError`) if the service call fails or returns an error
 */
async function takeScreenshot(
	options: ScreenshotOptions,
): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/screenshotone.controller.ts',
		'takeScreenshot',
	);

	methodLogger.debug('Taking screenshot with options:', {
		...options,
		access_key: options.access_key ? '[REDACTED]' : undefined,
		html: options.html ? '[HTML CONTENT REDACTED]' : undefined,
	});

	try {
		// Validate required parameters
		if (!options.url && !options.html) {
			throw new Error(
				'Either URL or HTML content is required for taking a screenshot',
			);
		}

		const accessKey =
			options.access_key || config.get('SCREENSHOTONE_ACCESS_KEY');
		if (!accessKey) {
			throw new Error('Access key is required for ScreenshotOne API');
		}

		// Define controller defaults
		const defaultOptions: Partial<Record<string, any>> = {
			format: 'png',
			response_type: 'by_format', // Valid values: by_format, empty, json
			viewport_width: 1280,
			viewport_height: 800,
			wait_until: 'load',
		};

		// Merge options with defaults
		const mergedOptions = { ...defaultOptions, ...options };

		// Set upload to true by default if Cloudflare credentials are available and upload wasn't explicitly set to false
		if (
			mergedOptions.upload === undefined &&
			env.CLOUDFLARE_CDN_ACCESS_KEY &&
			env.CLOUDFLARE_CDN_SECRET_KEY
		) {
			mergedOptions.upload = true;
			methodLogger.debug(
				'Setting upload to true by default as Cloudflare credentials are available',
			);
		}

		// Ensure response_type is valid - handle legacy 'image' value
		if (
			mergedOptions.response_type &&
			!['by_format', 'empty', 'json'].includes(
				mergedOptions.response_type as string,
			)
		) {
			// Replace invalid values with 'by_format' which is valid for the API
			const oldValue = mergedOptions.response_type;
			mergedOptions.response_type = 'by_format';
			methodLogger.debug(
				`Changed response_type from "${oldValue}" to "by_format"`,
			);
		}

		methodLogger.debug('Using options after defaults:', {
			...mergedOptions,
			access_key: '[REDACTED]',
			html: mergedOptions.html ? '[HTML CONTENT REDACTED]' : undefined,
		});

		// Call the service with the options
		const response = await screenshotOneService.takeScreenshot(
			{
				url: mergedOptions.url,
				html: mergedOptions.html,
				format: mergedOptions.format,
				response_type: mergedOptions.response_type,
				viewport_width: mergedOptions.viewport_width,
				viewport_height: mergedOptions.viewport_height,
				viewport_device: mergedOptions.viewport_device,
				device_scale_factor: mergedOptions.device_scale_factor,
				viewport_mobile: mergedOptions.viewport_mobile,
				full_page: mergedOptions.full_page,
				full_page_scroll: mergedOptions.full_page_scroll,
				full_page_scroll_delay: mergedOptions.full_page_scroll_delay,
				selector: mergedOptions.selector,
				selector_scroll_into_view:
					mergedOptions.selector_scroll_into_view,
				image_quality: mergedOptions.image_quality,
				image_width: mergedOptions.image_width,
				image_height: mergedOptions.image_height,
				omit_background: mergedOptions.omit_background,
				clip_x: mergedOptions.clip_x,
				clip_y: mergedOptions.clip_y,
				clip_width: mergedOptions.clip_width,
				clip_height: mergedOptions.clip_height,
				wait_until: mergedOptions.wait_until,
				delay: mergedOptions.delay,
				timeout: mergedOptions.timeout,
				wait_for_selector: mergedOptions.wait_for_selector,
				block_ads: mergedOptions.block_ads,
				block_trackers: mergedOptions.block_trackers,
				block_cookie_banners: mergedOptions.block_cookie_banners,
				hide_selectors: mergedOptions.hide_selectors,
				styles: mergedOptions.styles,
				scripts: mergedOptions.scripts,
				cache: mergedOptions.cache,
				cache_ttl: mergedOptions.cache_ttl,
				pdf_landscape: mergedOptions.pdf_landscape,
				pdf_paper_format: mergedOptions.pdf_paper_format,
				pdf_print_background: mergedOptions.pdf_print_background,
				pdf_fit_one_page: mergedOptions.pdf_fit_one_page,
			},
			accessKey,
		);
		methodLogger.debug('Got the response from the service');

		// Process the response based on response_type
		if (mergedOptions.response_type === 'json') {
			// For JSON responses, return the data directly
			return { content: JSON.stringify(response.data, null, 2) };
		} else {
			// For image/binary responses, encode as base64
			const buffer = Buffer.from(response.data);
			const base64Data = buffer.toString('base64');
			const mimeType = getMimeType(mergedOptions.format || 'png');
			const dataUrl = `data:${mimeType};base64,${base64Data}`;

			// Handle upload if requested
			if (mergedOptions.upload) {
				try {
					// Check if Cloudflare credentials are available
					if (
						!env.CLOUDFLARE_CDN_ACCESS_KEY ||
						!env.CLOUDFLARE_CDN_SECRET_KEY
					) {
						methodLogger.warn(
							'Upload requested but Cloudflare credentials are missing',
						);
						return {
							content: dataUrl,
							error: 'Screenshot taken but upload failed: Cloudflare credentials are missing',
						};
					}

					// Generate filename if not provided
					const timestamp = new Date()
						.toISOString()
						.replace(/[:.]/g, '-');
					const filename = mergedOptions.upload_filename
						? `${mergedOptions.upload_filename}.${
								mergedOptions.format || 'png'
							}`
						: `screenshot-${timestamp}.${
								mergedOptions.format || 'png'
							}`;

					methodLogger.debug(
						'Uploading screenshot to Cloudflare storage',
						{
							filename,
							format: mergedOptions.format || 'png',
							debug: mergedOptions.upload_debug || false,
						},
					);

					// Upload the file
					const storage = getCurrentStorage();
					const uploadResult = await uploadFileBuffer(
						buffer,
						filename,
						{
							storage,
							debug: mergedOptions.upload_debug || false,
						},
					);

					methodLogger.debug(
						'Screenshot uploaded successfully',
						uploadResult,
					);

					return {
						content: dataUrl,
						info: 'Screenshot uploaded successfully',
						metadata: {
							upload: uploadResult,
						},
					};
				} catch (uploadError) {
					methodLogger.error(
						'Error uploading screenshot:',
						uploadError,
					);
					return {
						content: dataUrl,
						error: `Screenshot taken but upload failed: ${
							uploadError instanceof Error
								? uploadError.message
								: 'Unknown error'
						}`,
					};
				}
			}

			return {
				content: dataUrl,
			};
		}
	} catch (error) {
		// Use the standardized error handler with return
		return handleControllerError(error, {
			entityType: 'Screenshot',
			operation: 'taking',
			source: 'controllers/screenshotone.controller.ts@takeScreenshot',
			additionalInfo: {
				url: options.url,
				hasHtml: !!options.html,
			},
		});
	}
}

/**
 * Helper function to get the MIME type based on format
 * @param format The screenshot format
 * @returns The corresponding MIME type
 */
function getMimeType(format: string): string {
	switch (format.toLowerCase()) {
		case 'jpeg':
		case 'jpg':
			return 'image/jpeg';
		case 'webp':
			return 'image/webp';
		case 'pdf':
			return 'application/pdf';
		case 'png':
		default:
			return 'image/png';
	}
}

export default {
	takeScreenshot,
};
