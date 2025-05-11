import chalk from 'chalk';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import humanize from 'humanize-duration';

dayjs.extend(duration);

/**
 * Convert seconds to time format: "HH:mm:ss"
 * @param seconds - Input seconds
 */
export function secondsToTimeString(seconds: number) {
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const remainingSeconds = Math.floor(seconds % 60);
	return `${hours.toString().padStart(2, '0')}:${minutes
		.toString()
		.padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function secondsToTimeFormat(
	seconds: number,
	format: 'HH:mm:ss' | 'mm:ss',
) {
	const duration = dayjs.duration(seconds, 'seconds');

	if (format === 'HH:mm:ss') {
		return duration.format('HH:mm:ss');
	}
	return duration.format('mm:ss');
}

export function logWithTime(...messages: string[]) {
	console.log(chalk.gray(`[${dayjs().format('HH:mm:ss')}]`), ...messages);
}

export class LogSession {
	private startTime: dayjs.Dayjs;
	private lastLogTime: dayjs.Dayjs;
	private title: string;

	constructor(title = 'LOG') {
		this.title = title;
		this.startTime = dayjs();
		this.lastLogTime = dayjs();
		console.log(`----------------------------------`);
		console.log(chalk.green(`[${this.title}]`, 'Log session started'));
	}

	log(...messages: string[]) {
		const duration = dayjs().diff(this.lastLogTime, 'milliseconds');
		console.log(chalk.yellow(`[${humanize(duration)}]`), ...messages);
		this.lastLogTime = dayjs();
	}

	logWithTime(...messages: string[]) {
		console.log(chalk.gray(`[${dayjs().format('HH:mm:ss')}]`), ...messages);
	}

	end() {
		const duration = dayjs().diff(this.startTime, 'milliseconds');
		console.log(
			chalk.green(`[${humanize(duration)}]`, 'Log session ended'),
		);
		console.log(`----------------------------------`);
	}
}
