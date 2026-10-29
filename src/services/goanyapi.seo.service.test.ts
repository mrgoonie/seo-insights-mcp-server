import axios from 'axios';
import service from './goanyapi.seo.service.js';

jest.mock('axios');

const get = axios.get as jest.Mock;

describe('GoAnyAPI SEO provider', () => {
	const previousKey = process.env.GOANYAPI_API_KEY;

	beforeEach(() => {
		process.env.GOANYAPI_API_KEY = 'test-key';
		get.mockReset();
		get.mockResolvedValue({ data: { data: { example: true } } });
	});

	afterAll(() => {
		if (previousKey === undefined) delete process.env.GOANYAPI_API_KEY;
		else process.env.GOANYAPI_API_KEY = previousKey;
	});

	it.each([
		[
			'backlinks',
			() => service.getBacklinks('example.com'),
			'/api/v1/backlink',
			{ domain: 'example.com' },
		],
		[
			'keyword ideas',
			() => service.getKeywordIdeas('seo', 'US', 'Google'),
			'/api/v1/keyword-generator',
			{ keyword: 'seo', country: 'us' },
		],
		[
			'keyword difficulty',
			() => service.getKeywordDifficulty('seo', 'US'),
			'/api/v1/keyword-difficulty',
			{ keyword: 'seo', country: 'us' },
		],
		[
			'traffic',
			() => service.checkTraffic('example.com', 'subdomains', 'None'),
			'/api/v1/traffic',
			{ domain: 'example.com' },
		],
	])(
		'routes %s to the public endpoint',
		async (_name, call, path, params) => {
			await expect(call()).resolves.toEqual({ data: { example: true } });
			expect(get).toHaveBeenCalledWith(`https://goanyapi.com${path}`, {
				params,
				headers: { Authorization: 'Bearer test-key' },
				timeout: 30_000,
			});
		},
	);

	it('rejects unsupported options before requesting or consuming credits', async () => {
		await expect(
			service.getKeywordIdeas('seo', 'us', 'Bing'),
		).rejects.toThrow('Google only');
		await expect(
			service.checkTraffic('example.com', 'exact', 'None'),
		).rejects.toThrow('unavailable');
		await expect(
			service.checkTraffic('example.com', 'subdomains', 'uk'),
		).rejects.toThrow('unavailable');
		await expect(
			service.getBacklinks('https://example.com'),
		).rejects.toThrow('hostname');
		expect(get).not.toHaveBeenCalled();
	});

	it('requires an API key', async () => {
		delete process.env.GOANYAPI_API_KEY;
		await expect(service.getBacklinks('example.com')).rejects.toThrow(
			'GOANYAPI_API_KEY',
		);
		expect(get).not.toHaveBeenCalled();
	});
});
