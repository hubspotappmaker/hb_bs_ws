import { Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export class CustomLogger extends Logger {
    private logFilePath: string;

    constructor(context: string) {
        super(context);
        this.logFilePath = path.join(__dirname, 'application.log');
    }

    private writeLogToFile(message: string) {
        const logMessage = `${new Date().toISOString()} ${message}\n`;
        fs.appendFileSync(this.logFilePath, logMessage);
    }

    log(message: string) {
        super.log(message);
        this.writeLogToFile(`LOG: ${message}`);
    }

    error(message: string, trace?: string) {
        super.error(message, trace);
        this.writeLogToFile(`ERROR: ${message} - TRACE: ${trace}`);
    }

    warn(message: string) {
        super.warn(message);
        this.writeLogToFile(`WARN: ${message}`);
    }

    debug(message: string) {
        super.debug?.(message);
        this.writeLogToFile(`DEBUG: ${message}`);
    }

    verbose(message: string) {
        super.verbose?.(message);
        this.writeLogToFile(`VERBOSE: ${message}`);
    }
}
