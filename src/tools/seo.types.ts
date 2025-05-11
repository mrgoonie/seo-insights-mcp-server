/**
 * @file seo.types.ts
 * @description Type definitions for SEO tools
 */

import { z } from 'zod';

// Backlinks types
export const BacklinksParamsSchema = z.object({
	domain: z.string().describe('The domain to query for backlinks'),
});

export type BacklinksParams = z.infer<typeof BacklinksParamsSchema>;

export interface Backlink {
	anchor: string;
	domainRating: number;
	title: string;
	urlFrom: string;
	urlTo: string;
	edu: boolean;
	gov: boolean;
}

export interface BacklinksOverview {
	backlinks: number;
	refDomains: number;
	refPages: number;
	dofollow: number;
	domainRating: number;
	urlRating: number;
}

export interface BacklinksResponse {
	overview: BacklinksOverview;
	backlinks: Backlink[];
}

// Keyword generator types
export const KeywordGeneratorParamsSchema = z.object({
	keyword: z.string().describe('The seed keyword to generate ideas from'),
	country: z
		.string()
		.default('us')
		.describe('Country code for keyword research (e.g., "us", "uk")'),
	searchEngine: z
		.string()
		.default('Google')
		.describe('Search engine to use (e.g., "Google", "Bing")'),
});

export type KeywordGeneratorParams = z.infer<
	typeof KeywordGeneratorParamsSchema
>;

export interface KeywordIdea {
	keyword: string;
	country: string;
	difficulty: string;
	volume: string;
	updatedAt: string;
}

export interface KeywordIdeaResult {
	label: string;
	value: KeywordIdea;
}

// Keyword difficulty types
export const KeywordDifficultyParamsSchema = z.object({
	keyword: z.string().describe('The keyword to check difficulty for'),
	country: z
		.string()
		.default('us')
		.describe('Country code for keyword research (e.g., "us", "uk")'),
});

export type KeywordDifficultyParams = z.infer<
	typeof KeywordDifficultyParamsSchema
>;

export interface SerpResult {
	title: string;
	url: string;
	position: number;
	domainRating?: number;
	urlRating?: number;
	traffic?: number;
	keywords?: number;
	topKeyword?: string;
	topVolume?: number;
}

export interface KeywordDifficultyResponse {
	difficulty: number;
	shortage: number;
	lastUpdate: string;
	serp: {
		results: SerpResult[];
	};
}

// Traffic checker types
export const TrafficCheckerParamsSchema = z.object({
	domainOrUrl: z.string().describe('The domain or URL to check traffic for'),
	country: z
		.string()
		.default('None')
		.describe('Country code for traffic data (e.g., "us", "uk")'),
	mode: z
		.enum(['subdomains', 'exact'])
		.default('subdomains')
		.describe('Query mode: "subdomains" or "exact"'),
});

export type TrafficCheckerParams = z.infer<typeof TrafficCheckerParamsSchema>;

export interface TrafficHistory {
	date: string;
	traffic: number;
}

export interface TrafficData {
	trafficMonthlyAvg: number;
	costMontlyAvg: number;
}

export interface TopPage {
	url: string;
	traffic: number;
	keywords: number;
}

export interface TopCountry {
	country: string;
	traffic: number;
}

export interface TopKeyword {
	keyword: string;
	position: number;
	volume: number;
	traffic: number;
}

export interface TrafficResponse {
	traffic_history: TrafficHistory[];
	traffic: TrafficData;
	top_pages: TopPage[];
	top_countries: TopCountry[];
	top_keywords: TopKeyword[];
}
