export async function retry(
	promiseFactory: () => void | Promise<any>,
	retryCount: number,
) {
	try {
		return await promiseFactory();
	} catch (error) {
		if (retryCount <= 0) {
			throw error;
		}
		return retry(promiseFactory, retryCount - 1);
	}
}
