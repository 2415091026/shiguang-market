<template>
	<view
		class="liquid-dock"
		:class="[
			`theme-${effectiveTheme}`,
			{
				'has-safe-area': safeArea,
				'is-disabled': disabled,
				'is-pressing': isPressing,
				'is-dragging': isDragging
			}
		]"
		:style="containerStyle"
	>
		<!-- 内嵌 SVG 滤镜：采用跑道型胶囊 (Stadium) 边缘弯月面折射贴图，严格匹配胶囊宽高比 -->
		<svg
			id="liquid-lens-svg"
			class="liquid-dock__svg-defs"
			width="0"
			height="0"
			:viewBox="`0 0 ${Math.round(currentLensWidth)} ${Math.round(currentLensHeight)}`"
			aria-hidden="true"
			focusable="false"
		>
			<defs>
				<filter
					id="sphere-rim-refraction"
					x="-8%"
					y="-8%"
					width="116%"
					height="116%"
					filterUnits="objectBoundingBox"
					primitiveUnits="userSpaceOnUse"
					color-interpolation-filters="sRGB"
				>
					<feImage
						:href="rimDisplacementDataUrl"
						:xlink:href="rimDisplacementDataUrl"
						x="0"
						y="0"
						:width="Math.round(currentLensWidth)"
						:height="Math.round(currentLensHeight)"
						preserveAspectRatio="none"
						result="rimDispMap"
					/>
					<feDisplacementMap
						in="SourceGraphic"
						in2="rimDispMap"
						:scale="DOCK_CONFIG.rimRefractionScale"
						xChannelSelector="R"
						yChannelSelector="G"
						result="refractedOutput"
					/>
				</filter>
			</defs>
		</svg>

		<!-- 外层 iOS 26 液态玻璃长胶囊底栏 (overflow: visible 允许按住时水滴凸透镜上下破界悬浮) -->
		<view
			id="liquidDockSurface"
			ref="surfaceRef"
			class="liquid-dock__surface"
			:style="surfaceStyle"
			@mousedown="handleMouseDown"
			@touchstart="handleTouchStart"
			@touchmove.stop.prevent="handleTouchMove"
			@touchend="handleTouchEnd"
			@touchcancel="handleTouchCancel"
		>
			<!-- 1. 底栏玻璃背景与双层内折光高光边（独立裁剪圆角，不裁剪破界水滴） -->
			<view class="liquid-dock__surface-glass" pointer-events="none">
				<view class="liquid-dock__glass-rim"></view>
			</view>

			<!-- 2. 底层默认导航项（Normal Layer）：未覆盖区域显示深邃纯黑 (#1C1C1E) 图标与文字
			     通过动态遮罩实时挖空当前胶囊/水滴覆盖区，实现跨 Tab 半蓝半黑无缝裁切 -->
			<view
				class="liquid-dock__items-layer"
				:style="normalLayerMaskStyle"
			>
				<view
					v-for="(item, index) in items"
					:key="item.key || index"
					class="liquid-dock__item"
					:class="{
						'is-disabled': item.disabled
					}"
					:style="getItemSlotStyle()"
					@click="handleItemClick(item, index)"
				>
					<view class="liquid-dock__icon-wrapper">
						<image
							class="liquid-dock__icon"
							:src="getRenderedIconSrc(item, 'normal')"
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

					<text v-if="showLabel && item.label" class="liquid-dock__label liquid-dock__label--normal">
						{{ item.label }}
					</text>
				</view>
			</view>

			<!-- 3. 顶层双态液态透镜容器 (.liquid-dock__morph-lens)
			     - 常态 (!isPressing)：图二同款内嵌式柔和浅灰胶囊 (高 54px，不超出底栏，内部 1.0x 锐利蓝字)
			     - 按住/拖动态 (isPressing)：高德截图同款破界悬浮 3D 水滴凸透镜 (92x78px，上下超出底栏，中心 1.22x 清晰放大，仅球体边缘产生弧形折射与微色散光圈) -->
			<view
				v-if="items && items.length > 0"
				class="liquid-dock__morph-lens"
				:class="{
					'is-ready': isReady,
					'is-pressing': isPressing,
					'is-dragging': isDragging
				}"
				:style="morphLensOuterStyle"
				pointer-events="none"
			>
				<!-- 3.1 材质基底：常态为柔和浅灰胶囊，按住态为高透立体水滴玻璃 -->
				<view
					class="liquid-dock__morph-backdrop"
					:style="morphBackdropStyle"
				></view>

				<!-- 3.2 内部裁剪与折射视口：渲染 #007AFF 亮蓝色高亮层 -->
				<view class="liquid-dock__morph-viewport">
					<view
						class="liquid-dock__morph-refraction-stage"
						:class="{ 'is-lens-active': isPressing }"
					>
						<view
							class="liquid-dock__morph-track"
							:class="{
								'is-ready': isReady,
								'is-dragging': isDragging
							}"
							:style="morphCloneTrackStyle"
						>
							<view
								v-for="(item, index) in items"
								:key="`active-${item.key || index}`"
								class="liquid-dock__item liquid-dock__item--active-clone"
								:class="{ 'is-disabled': item.disabled }"
								:style="getItemSlotStyle()"
							>
								<view class="liquid-dock__icon-wrapper">
									<image
										class="liquid-dock__icon"
										:src="getRenderedIconSrc(item, 'active')"
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

								<text v-if="showLabel && item.label" class="liquid-dock__label liquid-dock__label--active">
									{{ item.label }}
								</text>
							</view>
						</view>
					</view>
				</view>

				<!-- 3.3 高德截图同款：水滴球体专属光学层（仅在按住/拖动为凸透镜时显现） -->
				<!-- 球体最外圈 14% 边缘棱镜色散环（中心完全透明，绝不污染中间的文字与图标） -->
				<view class="liquid-dock__droplet-prism-rim"></view>
				<!-- 球体顶部中央胶囊形高光反射小横条 -->
				<view class="liquid-dock__droplet-top-pill-highlight"></view>
				<!-- 球体底部边缘月牙反光与立体内描边 -->
				<view class="liquid-dock__droplet-bevel-ring"></view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, getCurrentInstance } from 'vue'

