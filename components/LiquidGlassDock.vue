<template>
	<view
		class="liquid-dock"
		:class="[
			`theme-${effectiveTheme}`,
			`state-${interactionState}`,
			{
				'has-safe-area': safeArea,
				'is-disabled': disabled,
				'is-lens-visible': isLensVisible
			}
		]"
		:style="containerStyle"
	>
		<!-- H5 专属静态 SVG 光学折射滤镜（仅挂载一次，作用于透镜内部前景内容层，产生边缘弯曲拉伸折射） -->
		<!-- #ifdef H5 -->
		<svg
			class="liquid-dock__svg-defs"
			width="0"
			height="0"
			viewBox="0 0 124 78"
			aria-hidden="true"
			focusable="false"
		>
			<defs>
				<filter
					:id="svgFilterId"
					x="-10%"
					y="-10%"
					width="120%"
					height="120%"
					filterUnits="objectBoundingBox"
					primitiveUnits="userSpaceOnUse"
					color-interpolation-filters="sRGB"
				>
					<feImage
						:href="displacementMapDataUri"
						:xlink:href="displacementMapDataUri"
						x="0"
						y="0"
						width="124"
						height="78"
						preserveAspectRatio="none"
						result="lensDispMap"
					/>
					<feDisplacementMap
						in="SourceGraphic"
						in2="lensDispMap"
						:scale="LENS_CONFIG.refractionScale"
						xChannelSelector="R"
						yChannelSelector="G"
						result="refractedMain"
					/>
				</filter>
			</defs>
		</svg>
		<!-- #endif -->

		<!-- 悬浮液态玻璃主胶囊容器 -->
		<view
			id="liquidDockSurface"
			ref="surfaceRef"
			class="liquid-dock__surface"
			:style="surfaceStyle"
			@mouseenter="handleSurfaceMouseEnter"
			@mousemove="handleSurfaceMouseMove"
			@mouseleave="handleSurfaceMouseLeave"
			@touchstart="handleTouchStart"
			@touchmove="handleTouchMove"
			@touchend="handleTouchEnd"
			@touchcancel="handleTouchCancel"
		>
			<!-- 1. 极细微玻璃内折射边（还原图2干净纯粹的苹果原生液态玻璃边缘） -->
			<view class="liquid-dock__glass-bevel" pointer-events="none"></view>

			<!-- 2. 共享连续移动的 Active 高亮层 (.liquid-dock__active-indicator)
			     外层负责平滑 translate3d 连续位移，内层负责三阶段液态拉伸与回缩形变，互不覆盖 transform -->
			<view
				v-if="items && items.length > 0"
				class="liquid-dock__active-indicator"
				:class="{
					'is-ready': isIndicatorReady,
					'is-under-lens': isLensActive
				}"
				:style="activeIndicatorTrackStyle"
				pointer-events="none"
			>
				<view
					class="liquid-dock__active-indicator-body"
					:class="`phase-${indicatorPhase}`"
					:style="activeIndicatorBodyStyle"
				>
					<view class="liquid-dock__active-indicator-highlight"></view>
				</view>
			</view>

			<!-- 3. 底层原始导航项目列表（负责正常展示与点击交互；Icon 缩放与颜色过渡通过独立包装层协调） -->
			<view class="liquid-dock__items-layer">
				<view
					v-for="(item, index) in items"
					:key="item.key || index"
					class="liquid-dock__item"
					:class="{
						'is-active': activeItemKey === item.key,
						'is-lens-covered': isLensActive && hoveredIndex === index,
						'is-disabled': item.disabled
					}"
					:style="getBaseItemStyle(index)"
					@mouseenter="handleItemMouseEnter(index, $event)"
					@click="handleItemClick(item, index)"
				>
					<!-- 独立负责图标轻微缩放 (1.06x) 的内部包装层，不产生上下跳动，也不与透镜 transform 冲突 -->
					<view class="liquid-dock__icon-scale">
						<view class="liquid-dock__icon-wrapper">
							<image
								class="liquid-dock__icon liquid-dock__icon--default"
								:class="{ 'is-hidden': activeItemKey === item.key }"
								:src="getDefaultIconSrc(item)"
								mode="aspectFit"
							/>
							<image
								class="liquid-dock__icon liquid-dock__icon--active"
								:class="{ 'is-visible': activeItemKey === item.key }"
								:src="getActiveIconSrc(item)"
								mode="aspectFit"
							/>

							<!-- 徽标 Badge -->
							<view
								v-if="hasBadge(item.badge)"
								class="liquid-dock__badge"
								:class="{ 'is-dot': isDotBadge(item.badge) }"
							>
								<text v-if="!isDotBadge(item.badge)" class="liquid-dock__badge-text">
									{{ formatBadge(item.badge) }}
								</text>
							</view>
						</view>
					</view>

					<text v-if="showLabel && item.label" class="liquid-dock__label">
						{{ item.label }}
					</text>
				</view>
			</view>

			<!-- 4. 局部液态放大凸透镜覆盖层 (.liquid-dock__lens) -->
			<view
				v-if="items && items.length > 0"
				class="liquid-dock__lens"
				:class="[
					`is-${interactionState}`,
					`mode-${activeInputMode}`,
					{ 'is-visible': isLensVisible }
				]"
				:style="lensOuterStyle"
				aria-hidden="true"
				pointer-events="none"
			>
				<!-- 4.1 凸透镜玻璃材质基底（中央清澈透明，边缘具有凸透镜曲率折光、内阴影与受光高光） -->
				<view class="liquid-dock__lens-backdrop"></view>

				<!-- 4.2 透镜内部局部放大与边缘折射变形视口（仅放大视觉副本，与底层坐标 1:1 实时同步锁定） -->
				<view class="liquid-dock__lens-viewport" aria-hidden="true">
					<view
						class="liquid-dock__lens-refraction-stage"
						:style="lensRefractionStageStyle"
					>
						<view class="liquid-dock__lens-scene" :style="lensSceneStyle">
							<view
								v-for="(item, index) in items"
								:key="`lens-${item.key || index}`"
								class="liquid-dock__item liquid-dock__item--clone"
								:class="{
									'is-active': lensVisualActiveKey === item.key,
									'is-disabled': item.disabled
								}"
								:style="getCloneItemDistortionStyle(index)"
							>
								<view class="liquid-dock__icon-wrapper">
									<image
										class="liquid-dock__icon liquid-dock__icon--default"
										:class="{ 'is-hidden': lensVisualActiveKey === item.key }"
										:src="getDefaultIconSrc(item)"
										mode="aspectFit"
									/>
									<image
										class="liquid-dock__icon liquid-dock__icon--active"
										:class="{ 'is-visible': lensVisualActiveKey === item.key }"
										:src="getActiveIconSrc(item)"
										mode="aspectFit"
									/>

									<view
										v-if="hasBadge(item.badge)"
										class="liquid-dock__badge"
										:class="{ 'is-dot': isDotBadge(item.badge) }"
									>
										<text v-if="!isDotBadge(item.badge)" class="liquid-dock__badge-text">
											{{ formatBadge(item.badge) }}
										</text>
									</view>
								</view>

								<text v-if="showLabel && item.label" class="liquid-dock__label">
									{{ item.label }}
								</text>
							</view>
						</view>
					</view>
				</view>

				<!-- 4.3 凸透镜多层光学表面：边缘轻微色散、明暗相间菲涅尔反射环、顶部与侧边高光 -->
				<view class="liquid-dock__lens-chromatic-ring"></view>
				<view class="liquid-dock__lens-rim-light"></view>
				<view class="liquid-dock__lens-specular-top"></view>
				<view class="liquid-dock__lens-specular-bottom"></view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, getCurrentInstance } from 'vue'

