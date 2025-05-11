import axios from 'axios';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { PassThrough } from 'stream';

/**
 * Read image url and convert to {Buffer}
 * @returns {Promise<Buffer | null>}
 */
export async function getBufferFromUrl(url: string) {
	try {
		const response = await axios.get(url, { responseType: 'arraybuffer' });
		return Buffer.from(response.data);
	} catch (error) {
		console.error('getBufferFromUrl() > Error:', error);
		return null;
	}
}

export async function getFileSizeFromUrl(url: string) {
	try {
		const response = await axios.head(url);
		return parseInt(response.headers['content-length'], 10);
	} catch (error) {
		console.error('getFileSizeFromUrl() > Error:', error);
		return null;
	}
}

/**
 * Read file url and convert to {ReadStream}
 */

export async function getStreamFromUrl(url: string) {
	try {
		const response = await axios.get(url, { responseType: 'stream' });

		if (!(response.data instanceof PassThrough)) {
			throw new Error('Response is not a stream');
		}

		const size = parseInt(response.headers['content-length'], 10);
		return { stream: response.data, size };
	} catch (error) {
		console.error('getStreamFromUrl() > Error:', error);
		throw error; // re-throw the error to propagate it
	}
}

/**
 * Download file from url and save to outputPath
 * @param url
 * @param outputPath - Include file name
 * @returns {Promise<string | null>}
 */
export async function downloadFile(url: string, outputPath: string) {
	try {
		const response = await axios.get(url, {
			responseType: 'arraybuffer',
		});

		// split file name & create directory if not exists
		const dirPath = dirname(outputPath);
		if (!existsSync(dirPath)) mkdirSync(dirPath, { recursive: true });

		writeFileSync(outputPath, response.data);

		return outputPath;
	} catch (error) {
		console.error('Error downloading the image:', error);
		return null;
	}
}
