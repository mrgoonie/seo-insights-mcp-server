import axios from 'axios';

const BASE_URL = 'https://goanyapi.com';

async function request(path: string, params: Record<string, string>) {
	const apiKey = process.env.GOANYAPI_API_KEY;
	if (!apiKey) {
		throw new Error(
			'GOANYAPI_API_KEY is required when SEO_PROVIDER=goanyapi',
		);
	}

	const response = await axios.get(`${BASE_URL}${path}`, {
		params,
		headers: { Authorization: `Bearer ${apiKey}` },
		timeout: 30_000,
	});
	return response.data;
}

function requireDomain(input: string): string {
	const domain = input.trim();
	if (!/^(?!-)[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(domain)) {
		throw new Error('GoAnyAPI requires a hostname such as example.com');
	}
	return domain;
}

function requireCountry(country: string): string {
	if (!/^[a-z]{2}$/i.test(country)) {
		throw new Error('GoAnyAPI requires a two-letter country code');
	}
	return country.toLowerCase();
}

async function getBacklinks(domain: string) {
	return request('/api/v1/backlink', { domain: requireDomain(domain) });
}

async function getKeywordIdeas(
	keyword: string,
	country: string,
	searchEngine: string,
) {
	if (searchEngine.toLowerCase() !== 'google') {
		throw new Error('GoAnyAPI keyword generator supports Google only');
	}
	return request('/api/v1/keyword-generator', {
		keyword,
		country: requireCountry(country),
	});
}

async function getKeywordDifficulty(keyword: string, country: string) {
	return request('/api/v1/keyword-difficulty', {
		keyword,
		country: requireCountry(country),
	});
}

async function checkTraffic(domain: string, mode: string, country: string) {
	if (mode !== 'subdomains' || country !== 'None') {
		throw new Error(
			'GoAnyAPI traffic accepts a domain only; --mode exact and --country are unavailable',
		);
	}
	return request('/api/v1/traffic', { domain: requireDomain(domain) });
}

export default {
	getBacklinks,
	getKeywordIdeas,
	getKeywordDifficulty,
	checkTraffic,
};
