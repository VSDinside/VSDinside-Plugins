//
//
/*********************************************************************/
/* 在 tauri 构建之后，将所需文件提取出来，复制到 Stream Dock 插件目录 /
/*********************************************************************/

const os = require("node:os");
const path = require("node:path");
const fs = require("node:fs");

console.log("autofile script: extract and copy related files to sdplugin directory ...");

const srcRootDir = path.resolve(__dirname, "../");
const dstRootDir = path.resolve(os.homedir(), "./AppData/Roaming/HotSpot/StreamDock/plugins/com.mirabox.streamdock.notes.sdPlugin");

if (fs.existsSync(dstRootDir)) {
	fs.rmSync(dstRootDir, { recursive: true, force: true });
}
fs.mkdirSync(dstRootDir);

/****************************** 抽取并复制文件 ****************************/

// 根目录下抽取部分文件
// plugin目录下只抽取plugin.exe文件，propertyInspector和static目录下全部抽取

fs.readdirSync(srcRootDir).forEach(item => {
	let srcPath = path.join(srcRootDir, `./${item}`);
	let dstPath = path.join(dstRootDir, `./${item}`);

	if (/^(de|en|es|fr|it|ja|ko|pl|pt|ru|zh_CN|manifest).json$/.test(item)) {
		fs.cpSync(srcPath, dstPath);
	}

	if (/^propertyInspector|static$/.test(item)) {
		fs.cpSync(srcPath, dstPath, { recursive: true });
	}

	if (/^plugin$/.test(item)) {
		srcPath = path.join(srcRootDir, `./${item}/src-tauri/target/release/plugin.exe`);
		dstPath = path.join(dstRootDir, `./${item}/plugin.exe`);

		fs.cpSync(srcPath, dstPath);
	}
});

console.log("autofile script: extract end.");
