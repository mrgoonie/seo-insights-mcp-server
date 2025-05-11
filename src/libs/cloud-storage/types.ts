export const CLOUD_STORAGE_PROVIDERS = [
	'aws',
	'cloudflare',
	'do_space',
] as const;
export type CloudStorageProvider = (typeof CLOUD_STORAGE_PROVIDERS)[number];

export interface ICloudStorage {
	provider: CloudStorageProvider;
	region: string;
	bucket: string;
	accessKey: string;
	secretKey: string;
	endpoint: string;
	baseUrl?: string;
	basePath?: string;
}

export interface StorageUploadOptions {
	storage?: ICloudStorage;
	debug?: boolean;
}
