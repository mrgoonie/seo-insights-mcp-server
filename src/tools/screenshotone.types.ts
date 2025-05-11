/**
 * @file screenshotone.types.ts
 * @description Type definitions for the ScreenshotOne MCP tool.
 */

import { z } from 'zod';

/**
 * Schema for ScreenshotOne take screenshot tool arguments
 */
export const TakeScreenshotToolArgs = z.object({
	// Essential parameters
	url: z
		.string()
		.optional()
		.describe('URL of the webpage to take a screenshot of'),
	html: z
		.string()
		.optional()
		.describe('HTML content to render and take a screenshot of'),
	access_key: z.string().optional().describe('Your ScreenshotOne access key'),

	// Upload options
	upload: z
		.boolean()
		.optional()
		.describe('Upload the screenshot to Cloudflare storage'),
	upload_filename: z
		.string()
		.optional()
		.describe(
			'Filename to use when uploading to storage (without extension)',
		),
	upload_debug: z
		.boolean()
		.optional()
		.describe('Enable debug logging for upload process'),

	// Format options
	format: z
		.enum(['png', 'jpeg', 'webp', 'pdf'])
		.optional()
		.describe('Output format of the screenshot'),
	response_type: z
		.enum(['by_format', 'empty', 'json'])
		.optional()
		.describe('Response type (by_format, empty, or json)'),

	// Viewport options
	viewport_width: z
		.number()
		.optional()
		.describe('Width of the viewport in pixels'),
	viewport_height: z
		.number()
		.optional()
		.describe('Height of the viewport in pixels'),
	viewport_device: z
		.string()
		.optional()
		.describe('Emulate specific device (e.g., "iPhone X")'),
	device_scale_factor: z
		.number()
		.optional()
		.describe('Device scale factor for the viewport'),
	viewport_mobile: z
		.boolean()
		.optional()
		.describe('Whether to emulate a mobile device'),

	// Full page options
	full_page: z.boolean().optional().describe('Capture full page screenshot'),
	full_page_scroll: z
		.boolean()
		.optional()
		.describe('Enable scrolling for full page capture'),
	full_page_scroll_delay: z
		.number()
		.optional()
		.describe('Delay between scrolls in milliseconds'),

	// Selector options
	selector: z
		.string()
		.optional()
		.describe('CSS selector to capture specific element'),
	selector_scroll_into_view: z
		.boolean()
		.optional()
		.describe('Scroll the selector into view before capture'),

	// Image options
	image_quality: z
		.number()
		.min(1)
		.max(100)
		.optional()
		.describe('Image quality (1-100)'),
	image_width: z.number().optional().describe('Resize image width'),
	image_height: z.number().optional().describe('Resize image height'),
	omit_background: z
		.boolean()
		.optional()
		.describe('Make background transparent (PNG only)'),

	// Clip options
	clip_x: z.number().optional().describe('X coordinate of the clip area'),
	clip_y: z.number().optional().describe('Y coordinate of the clip area'),
	clip_width: z.number().optional().describe('Width of the clip area'),
	clip_height: z.number().optional().describe('Height of the clip area'),

	// Wait options
	wait_until: z
		.enum(['load', 'domcontentloaded', 'networkidle0', 'networkidle2'])
		.optional()
		.describe('When to consider navigation successful'),
	delay: z
		.number()
		.optional()
		.describe('Delay in milliseconds before taking the screenshot'),
	timeout: z
		.number()
		.optional()
		.describe('Maximum navigation time in milliseconds'),
	wait_for_selector: z
		.string()
		.optional()
		.describe('Wait for selector to appear before screenshot'),

	// Blocking options
	block_ads: z.boolean().optional().describe('Block ads'),
	block_trackers: z.boolean().optional().describe('Block trackers'),
	block_cookie_banners: z
		.boolean()
		.optional()
		.describe('Block cookie consent banners'),

	// Customization options
	hide_selectors: z
		.array(z.string())
		.optional()
		.describe('CSS selectors to hide'),
	styles: z.string().optional().describe('Custom CSS to inject'),
	scripts: z.string().optional().describe('Custom JavaScript to inject'),

	// Cache options
	cache: z.boolean().optional().describe('Enable caching'),
	cache_ttl: z.number().optional().describe('Cache TTL in seconds'),

	// PDF options (when format is pdf)
	pdf_landscape: z
		.boolean()
		.optional()
		.describe('Use landscape orientation for PDF'),
	pdf_paper_format: z
		.enum([
			'Letter',
			'Legal',
			'Tabloid',
			'Ledger',
			'A0',
			'A1',
			'A2',
			'A3',
			'A4',
			'A5',
			'A6',
		])
		.optional()
		.describe('Paper format for PDF'),
	pdf_print_background: z
		.boolean()
		.optional()
		.describe('Print background graphics in PDF'),
	pdf_fit_one_page: z
		.boolean()
		.optional()
		.describe('Fit content to one page in PDF'),
});

/**
 * Type for ScreenshotOne take screenshot tool arguments
 */
export type TakeScreenshotToolArgsType = z.infer<typeof TakeScreenshotToolArgs>;

/**
 * Options for the screenshot controller
 */
export interface ScreenshotOptions {
	url?: string;
	html?: string;
	access_key?: string;
	upload?: boolean;
	upload_filename?: string;
	upload_debug?: boolean;
	format?: 'png' | 'jpeg' | 'webp' | 'pdf';
	response_type?: 'by_format' | 'empty' | 'json';
	viewport_width?: number;
	viewport_height?: number;
	viewport_device?: string;
	device_scale_factor?: number;
	viewport_mobile?: boolean;
	full_page?: boolean;
	full_page_scroll?: boolean;
	full_page_scroll_delay?: number;
	selector?: string;
	selector_scroll_into_view?: boolean;
	image_quality?: number;
	image_width?: number;
	image_height?: number;
	omit_background?: boolean;
	clip_x?: number;
	clip_y?: number;
	clip_width?: number;
	clip_height?: number;
	wait_until?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';
	delay?: number;
	timeout?: number;
	wait_for_selector?: string;
	block_ads?: boolean;
	block_trackers?: boolean;
	block_cookie_banners?: boolean;
	hide_selectors?: string[];
	styles?: string;
	scripts?: string;
	cache?: boolean;
	cache_ttl?: number;
	pdf_landscape?: boolean;
	pdf_paper_format?:
		| 'Letter'
		| 'Legal'
		| 'Tabloid'
		| 'Ledger'
		| 'A0'
		| 'A1'
		| 'A2'
		| 'A3'
		| 'A4'
		| 'A5'
		| 'A6';
	pdf_print_background?: boolean;
	pdf_fit_one_page?: boolean;
}
