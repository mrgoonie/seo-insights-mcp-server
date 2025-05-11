/**
 * Common type definitions shared across controllers.
 * These types provide a standard interface for controller interactions.
 * Centralized here to ensure consistency across the codebase.
 */

/**
 * Common pagination information for API responses.
 * This is used for providing consistent pagination details to clients.
 */
export interface ResponsePagination {
	/**
	 * Cursor for the next page of results, if available.
	 * This should be passed to subsequent requests to retrieve the next page.
	 */
	nextCursor?: string;

	/**
	 * Whether more results are available beyond the current page.
	 * When true, clients should use the nextCursor to retrieve more results.
	 */
	hasMore: boolean;

	/**
	 * The number of items in the current result set.
	 * This helps clients track how many items they've received.
	 */
	count?: number;
}

/**
 * Common pagination options for API requests.
 * These options control how many results are returned and which page is retrieved.
 */
export interface PaginationOptions {
	/**
	 * Maximum number of results to return per page.
	 * Valid range: 1-100
	 * If not specified, the default page size (typically 25) will be used.
	 */
	limit?: number;

	/**
	 * Pagination cursor for retrieving a specific page of results.
	 * Obtain this value from the previous response's pagination information.
	 */
	cursor?: string;
}

/**
 * Base interface for entity identifiers.
 * Used to standardize parameter patterns across controllers.
 * Each entity-specific identifier should extend this interface.
 */
export interface EntityIdentifier {
	/**
	 * Allows for dynamic keys with string values.
	 * Entity-specific identifiers will add strongly-typed properties.
	 */
	[key: string]: string;
}

/**
 * Common response structure for controller operations.
 * All controller methods should return this structure.
 */
export interface ControllerResponse {
	/**
	 * Formatted content to be displayed to the user.
	 * Usually a Markdown-formatted string.
	 */
	content: string;

	/**
	 * Optional pagination information for list operations.
	 * If present, indicates that more results are available.
	 */
	pagination?: ResponsePagination;

	/**
	 * Optional error message to be displayed to the user.
	 * Used when an operation fails but can still return some content.
	 */
	error?: string;

	/**
	 * Optional informational message to be displayed to the user.
	 * Used for success messages or additional context.
	 */
	info?: string;

	/**
	 * Optional metadata about the response.
	 * Can contain any additional data that might be useful for the client.
	 */
	metadata?: Record<string, any>;
}
