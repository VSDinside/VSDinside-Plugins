interface SDArgs {
	wsServerPort: string;
	pluginUUID: string;
	registerEvent: string;
	info: AppInfo;
}

interface AppInfo {
	application: {
		font: string;
		language: string;
		platform: string;
		platformVersion: string;
		version: string;
	};
	colors: {};
	devicePixelRatio: number;
	devices: {
		id: string;
		name: string;
		size: {
			columns: number;
			rows: number;
		};
		type: number;
	}[];
	plugin: {
		uuid: string;
		version: string;
	};
}

interface WSEventData {
	event: string;
	action?: string;
	context?: string;
	device?: string;
	payload?: {
		settings?: any;
		coordinates?: {
			column: number;
			row: number;
		};
		controller?: string;
		state?: number;
		isInMultiAction?: boolean;
	};
}

interface NoteCfg {
	winLabel: string;
	title: string;
	content: string;
	color: string;
	x: number;
	y: number;
	width: number;
	height: number;
	is_visible: boolean;
}
type NoteCfgOpts = Partial<Omit<NoteCfg, "winLabel">> & Pick<NoteCfg, "winLabel">;