/**
 * 双态液态玻璃配置：
 * - 常态：内嵌浅灰胶囊 (宽 = slotWidth, 高 = 54px)
 * - 按住/拖动态：严格保持未按住胶囊的宽高比 (slotWidth : 54)，按 pressScale 等比放大为破界跑道型水滴凸透镜
 */
const DOCK_CONFIG = {
	dockHeight: 62,
	pillInset: 4,
	// 按住态等比膨胀系数（宽高同时乘以该系数，100% 保持与未按住胶囊相同的宽高比）
	pressScale: 1.22,
	// 按住态水滴透镜内图标与文字放大倍率（轻度放大，保证图标与文字完整可见不被裁切）
	dropletMagnification: 1.1,
	// 仅作用于透镜最外圈的边缘折射强度（过大会把边缘附近的文字推出透镜，造成遮挡）
	rimRefractionScale: 12,
	// 点击/松手回弹过渡时长 (ms)
	moveDuration: 280
}

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
	theme: {
		type: String,
		default: 'auto'
	},
	showLabel: {
		type: Boolean,
		default: true
	},
	safeArea: {
		type: Boolean,
		default: true
	},
	blur: {
		type: Number,
		default: 24
	},
	disabled: {
		type: Boolean,
		default: false
	},
	maxWidth: {
		type: String,
		default: '720rpx'
	}
})

const emit = defineEmits(['update:modelValue', 'change', 'item-click'])

const instance = getCurrentInstance()
const surfaceRef = ref(null)

/**
 * 生成基于“跑道型胶囊有向距离场 (Stadium SDF)”的连续液态凸透镜折射贴图
 * 让整个跑道型水滴具备真实、丝滑的光学液化拉伸与边缘弯月面弯曲效果（严格贴合胶囊宽高比，绝不变圆）
 */
const createRimOnlySphereBmpDataUrl = () => {
	const width = 96
	const height = 56
	const rowSize = Math.floor((24 * width + 31) / 32) * 4
	const pixelArraySize = rowSize * height
	const fileSize = 54 + pixelArraySize
	const buf = new Uint8Array(fileSize)
	const view = new DataView(buf.buffer)

	buf[0] = 0x42
	buf[1] = 0x4d
	view.setUint32(2, fileSize, true)
	view.setUint32(10, 54, true)
	view.setUint32(14, 40, true)
	view.setInt32(18, width, true)
	view.setInt32(22, -height, true)
	view.setUint16(26, 1, true)
	view.setUint16(28, 24, true)
	view.setUint32(34, pixelArraySize, true)

	const halfW = (width - 1) / 2
	const halfH = (height - 1) / 2
	const aspect = width / height
	const seg = Math.max(0, aspect - 1.0)
	const flatCore = 0.74

	for (let y = 0; y < height; y++) {
		const ny = (y - halfH) / halfH
		for (let x = 0; x < width; x++) {
			const nx = ((x - halfW) / halfW) * aspect
			const qx = Math.max(-seg, Math.min(seg, nx))
			const vx = nx - qx
			const vy = ny
			const d = Math.sqrt(vx * vx + vy * vy)
			let rVal = 128
			let gVal = 128

			if (d > flatCore && d < 1.0) {
				const u = (d - flatCore) / (1.0 - flatCore)
				const rimBell = Math.sin(Math.PI * u) * Math.pow(u, 0.85)
				const ux = vx / d
				const uy = vy / d
				const dispX = ux * rimBell
				const dispY = uy * rimBell
				rVal = Math.max(0, Math.min(255, Math.round(128 + dispX * 124)))
				gVal = Math.max(0, Math.min(255, Math.round(128 + dispY * 124)))
			}

			const idx = 54 + y * rowSize + x * 3
			buf[idx] = 128
			buf[idx + 1] = gVal
			buf[idx + 2] = rVal
		}
	}

	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
	let base64 = ''
	const len = buf.length
	for (let i = 0; i < len; i += 3) {
		const b0 = buf[i]
		const b1 = i + 1 < len ? buf[i + 1] : 0
		const b2 = i + 2 < len ? buf[i + 2] : 0
		base64 += chars[b0 >> 2]
		base64 += chars[((b0 & 3) << 4) | (b1 >> 4)]
		base64 += i + 1 < len ? chars[((b1 & 15) << 2) | (b2 >> 6)] : '='
		base64 += i + 2 < len ? chars[b2 & 63] : '='
	}
	return `data:image/bmp;base64,${base64}`
}

const rimDisplacementDataUrl = ref(createRimOnlySphereBmpDataUrl())

/**
 * H5 / WebView 下使用 Canvas 生成 160x96 高精度跑道型胶囊液化折射贴图
 */