/**
 * 集中管理的液态凸透镜与 Active 高亮层动画参数配置
 * 同时映射为根节点 CSS 自定义属性，便于样式层统一调节
 */
const LENS_CONFIG = {
	// 透镜宽度与高度（单位 px，圆润椭圆形凸透镜轮廓）
	lensWidth: 124,
	lensHeight: 78,
	// 透镜内部放大倍率（1.3 ~ 1.6 推荐范围内）
	magnification: 1.42,
	// 透镜边缘弯曲拉伸畸变强度
	edgeDistortionStrength: 0.24,
	// H5 SVG feDisplacementMap 边缘折射强度
	refractionScale: 13,
	// 透镜中心背景透明度
	lensBgOpacity: 0.16,
	// 透镜顶部与边缘高光强度
	specularOpacity: 0.92,
	// 透镜显示动画时长（120 ~ 200ms 推荐区间）
	enterDuration: 150,
	// 透镜跨 Icon 移动动画时长（140 ~ 220ms 推荐区间）
	moveDuration: 170,
	// 透镜隐藏动画时长（160 ~ 240ms 推荐区间）
	leaveDuration: 190,
	// Active 高亮层连续移动时长（220 ~ 320ms 推荐区间）
	activeMoveDuration: 270,
	// Icon 颜色过渡时长（180 ~ 260ms 推荐区间）
	iconColorDuration: 210,
	// Icon 缩放变形时长（200 ~ 280ms 推荐区间）
	iconScaleDuration: 240
}

// 属性定义（完整保留现有导航 Props）
const props = defineProps({
	items: {
		type: Array,
		default: () => [
			{
				key: 'home',
				label: '首页',
				defaultIcon: '/static/tabbar/home.svg',
				activeIcon: '/static/tabbar/home-active.svg',
				badge: 0
			},
			{
				key: 'favorite',
				label: '收藏',
				defaultIcon: '/static/tabbar/favorite.svg',
				activeIcon: '/static/tabbar/favorite-active.svg',
				badge: 0
			},
			{
				key: 'community',
				label: '交流',
				defaultIcon: '/static/tabbar/community.svg',
				activeIcon: '/static/tabbar/community-active.svg',
				badge: 0
			},
			{
				key: 'profile',
				label: '我的',
				defaultIcon: '/static/tabbar/profile.svg',
				activeIcon: '/static/tabbar/profile-active.svg',
				badge: 0
			}
		]
	},
	modelValue: {
		type: String,
		default: 'home'
	},
	position: {
		type: String,
		default: 'bottom'
	},
	showLabel: {
		type: Boolean,
		default: true
	},
	theme: {
		type: String,
		default: 'light'
	},
	disabled: {
		type: Boolean,
		default: false
	},
	safeArea: {
		type: Boolean,
		default: true
	},
	zIndex: {
		type: [Number, String],
		default: 999
	},
	maxWidth: {
		type: String,
		default: '720rpx'
	}
})

// 事件派发
const emit = defineEmits(['update:modelValue', 'change', 'itemClick'])

const instance = getCurrentInstance()
const surfaceRef = ref(null)
const svgFilterId = 'liquid-lens-refraction-filter'

/**
 * 椭圆形凸透镜径向位移贴图 Data URI（中央 58% 区域保持 rgb(128,128,128) 零位移清晰，边缘平滑弯曲折射）
 */
const displacementMapDataUri = computed(() => {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="124" height="78" viewBox="0 0 124 78">
		<defs>
			<linearGradient id="rx" x1="0%" y1="50%" x2="100%" y2="50%">
				<stop offset="0%" stop-color="rgb(230,128,128)"/>
				<stop offset="24%" stop-color="rgb(140,128,128)"/>
				<stop offset="50%" stop-color="rgb(128,128,128)"/>
				<stop offset="76%" stop-color="rgb(116,128,128)"/>
				<stop offset="100%" stop-color="rgb(26,128,128)"/>
			</linearGradient>
			<radialGradient id="clearCenter" cx="50%" cy="50%" rx="50%" ry="50%">
				<stop offset="0%" stop-color="rgb(128,128,128)" stop-opacity="1"/>
				<stop offset="58%" stop-color="rgb(128,128,128)" stop-opacity="0.95"/>
				<stop offset="85%" stop-color="rgb(128,128,128)" stop-opacity="0.22"/>
				<stop offset="100%" stop-color="rgb(128,128,128)" stop-opacity="0"/>
			</radialGradient>
		</defs>
		<rect width="124" height="78" rx="39" ry="39" fill="url(#rx)"/>
		<ellipse cx="62" cy="39" rx="58" ry="36" fill="url(#clearCenter)"/>
	</svg>`
	return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
})

// H5 端为透镜内部前景内容层应用 SVG 折射滤镜
const lensRefractionStageStyle = computed(() => {
	// #ifdef H5
	return {
		filter: `url(#${svgFilterId})`
	}
	// #endif
	// #ifndef H5
	return {}
	// #endif
})

// 系统暗色模式检测
const systemIsDark = ref(false)
let darkMediaQuery = null
let darkMediaHandler = null

const effectiveTheme = computed(() => {
	if (props.theme === 'auto') {
		return systemIsDark.value ? 'dark' : 'light'
	}
	return props.theme || 'light'
})

/**
 * 透镜交互状态机：
 * 'idle'      - 常态玻璃 Dock（透镜隐藏）
 * 'entering'  - 鼠标进入或手指触摸 Icon，透镜显现
 * 'moving'    - 鼠标跨 Icon 悬停移动或手指滑动，透镜平滑跟随
 * 'leaving'   - 鼠标离开 Dock 或手指抬起，透镜平滑淡出消失
 */
const interactionState = ref('idle')
const activeInputMode = ref('mouse') // 'mouse' | 'touch'
const hoveredIndex = ref(-1)

const isLensActive = computed(() => {
	return interactionState.value === 'entering' || interactionState.value === 'moving'
})

const isLensVisible = computed(() => {
	return (
		interactionState.value === 'entering' ||
		interactionState.value === 'moving' ||
		interactionState.value === 'leaving'
	)
})

/**
 * 共享 Active 高亮层 (.liquid-dock__active-indicator) 三阶段运动状态机：
 * 'rest'       - 阶段 C：稳定停靠在当前选中 Icon 中心（标准圆角胶囊）
 * 'stretching' - 阶段 A & B：开始移动与平滑移动过程（沿运动方向产生轻量液态横向拉伸与微压缩）
 */
