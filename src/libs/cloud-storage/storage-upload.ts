import type { PutObjectCommandInput } from '@aws-sdk/client-s3';
import {
	ListBucketsCommand,
	PutObjectCommand,
	S3Client,
} from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@aws-sdk/node-http-handler';

import { env } from '../../env';

import { getImageBufferFromUrl, readFileToBuffer } from '../utils/image';
import {
	getUploadFileOriginEndpointUrl,
	getUploadFilePublicUrl,
	guessMimeTypeByBuffer,
} from './helper';
import type { CloudStorageProvider, StorageUploadOptions } from './types';
import type { ICloudStorage } from './types';

export function getCurrentStorage(): ICloudStorage {
	if (!env.CLOUDFLARE_CDN_ACCESS_KEY || !env.CLOUDFLARE_CDN_SECRET_KEY) {
		throw new Error(
			'Cloudflare CDN access key or secret key is not defined',
		);
	}

	return {
		provider: 'cloudflare',
		region: 'auto',
		bucket: env.CLOUDFLARE_CDN_BUCKET_NAME,
		accessKey: env.CLOUDFLARE_CDN_ACCESS_KEY,
		secretKey: env.CLOUDFLARE_CDN_SECRET_KEY,
		endpoint: env.CLOUDFLARE_CDN_ENDPOINT_URL,
		baseUrl: env.CLOUDFLARE_CDN_BASE_URL,
		basePath: `/${env.CLOUDFLARE_CDN_PROJECT_NAME}`,
	};
}

export async function initStorage(storage: ICloudStorage) {
	const s3 = new S3Client({
		region: storage.region,
		endpoint:
			storage.endpoint ||
			`https://${storage.accessKey}.r2.cloudflarestorage.com`,
		credentials: {
			accessKeyId: storage.accessKey,
			secretAccessKey: storage.secretKey,
		},
		forcePathStyle: true,
		retryMode: 'standard',
		maxAttempts: 5,
		requestHandler: new NodeHttpHandler({
			connectionTimeout: 10000,
			socketTimeout: 10000,
		}),
	});

	return s3;
}

export async function listBuckets(storage: ICloudStorage) {
	const s3 = await initStorage(storage);

	const response = await s3.send(new ListBucketsCommand({}));

	return response.Buckets;
}

export async function uploadFileBuffer(
	buffer: Buffer,
	destFileName: string,
	options?: StorageUploadOptions,
): Promise<{
	path: string;
	storageUrl: string;
	publicUrl: string;
	provider: CloudStorageProvider;
}> {
	const { storage = getCurrentStorage() } = options || {};
	if (!storage) throw new Error('Storage is not defined');

	if (destFileName.startsWith('/')) destFileName = destFileName.slice(1);

	const path = destFileName.replace(/[^a-zA-Z0-9-_.]/g, '');
	if (options?.debug) console.log('uploadFileBuffer :>>', { storage });
	const s3 = await initStorage(storage);

	const mimeType =
		guessMimeTypeByBuffer(buffer) || 'application/octet-stream';
	if (options?.debug) console.log('uploadFileBuffer :>>', { mimeType });

	if (options?.debug) console.log('uploadFileBuffer :>>', { path });

	const uploadParams: PutObjectCommandInput = {
		Bucket: storage.bucket,
		Key: `${env.CLOUDFLARE_CDN_PROJECT_NAME}/${path}`,
		Body: buffer,
		ContentType: mimeType,
		CacheControl: 'max-age=31536000, s-maxage=31536000',
	};

	if (options?.debug) console.log('uploadFileBuffer :>>', { uploadParams });

	try {
		const data = await s3.send(new PutObjectCommand(uploadParams));
		if (options?.debug) console.log('uploadFileBuffer :>>', { data });

		const response = {
			provider: storage.provider,
			path,
			storageUrl: getUploadFileOriginEndpointUrl(storage, destFileName),
			publicUrl: getUploadFilePublicUrl(storage, destFileName),
		};
		if (options?.debug) console.log('uploadFileBuffer :>>', { response });
		return response;
	} catch (error) {
		if (error instanceof Error) {
			console.error('Upload error:', error.message);
			if ('code' in error) {
				console.error('Error code:', (error as any).code);
			}
		}
		throw error;
	}
}

export async function uploadFileURL(
	url: string,
	destFileName: string,
	options?: StorageUploadOptions,
) {
	const buffer = await getImageBufferFromUrl(url);
	if (options?.debug) console.log('uploadFileURL :>>', { buffer });
	if (!buffer) throw new Error(`Unable to get image buffer from "${url}"`);
	return uploadFileBuffer(buffer, destFileName, options);
}

export async function uploadFilePath(
	filePath: string,
	destFileName: string,
	options?: StorageUploadOptions,
) {
	const buffer = readFileToBuffer(filePath);
	if (!buffer)
		throw new Error(`Unable to get image buffer from "${filePath}"`);
	return uploadFileBuffer(buffer, destFileName, options);
}