const upgradeRimDisplacementWithCanvas = () => {
	if (typeof document === 'undefined') return
	try {
		const width = 160
		const height = 96
		const canvas = document.createElement('canvas')
		canvas.width = width
		canvas.height = height
		const ctx = canvas.getContext('2d')
		if (!ctx) return

		const imgData = ctx.createImageData(width, height)
		const data = imgData.data
		const halfW = (width - 1) / 2
		const halfH = (height - 1) / 2
		const aspect = width / height
		const seg = Math.max(0, aspect - 1.0)
		const flatCore = 0.74

		for (let y = 0; y < height; y++) {
			const ny = (y - halfH) / halfH
			for (let x = 0; x < width; x++) {
				const nx = ((x - halfW) / halfW) * aspect
				const qx = Math.max(-seg, Math.min(seg, nx))
				const vx = nx - qx
				const vy = ny
				const d = Math.sqrt(vx * vx + vy * vy)
				let rVal = 128
				let gVal = 128

				if (d > flatCore && d < 1.0) {
					const u = (d - flatCore) / (1.0 - flatCore)
					const rimBell = Math.sin(Math.PI * u) * Math.pow(u, 0.85)
					const ux = vx / d
					const uy = vy / d
					const dispX = ux * rimBell
					const dispY = uy * rimBell
					rVal = Math.max(0, Math.min(255, Math.round(128 + dispX * 125)))
					gVal = Math.max(0, Math.min(255, Math.round(128 + dispY * 125)))
				}

				const p = (y * width + x) * 4
				data[p] = rVal
				data[p + 1] = gVal
				data[p + 2] = 128
				data[p + 3] = 255
			}
		}

		ctx.putImageData(imgData, 0, 0)
		const url = canvas.toDataURL('image/png')
		if (url && url.startsWith('data:image/png')) {
			rimDisplacementDataUrl.value = url
		}
	} catch (e) {}
}

/**
 * 图标生成器：
 * - normal 层：深邃纯黑 (#1C1C1E)
 * - active 层：纯正苹果蓝 (#007AFF)
 * 两层几何轮廓 100% 相同，因此当水滴边缘切过相邻图标（如高德截图中切过“探索”左半边）时，
 * 水滴内左半边为亮蓝色放大，水滴外右半边为黑色原样，严丝合缝！
 */
