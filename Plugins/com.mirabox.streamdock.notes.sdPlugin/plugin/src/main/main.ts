import { invoke } from "@tauri-apps/api/core";
import { SD_PLUGIN } from "./sd-plugin";

(async function () {
	// restore pre notes
	await invoke("restore_notes");

	// initilizal sd plugin
	await SD_PLUGIN.init();
})();
