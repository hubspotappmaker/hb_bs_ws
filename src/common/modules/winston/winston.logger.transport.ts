import * as winston from "winston";
import * as DailyRotateFile from "winston-daily-rotate-file";
import {
	transportDailyFileConfig,
	transportHTTPConfig,
	transportsCommon,
	transportsConsoleConfig,
	transportsMaxSizeConfig,
} from "./winston.logger.config";
import { WinstonCustomTransport } from "./winston.logger.custom";

const logFormatConsole = winston.format.combine(
	winston.format.label({
		label: process.env.APP_NAME || "APP_NAME",
	}),
	winston.format.timestamp({
		format: transportsCommon.formatDate,
	}),
	winston.format.errors({ stack: true }),
	winston.format.json({
		space: 2,
	}),

	// winston.format.colorize({ all: false }),
	// winston.format.printf(
	//   ({ level, message, label, timestamp, meta }) => {
	//     return `${timestamp} [${label}] ${level}:${message} --- ${meta? JSON.stringify(meta) : ''}`;
	//   }
	// ),

	winston.format.colorize({ all: true }),
	winston.format.printf(info => {
		if (info?.isApiLog) {
			return `[${info.message}] ${info.originalUrl} | ${info.statusCode} | ${info.timestamp} | ${info.ip} - ${info.statusMessage}`;
		}
		return `[${info.level}] - ${info.timestamp} | ${JSON.stringify(info)}`;
	}),
);

export const transportsConsole = new winston.transports.Console({
	format: logFormatConsole,
	level: transportsConsoleConfig.level,
	silent: transportsConsoleConfig.silent,
});

const logFormatFile = winston.format.combine(
	winston.format.label({ label: process.env.serviceName || "name_app" }),
	winston.format.errors({ stack: true }),
	winston.format.timestamp({
		format: transportsCommon.formatDate,
	}),

	winston.format.json({
		space: 0,
	}),
);

export const transportMaxSize = new winston.transports.File({
	level: transportsConsoleConfig.level,
	format: logFormatFile,
	filename: transportsMaxSizeConfig.filename,
	maxsize: transportsMaxSizeConfig.maxSize,
	silent: transportsMaxSizeConfig.silent,
});

const errorDailyRotateFile = {
	silent: transportDailyFileConfig.silent,
	filename: transportDailyFileConfig.filename,
	datePattern: transportDailyFileConfig.datePattern,
	zippedArchive: false,
	maxSize: transportDailyFileConfig.maxSize,
	maxFiles: transportDailyFileConfig.maxFiles,
	prepend: false,
	json: true,
};
export const transportDailyFile = new DailyRotateFile(errorDailyRotateFile);

export const transportHttp = new winston.transports.Http({
	format: logFormatFile,
	silent: transportHTTPConfig.silent,
	host: transportHTTPConfig.host,
	port: transportHTTPConfig.port,
	path: transportHTTPConfig.path,
});

export const MyCustomTransport = new WinstonCustomTransport({
	silent: true,
	level: transportsConsoleConfig.level,
	format: logFormatFile,
});
