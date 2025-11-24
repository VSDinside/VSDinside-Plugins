/**
 * 防抖函数
 */
export function debounce<T>(fn: (arg: T) => void, interval: number = 100) {
	let timer: number | null = null;
	return (arg: T) => {
		if (timer !== null) {
			window.clearTimeout(timer);
			timer = null;
		}
		timer = window.setTimeout(() => fn(arg), interval);
	};
}

/**
 * 浅化一个颜色值
 *
 * @param color 十六进制颜色值
 */
export function lightColor(color: string, factor: number = 0.3): string {
	const matched = color.toLowerCase().match(/^#([0-9a-z]{2})([0-9a-z]{2})([0-9a-z]{2})$/);
	if (matched == null) {
		throw new Error("color must be hex");
	}
	let r = parseInt("0x" + matched[1], 16);
	let g = parseInt("0x" + matched[2], 16);
	let b = parseInt("0x" + matched[3], 16);

	r = r + Math.round((255 - r) * factor);
	g = g + Math.round((255 - g) * factor);
	b = b + Math.round((255 - b) * factor);

	return `#${r.toString(16)}${g.toString(16)}${b.toString(16)}`;
}