const isIndicatorReady = ref(false)
const indicatorPhase = ref('rest')
const indicatorStretchX = ref(1)
const indicatorStretchY = ref(1)
const indicatorOriginX = ref('50%')
let indicatorStretchTimerId = null

// 当前业务实际选中项索引（严格与 props.modelValue 路由状态同步）
const targetIndex = computed(() => {
	const list = props.items || []
	const idx = list.findIndex((it) => it.key === props.modelValue)
	return idx >= 0 ? idx : 0
})

/**
 * 当前激活项 Key：
 * - 点击切换或路由变化时，严格对应 props.modelValue；
 * - 触摸按住拖拽滑动时，实时对应当前命中的导航项，确保高亮层与选中状态同步跟随。
 */
const activeItemKey = computed(() => {
	const list = props.items || []
	if (list.length === 0) return ''
	if (
		activeInputMode.value === 'touch' &&
		isLensActive.value &&
		hoveredIndex.value >= 0 &&
		hoveredIndex.value < list.length
	) {
		const item = list[hoveredIndex.value]
		if (item && !item.disabled) {
			return item.key
		}
	}
	return props.modelValue
})

// 透镜内部视觉副本高亮 Key（悬停或触摸哪个 Icon，透镜内即呈现清晰的放大激活视觉）
const lensVisualActiveKey = computed(() => {
	const list = props.items || []
	if (list.length === 0) return ''
	if (isLensVisible.value && hoveredIndex.value >= 0 && hoveredIndex.value < list.length) {
		const item = list[hoveredIndex.value]
		if (item && !item.disabled) {
			return item.key
		}
	}
	return props.modelValue
})

// Active 高亮层当前目标索引（与 activeItemKey 严格一致）
const activeIndicatorIndex = computed(() => {
	const list = props.items || []
	const idx = list.findIndex((it) => it.key === activeItemKey.value)
	return idx >= 0 ? idx : targetIndex.value
})

/**
 * 监听选中索引变化（无论是点击 Icon、触摸滑动还是外部路由修改 modelValue），
 * 触发共享高亮层的三阶段液态拉伸与平滑减速恢复动画
 */
watch(
	activeIndicatorIndex,
	(newIdx, oldIdx) => {
		if (!isIndicatorReady.value) return
		if (typeof oldIdx !== 'number' || newIdx === oldIdx) return

		const stepCount = Math.abs(newIdx - oldIdx)
		const direction = newIdx > oldIdx ? 1 : -1

		// 根据跨度计算适度、克制的液态拉伸比例（1 格 ~1.13x，多格最高 ~1.22x，绝不夸张弹跳）
		const stretchX = Math.min(1 + 0.10 + stepCount * 0.032, 1.22)
		const stretchY = Math.max(1 - 0.03 - stepCount * 0.01, 0.94)

		indicatorOriginX.value = direction > 0 ? '42%' : '58%'
		indicatorStretchX.value = stretchX
		indicatorStretchY.value = stretchY
		indicatorPhase.value = 'stretching'

		if (indicatorStretchTimerId !== null) {
			clearTimeout(indicatorStretchTimerId)
		}
		// 在位移过半（约 115ms）后进入阶段 C 自然回缩恢复为标准圆角胶囊，与位移终点（270ms）同步完成
		indicatorStretchTimerId = setTimeout(() => {
			indicatorStretchX.value = 1
			indicatorStretchY.value = 1
			indicatorOriginX.value = '50%'
			indicatorPhase.value = 'rest'
			indicatorStretchTimerId = null
		}, Math.round(LENS_CONFIG.activeMoveDuration * 0.42))
	}
)

/**
 * 共享 Active 高亮层外层轨道样式（仅负责 translate3d 位移，适配任意 3/4/5 个均匀分布导航项）
 */
const activeIndicatorTrackStyle = computed(() => {
	const len = props.items?.length || 4
	const idx = activeIndicatorIndex.value
	return {
		width: `calc((100% - 10px) / ${len})`,
		transform: `translate3d(${(idx * 100).toFixed(2)}%, 0, 0)`
	}
})

/**
 * 共享 Active 高亮层内层胶囊形变样式（仅负责 scale3d 液态拉伸与回缩，与外层 translate3d 解耦）
 */
const activeIndicatorBodyStyle = computed(() => {
	return {
		transformOrigin: `${indicatorOriginX.value} 50%`,
		transform: `scale3d(${indicatorStretchX.value.toFixed(3)}, ${indicatorStretchY.value.toFixed(3)}, 1)`
	}
})

/**
 * 同步初始化 Dock 容器几何尺寸（确保首帧坐标精确）
 */
const getInitialDockMetrics = () => {
	let winW = 375
	let winH = 812
	try {
		if (typeof uni !== 'undefined' && typeof uni.getSystemInfoSync === 'function') {
			const sys = uni.getSystemInfoSync()
			if (sys && sys.windowWidth > 0) {
				winW = sys.windowWidth
				winH = sys.windowHeight || 812
			}
		} else if (typeof window !== 'undefined' && window.innerWidth > 0) {
			winW = window.innerWidth
			winH = window.innerHeight || 812
		}
	} catch (e) {}

	const rpxRatio = winW / 750
	const marginPx = 64 * rpxRatio
	const maxWidthPx = 720 * rpxRatio
	const width = Math.min(winW - marginPx, maxWidthPx)
	const height = Math.round(124 * rpxRatio)
	const left = (winW - width) * 0.5
	const top = winH - height - Math.round(24 * rpxRatio)

	return {
		left,
		top,
		width: Math.max(width, 240),
		height: Math.max(height, 54)
	}
}

const dockMetrics = ref(getInitialDockMetrics())

// 透镜中心坐标状态（以当前悬停/触摸的 Icon 为中心，避免固定在 Dock 中央）
const lensState = ref({
	x: 50,
	y: 31
})

// 内部交互追踪变量
let isTouchActive = false
let lastTouchTime = 0
let touchStartX = 0
let touchStartY = 0
let hasTouchDragged = false
let suppressNextSyntheticClick = false
let lastMoveFrameTime = 0
let leaveTimerId = null
let enterTimerId = null
let suppressClickTimerId = null
let readyTimerId = null

// 单项百分比宽度
const itemWidthPercent = computed(() => {
	const len = props.items?.length || 4
	return `${(100 / len).toFixed(4)}%`
})

/**
 * 根节点样式与提取的 CSS 自定义属性（尺寸、放大倍率、高光强度、透明度、动画时长）
 */
const containerStyle = computed(() => {
	return {
		zIndex: props.zIndex,
		'--lens-width': `${LENS_CONFIG.lensWidth}px`,
		'--lens-height': `${LENS_CONFIG.lensHeight}px`,
		'--lens-scale': `${LENS_CONFIG.magnification}`,
		'--lens-specular-opacity': `${LENS_CONFIG.specularOpacity}`,
		'--lens-bg-opacity': `${LENS_CONFIG.lensBgOpacity}`,
		'--lens-enter-duration': `${LENS_CONFIG.enterDuration}ms`,
		'--lens-move-duration': `${LENS_CONFIG.moveDuration}ms`,
		'--lens-leave-duration': `${LENS_CONFIG.leaveDuration}ms`,
		'--active-move-duration': `${LENS_CONFIG.activeMoveDuration}ms`,
		'--icon-color-duration': `${LENS_CONFIG.iconColorDuration}ms`,
		'--icon-scale-duration': `${LENS_CONFIG.iconScaleDuration}ms`
	}
})

