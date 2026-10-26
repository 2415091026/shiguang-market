import { ref } from 'vue'

// 状态栏高度（默认 44px 适配主流全面屏，避免 20px 导致灵动岛机型内容顶出）
const statusBarHeight = ref(44)

// 胶囊导航栏核心行高度（标准 44px）
const navBarHeight = ref(44)

// 胶囊避让右边距（包含胶囊宽度与边距）
const capsulePaddingRight = ref(0)

// 胶囊尺寸与绝对坐标
const capsuleInfo = ref({
	top: 0,
	bottom: 0,
	left: 0,
	right: 0,
	width: 87,
	height: 32
})

// 是否小程序环境
const isMiniProgram = ref(false)

/**
 * 核心：高鲁棒性安全区与胶囊尺寸计算（带灵动岛自愈矫正）
 */
export const updateSafeArea = () => {
	try {
		// 1. 获取系统信息
		const systemInfo = uni.getSystemInfoSync()
		if (systemInfo && systemInfo.statusBarHeight) {
			statusBarHeight.value = systemInfo.statusBarHeight
		}

		// 2. 检测微信小程序胶囊（通过运行时原生方法检测，避免条件编译语法不兼容）
		let menuButton = null
		if (typeof uni.getMenuButtonBoundingClientRect === 'function') {
			menuButton = uni.getMenuButtonBoundingClientRect()
		}

		// 如果成功获取到小程序胶囊且存在有效物理尺寸
		if (menuButton && menuButton.top > 0 && menuButton.left > 0 && menuButton.width > 0) {
			isMiniProgram.value = true
			capsuleInfo.value = { ...menuButton }

			// 【核心自愈算法】：针对 iPhone 14 Pro / 15 / 16 等灵动岛设备与特殊宿主
			// 若 statusBarHeight 异常偏小（比如返回了 20，但胶囊 top 却在 50~60px 以上）
			// 胶囊与状态栏底部的正常间隙一般为 4px~8px，在此进行数学反推修正
			if (statusBarHeight.value < menuButton.top - 12) {
				statusBarHeight.value = Math.max(menuButton.top - 6, 44)
			}

			// 导航行内容高度：(胶囊顶部 - 状态栏高度) * 2 + 胶囊自身高度
			const verticalGap = Math.max(menuButton.top - statusBarHeight.value, 4)
			const calculatedNavHeight = verticalGap * 2 + menuButton.height
			navBarHeight.value = Math.max(calculatedNavHeight, 44)

			// 右侧避让宽度：屏幕总宽 - 胶囊左边缘 + 额外呼吸边距(8px)
			const screenWidth = systemInfo.screenWidth || 375
			const rightMargin = screenWidth - menuButton.left
			capsulePaddingRight.value = Math.max(rightMargin + 8, 96)
		} else {
			// #ifdef MP
			// 小程序环境下如果偶发未就绪，采用微信官方标准胶囊尺寸进行防御性兜底
			isMiniProgram.value = true
			capsulePaddingRight.value = 100
			navBarHeight.value = 44
			// 若当前为 iOS 全面屏/灵动岛机型，兜底状态栏高度 47px~54px
			if (statusBarHeight.value < 44) {
				statusBarHeight.value = 47
			}
			// #endif

			// #ifndef MP
			// 非小程序端（App、H5），无需避让胶囊
			isMiniProgram.value = false
			capsulePaddingRight.value = 0
			navBarHeight.value = 44
			// #endif
		}
	} catch (err) {
		console.warn('获取安全区与胶囊异常，已执行自愈兜底:', err)
	}
}

// 模块加载即刻计算一次
updateSafeArea()

/**
 * 外部 Composable Hook
 */
export const useSafeArea = () => {
	return {
		statusBarHeight,
		navBarHeight,
		capsulePaddingRight,
		capsuleInfo,
		isMiniProgram,
		updateSafeArea
	}
}