const ICON_SVG_BUILDERS = {
	home: (color) =>
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none"><rect x="4" y="3" width="16" height="18" rx="3.5" stroke="${color}" stroke-width="2.2"/><line x1="8" y1="7.5" x2="14" y2="7.5" stroke="${color}" stroke-width="2" stroke-linecap="round"/><line x1="8" y1="10.5" x2="12" y2="10.5" stroke="${color}" stroke-width="2" stroke-linecap="round"/><rect x="7.5" y="13" width="9" height="5" rx="1.2" fill="${color}"/></svg>`,
	favorite: (color) =>
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="${color}" stroke="${color}" stroke-width="1.6" stroke-linejoin="round"><polygon points="12 2.4 14.95 8.38 21.55 9.34 16.77 14.00 17.90 20.57 12 17.47 6.10 20.57 7.23 14.00 2.45 9.34 9.05 8.38 12 2.4"/></svg>`,
	community: (color) =>
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="${color}"><path d="M12 3C6.48 3 2 6.69 2 11.25c0 2.08.94 3.98 2.48 5.43-.18 1.24-.76 2.52-1.62 3.38-.22.22-.04.6.27.56 1.88-.24 3.63-.95 4.84-1.69 1.24.38 2.6.57 4.03.57 5.52 0 10-3.69 10-8.25S17.52 3 12 3z"/></svg>`,
	profile: (color) =>
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="${color}"><circle cx="12" cy="7.2" r="4.3"/><path d="M4.2 19.6c0-3.4 3.5-5.8 7.8-5.8s7.8 2.4 7.8 5.8c0 .9-.7 1.6-1.6 1.6H5.8c-.9 0-1.6-.7-1.6-1.6z"/></svg>`
}

const ICON_CACHE = {}

const getRenderedIconSrc = (item, mode) => {
	// 优先使用真实传入的静态图标路径（支持小程序、H5与原生App端稳定渲染）
	if (mode === 'active' && item?.activeIcon) {
		return item.activeIcon
	}
	if (mode === 'normal' && (item?.defaultIcon || item?.icon)) {
		return item.defaultIcon || item.icon
	}

	const key = item?.key || ''
	const cacheKey = `${key}_${mode}`
	if (ICON_CACHE[cacheKey]) {
		return ICON_CACHE[cacheKey]
	}

	const builder = ICON_SVG_BUILDERS[key]
	if (builder) {
		const color = mode === 'active' ? '#FF5500' : '#1C1C1E'
		const svg = builder(color)
		const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
		ICON_CACHE[cacheKey] = dataUri
		return dataUri
	}

	return item?.defaultIcon || item?.icon || ''
}

// 主题模式
const systemDark = ref(false)
const effectiveTheme = computed(() => {
	if (props.theme === 'light' || props.theme === 'dark') {
		return props.theme
	}
	return systemDark.value ? 'dark' : 'light'
})

// 当前选中的 Tab Key 与索引
const activeItemKey = ref(props.modelValue)
watch(
	() => props.modelValue,
	(val) => {
		if (val && val !== activeItemKey.value) {
			activeItemKey.value = val
			if (!isDragging.value) {
				lensCenterX.value = getTabCenterX(activeIndex.value)
			}
		}
	}
)

const activeIndex = computed(() => {
	const idx = props.items.findIndex((item) => item.key === activeItemKey.value)
	return idx >= 0 ? idx : 0
})

// 容器几何测量状态 (px)
const dockRect = ref({
	left: 16,
	top: 0,
	width: 348,
	height: DOCK_CONFIG.dockHeight
})

// 胶囊/水滴当前中心 X 坐标（相对于 innerTrack 左边缘，单位 px）
const lensCenterX = ref(42)
const isReady = ref(false)
// 是否处于按住/拖动的水滴凸透镜状态
const isPressing = ref(false)
const isDragging = ref(false)
const dragStretchX = ref(1)
const dragStretchY = ref(1)

let resizeTimer = null
let stretchResetTimer = null

// 内部轨道宽度与单个 Tab 槽位宽度
const innerTrackWidth = computed(() => {
	return Math.max(dockRect.value.width - DOCK_CONFIG.pillInset * 2, 200)
})

const slotWidth = computed(() => {
	const count = Math.max(props.items.length, 1)
	return innerTrackWidth.value / count
})

/**
 * 获取第 index 个 Tab 在 innerTrack 内的中心 X 坐标 (px)
 */
const getTabCenterX = (index) => {
	return (index + 0.5) * slotWidth.value
}

/**
 * 根据 innerTrack 内的 X 坐标计算命中的 Tab 索引
 */
const getHitIndexFromTrackX = (trackX) => {
	const count = Math.max(props.items.length, 1)
	const idx = Math.floor((trackX / innerTrackWidth.value) * count)
	return Math.max(0, Math.min(count - 1, idx))
}

/**
 * 限制水滴中心 X 坐标在底栏轨道内（边缘带柔和阻尼）
 */
const clampTrackCenterX = (rawTrackX) => {
	const minCenter = slotWidth.value * 0.42
	const maxCenter = innerTrackWidth.value - slotWidth.value * 0.42
	if (rawTrackX < minCenter) {
		return minCenter - (minCenter - rawTrackX) * 0.25
	}
	if (rawTrackX > maxCenter) {
		return maxCenter + (rawTrackX - maxCenter) * 0.25
	}
	return rawTrackX
}

/**
 * 测量底栏真实 DOM 尺寸
 */
const measureSurfaceRect = (callback) => {
	try {
		const query = instance?.proxy
			? uni.createSelectorQuery().in(instance.proxy)
			: uni.createSelectorQuery()
		query
			.select('#liquidDockSurface')
			.boundingClientRect((rect) => {
				if (rect && rect.width > 0) {
					dockRect.value = {
						left: rect.left,
						top: rect.top,
						width: rect.width,
						height: rect.height || DOCK_CONFIG.dockHeight
					}
				}
				if (typeof callback === 'function') {
					callback()
				}
			})
			.exec()
	} catch (e) {
		if (typeof callback === 'function') {
			callback()
		}
	}
}

// 样式计算
const containerStyle = computed(() => ({
	maxWidth: props.maxWidth,
	'--dock-blur': `${props.blur}px`,
	'--pill-move-duration': `${DOCK_CONFIG.moveDuration}ms`
}))

const surfaceStyle = computed(() => ({
	height: `${DOCK_CONFIG.dockHeight}px`,
	padding: `${DOCK_CONFIG.pillInset}px`
}))

const getItemSlotStyle = () => {
	const count = Math.max(props.items.length, 1)
	return {
		width: `${(100 / count).toFixed(4)}%`
	}
}

/**
 * 当前激活容器的实时宽高：
 * - 常态 (!isPressing)：宽 = slotWidth，高 = innerH (54px 内嵌浅灰胶囊)
 * - 按住/拖动态 (isPressing)：宽高同时乘以 DOCK_CONFIG.pressScale (1.28)，100% 保持未按住胶囊的宽高比，绝不变圆！
 */
const currentLensWidth = computed(() => {
	const baseW = slotWidth.value
	return isPressing.value ? baseW * DOCK_CONFIG.pressScale : baseW
})

const currentLensHeight = computed(() => {
	const innerH = (dockRect.value.height || DOCK_CONFIG.dockHeight) - DOCK_CONFIG.pillInset * 2
	return isPressing.value ? innerH * DOCK_CONFIG.pressScale : innerH
})

/**
 * 顶层双态透镜外层定位样式
 */
const morphLensOuterStyle = computed(() => {
	const innerH = (dockRect.value.height || DOCK_CONFIG.dockHeight) - DOCK_CONFIG.pillInset * 2
	const w = currentLensWidth.value
	const h = currentLensHeight.value

	const leftPx = Math.round((lensCenterX.value - w / 2) * 100) / 100
	const topPx = Math.round(((innerH - h) / 2) * 100) / 100

	return {
		width: `${Math.round(w * 100) / 100}px`,
		height: `${Math.round(h * 100) / 100}px`,
		transform: `translate3d(${leftPx}px, ${topPx}px, 0) scale3d(${dragStretchX.value}, ${dragStretchY.value}, 1)`
	}
})

const morphBackdropStyle = computed(() => ({}))

/**
 * 透镜内部 #007AFF 亮蓝色克隆轨道的反向平移 + 按住态 1.22x 中心放大样式
 * 无论处于常态还是按住破界水滴态，内部蓝色内容与底层黑色内容在中心坐标 (lensCenterX, innerH/2) 上 100% 对齐！
 */
const morphCloneTrackStyle = computed(() => {
	const innerW = innerTrackWidth.value
	const innerH = (dockRect.value.height || DOCK_CONFIG.dockHeight) - DOCK_CONFIG.pillInset * 2
	const w = currentLensWidth.value
	const h = currentLensHeight.value
	const scale = isPressing.value ? DOCK_CONFIG.dropletMagnification : 1

	const Cx = lensCenterX.value
	const Cy = innerH / 2

	// 将轨道上的点 (Cx, Cy) 映射到当前透镜容器正中心 (w/2, h/2)，并围绕该中心放大 scale 倍：
	const tx = Math.round((w / 2 - scale * Cx) * 100) / 100
	const ty = Math.round((h / 2 - scale * Cy) * 100) / 100

	return {
		width: `${Math.round(innerW * 100) / 100}px`,
		height: `${Math.round(innerH * 100) / 100}px`,
		transformOrigin: '0 0',
		transform: `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`
	}
})

/**
 * 底层 Normal Layer 跑道型胶囊精准镂空遮罩：
 * 使用 SVG evenodd 复合路径实时挖空与顶层跑道型胶囊 1:1 严丝合缝对齐的圆角胶囊孔洞：
 * 1. 胶囊内部只显示清晰放大的 #007AFF 亮蓝内容，绝无底层黑色图标重影；
 * 2. 当跑道型水滴胶囊滑到两个 Tab 中间（如图 3 压住相邻 Tab 左半边）时，胶囊内左半边为亮蓝色折射放大，胶囊外右半边为黑色原样！
 */
const normalLayerMaskStyle = computed(() => {
	const W = Math.max(Math.round(innerTrackWidth.value), 200)
	const H = Math.max(
		Math.round((dockRect.value.height || DOCK_CONFIG.dockHeight) - DOCK_CONFIG.pillInset * 2),
		40
	)
	const w = Math.max(24, Math.round(currentLensWidth.value * dragStretchX.value - 2))
	const h = Math.max(24, Math.round(currentLensHeight.value * dragStretchY.value - 2))
	const r = Math.round((Math.min(w, h) / 2) * 10) / 10
	const x0 = Math.round((lensCenterX.value - w / 2) * 10) / 10
	const y0 = Math.round(((H - h) / 2) * 10) / 10

	const outerPath = `M0,0H${W}V${H}H0Z`
	const pillHolePath = `M${x0 + r},${y0}H${x0 + w - r}A${r},${r} 0 0 1 ${x0 + w},${y0 + r}V${y0 + h - r}A${r},${r} 0 0 1 ${x0 + w - r},${y0 + h}H${x0 + r}A${r},${r} 0 0 1 ${x0},${y0 + h - r}V${y0 + r}A${r},${r} 0 0 1 ${x0 + r},${y0}Z`
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><path fill="#000" fill-rule="evenodd" d="${outerPath}${pillHolePath}"/></svg>`
	const maskUrl = `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`

	return {
		WebkitMaskImage: maskUrl,
		maskImage: maskUrl,
		WebkitMaskSize: '100% 100%',
		maskSize: '100% 100%',
		WebkitMaskRepeat: 'no-repeat',
		maskRepeat: 'no-repeat'
	}
})

