import { invoke } from "@tauri-apps/api/core";
import { debounce, lightColor } from "../common/utils";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

window.addEventListener("contextmenu", evt => evt.preventDefault());

(async function () {
	const noteCfg: NoteCfg = await invoke("get_note_cfg");
	const curr_window = getCurrentWebviewWindow();

	const closeBtnDom: HTMLImageElement | null = document.querySelector(".close-btn");
	const textareaDom: HTMLTextAreaElement | null = document.querySelector("textarea");

	const bgColorWrapperDom: HTMLDivElement | null = document.querySelector(".bg-color-wrapper");
	const selectColorBtnDom: HTMLImageElement | null = document.querySelector(".bg-color-btn");
	const bgColorPickerDom: HTMLDivElement | null = document.querySelector(".bg-color-picker");
	const presetColorsDom: HTMLUListElement | null = document.querySelector(".preset-colors");
	const customColorInputDom: HTMLInputElement | null = document.querySelector(".custom-color > input");
	const echoCustomColorDom: HTMLSpanElement | null = document.querySelector(".custom-color > .echo-color");
	const contentDom: HTMLElement | null = document.querySelector(".content");

	const noteTitleDom: HTMLSpanElement | null = document.querySelector(".note-title");

	// 关闭 note 按钮
	closeBtnDom!.addEventListener("click", async () => {
		await invoke("close_note");
	});

	// 文本域相关
	textareaDom!.value = noteCfg.content;
	textareaDom!.focus();
	textareaDom!.addEventListener(
		"input",
		debounce(async () => {
			await invoke("set_note_content", { content: textareaDom?.value });
		})
	);

	// 颜色相关

	/**
	 * 设置颜色值，然后持久化
	 */
	async function setColor(color: string, isInit: boolean = false) {
		const lColor = lightColor(color);

		document.body.style.backgroundColor = color;
		contentDom!.style.backgroundColor = lColor;
		customColorInputDom!.value = color;
		echoCustomColorDom!.textContent = color;

		if (isInit) return;
		await invoke("set_note_color", { color });
	}

	await setColor(noteCfg.color, true);

	window.addEventListener("click", () => bgColorPickerDom!.classList.add("invisible"));
	bgColorWrapperDom!.addEventListener("click", evt => evt.stopPropagation());
	selectColorBtnDom!.addEventListener("click", () => bgColorPickerDom!.classList.toggle("invisible"));

	presetColorsDom!.addEventListener("click", async evt => {
		const evtTarget = evt.target;
		if (!(evtTarget instanceof HTMLLIElement)) return;

		const rgb = evtTarget.style.backgroundColor;
		const matched = rgb.match(/^rgb\(([0-9]{1,3}), ([0-9]{1,3}), ([0-9]{1,3})\)$/)!;
		const r = parseInt(matched[1]);
		const g = parseInt(matched[2]);
		const b = parseInt(matched[3]);
		const hexColor = `#${r.toString(16)}${g.toString(16)}${b.toString(16)}`;

		await setColor(hexColor);
	});

	customColorInputDom!.addEventListener(
		"input",
		debounce(async () => {
			await setColor(customColorInputDom!.value);
		})
	);

	// 标题相关
	noteTitleDom!.textContent = noteCfg.title;
	curr_window.listen<string>("update_note_title", evt => {
		console.log(evt.payload);
		noteTitleDom!.textContent = evt.payload;
	});

	// 窗口位置相关
	curr_window.listen<{ x: number; y: number }>(
		"tauri://move",
		debounce(async evt => {
			await invoke("set_note_position", evt.payload);
		})
	);

	// 尺寸相关
	curr_window.listen<{ width: number; height: number }>(
		"tauri://resize",
		debounce(async evt => {
			await invoke("set_note_size", evt.payload);
		})
	);
})();
