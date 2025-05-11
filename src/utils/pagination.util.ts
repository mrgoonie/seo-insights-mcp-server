import { Logger } from './logger.util.js';

// Create a contextualized logger for this file
const paginationLogger = Logger.forContext('utils/pagination.util.ts');

// Log pagination utility initialization
paginationLogger.debug('Pagination utility initialized');

/**
 * Types of pagination mechanisms used by different APIs
 */
export enum PaginationType {
	/**
	 * Offset-based pagination (startAt, maxResults, total)
	 * Used by many REST APIs including Jira
	 */
	OFFSET = 'offset',

	/**
	 * Cursor-based pagination (cursor in URL)
	 * Used by many modern APIs including Confluence
	 */
	CURSOR = 'cursor',

	/**
	 * Page-based pagination (page parameter in URL)
	 * Used by many APIs including Bitbucket
	 */
	PAGE = 'page',
}

/**
 * Structure for offset-based pagination data
 */
export interface OffsetPaginationData {
	startAt?: number;
	maxResults?: number;
	total?: number;
	nextPage?: string;
	values?: unknown[];
}

/**
 * Structure for cursor-based pagination data
 */
export interface CursorPaginationData {
	_links: {
		next?: string;
	};
	results?: unknown[];
}

/**
 * Structure for page-based pagination data
 */
export interface PagePaginationData {
	next?: string;
	values?: unknown[];
}

/**
 * Union type for all pagination data types
 */
export type PaginationData =
	| OffsetPaginationData
	| CursorPaginationData
	| PagePaginationData;

/**
 * Response pagination information
 */
export interface ResponsePagination {
	/** The next cursor value (if applicable) */
	nextCursor?: string;
	/** Whether there are more results available */
	hasMore: boolean;
	/** Count of items in the current batch */
	count?: number;
}

/**
 * Extract pagination information from an API response
 * @param data API response data
 * @param type Pagination type (offset, cursor, or page)
 * @param source Optional source identifier for logging
 * @returns Response pagination information
 */
export function extractPaginationInfo<T extends Record<string, unknown>>(
	data: T,
	type: PaginationType,
	source?: string,
): ResponsePagination {
	const methodLogger = Logger.forContext(
		'utils/pagination.util.ts',
		'extractPaginationInfo',
	);

	methodLogger.debug(`Extracting pagination info using type: ${type}`);

	if (!data) {
		methodLogger.debug('No data provided for pagination extraction');
		return { hasMore: false };
	}

	let nextCursor: string | undefined;
	let count: number | undefined;
	let hasMore = false;

	try {
		// Extract count from the appropriate data field based on pagination type
		switch (type) {
			case PaginationType.OFFSET: {
				// Type guard to check if data has expected offset pagination properties
				const hasOffsetProps =
					'startAt' in data ||
					'maxResults' in data ||
					'total' in data ||
					'values' in data;

				if (hasOffsetProps) {
					const offsetData = data as unknown as OffsetPaginationData;
					count = offsetData.values?.length;

					// Handle offset-based pagination
					if (
						offsetData.startAt !== undefined &&
						offsetData.maxResults !== undefined &&
						offsetData.total !== undefined &&
						offsetData.startAt + offsetData.maxResults <
							offsetData.total
					) {
						hasMore = true;
						nextCursor = String(
							offsetData.startAt + offsetData.maxResults,
						);
					} else if (offsetData.nextPage) {
						hasMore = true;
						nextCursor = offsetData.nextPage;
					}
				}
				break;
			}

			case PaginationType.CURSOR: {
				// Type guard to check if data has expected cursor pagination properties
				const hasCursorProps =
					'_links' in data &&
					data._links &&
					typeof data._links === 'object';

				if (hasCursorProps) {
					const cursorData = data as unknown as CursorPaginationData;
					count =
						'results' in cursorData &&
						Array.isArray(cursorData.results)
							? cursorData.results.length
							: undefined;

					// Handle cursor-based pagination
					if (
						cursorData._links &&
						typeof cursorData._links.next === 'string'
					) {
						const nextUrl = cursorData._links.next;
						const cursorMatch = nextUrl.match(/cursor=([^&]+)/);
						if (cursorMatch && cursorMatch[1]) {
							hasMore = true;
							nextCursor = decodeURIComponent(cursorMatch[1]);
						}
					}
				}
				break;
			}

			case PaginationType.PAGE: {
				// Type guard to check if data has expected page pagination properties
				const hasPageProps = 'next' in data || 'values' in data;

				if (hasPageProps) {
					const pageData = data as unknown as PagePaginationData;
					count = pageData.values?.length;

					// Handle page-based pagination
					if (pageData.next && typeof pageData.next === 'string') {
						try {
							const nextUrl = new URL(pageData.next);
							const nextPage = nextUrl.searchParams.get('page');
							if (nextPage) {
								hasMore = true;
								nextCursor = nextPage;
							}
						} catch (error) {
							methodLogger.warn(
								`${source} Failed to parse next URL: ${pageData.next}`,
								{ error },
							);
						}
					}
				}
				break;
			}

			default:
				methodLogger.warn(`${source} Unknown pagination type: ${type}`);
		}

		if (nextCursor) {
			methodLogger.debug(`${source} Next cursor: ${nextCursor}`);
		}

		return {
			nextCursor,
			hasMore,
			count,
		};
	} catch (error) {
		methodLogger.warn(
			`${source} Error extracting pagination information: ${error instanceof Error ? error.message : String(error)}`,
		);
		return { hasMore: false };
	}
}