/**
 * 统一提取客户端横坐标 clientX（兼容 Touch 与 Mouse 事件）
 */
const extractClientX = (e) => {
	const touch =
		(e?.touches && e.touches[0]) ||
		(e?.changedTouches && e.changedTouches[0]) ||
		(e?.detail?.touches && e.detail.touches[0]) ||
		(e?.detail?.changedTouches && e.detail.changedTouches[0])
	if (touch) {
		const x = touch.clientX ?? touch.pageX ?? touch.x
		if (typeof x === 'number' && !Number.isNaN(x)) return x
	}
	const directX = e?.clientX ?? e?.pageX ?? e?.detail?.clientX ?? e?.detail?.pageX ?? e?.detail?.x
	return typeof directX === 'number' && !Number.isNaN(directX) ? directX : null
}

/**
 * 按下开始（同时支持手指触摸 touchstart 与鼠标按住 mousedown）
 * 仅浮起并移动液态玻璃水滴透镜，不切换业务页面（松开后才切换）
 */
const startPressAtClientX = (clientX) => {
	if (props.disabled || clientX === null) return

	isPressing.value = true
	isDragging.value = false

	measureSurfaceRect(() => {
		const trackX = clientX - dockRect.value.left - DOCK_CONFIG.pillInset
		const hitIdx = getHitIndexFromTrackX(trackX)

		// 若按在其他 Tab 上，水滴平滑滑向该位置；若按在当前水滴附近则直接吸附跟手
		const targetCenter = getTabCenterX(hitIdx)
		if (Math.abs(trackX - lensCenterX.value) <= slotWidth.value * 0.65) {
			isDragging.value = true
			lensCenterX.value = clampTrackCenterX(trackX)
		} else {
			lensCenterX.value = targetCenter
		}
	})
}

/**
 * 按住移动（实时 1:1 跟手滑动水滴凸透镜）
 * 滑动过程中仅移动液态玻璃透镜与实时液化折射，不触发页面切换
 */
const movePressAtClientX = (clientX) => {
	if (props.disabled || !isPressing.value || clientX === null) return

	isDragging.value = true
	const rawTrackX = clientX - dockRect.value.left - DOCK_CONFIG.pillInset
	const clampedX = clampTrackCenterX(rawTrackX)

	// 根据拖动速度产生轻微液态水滴横向弹性张力
	const delta = Math.abs(clampedX - lensCenterX.value)
	const stretch = Math.min(1.07, 1 + delta * 0.004)
	dragStretchX.value = Number(stretch.toFixed(3))
	dragStretchY.value = Number((1 / Math.sqrt(stretch)).toFixed(3))

	if (stretchResetTimer) clearTimeout(stretchResetTimer)
	stretchResetTimer = setTimeout(() => {
		dragStretchX.value = 1
		dragStretchY.value = 1
	}, 90)

	lensCenterX.value = clampedX
}