const surfaceStyle = computed(() => {
	return {
		maxWidth: props.maxWidth
	}
})

/**
 * 计算指定索引的 Icon 在 Dock 表面内的水平中心坐标 (px)
 * @param {number} index - 导航项索引
 * @returns {number}
 */
const getItemCenterX = (index) => {
	const m = dockMetrics.value
	const len = props.items?.length || 4
	const innerPadding = 5
	const itemWidth = Math.max(m.width - innerPadding * 2, 1) / len
	const safeIdx = Number.isFinite(index) ? Math.min(Math.max(index, 0), len - 1) : 0
	return innerPadding + (safeIdx + 0.5) * itemWidth
}

/**
 * 透镜外层定位与缩放样式
 */
const lensOuterStyle = computed(() => {
	const lw = LENS_CONFIG.lensWidth
	const lh = LENS_CONFIG.lensHeight
	const tx = lensState.value.x - lw * 0.5
	const ty = lensState.value.y - lh * 0.5

	let scale = 0.84
	if (interactionState.value === 'entering' || interactionState.value === 'moving') {
		scale = 1
	} else if (interactionState.value === 'leaving') {
		scale = 0.88
	}

	return {
		width: `${lw}px`,
		height: `${lh}px`,
		transform: `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) scale3d(${scale}, ${scale}, 1)`
	}
})

/**
 * 透镜内部局部放大场景定位与缩放样式
 * 实时反向补偿位移，确保透镜内部图标始终锚定在原物理位置放大
 */
const lensSceneStyle = computed(() => {
	const m = dockMetrics.value
	const lw = LENS_CONFIG.lensWidth
	const lh = LENS_CONFIG.lensHeight
	const scale = LENS_CONFIG.magnification
	const viewportInset = 1.5
	const sceneTx = lw * 0.5 - viewportInset - lensState.value.x * scale
	const sceneTy = lh * 0.5 - viewportInset - lensState.value.y * scale

	return {
		width: `${m.width.toFixed(1)}px`,
		height: `${m.height.toFixed(1)}px`,
		transform: `translate3d(${sceneTx.toFixed(1)}px, ${sceneTy.toFixed(1)}px, 0) scale(${scale})`
	}
})

/**
 * 底层原始导航项样式：
 * 普通状态下保持原尺寸和原位置；当透镜覆盖在当前 Icon 上时，底层原 Icon 隐退，完全由透镜内放大副本呈现，消除双影
 */
const getBaseItemStyle = (index) => {
	if (!isLensActive.value) {
		return {
			width: itemWidthPercent.value,
			opacity: 1
		}
	}

	const itemCenterX = getItemCenterX(index)
	const dist = Math.abs(lensState.value.x - itemCenterX)
	const lensHalfW = LENS_CONFIG.lensWidth * 0.48

	let opacity = 1
	if (dist < lensHalfW) {
		const norm = dist / lensHalfW
		opacity = Math.pow(norm, 2.6) * 0.85
	}

	return {
		width: itemWidthPercent.value,
		opacity: opacity.toFixed(2)
	}
}

/**
 * 透镜内部视觉副本的边缘弯曲、拉伸折射样式
 */
const getCloneItemDistortionStyle = (index) => {
	const itemCenterX = getItemCenterX(index)
	const dx = itemCenterX - lensState.value.x
	const halfLensW = LENS_CONFIG.lensWidth * 0.5
	const normX = Math.max(Math.min(dx / halfLensW, 1.3), -1.3)
	const absNorm = Math.abs(normX)

	// 透镜中央 36% 区域零扭曲，保证主放大图标与标签文字端正清晰
	const edgeFactor = absNorm <= 0.36 ? 0 : Math.min((absNorm - 0.36) / 0.64, 1.1)
	const strength = LENS_CONFIG.edgeDistortionStrength

	const radialPushPx = normX * edgeFactor * 5.5
	const scaleX = 1 + edgeFactor * strength
	const scaleY = 1 - edgeFactor * (strength * 0.3)
	const skewDeg = -normX * edgeFactor * 6.5

	return {
		width: itemWidthPercent.value,
		transform: `translate3d(${radialPushPx.toFixed(1)}px, 0, 0) scale(${scaleX.toFixed(3)}, ${scaleY.toFixed(3)}) skewX(${skewDeg.toFixed(2)}deg)`
	}
}

/**
 * 获取默认态与激活态图标资源路径
 */
const getDefaultIconSrc = (item) => {
	return item.defaultIcon || item.icon
}

const getActiveIconSrc = (item) => {
	return item.activeIcon || item.icon || item.defaultIcon
}

/**
 * 徽标判断与格式化
 */
const hasBadge = (badge) => {
	if (badge === true || badge === 'dot') return true
	if (typeof badge === 'number') return badge > 0
	if (typeof badge === 'string') return badge.trim().length > 0
	return false
}

const isDotBadge = (badge) => {
	return badge === true || badge === 'dot'
}

const formatBadge = (badge) => {
	if (typeof badge === 'number') {
		return badge > 99 ? '99+' : `${badge}`
	}
	return badge
}

/**
 * 提取事件中的屏幕坐标（兼容 TouchEvent / MouseEvent / PointerEvent）
 */
const extractEventPoint = (e) => {
	if (!e) return null

	const touch =
		(e.touches && e.touches[0]) ||
		(e.changedTouches && e.changedTouches[0])

	if (touch) {
		const tx = touch.clientX ?? touch.pageX ?? touch.x
		const ty = touch.clientY ?? touch.pageY ?? touch.y
		if (typeof tx === 'number' && Number.isFinite(tx)) {
			return {
				x: tx,
				y: typeof ty === 'number' && Number.isFinite(ty) ? ty : 0
			}
		}
	}

	const cx = e.clientX ?? e.pageX ?? e.detail?.clientX ?? e.detail?.x
	const cy = e.clientY ?? e.pageY ?? e.detail?.clientY ?? e.detail?.y
	if (typeof cx === 'number' && Number.isFinite(cx)) {
		return {
			x: cx,
			y: typeof cy === 'number' && Number.isFinite(cy) ? cy : 0
		}
	}

	return null
}

/**
 * 测量并更新 Dock 表面容器的真实几何坐标
 */
