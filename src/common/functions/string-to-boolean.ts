export function stringToBoolean(boolean: string) {
	const a = {
		true: true,
		false: false,
	};
	return a[boolean];
}