/**
 * 松开手指或鼠标：此时才确认选中的 Tab 并切换业务页面，水滴吸附回选中 Tab 中心并收拢为常态胶囊
 */
const endPressAtClientX = (clientX) => {
	if (!isPressing.value && !isDragging.value) return

	const finalTrackX =
		clientX !== null
			? clientX - dockRect.value.left - DOCK_CONFIG.pillInset
			: lensCenterX.value
	const hitIdx = getHitIndexFromTrackX(finalTrackX)
	const hitItem = props.items[hitIdx]
	if (hitItem && !hitItem.disabled) {
		commitActiveItem(hitItem, hitIdx)
	}

	isDragging.value = false
	isPressing.value = false
	dragStretchX.value = 1
	dragStretchY.value = 1
	lensCenterX.value = getTabCenterX(activeIndex.value)
}

// Touch 事件处理
const handleTouchStart = (e) => {
	startPressAtClientX(extractClientX(e))
}

const handleTouchMove = (e) => {
	movePressAtClientX(extractClientX(e))
}

const handleTouchEnd = (e) => {
	endPressAtClientX(extractClientX(e))
}

const handleTouchCancel = (e) => {
	endPressAtClientX(extractClientX(e))
}

// Mouse 事件处理（支持 H5 / 电脑端模拟器用鼠标按住左右拖动水滴）
let isMouseDown = false

const handleMouseDown = (e) => {
	if (props.disabled) return
	isMouseDown = true
	startPressAtClientX(extractClientX(e))
}

const handleWindowMouseMove = (e) => {
	if (!isMouseDown) return
	movePressAtClientX(extractClientX(e))
}

const handleWindowMouseUp = (e) => {
	if (!isMouseDown) return
	isMouseDown = false
	endPressAtClientX(extractClientX(e))
}

const commitActiveItem = (item, index) => {
	if (!item || item.disabled) return
	emit('item-click', item, index)
	if (activeItemKey.value !== item.key) {
		activeItemKey.value = item.key
		emit('update:modelValue', item.key)
		emit('change', item.key, item, index)
	}
}

const handleItemClick = (item, index) => {
	if (props.disabled || !item || item.disabled) return
	commitActiveItem(item, index)
	isDragging.value = false
	isPressing.value = false
	lensCenterX.value = getTabCenterX(index)
}

// 徽标辅助函数
const hasBadge = (badge) => badge !== undefined && badge !== null && badge !== '' && badge !== 0 && badge !== false
const isDotBadge = (badge) => badge === true || badge === 'dot'
const formatBadge = (badge) => {
	const num = Number(badge)
	if (!Number.isNaN(num)) {
		return num > 99 ? '99+' : String(num)
	}
	return String(badge)
}

const handleWindowResize = () => {
	if (resizeTimer) clearTimeout(resizeTimer)
	resizeTimer = setTimeout(() => {
		measureSurfaceRect(() => {
			lensCenterX.value = getTabCenterX(activeIndex.value)
		})
	}, 60)
}

onMounted(() => {
	try {
		const sys = uni.getSystemInfoSync()
		if (sys && sys.theme) {
			systemDark.value = sys.theme === 'dark'
		}
		if (sys && sys.windowWidth) {
			const estWidth = Math.min(sys.windowWidth - 24, 360)
			dockRect.value.width = estWidth
			dockRect.value.left = (sys.windowWidth - estWidth) / 2
		}
	} catch (e) {}

	upgradeRimDisplacementWithCanvas()
	lensCenterX.value = getTabCenterX(activeIndex.value)

	setTimeout(() => {
		measureSurfaceRect(() => {
			lensCenterX.value = getTabCenterX(activeIndex.value)
			setTimeout(() => {
				isReady.value = true
			}, 30)
		})
	}, 40)

	// #ifdef H5
	if (typeof window !== 'undefined') {
		window.addEventListener('resize', handleWindowResize, { passive: true })
		window.addEventListener('mousemove', handleWindowMouseMove, { passive: true })
		window.addEventListener('mouseup', handleWindowMouseUp, { passive: true })
	}
	// #endif
})

onBeforeUnmount(() => {
	if (resizeTimer) clearTimeout(resizeTimer)
	if (stretchResetTimer) clearTimeout(stretchResetTimer)
	// #ifdef H5
	if (typeof window !== 'undefined') {
		window.removeEventListener('resize', handleWindowResize)
		window.removeEventListener('mousemove', handleWindowMouseMove)
		window.removeEventListener('mouseup', handleWindowMouseUp)
	}
	// #endif
})
</script>

<style scoped lang="scss">
/* ==========================================================================
 * 双态液态玻璃 TabBar：
 * 1. 常态（未按住）：还原图二 iOS 26 内嵌柔和浅灰胶囊 + 锐利 #007AFF 蓝标
 * 2. 按住/拖动态：还原高德截图破界悬浮 3D 水滴凸透镜（中心高清放大、外圈球面折射与棱镜色散环、顶部胶囊高光条）
 * ========================================================================== */