const measureSurfaceRect = () => {
	const fallback = getInitialDockMetrics()
	if (dockMetrics.value.width <= 0) {
		dockMetrics.value = fallback
	}

	// #ifdef H5
	const domEl = surfaceRef.value?.$el || surfaceRef.value
	if (domEl && typeof domEl.getBoundingClientRect === 'function') {
		const rect = domEl.getBoundingClientRect()
		if (rect && rect.width > 0 && rect.height > 0) {
			dockMetrics.value = {
				left: rect.left,
				top: rect.top,
				width: rect.width,
				height: rect.height
			}
			return
		}
	}
	// #endif

	try {
		if (typeof uni !== 'undefined' && typeof uni.createSelectorQuery === 'function') {
			const query = instance?.proxy
				? uni.createSelectorQuery().in(instance.proxy)
				: uni.createSelectorQuery()
			query
				.select('#liquidDockSurface')
				.boundingClientRect((rect) => {
					if (rect && rect.width > 0 && rect.height > 0) {
						dockMetrics.value = {
							left: rect.left,
							top: rect.top,
							width: rect.width,
							height: rect.height
						}
					}
				})
				.exec()
		}
	} catch (err) {}
}

/**
 * 根据相对 X 坐标计算命中的导航项索引
 * @param {number} rawX - 相对 Dock 左边缘的 X 坐标
 * @returns {number}
 */
const getHitItemIndex = (rawX) => {
	const m = dockMetrics.value
	const len = props.items?.length || 4
	const innerPadding = 5
	const usableWidth = Math.max(m.width - innerPadding * 2, 1)
	const itemWidth = usableWidth / len
	const idx = Math.floor((rawX - innerPadding) / itemWidth)
	if (!Number.isFinite(idx)) return targetIndex.value
	return Math.min(Math.max(idx, 0), len - 1)
}

/**
 * 清理透镜过渡定时器
 */
const clearTransitionTimers = () => {
	if (leaveTimerId !== null) {
		clearTimeout(leaveTimerId)
		leaveTimerId = null
	}
	if (enterTimerId !== null) {
		clearTimeout(enterTimerId)
		enterTimerId = null
	}
}

/**
 * 激活或移动透镜至指定导航项
 * @param {number} index - 目标 Icon 索引
 * @param {number|null} pointerClientX - 指针屏幕 X（可选）
 * @param {string} mode - 'mouse' | 'touch'
 */
const focusLensOnItem = (index, pointerClientX = null, mode = 'mouse') => {
	if (props.disabled) return
	const list = props.items || []
	if (index < 0 || index >= list.length || list[index]?.disabled) return

	clearTransitionTimers()
	activeInputMode.value = mode

	const m = dockMetrics.value
	const itemCenterX = getItemCenterX(index)
	let targetX = itemCenterX

	if (typeof pointerClientX === 'number' && Number.isFinite(pointerClientX)) {
		const rawX = pointerClientX - m.left
		const offsetFromCenter = rawX - itemCenterX
		if (mode === 'mouse') {
			// 桌面悬停：以当前 Icon 为核心锚点，仅保留 ±5px 微量阻尼柔顺感，防止微移抖动
			const dampedOffset = Math.max(Math.min(offsetFromCenter * 0.14, 5), -5)
			targetX = itemCenterX + dampedOffset
		} else {
			// 触摸滑动：平滑跟手移动
			const minX = LENS_CONFIG.lensWidth * 0.34
			const maxX = Math.max(m.width - minX, minX)
			const clampedRawX = Math.max(Math.min(rawX, maxX), minX)
			targetX = itemCenterX * 0.32 + clampedRawX * 0.68
		}
	}

	const wasIdleOrLeaving =
		interactionState.value === 'idle' || interactionState.value === 'leaving'

	hoveredIndex.value = index
	lensState.value = {
		x: targetX,
		y: m.height * 0.5
	}

	// 触摸按住滑动到新的导航项时，同步更新选中项，驱动高亮层与透镜协同平滑移动
	if (mode === 'touch') {
		const hitItem = list[index]
		if (hitItem && !hitItem.disabled && hitItem.key !== props.modelValue) {
			emit('update:modelValue', hitItem.key)
			emit('change', hitItem.key, hitItem)
		}
	}

	if (wasIdleOrLeaving) {
		interactionState.value = 'entering'
		enterTimerId = setTimeout(() => {
			if (interactionState.value === 'entering') {
				interactionState.value = 'moving'
			}
			enterTimerId = null
		}, LENS_CONFIG.enterDuration)
	} else if (interactionState.value !== 'moving') {
		interactionState.value = 'moving'
	}
}

/**
 * 平滑隐藏透镜
 */
const hideLensSmoothly = () => {
	if (interactionState.value === 'idle') return

	clearTransitionTimers()

	const snapIdx = hoveredIndex.value >= 0 ? hoveredIndex.value : targetIndex.value
	lensState.value = {
		x: getItemCenterX(snapIdx),
		y: dockMetrics.value.height * 0.5
	}

	interactionState.value = 'leaving'
	leaveTimerId = setTimeout(() => {
		interactionState.value = 'idle'
		hoveredIndex.value = -1
		leaveTimerId = null
	}, LENS_CONFIG.leaveDuration)
}

/* ==========================================================================
 * 桌面端鼠标悬停交互（无需按下鼠标，进入 Icon 即刻呈现透镜，跨 Icon 平滑跟随，离开淡出）
 * ========================================================================== */

const handleSurfaceMouseEnter = () => {
	if (props.disabled) return
	if (Date.now() - lastTouchTime < 650) return
	measureSurfaceRect()
}

const handleItemMouseEnter = (index, e) => {
	if (props.disabled) return
	if (isTouchActive || Date.now() - lastTouchTime < 650) return
	measureSurfaceRect()
	const pt = extractEventPoint(e)
	focusLensOnItem(index, pt ? pt.x : null, 'mouse')
}

const handleSurfaceMouseMove = (e) => {
	if (props.disabled) return
	if (isTouchActive || Date.now() - lastTouchTime < 650) return

	const now = Date.now()
	if (now - lastMoveFrameTime < 16) return
	lastMoveFrameTime = now

	const pt = extractEventPoint(e)
	if (!pt) return

	const rawX = pt.x - dockMetrics.value.left
	const hitIdx = getHitItemIndex(rawX)
	focusLensOnItem(hitIdx, pt.x, 'mouse')
}

const handleSurfaceMouseLeave = () => {
	if (isTouchActive) return
	hideLensSmoothly()
}

/* ==========================================================================
 * 移动端 / App 端触摸交互
 * ========================================================================== */

const handleTouchStart = (e) => {
	if (props.disabled) return
	lastTouchTime = Date.now()
	isTouchActive = true
	hasTouchDragged = false

	measureSurfaceRect()
	const pt = extractEventPoint(e)
	if (!pt) return

	touchStartX = pt.x
	touchStartY = pt.y
	const rawX = pt.x - dockMetrics.value.left
	const hitIdx = getHitItemIndex(rawX)
	focusLensOnItem(hitIdx, pt.x, 'touch')
}

const handleTouchMove = (e) => {
	if (!isTouchActive || props.disabled) return
	lastTouchTime = Date.now()

	const now = lastTouchTime
	if (now - lastMoveFrameTime < 14) return
	lastMoveFrameTime = now

	const pt = extractEventPoint(e)
	if (!pt) return

	const deltaX = pt.x - touchStartX
	const deltaY = pt.y - touchStartY
	if (!hasTouchDragged && Math.hypot(deltaX, deltaY) > 6) {
		hasTouchDragged = true
	}

	const rawX = pt.x - dockMetrics.value.left
	const hitIdx = getHitItemIndex(rawX)
	focusLensOnItem(hitIdx, pt.x, 'touch')
}

