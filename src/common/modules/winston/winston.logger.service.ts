import * as winston from "winston";
import { LoggerService } from "@nestjs/common";
import { Injectable } from "@nestjs/common";
import {
	MyCustomTransport,
	transportDailyFile,
	transportHttp,
	transportMaxSize,
	transportsConsole,
} from "./winston.logger.transport";
import { transportsCommon } from "./winston.logger.config";

const logFormatDefault = winston.format.combine(
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
);

@Injectable()
export class WinstonCustomLogger implements LoggerService {
	private winston;
	private contextName;

	constructor() {
		this.winston = winston.createLogger({
			format: logFormatDefault,
			defaultMeta: { service: this.contextName },
			transports: [transportsConsole, transportMaxSize, transportDailyFile, transportHttp, MyCustomTransport],
		});
	}

	setContextName(contextName) {
		this.contextName = contextName;
	}

	apiLog(input) {
		this.winston.log({
			isApiLog: true,
			level: "info",
			statusCode: input.statusCode,
			message: input.method,
			originalUrl: input.originalUrl,
			statusMessage: input.statusMessage,
			ip: input.ip,
			params: input.params,
			query: input.query,
			body: input.body,
			response: input.response,
		});
	}

	error(message: any, key?: string) {
		this.winston.log({
			level: "error",
			message,
			contextName: this.contextName,
			key,
		});
	}

	warn(message: any, key?: string) {
		this.winston.log({
			level: "warn",
			message,
			contextName: this.contextName,
			key,
		});
	}

	log(message: any, key?: string) {
		this.winston.log({
			level: "info",
			message,
			contextName: this.contextName,
			key,
		});
	}

	info(message: any, key?: string) {
		this.winston.log({
			level: "info",
			message,
			contextName: this.contextName,
			key,
		});
	}

	http(message: any, key?: string) {
		this.winston.log({
			level: "http",
			message,
			contextName: this.contextName,
			key,
		});
	}

	verbose(message: any, key?: string) {
		this.winston.log({
			level: "verbose",
			message,
			contextName: this.contextName,
			key,
		});
	}

	debug(message: any, key?: string) {
		this.winston.log({
			level: "debug",
			message,
			contextName: this.contextName,
			key,
		});
	}

	silly(message: any, key?: string) {
		this.winston.log({
			level: "silly",
			message,
			contextName: this.contextName,
			key,
		});
	}
}