.liquid-dock {
	--dock-blur: 20px;
	--pill-move-duration: 280ms;
	--pill-ease: cubic-bezier(0.22, 1, 0.36, 1);
	--ios-active-orange: #FF5500;
	--ios-inactive-black: #1C1C1E;

	position: fixed;
	left: 50%;
	bottom: 16rpx;
	transform: translate3d(-50%, 0, 0);
	width: calc(100% - 48rpx);
	max-width: 720rpx;
	z-index: 999;
	pointer-events: none;
	user-select: none;
	-webkit-user-select: none;
	box-sizing: border-box;
	overflow: visible !important;

	&.has-safe-area {
		bottom: calc(16rpx + constant(safe-area-inset-bottom));
		bottom: calc(16rpx + env(safe-area-inset-bottom));
	}

	&.is-disabled {
		opacity: 0.5;
	}
}

.liquid-dock__svg-defs {
	position: absolute;
	width: 0;
	height: 0;
	overflow: hidden;
	pointer-events: none;
}

/* --------------------------------------------------------------------------
 * 1. 外层胶囊底栏容器 (overflow: visible 允许按住时水滴透镜上下破界突出)
 * -------------------------------------------------------------------------- */
.liquid-dock__surface {
	position: relative;
	width: 100%;
	height: 62px;
	padding: 4px;
	box-sizing: border-box;
	border-radius: 9999px;
	pointer-events: auto;
	overflow: visible !important;
	touch-action: none;
	cursor: pointer;
}

/* 独立承担底栏高透液态毛玻璃背景，直接折射底下实时全屏地图画面 */
.liquid-dock__surface-glass {
	position: absolute;
	top: 0;
	right: 0;
	bottom: 0;
	left: 0;
	border-radius: 9999px;
	overflow: hidden;
	pointer-events: none;
	z-index: 1;

	background: rgba(255, 255, 255, 0.65);
	-webkit-backdrop-filter: blur(20px) saturate(180%) contrast(104%);
	backdrop-filter: blur(20px) saturate(180%) contrast(104%);

	border: 1px solid rgba(255, 255, 255, 0.88);
	box-shadow:
		0 0 0 0.5px rgba(0, 0, 0, 0.05),
		inset 0 1.5px 2px rgba(255, 255, 255, 0.96),
		inset 0 -1.5px 2px rgba(255, 255, 255, 0.78),
		0 10px 28px rgba(15, 23, 42, 0.10),
		0 2px 8px rgba(15, 23, 42, 0.04);
}

.liquid-dock__glass-rim {
	position: absolute;
	top: 1px;
	right: 1px;
	bottom: 1px;
	left: 1px;
	border-radius: 9999px;
	pointer-events: none;
	border: 1px solid rgba(255, 255, 255, 0.55);
	box-shadow:
		inset 2px 0 3px rgba(255, 255, 255, 0.7),
		inset -2px 0 3px rgba(255, 255, 255, 0.7),
		inset 0 1px 2px rgba(0, 0, 0, 0.02);
}

/* --------------------------------------------------------------------------
 * 2. 底层默认导航项（Normal Layer）：深邃纯黑 (#1C1C1E)
 * -------------------------------------------------------------------------- */
.liquid-dock__items-layer {
	position: relative;
	z-index: 2;
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: space-around;
	box-sizing: border-box;
}

.liquid-dock__item {
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	height: 100%;
	box-sizing: border-box;
	flex-shrink: 0;

	&.is-disabled {
		opacity: 0.35;
		pointer-events: none;
	}
}

.liquid-dock__icon-wrapper {
	position: relative;
	width: 26px;
	height: 26px;
	display: flex;
	align-items: center;
	justify-content: center;
}

.liquid-dock__icon {
	width: 24px;
	height: 24px;
	display: block;
}

.liquid-dock__label {
	font-size: 11px;
	margin-top: 2px;
	line-height: 1.15;
	letter-spacing: 0.1px;
	white-space: nowrap;
	font-weight: 600;
}

