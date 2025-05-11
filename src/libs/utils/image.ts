import axios from 'axios';
import { readFileSync, writeFileSync } from 'fs';
import { Jimp } from 'jimp';
import path from 'path';

export function readFileToBuffer(filePath: string) {
	const _path = path.resolve(filePath);
	try {
		const buffer = readFileSync(_path);
		return buffer;
	} catch (err: any) {
		throw new Error(
			`Error reading file from path ${filePath}: ${err.message}`,
		);
	}
}

/**
 * Đọc URL hình ảnh và chuyển đổi thành {Buffer}
 * @returns {Promise<Buffer | null>}
 */
export async function getImageBufferFromUrl(url: string) {
	try {
		const response = await axios.get(url, { responseType: 'arraybuffer' });
		if (response.status !== 200) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		return Buffer.from(response.data);
	} catch (error) {
		console.error('Lỗi khi lấy hình ảnh:', error);
		return null;
	}
}

/**
 * Tải hình ảnh từ URL và lưu vào đường dẫn đầu ra
 * @returns {Promise<string | null>}
 */
export async function downloadImage(
	url: string,
	outputPath: string,
): Promise<string | null> {
	try {
		const response = await axios.get(url, { responseType: 'arraybuffer' });
		if (response.status !== 200) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		writeFileSync(outputPath, Buffer.from(response.data));
		return outputPath;
	} catch (error) {
		console.error('Lỗi khi tải hình ảnh:', error);
		return null;
	}
}

export async function resizeImageFromUrl(
	url: string,
	width: number,
	height?: number,
) {
	const buffer = await getImageBufferFromUrl(url);
	if (!buffer) return null;

	// resize image using "Jimp"
	const image = await Jimp.read(buffer);

	if (height) {
		await image.resize({ w: width, h: height });
	} else {
		const aspectRatio = image.width / image.height;
		const newHeight = Math.round(width / aspectRatio);
		await image.resize({ w: width, h: newHeight });
	}

	// return buffer
	return image.getBuffer('image/png');
}

export async function bufferToBase64(buffer: Buffer) {
	return buffer.toString('base64');
}

export async function imageUrlToBase64(url: string) {
	const buffer = await getImageBufferFromUrl(url);
	if (!buffer) return null;
	return bufferToBase64(buffer);
}

export async function resizeImageUrlToBase64(
	url: string,
	width: number,
	height?: number,
) {
	const buffer = await resizeImageFromUrl(url, width, height);
	if (!buffer) return null;
	return bufferToBase64(buffer);
}

export function saveBufferToFile(buffer: Buffer, filePath: string) {
	writeFileSync(filePath, buffer);
	return filePath;
}

export function bufferToBlob(buffer: Buffer) {
	return new Blob([buffer], { type: 'image/png' });
}

export async function getImageSizeByBuffer(buffer: Buffer) {
	const image = await Jimp.read(buffer);
	return { width: image.width, height: image.height };
}

export async function getImageSizeByUrl(url: string) {
	const buffer = await getImageBufferFromUrl(url);
	if (!buffer) return null;
	return getImageSizeByBuffer(buffer);
}
