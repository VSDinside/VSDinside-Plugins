import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

class SDPlugin {
	private isInited = false;
	private actions: Action[] = [];
	private wsClient: WebSocket | null = null;

	async init() {
		if (this.isInited) return;
		this.isInited = true;

		const args: SDArgs = await invoke("get_args");
		this.wsClient = new WebSocket(`ws://localhost:${args.wsServerPort}`);
		// init ws client.
		this.wsClient.onopen = () => {
			this.wsClient?.send(JSON.stringify({ event: args.registerEvent, uuid: args.pluginUUID }));
		};
		this.wsClient.onerror = reason => {
			console.error(`error while connecting with web socket: ${reason}`);
		};

		// distribute event to actions or plugin self.
		this.wsClient.onmessage = msg => {
			const data: WSEventData = JSON.parse(msg.data);
			if (data.event === "sendToPlugin") data.event = "didReceiveFromPI";
			if (data.context) {
				const targetAction = this.actions.find(item => item.context === data.context);
				targetAction?.[data.event]?.(data);
			}
			this[data.event]?.(data);
		};

		listen<NoteCfg[]>("update_PI_note_cfgs", evt => {
			this["sendToPropertyInspector"]?.(evt.payload);
		});
	}

	/**
	 * action 实例被放在 sd 上时触发的事件
	 */
	willAppear(data: WSEventData) {
		const type = data.action?.split(".").pop();
		const newAction = new Action(type as "add-note" | "toggle-visible", data.context!);
		this.actions.push(newAction);
	}

	/**
	 * action 实例被从 sd 上取消时触发的事件
	 */
	willDisappear(data: WSEventData) {
		this.actions = this.actions.filter(item => item.context !== data.context);
	}

	/**
	 * toggle-visible action pi 出现时的事件
	 */
	async propertyInspectorDidAppear(data: WSEventData) {
		const targetAction = this.actions.find(item => item.context === data.context);
		if (!targetAction || targetAction.type !== "toggle-visible") return;

		const noteCfgs: NoteCfg[] = await invoke("get_note_cfgs");
		this.wsClient?.send(
			JSON.stringify({
				action: targetAction.type,
				event: "sendToPropertyInspector",
				context: targetAction.context,
				payload: noteCfgs,
			})
		);
	}

	/**
	 * 接收到 pi 发送过来的需要设置的配置
	 */
	async didReceiveFromPI(data: WSEventData) {
		interface Payload {
			targetCfg: "title" | "visible";
			label: string;
			title?: string;
			visible?: boolean;
		}
		const { targetCfg, label, title, visible } = data.payload as Payload;
		switch (targetCfg) {
			case "title": {
				await invoke("set_note_title", { label, title });
				break;
			}
			case "visible": {
				await invoke("set_note_visible", { label, visible });
			}
		}
	}

	/**
	 * 将 noteCfgs 同步到所有的 toggle-visible pi
	 */
	async sendToPropertyInspector(noteCfgs: NoteCfg[]) {
		this.actions.forEach(item => {
			if (item.type !== "toggle-visible") return;
			this.wsClient?.send(
				JSON.stringify({
					action: item.type,
					event: "sendToPropertyInspector",
					context: item.context,
					payload: noteCfgs,
				})
			);
		});
	}

	[propKey: string]: any;
}

class Action {
	type: "add-note" | "toggle-visible";
	context: string;

	constructor(type: "add-note" | "toggle-visible", context: string) {
		this.type = type;
		this.context = context;
	}

	async keyDown(_: WSEventData) {
		switch (this.type) {
			case "add-note": {
				await invoke("create_note");
				break;
			}
			case "toggle-visible": {
				await invoke("toggle_all_visible");
			}
		}
	}

	[propKey: string]: any;
}

/**
 * 插件单例
 */
const SD_PLUGIN = new SDPlugin();

export { SD_PLUGIN };