.liquid-dock__label--normal {
	color: var(--ios-inactive-black, #1C1C1E);
}

.liquid-dock__label--active {
	color: var(--ios-active-orange, #FF5500);
}

/* --------------------------------------------------------------------------
 * 3. 顶层双态液态透镜容器 (.liquid-dock__morph-lens)
 *    常态：内嵌柔和胶囊
 *    按住/拖动态 (.is-pressing)：破界悬浮 3D 水滴凸透镜
 * -------------------------------------------------------------------------- */
.liquid-dock__morph-lens {
	position: absolute;
	top: 4px;
	left: 4px;
	border-radius: 9999px;
	pointer-events: none !important;
	z-index: 6;
	transform-origin: center center;
	will-change: transform, width, height;

	&.is-ready:not(.is-dragging) {
		transition:
			transform var(--pill-move-duration, 280ms) var(--pill-ease),
			width 210ms var(--pill-ease),
			height 210ms var(--pill-ease);
	}

	&.is-dragging {
		transition:
			width 180ms var(--pill-ease),
			height 180ms var(--pill-ease);
	}
}

/* 3.1 材质基底：从常态柔和胶囊平滑过渡到按住态高透凸透镜水滴 */
.liquid-dock__morph-backdrop {
	position: absolute;
	top: 0;
	right: 0;
	bottom: 0;
	left: 0;
	border-radius: 9999px;
	pointer-events: none;
	z-index: 1;

	/* 常态：柔和通透暖灰白内嵌胶囊色 */
	background: rgba(236, 234, 232, 0.72);
	box-shadow:
		inset 0 1px 1px rgba(255, 255, 255, 0.75),
		0 1px 2px rgba(0, 0, 0, 0.02);
	transition: background 180ms ease, box-shadow 180ms ease, backdrop-filter 180ms ease;
}

/* 按住/拖动时切换为近乎全透明的液态玻璃水滴（参考图 1：内部清澈不遮挡，仅靠边缘光泽与投影体现体积感） */
.liquid-dock__morph-lens.is-pressing .liquid-dock__morph-backdrop {
	background: linear-gradient(
		180deg,
		rgba(255, 255, 255, 0.10) 0%,
		rgba(255, 255, 255, 0.02) 45%,
		rgba(255, 255, 255, 0.06) 100%
	);
	-webkit-backdrop-filter: saturate(160%) brightness(1.04);
	backdrop-filter: saturate(160%) brightness(1.04);
	box-shadow:
		0 8px 22px rgba(15, 23, 42, 0.12),
		0 2px 6px rgba(15, 23, 42, 0.06);
}

/* 3.2 内部裁剪与边缘弯月面折射舞台 */
.liquid-dock__morph-viewport {
	position: relative;
	width: 100%;
	height: 100%;
	border-radius: 9999px;
	overflow: hidden;
	z-index: 2;
}

.liquid-dock__morph-refraction-stage {
	position: relative;
	width: 100%;
	height: 100%;
	border-radius: 9999px;

	/* 按住态开启跑道型胶囊液态玻璃凸透镜液化折射 */
	&.is-lens-active {
		-webkit-filter: url(#sphere-rim-refraction);
		filter: url(#sphere-rim-refraction);
	}
}

.liquid-dock__morph-track {
	position: absolute;
	top: 0;
	left: 0;
	display: flex;
	align-items: center;
	justify-content: space-around;
	will-change: transform;

	&.is-ready:not(.is-dragging) {
		transition: transform var(--pill-move-duration, 280ms) var(--pill-ease);
	}

	&.is-dragging {
		transition: none;
	}
}

/* --------------------------------------------------------------------------
 * 3.3 液态玻璃水滴边缘光泽（参考图 1：仅 1.5px 细边棱镜微色散 + 立体明暗描边，内部完全透明不遮挡）
 * -------------------------------------------------------------------------- */

.liquid-dock__droplet-prism-rim {
	position: absolute;
	top: 0;
	right: 0;
	bottom: 0;
	left: 0;
	padding: 1.5px;
	box-sizing: border-box;
	border-radius: 9999px;
	pointer-events: none;
	z-index: 3;
	opacity: 0;
	transition: opacity 160ms ease;

	background: conic-gradient(
		from 200deg at 50% 50%,
		rgba(255, 255, 255, 0.95) 0deg,
		rgba(180, 225, 255, 0.70) 60deg,
		rgba(255, 255, 255, 0.55) 120deg,
		rgba(255, 220, 170, 0.60) 190deg,
		rgba(255, 255, 255, 0.95) 260deg,
		rgba(200, 235, 255, 0.70) 320deg,
		rgba(255, 255, 255, 0.95) 360deg
	);
	-webkit-mask:
		linear-gradient(#000 0 0) content-box,
		linear-gradient(#000 0 0);
	-webkit-mask-composite: xor;
	mask-composite: exclude;
}

/* 顶部高光条：参考图 1 无独立高光条，按住态保持隐藏 */
.liquid-dock__droplet-top-pill-highlight {
	display: none;
}

/* 水滴外圈立体明暗描边：顶部亮边 + 底部暗边，内部无任何填充 */
.liquid-dock__droplet-bevel-ring {
	position: absolute;
	top: 0;
	right: 0;
	bottom: 0;
	left: 0;
	border-radius: 9999px;
	pointer-events: none;
	z-index: 4;
	opacity: 0;
	transition: opacity 160ms ease;

	box-shadow:
		inset 0 1.5px 1.5px rgba(255, 255, 255, 0.85),
		inset 0 -1.5px 2px rgba(15, 23, 42, 0.10),
		inset 1.5px 0 2px rgba(255, 255, 255, 0.45),
		inset -1.5px 0 2px rgba(255, 255, 255, 0.45),
		0 0 0 0.5px rgba(15, 23, 42, 0.10);
}

.liquid-dock__morph-lens.is-pressing {
	.liquid-dock__droplet-prism-rim,
	.liquid-dock__droplet-top-pill-highlight,
	.liquid-dock__droplet-bevel-ring {
		opacity: 1;
	}
}

/* 徽标 Badge */
.liquid-dock__badge {
	position: absolute;
	top: -2px;
	right: -6px;
	min-width: 14px;
	height: 14px;
	padding: 0 4px;
	background: #FF3B30;
	border: 1px solid #FFFFFF;
	border-radius: 9999px;
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 1px 4px rgba(255, 59, 48, 0.45);
	z-index: 3;

	&.is-dot {
		min-width: 8px;
		width: 8px;
		height: 8px;
		padding: 0;
		right: -1px;
		top: -1px;
	}
}

.liquid-dock__badge-text {
	font-size: 9px;
	font-weight: 700;
	color: #FFFFFF;
	line-height: 1;
}

/* --------------------------------------------------------------------------
 * 4. 暗色模式适配 (Theme Dark)
 * -------------------------------------------------------------------------- */
.theme-dark {
	.liquid-dock__surface-glass {
		background: rgba(28, 30, 38, 0.82);
		border-color: rgba(255, 255, 255, 0.16);
	}

	.liquid-dock__morph-backdrop {
		background: rgba(255, 255, 255, 0.14);
	}

	.liquid-dock__label--normal {
		color: #F1F5F9;
	}
}
</style>
