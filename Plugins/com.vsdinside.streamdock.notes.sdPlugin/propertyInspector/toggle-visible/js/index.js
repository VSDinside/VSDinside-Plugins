/**
 * @typedef {Object} NoteCfg
 * @property {string} winLabel
 * @property {string} title
 * @property {string} content
 * @property {string} color
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 * @property {boolean} is_visible
 */

/**
 * 入口函数
 *
 * @param {number} inPort
 * @param {string} inPropertyInspectorUUID
 * @param {string} inRegisterEvent
 * @param {string} inInfo
 * @param {string} inActionInfo
 */
function connectElgatoStreamDeckSocket(inPort, inPropertyInspectorUUID, inRegisterEvent, inInfo, inActionInfo) {
	// 实现国际化
	i18n(JSON.parse(inInfo).application.language).then(t => {
		const $PI = {
			wsServerPort: inPort,
			piUUID: inPropertyInspectorUUID,
			registerEvent: inRegisterEvent,
			appInfo: JSON.parse(inInfo),
			actionInfo: JSON.parse(inActionInfo),

			wsClient: null,
			noteCfgs: [],

			connectToPlugin() {
				this.wsClient = new WebSocket("ws://localhost:" + inPort);
				this.wsClient.onopen = () => this.wsClient.send(JSON.stringify({ event: this.registerEvent, uuid: this.piUUID }));
				this.wsClient.onerror = err => console.log(err);
				this.wsClient.onmessage = event => {
					const data = JSON.parse(event.data);
					if (data.event === "sendToPropertyInspector") data.event = "didReceiveFromPlugin";
					this[data.event]?.(data);
				};
			},

			/**
			 * @param {NoteCfg[]} noteCfgs
			 */
			didReceiveFromPlugin(data) {
				this.noteCfgs = data.payload;
				this.renderNotesList();
			},

			/**
			 * @param {string} label
			 * @param {boolean} visible
			 */
			setNoteVisible(label, visible) {
				this.wsClient.send(
					JSON.stringify({
						action: this.actionInfo.action,
						event: "sendToPlugin",
						context: this.piUUID,
						payload: { targetCfg: "visible", label, visible },
					})
				);
			},

			/**
			 * @param {string} label
			 * @param {string} title
			 */
			setNoteTitle(label, title) {
				this.wsClient.send(
					JSON.stringify({
						action: this.actionInfo.action,
						event: "sendToPlugin",
						context: this.piUUID,
						payload: { targetCfg: "title", label, title },
					})
				);
			},

			/**
			 * @param {NoteCfg[]} noteCfgs
			 */
			renderNotesList() {
				/** @type {HTMLUListElement} */
				const notesTitleListUL = document.querySelector(".notes-list");
				/** @type {HTMLTemplateElement} */
				const listItemTemplate = document.querySelector("#notes-list-item-template");

				notesTitleListUL.innerHTML = "";
				if (this.noteCfgs.length === 0) {
					const emptyTipP = document.createElement("li");
					emptyTipP.classList.add("empty-tip");
					emptyTipP.textContent = t("No notes");
					notesTitleListUL.append(emptyTipP);
				}
				this.noteCfgs.forEach(noteCfg => {
					/** @type {DocumentFragment} */
					const documentFragment = listItemTemplate.content.cloneNode(true);

					const listItemLi = documentFragment.querySelector(".item");
					listItemLi.classList[noteCfg.is_visible ? "remove" : "add"]("invisible");

					const noteTitleSpan = documentFragment.querySelector(".note-title");
					noteTitleSpan.textContent = noteCfg.title;

					/** @type {HTMLInputElement} */
					const noteTitleInput = documentFragment.querySelector(".note-title-input");
					noteTitleInput.placeholder = t("enter custom title ..."); // i18n

					const visibilityTipSpan = documentFragment.querySelector(".visibility-tip");
					visibilityTipSpan.textContent = noteCfg.is_visible ? t("visible") : t("hide"); // i18n

					const visibilityIconImg = documentFragment.querySelector(".visibility-icon");
					visibilityIconImg.src = `../../static/${noteCfg.is_visible ? "" : "in"}visible.png`;

					// 点击标题打开自定义标题输入框事件
					noteTitleSpan.addEventListener("click", () => {
						noteTitleSpan.style.display = "none";
						noteTitleInput.style.display = "block";
						noteTitleInput.focus();
					});

					// 打入回车后或者失焦后设置自定义标题事件
					noteTitleInput.addEventListener("keydown", event => {
						if (event.key !== "Enter") return;
						if (noteTitleInput.value.length === 0) {
							noteTitleInput.style.display = "none";
							noteTitleSpan.style.display = "block";
							return;
						}
						this.setNoteTitle(noteCfg.label, noteTitleInput.value);
					});
					noteTitleInput.addEventListener("blur", () => {
						if (noteTitleInput.value.length === 0) {
							noteTitleInput.style.display = "none";
							noteTitleSpan.style.display = "block";
							return;
						}
						this.setNoteTitle(noteCfg.label, noteTitleInput.value);
					});

					// 点击显示隐藏图标事件
					visibilityIconImg.addEventListener("click", () => {
						this.setNoteVisible(noteCfg.label, !noteCfg.is_visible);
					});

					notesTitleListUL.append(documentFragment);
				});
			},
		};

		$PI.connectToPlugin();
		window.$PI = $PI;
	});
}
