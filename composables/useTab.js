import { ref } from 'vue'

// 当前激活的 Tab 标识：'home' | 'favorite' | 'community' | 'profile'
export const currentTab = ref('home')

/**
 * 切换全局 Tab 项
 * @param {string} tabKey - 目标 Tab 的唯一标识
 */
export const switchTab = (tabKey) => {
	currentTab.value = tabKey
}

/**
 * Tab 控制器 Hook
 */
export const useTab = () => {
	return {
		currentTab,
		switchTab
	}
}
