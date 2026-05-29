/**
 * Logger utility — Centralizado con niveles y timestamps
 */

const LOG_LEVELS = {
	DEBUG: 0,
	INFO: 1,
	WARN: 2,
	ERROR: 3,
};

const LEVEL_NAMES = {
	0: "DEBUG",
	1: "INFO",
	2: "WARN",
	3: "ERROR",
};

const COLORS = {
	DEBUG: "\x1b[36m", // Cyan
	INFO: "\x1b[32m", // Green
	WARN: "\x1b[33m", // Yellow
	ERROR: "\x1b[31m", // Red
	RESET: "\x1b[0m",
};

class Logger {
	constructor(context = "App", minLevel = LOG_LEVELS.INFO) {
		this.context = context;
		this.minLevel = minLevel;
	}

	#formatMessage(level, message, data = null) {
		const timestamp = new Date().toISOString();
		const levelName = LEVEL_NAMES[level];
		const color = COLORS[levelName] || "";
		const reset = COLORS.RESET;

		let output = `${color}[${timestamp}] [${levelName}] [${this.context}]${reset} ${message}`;

		if (data) {
			output += `\n${JSON.stringify(data, null, 2)}`;
		}

		return output;
	}

	debug(message, data = null) {
		if (this.minLevel <= LOG_LEVELS.DEBUG) {
			console.log(this.#formatMessage(LOG_LEVELS.DEBUG, message, data));
		}
	}

	info(message, data = null) {
		if (this.minLevel <= LOG_LEVELS.INFO) {
			console.log(this.#formatMessage(LOG_LEVELS.INFO, message, data));
		}
	}

	warn(message, data = null) {
		if (this.minLevel <= LOG_LEVELS.WARN) {
			console.warn(this.#formatMessage(LOG_LEVELS.WARN, message, data));
		}
	}

	error(message, data = null) {
		if (this.minLevel <= LOG_LEVELS.ERROR) {
			console.error(this.#formatMessage(LOG_LEVELS.ERROR, message, data));
		}
	}
}

export { Logger, LOG_LEVELS };