const handleTouchEnd = () => {
	if (!isTouchActive) return
	lastTouchTime = Date.now()
	isTouchActive = false

	if (hasTouchDragged) {
		hasTouchDragged = false
		suppressNextSyntheticClick = true
		if (suppressClickTimerId !== null) clearTimeout(suppressClickTimerId)
		suppressClickTimerId = setTimeout(() => {
			suppressNextSyntheticClick = false
			suppressClickTimerId = null
		}, 260)
	}

	hideLensSmoothly()
}

const handleTouchCancel = () => {
	isTouchActive = false
	hasTouchDragged = false
	hideLensSmoothly()
}

/**
 * 单项点击导航处理：
 * 点击后立即更新 modelValue，共享高亮层连续平滑移动到实际选中项，并与透镜位置协调一致
 */
const handleItemClick = (item, index) => {
	if (props.disabled || item.disabled) return

	emit('itemClick', item, index)

	if (suppressNextSyntheticClick) {
		suppressNextSyntheticClick = false
		return
	}

	if (item.key !== props.modelValue) {
		emit('update:modelValue', item.key)
		emit('change', item.key, item)
	}
}

const handleWindowBlur = () => {
	isTouchActive = false
	hasTouchDragged = false
	hideLensSmoothly()
}

const handleWindowResize = () => {
	dockMetrics.value = getInitialDockMetrics()
	measureSurfaceRect()
}

// 挂载与卸载生命周期
onMounted(() => {
	dockMetrics.value = getInitialDockMetrics()
	lensState.value = {
		x: getItemCenterX(targetIndex.value),
		y: dockMetrics.value.height * 0.5
	}

	// 首帧直接定位到初始 active 项后开启过渡，避免首次加载时从边缘飞入
	readyTimerId = setTimeout(() => {
		isIndicatorReady.value = true
		measureSurfaceRect()
		readyTimerId = null
	}, 50)

	// #ifdef H5
	if (typeof window !== 'undefined') {
		window.addEventListener('resize', handleWindowResize, { passive: true })
		window.addEventListener('blur', handleWindowBlur)
		if (typeof document !== 'undefined') {
			document.addEventListener('visibilitychange', handleWindowBlur)
		}
		if (window.matchMedia) {
			darkMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
			systemIsDark.value = darkMediaQuery.matches
			darkMediaHandler = (e) => {
				systemIsDark.value = e.matches
			}
			darkMediaQuery.addEventListener('change', darkMediaHandler)
		}
	}
	// #endif
})

onBeforeUnmount(() => {
	clearTransitionTimers()
	if (indicatorStretchTimerId !== null) {
		clearTimeout(indicatorStretchTimerId)
		indicatorStretchTimerId = null
	}
	if (suppressClickTimerId !== null) {
		clearTimeout(suppressClickTimerId)
		suppressClickTimerId = null
	}
	if (readyTimerId !== null) {
		clearTimeout(readyTimerId)
		readyTimerId = null
	}

	// #ifdef H5
	if (typeof window !== 'undefined') {
		window.removeEventListener('resize', handleWindowResize)
		window.removeEventListener('blur', handleWindowBlur)
		if (typeof document !== 'undefined') {
			document.removeEventListener('visibilitychange', handleWindowBlur)
		}
		if (darkMediaQuery && darkMediaHandler) {
			darkMediaQuery.removeEventListener('change', darkMediaHandler)
		}
	}
	// #endif
})
</script>

<style scoped lang="scss">
/* ==========================================================================
 * Liquid Glass Dock — 连续液态 Active 高亮过渡与局部凸透镜系统
 * ========================================================================== */

.liquid-dock {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 24rpx;
	display: flex;
	justify-content: center;
	align-items: center;
	pointer-events: none;
	isolation: isolate;
	transition: bottom 0.25s ease;

	&.has-safe-area {
		bottom: calc(24rpx + env(safe-area-inset-bottom, 0px));
	}

	&.is-disabled {
		opacity: 0.48;
		pointer-events: none !important;
	}
}

/* 静态隐藏 SVG Filter 容器 */
.liquid-dock__svg-defs {
	position: absolute;
	width: 0;
	height: 0;
	overflow: hidden;
	pointer-events: none;
}

/* --------------------------------------------------------------------------
 * 1. 常态液态玻璃主胶囊体 (还原图2：干净通透的浅白玻璃 + 极细玻璃边缘折射圈)
 * -------------------------------------------------------------------------- */
.liquid-dock__surface {
	position: relative;
	z-index: 1;
	pointer-events: auto;
	width: calc(100% - 64rpx);
	min-height: 124rpx;
	height: 124rpx;
	border-radius: 9999rpx;
	box-sizing: border-box;
	display: flex;
	align-items: center;
	justify-content: space-around;
	padding: 5px;
	/* 允许纵向滚动手势，不阻塞正常页面滚动 */
	touch-action: pan-y;
	user-select: none;
	-webkit-user-select: none;
	overflow: visible;
	transform: translate3d(0, 0, 0);
	transition:
		box-shadow 0.22s ease,
		background 0.22s ease;

	/* 图2同款：纯净清透的浅白毛玻璃底色 */
	background: rgba(250, 250, 252, 0.72);

	/* 背景折射模糊与饱和度增透 */
	-webkit-backdrop-filter: blur(22px) saturate(190%);
	backdrop-filter: blur(22px) saturate(190%);

	/* 图2同款：外圈极细微灰轮廓线 + 内侧明亮白玻璃折光环 + 柔和浅阴影 */
	border: 0.5px solid rgba(0, 0, 0, 0.08);
	box-shadow:
		inset 0 0 0 1.5px rgba(255, 255, 255, 0.88),
		inset 0 1px 2px rgba(255, 255, 255, 0.95),
		0 6px 24px rgba(0, 0, 0, 0.06),
		0 1px 4px rgba(0, 0, 0, 0.04);
}

/* 玻璃内圈极细折射环 */
.liquid-dock__glass-bevel {
	position: absolute;
	top: 1.5px;
	right: 1.5px;
	bottom: 1.5px;
	left: 1.5px;
	border-radius: 9999rpx;
	pointer-events: none;
	border: 0.5px solid rgba(0, 0, 0, 0.04);
}

/* --------------------------------------------------------------------------
 * 2. 共享连续移动的 Active 高亮层 (.liquid-dock__active-indicator)
 *    - 外层轨道只做 translate3d 平滑位移，支持中途无缝转向，不回弹到旧位置
 *    - 内层胶囊体独立做 scale3d 液态拉伸与自然恢复，避免 transform 互相覆盖
 * -------------------------------------------------------------------------- */
