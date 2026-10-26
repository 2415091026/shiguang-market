import { ref } from 'vue'

// 当前激活的 Tab 标识：'home' | 'favorite' | 'community' | 'profile'
export const currentTab = ref('home')

// 全局商户探店深度详情抽屉状态（全局单一实例，解决App端与子视图层级遮挡）
export const activeShopDetail = ref(null)

/**
 * 切换全局 Tab 项
 * @param {string} tabKey - 目标 Tab 的唯一标识
 */
export const switchTab = (tabKey) => {
	currentTab.value = tabKey
}

/**
 * 打开全局商户深度详情抽屉
 * @param {Object} shop - 商户对象
 */
export const openShopDetail = (shop) => {
	if (!shop) return
	activeShopDetail.value = { ...shop }
}

/**
 * 关闭全局商户详情抽屉
 */
export const closeShopDetail = () => {
	activeShopDetail.value = null
}

/**
 * Tab 控制器 Hook
 */
export const useTab = () => {
	return {
		currentTab,
		switchTab,
		activeShopDetail,
		openShopDetail,
		closeShopDetail
	}
}

