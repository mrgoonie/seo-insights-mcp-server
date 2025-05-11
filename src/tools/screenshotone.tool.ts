import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../utils/logger.util.js';
import {
	TakeScreenshotToolArgs,
	TakeScreenshotToolArgsType,
} from './screenshotone.types.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import screenshotOneController from '../controllers/screenshotone.controller.js';

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

/**
 * @function handleTakeScreenshot
 * @description MCP Tool handler to take a screenshot using ScreenshotOne
 * @param {TakeScreenshotToolArgsType} args - Arguments provided to the tool
 * @returns {Promise<{ content: Array<{ type: 'text' | 'image', text?: string, image_url?: string }> }>} Formatted response for the MCP
 */
async function handleTakeScreenshot(args: TakeScreenshotToolArgsType) {
	const methodLogger = Logger.forContext(
		'tools/screenshotone.tool.ts',
		'handleTakeScreenshot',
	);
	methodLogger.debug(`Taking screenshot with options:`, {
		...args,
		access_key: args.access_key ? '[REDACTED]' : undefined,
		html: args.html ? '[HTML CONTENT REDACTED]' : undefined,
	});

	try {
		// Map tool arguments to controller options
		const controllerOptions = {
			url: args.url,
			html: args.html,
			access_key: args.access_key,
			format: args.format,
			response_type: args.response_type,
			viewport_width: args.viewport_width,
			viewport_height: args.viewport_height,
			viewport_device: args.viewport_device,
			device_scale_factor: args.device_scale_factor,
			viewport_mobile: args.viewport_mobile,
			full_page: args.full_page,
			full_page_scroll: args.full_page_scroll,
			full_page_scroll_delay: args.full_page_scroll_delay,
			selector: args.selector,
			selector_scroll_into_view: args.selector_scroll_into_view,
			image_quality: args.image_quality,
			image_width: args.image_width,
			image_height: args.image_height,
			omit_background: args.omit_background,
			clip_x: args.clip_x,
			clip_y: args.clip_y,
			clip_width: args.clip_width,
			clip_height: args.clip_height,
			wait_until: args.wait_until,
			delay: args.delay,
			timeout: args.timeout,
			wait_for_selector: args.wait_for_selector,
			block_ads: args.block_ads,
			block_trackers: args.block_trackers,
			block_cookie_banners: args.block_cookie_banners,
			hide_selectors: args.hide_selectors,
			styles: args.styles,
			scripts: args.scripts,
			cache: args.cache,
			cache_ttl: args.cache_ttl,
			pdf_landscape: args.pdf_landscape,
			pdf_paper_format: args.pdf_paper_format,
			pdf_print_background: args.pdf_print_background,
			pdf_fit_one_page: args.pdf_fit_one_page,
		};

		// Call the controller with the mapped options
		const result =
			await screenshotOneController.takeScreenshot(controllerOptions);
		methodLogger.debug(`Got the response from the controller`);

		// Format the response for the MCP tool
		// First check if we have a successful upload with a Cloudflare URL
		if (result.metadata?.upload?.publicUrl) {
			methodLogger.debug(
				'Returning Cloudflare URL instead of base64 data',
				{
					publicUrl: result.metadata.upload.publicUrl,
				},
			);

			// Return the Cloudflare URL as a resource type with URI
			return {
				content: [
					{
						type: 'text' as const,
						text: `Screenshot uploaded successfully: ${result.metadata.upload.publicUrl}`,
					},
					{
						type: 'resource' as const,
						resource: {
							uri: result.metadata.upload.publicUrl,
							text: 'View Screenshot',
							mimeType: getMimeType(args.format || 'png'),
						},
					},
				],
			};
		}
		// Check if the result is a base64 image or JSON content
		else if (result.content && result.content.startsWith('data:')) {
			// It's a base64 image - extract the base64 data and mime type
			const [dataPart, base64Data] = result.content.split(',');
			const mimeType = dataPart.split(':')[1].split(';')[0];
			return {
				content: [
					{
						type: 'image' as const,
						data: base64Data,
						mimeType: mimeType,
					},
				],
			};
		} else {
			// It's JSON or error content
			return {
				content: [
					{
						type: 'text' as const,
						text: result.content,
					},
				],
			};
		}
	} catch (error) {
		methodLogger.error(`Error taking screenshot`, error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * @function register
 * @description Registers the ScreenshotOne tools with the MCP server
 * @param {McpServer} server - The MCP server instance
 */
function register(server: McpServer) {
	const methodLogger = Logger.forContext(
		'tools/screenshotone.tool.ts',
		'register',
	);
	methodLogger.debug(`Registering ScreenshotOne tools...`);

	// Register take screenshot tool
	server.tool(
		'take_screenshot',
		`Takes a screenshot of a webpage or HTML content.
Requires either a URL or HTML content.
Returns the screenshot as an URL (default), an image or JSON with metadata.
Supports a wide range of customization options including viewport size, format, selectors, and more.`,
		TakeScreenshotToolArgs.shape,
		handleTakeScreenshot,
	);

	methodLogger.debug('Successfully registered ScreenshotOne tools.');
}

export default { register };
