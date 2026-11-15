import * as obsidian from 'obsidian';

const en = {
	invertColorsName: 'Invert dark colors in dark mode',
	invertColorsDescription: 'Invert dark colors in diagrams (e.g. axes, arrows) when in dark mode, so that they are visible.',
	clearCacheName: 'Clear cached SVGs',
	clearCacheDescription: 'SVGs rendered with TikZJax are stored in a database, so diagrams don\'t have to be re-rendered from scratch every time you open a page. Use this to clear the cache and force all diagrams to be re-rendered.',
	cacheCleared: 'TikZJax: Successfully cleared cached SVGs.',
};

const zh: typeof en = {
	invertColorsName: '在深色模式下反转深色元素',
	invertColorsDescription: '在深色模式下反转图表中深色元素（如坐标轴、箭头）的颜色，使其清晰可见。',
	clearCacheName: '清除 SVG 缓存',
	clearCacheDescription: 'TikZJax 渲染的 SVG 会存储在数据库中，无需每次打开页面都从头渲染图表。清除缓存可强制重新渲染所有图表。',
	cacheCleared: 'TikZJax：已成功清除 SVG 缓存。',
};

export function getUiStrings(): typeof en {
	try {
		// getLanguage was introduced in Obsidian 1.8.7; older versions store
		// the app language in localStorage. Only read the host's preference.
		const { getLanguage } = obsidian as typeof obsidian & { getLanguage?: () => string };
		const language = typeof getLanguage === 'function'
			? getLanguage()
			: window.localStorage.getItem('language');
		return language?.trim().toLowerCase().split(/[-_]/)[0] === 'zh' ? zh : en;
	} catch {
		return en;
	}
}
