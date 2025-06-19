import * as moment from "moment-timezone";
import { VIETNAM_TIME_ZONE } from "../../constants/time-zone";

export const transportsCommon = {
	formatDate: moment().tz(VIETNAM_TIME_ZONE).format("DD-MM-YYYY hh:mm:ss"),
};

export const transportsConsoleConfig = {
	silent: false,
	level: "info",
};

export const transportsMaxSizeConfig = {
	silent: false,
	level: "false",
	filename: "logs/logs_size/logs.log",
	maxSize: 5242880,
};

export const transportDailyFileConfig = {
	silent: false,
	filename: `logs/logs_daily/logs-%DATE%.log`,
	datePattern: "YYYY-MM-DD-HH",
	zippedArchive: false,
	maxSize: "10m",
	maxFiles: "14d",
};

export const transportHTTPConfig = {
	silent: true,
	host: "localhost",
	port: 54237,
	path: `/logger`,
};