.liquid-dock__active-indicator {
	position: absolute;
	top: 5px;
	bottom: 5px;
	left: 5px;
	pointer-events: none;
	z-index: 1;
	will-change: transform, opacity;

	/* 首次挂载完成后启用平滑连续移动曲线 */
	&.is-ready {
		transition:
			transform var(--active-move-duration, 270ms) cubic-bezier(0.22, 1, 0.36, 1),
			opacity 180ms ease;
	}

	/* 当液态凸透镜激活覆盖时，底层高亮层柔和降低存在感，与凸透镜自然融为一体，不瞬间消失 */
	&.is-under-lens {
		opacity: 0.42;
	}
}

.liquid-dock__active-indicator-body {
	position: relative;
	width: 100%;
	height: 100%;
	border-radius: 9999rpx;
	/* 图2 Today 同款：干净柔和的 iOS 浅灰半透明液态胶囊底色 + 细腻顶部内高光 */
	background: rgba(118, 118, 128, 0.13);
	box-shadow:
		inset 0 1px 1.5px rgba(255, 255, 255, 0.55),
		inset 0 -0.5px 1px rgba(0, 0, 0, 0.03);
	will-change: transform;
	transition: transform 185ms cubic-bezier(0.22, 1, 0.36, 1);

	&.phase-stretching {
		transition: transform 105ms cubic-bezier(0.2, 0.9, 0.3, 1);
	}
}

.liquid-dock__active-indicator-highlight {
	position: absolute;
	top: 1px;
	left: 20%;
	right: 20%;
	height: 1px;
	border-radius: 9999rpx;
	background: linear-gradient(
		90deg,
		rgba(255, 255, 255, 0) 0%,
		rgba(255, 255, 255, 0.72) 50%,
		rgba(255, 255, 255, 0) 100%
	);
	pointer-events: none;
}

/* --------------------------------------------------------------------------
 * 3. 底层导航项目列表（普通状态下保持原来的尺寸和位置，不发生布局抖动）
 * -------------------------------------------------------------------------- */
.liquid-dock__items-layer {
	position: relative;
	z-index: 2;
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: space-around;
}

.liquid-dock__item {
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	height: 100%;
	min-width: 88rpx;
	cursor: pointer;
	box-sizing: border-box;
	transition: opacity 0.14s ease;

	&.is-disabled {
		opacity: 0.35;
		pointer-events: none;
	}
}

/* 独立负责 Icon 轻微缩放 (1.06x) 的包装层，时长 240ms，不产生上下跳动 */
.liquid-dock__icon-scale {
	display: flex;
	align-items: center;
	justify-content: center;
	transform: scale3d(1, 1, 1);
	transform-origin: center center;
	transition: transform var(--icon-scale-duration, 240ms) cubic-bezier(0.22, 1, 0.36, 1);
}

.liquid-dock__item.is-active .liquid-dock__icon-scale {
	transform: scale3d(1.06, 1.06, 1);
}

