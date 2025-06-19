import * as Transport from "winston-transport";

export class WinstonCustomTransport extends Transport {
	constructor(opts) {
		super(opts);
	}

	log(info, callback) {
		setImmediate(() => {
			this.emit("logged", info);
		});
		callback();
	}
}
