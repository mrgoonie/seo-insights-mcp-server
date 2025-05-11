export async function wait(ms: number, callback?: () => void) {
	return new Promise((resolve) =>
		setTimeout(() => {
			callback?.();
			resolve(void 0);
		}, ms),
	);
}