.liquid-dock__icon-wrapper {
	position: relative;
	z-index: 1;
	width: 52rpx;
	height: 52rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

/* 默认图标与激活图标叠放，通过 210ms 透明度渐变实现平滑颜色过渡 */
.liquid-dock__icon {
	width: 44rpx;
	height: 44rpx;
	display: block;
	transition: opacity var(--icon-color-duration, 210ms) ease;
}

.liquid-dock__icon--default {
	opacity: 1;

	&.is-hidden {
		opacity: 0;
	}
}

.liquid-dock__icon--active {
	position: absolute;
	top: 4rpx;
	left: 4rpx;
	opacity: 0;

	&.is-visible {
		opacity: 1;
	}
}

/* 徽标 Badge */
.liquid-dock__badge {
	position: absolute;
	top: -4rpx;
	right: -12rpx;
	min-width: 28rpx;
	height: 28rpx;
	padding: 0 8rpx;
	background: #FF3B30;
	border: 2rpx solid #FFFFFF;
	border-radius: 9999rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 2rpx 8rpx rgba(255, 59, 48, 0.45);
	z-index: 3;

	&.is-dot {
		min-width: 16rpx;
		width: 16rpx;
		height: 16rpx;
		padding: 0;
		right: 0rpx;
		top: 0rpx;
	}
}

.liquid-dock__badge-text {
	font-size: 18rpx;
	font-weight: 700;
	color: #FFFFFF;
	line-height: 1;
}

/* 文字标签：与图标颜色同步 210ms 平滑过渡 */
.liquid-dock__label {
	position: relative;
	z-index: 1;
	font-size: 22rpx;
	margin-top: 4rpx;
	color: #64748B;
	font-weight: 500;
	letter-spacing: 0.5rpx;
	line-height: 1.2;
	transition:
		color var(--icon-color-duration, 210ms) ease,
		font-weight var(--icon-color-duration, 210ms) ease;
}

.liquid-dock__item.is-active {
	.liquid-dock__label {
		color: #FF5722;
		font-weight: 600;
	}
}

/* --------------------------------------------------------------------------
 * 4. 局部液态凸透镜覆盖层 (.liquid-dock__lens)
 * -------------------------------------------------------------------------- */
.liquid-dock__lens {
	position: absolute;
	top: 0;
	left: 0;
	width: var(--lens-width, 124px);
	height: var(--lens-height, 78px);
	border-radius: 9999px;
	pointer-events: none !important;
	z-index: 6;
	opacity: 0;
	transform-origin: center center;
	will-change: transform, opacity;
	transition:
		opacity var(--lens-leave-duration, 190ms) ease-out,
		transform var(--lens-leave-duration, 190ms) cubic-bezier(0.22, 1, 0.36, 1);

	/* 进入显现阶段 */
	&.is-entering {
		opacity: 1;
		transition:
			opacity var(--lens-enter-duration, 150ms) ease-out,
			transform var(--lens-enter-duration, 150ms) cubic-bezier(0.22, 1.08, 0.36, 1);
	}

	/* 桌面端跨 Icon 悬停移动 */
	&.is-moving.mode-mouse {
		opacity: 1;
		transition:
			opacity 120ms ease-out,
			transform var(--lens-move-duration, 170ms) cubic-bezier(0.22, 1, 0.36, 1);
	}

	/* 触摸端跟手滑动：与内部镜像场景保持零延迟实时同步 */
	&.is-moving.mode-touch {
		opacity: 1;
		transition: opacity 90ms ease-out;
	}

	/* 离开淡出阶段 */
	&.is-leaving {
		opacity: 0;
	}
}

/* 4.1 凸透镜光学玻璃基底 */
.liquid-dock__lens-backdrop {
	position: absolute;
	top: 0;
	right: 0;
	bottom: 0;
	left: 0;
	border-radius: 9999px;
	pointer-events: none;

	background: radial-gradient(
		ellipse 56% 58% at 50% 48%,
		rgba(255, 255, 255, var(--lens-bg-opacity, 0.16)) 0%,
		rgba(255, 255, 255, 0.28) 56%,
		rgba(242, 248, 255, 0.52) 84%,
		rgba(255, 255, 255, 0.78) 100%
	);

	-webkit-backdrop-filter: blur(10px) saturate(210%) contrast(106%);
	backdrop-filter: blur(10px) saturate(210%) contrast(106%);

	border: 1px solid rgba(255, 255, 255, 0.88);

	box-shadow:
		inset 0 2px 3px rgba(255, 255, 255, 0.98),
		inset 2px 0 3.5px rgba(255, 255, 255, 0.72),
		inset -2px -2.5px 6px rgba(15, 28, 48, 0.14),
		inset 0 -1.5px 2.5px rgba(255, 255, 255, 0.84),
		0 8px 22px rgba(15, 28, 48, 0.14),
		0 2px 6px rgba(15, 28, 48, 0.06);
}

/* 4.2 透镜内部局部放大与边缘折射裁剪视口 */
.liquid-dock__lens-viewport {
	position: absolute;
	top: 1.5px;
	right: 1.5px;
	bottom: 1.5px;
	left: 1.5px;
	border-radius: 9999px;
	overflow: hidden;
	pointer-events: none;
	z-index: 2;
}

.liquid-dock__lens-refraction-stage {
	position: relative;
	width: 100%;
	height: 100%;
	pointer-events: none;
}

/* 与 Dock 表面严格对齐的局部放大镜像场景 */
.liquid-dock__lens-scene {
	position: absolute;
	top: 0;
	left: 0;
	padding: 5px;
	box-sizing: border-box;
	display: flex;
	align-items: center;
	justify-content: space-around;
	transform-origin: 0 0;
	pointer-events: none;
	will-change: transform;
}

.liquid-dock__lens.is-moving.mode-mouse .liquid-dock__lens-scene {
	transition: transform var(--lens-move-duration, 170ms) cubic-bezier(0.22, 1, 0.36, 1);
}

/* 透镜内部视觉副本的文字清晰度与微色散修饰 */
.liquid-dock__item--clone {
	transform-origin: center center;
	will-change: transform;

	.liquid-dock__icon-wrapper {
		filter:
			drop-shadow(-0.6px -0.4px 0 rgba(56, 189, 248, 0.22))
			drop-shadow(0.6px 0.4px 0 rgba(255, 87, 34, 0.22));
	}

	.liquid-dock__label {
		font-weight: 600;
	}
}

/* 4.3 透镜边缘轻微折射色散环与顶部/侧边高光 */
.liquid-dock__lens-chromatic-ring {
	position: absolute;
	top: 1px;
	right: 1px;
	bottom: 1px;
	left: 1px;
	border-radius: 9999px;
	pointer-events: none;
	z-index: 3;
	box-shadow:
		inset 1.5px 1px 3px rgba(56, 189, 248, 0.22),
		inset -1.5px -1px 3px rgba(255, 98, 46, 0.22);
	opacity: 0.85;
}

.liquid-dock__lens-rim-light {
	position: absolute;
	top: 0;
	right: 0;
	bottom: 0;
	left: 0;
	border-radius: 9999px;
	pointer-events: none;
	z-index: 4;
	border: 1px solid rgba(255, 255, 255, 0.76);
	box-shadow:
		inset 0 1.5px 2.5px rgba(255, 255, 255, 0.96),
		inset 0 -1.5px 2.5px rgba(15, 28, 48, 0.10);
	opacity: var(--lens-specular-opacity, 0.92);
}

/* 顶部主受光高光弧 */
.liquid-dock__lens-specular-top {
	position: absolute;
	top: 2.5px;
	left: 16%;
	right: 16%;
	height: 11px;
	border-radius: 9999px;
	pointer-events: none;
	z-index: 4;
	background: linear-gradient(
		180deg,
		rgba(255, 255, 255, 0.82) 0%,
		rgba(255, 255, 255, 0.12) 65%,
		rgba(255, 255, 255, 0) 100%
	);
	opacity: var(--lens-specular-opacity, 0.92);
}

/* 底部曲率反光细弧 */
.liquid-dock__lens-specular-bottom {
	position: absolute;
	bottom: 2px;
	left: 22%;
	right: 22%;
	height: 3.5px;
	border-radius: 9999px;
	pointer-events: none;
	z-index: 4;
	background: linear-gradient(
		90deg,
		rgba(255, 255, 255, 0) 0%,
		rgba(255, 255, 255, 0.80) 50%,
		rgba(255, 255, 255, 0) 100%
	);
}

/* --------------------------------------------------------------------------
 * 5. 暗色模式适配 (Theme Dark)
 * -------------------------------------------------------------------------- */
.theme-dark {
	.liquid-dock__surface {
		background: rgba(28, 34, 46, 0.72);
		border-color: rgba(255, 255, 255, 0.14);
		box-shadow:
			inset 0 0 0 1px rgba(255, 255, 255, 0.18),
			0 10px 28px rgba(0, 0, 0, 0.42);
	}

	.liquid-dock__active-indicator-body {
		background: rgba(255, 255, 255, 0.14);
		box-shadow:
			inset 0 1px 1.5px rgba(255, 255, 255, 0.24),
			inset 0 -0.5px 1px rgba(0, 0, 0, 0.35);
	}

	.liquid-dock__lens-backdrop {
		background: radial-gradient(
			ellipse 56% 58% at 50% 48%,
			rgba(30, 41, 59, 0.22) 0%,
			rgba(30, 41, 59, 0.36) 60%,
			rgba(51, 65, 85, 0.50) 86%,
			rgba(255, 255, 255, 0.24) 100%
		);
		border-color: rgba(255, 255, 255, 0.32);
		box-shadow:
			inset 0 1.5px 2.5px rgba(255, 255, 255, 0.38),
			inset -2px -2px 6px rgba(0, 0, 0, 0.55),
			0 10px 26px rgba(0, 0, 0, 0.55);
	}

	.liquid-dock__lens-specular-top {
		background: linear-gradient(
			180deg,
			rgba(255, 255, 255, 0.28) 0%,
			rgba(255, 255, 255, 0.04) 60%,
			rgba(255, 255, 255, 0) 100%
		);
	}

	.liquid-dock__lens-rim-light {
		opacity: 0.48;
	}

	.liquid-dock__label {
		color: #94A3B8;
	}

	.liquid-dock__item.is-active .liquid-dock__label {
		color: #FF7A45;
	}
}

/* --------------------------------------------------------------------------
 * 6. 不支持 backdrop-filter 时的优雅降级
 * -------------------------------------------------------------------------- */
@supports not ((-webkit-backdrop-filter: blur(10px)) or (backdrop-filter: blur(10px))) {
	.liquid-dock__surface {
		background: rgba(248, 250, 252, 0.94) !important;
	}

	.liquid-dock__lens-backdrop {
		background: radial-gradient(
			ellipse at center,
			rgba(255, 255, 255, 0.88) 0%,
			rgba(242, 248, 255, 0.95) 100%
		) !important;
	}
}

/* --------------------------------------------------------------------------
 * 7. 尊重系统减少动效偏好 (prefers-reduced-motion)
 * -------------------------------------------------------------------------- */
@media (prefers-reduced-motion: reduce) {
	.liquid-dock__surface,
	.liquid-dock__active-indicator,
	.liquid-dock__active-indicator-body,
	.liquid-dock__icon-scale,
	.liquid-dock__lens,
	.liquid-dock__lens-scene,
	.liquid-dock__icon,
	.liquid-dock__label {
		transition-duration: 0.01ms !important;
	}
}
</style>
