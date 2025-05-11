import bcrypt from 'bcrypt';

/**
 * Generates a random string of the specified length using only digits and alphabet characters.
 * @param length - The length of the random string to generate.
 * @returns A random string of the specified length.
 */
export function generateRandomString(length: number): string {
	const characters =
		'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let result = '';
	for (let i = 0; i < length; i++) {
		const randomIndex = Math.floor(Math.random() * characters.length);
		result += characters[randomIndex];
	}
	return result;
}

export async function generateRandomApiKey(): Promise<string> {
	const saltRounds = 10;
	const token = crypto.randomUUID();
	const hashedToken = await bcrypt.hash(token, saltRounds);
	return 'wrk_' + hashedToken.replace(/[^a-zA-Z0-9]/g, '');
}
