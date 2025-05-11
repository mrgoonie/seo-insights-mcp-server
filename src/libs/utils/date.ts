import dayjs from 'dayjs';

export function getCurrentSystemDatetimeISOString() {
	return dayjs().toISOString();
}

export function nowStr() {
	return dayjs().format('YYYY-MM-DD HH:mm:ss');
}
