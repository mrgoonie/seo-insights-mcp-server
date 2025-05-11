import dotenv from 'dotenv';
import z from 'zod';

dotenv.config();

export const envSchema = z.object({
	SCREENSHOTONE_ACCESS_KEY: z.string(),
	CLOUDFLARE_CDN_PROJECT_NAME: z.string(),
	CLOUDFLARE_CDN_ACCESS_KEY: z.string().optional(),
	CLOUDFLARE_CDN_SECRET_KEY: z.string().optional(),
	CLOUDFLARE_CDN_BUCKET_NAME: z.string(),
	CLOUDFLARE_CDN_ENDPOINT_URL: z.string(),
	CLOUDFLARE_CDN_BASE_URL: z.string(),
});
export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);
