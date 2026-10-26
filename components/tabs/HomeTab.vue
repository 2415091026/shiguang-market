<template>
	<view class="immersive-home-page">
		<!-- ============================================================================
		     1. 顶部导航与搜索区 (位于原生 map 上方独立流式区域，杜绝 App 端原生地图层级遮挡)
		     ============================================================================ -->
		<view class="floating-top-header">
			<!-- 1.1 标题行：top 与 height 对齐安全区与微信小程序右上角原生胶囊 -->
			<view
				class="capsule-aligned-bar"
				:style="{
					marginTop: `${menuButtonRect.top}px`,
					height: `${menuButtonRect.height}px`,
					paddingRight: `${menuButtonRect.rightAvoid}px`
				}"
			>
				<view class="title-district-row">
					<text class="page-main-title">美食地图</text>
				</view>
			</view>

			<!-- 1.2 纯通栏毛玻璃胶囊搜索框（移除冗余“搜一下”按钮，完整展示 Placeholder） -->
			<view class="search-capsule-row">
				<view
					class="pure-glass-search-bar"
					:class="{ 'is-focused': isSearchFocused }"
				>
					<view class="search-leading-icon">
						<uni-icons type="search" size="17" color="#FF5500"></uni-icons>
					</view>
					<input
						v-model="searchKeyword"
						class="search-full-input"
						type="text"
						confirm-type="search"
						placeholder="搜索心仪美味、特色档口、探店视频..."
						placeholder-class="search-full-placeholder"
						@focus="isSearchFocused = true"
						@blur="isSearchFocused = false"
						@confirm="handleSearchConfirm"
					/>
					<view
						v-if="searchKeyword"
						class="search-clear-icon"
						@click.stop="handleClearKeyword"
					>
						<uni-icons type="clear" size="17" color="#94A3B8"></uni-icons>
					</view>
				</view>
			</view>

			<!-- 1.3 分类横向滚动栏（Category Pills）：紧贴搜索框下方，单胶囊独立毛玻璃 -->
			<view class="category-pills-row">
				<scroll-view
					class="category-scroll"
					scroll-x
					:show-scrollbar="false"
					enhanced
					:bounces="true"
				>
					<view class="category-pills-track">
						<view
							v-for="cat in categories"
							:key="cat.id"
							class="category-glass-pill"
							:class="{ 'is-active': activeCategory === cat.id }"
							@click="handleCategorySelect(cat.id)"
						>
							<uni-icons
								:type="cat.uniIcon"
								size="13"
								:color="activeCategory === cat.id ? '#FFFFFF' : '#FF5500'"
							></uni-icons>
							<text class="category-pill-label">{{ cat.name }}</text>
						</view>
					</view>
				</scroll-view>
			</view>
		</view>

		<!-- ============================================================================
		     2. 中间核心地图视口区域 (flex: 1 撑满中间区域，不越界遮挡 App 端顶部与底部 DOM)
		     ============================================================================ -->
		<view class="map-viewport">
			<map
				id="streetMap"
				class="fullscreen-map"
				:latitude="mapCenter.latitude"
				:longitude="mapCenter.longitude"
				:scale="mapScale"
				:markers="mapMarkers"
				:show-location="true"
				:enable-scroll="true"
				:enable-zoom="true"
				:enable-rotate="false"
				:show-compass="false"
				v-show="!isAppDrawerHidden"
				@markertap="handleMarkerTap"
				@callouttap="handleCalloutTap"
				@regionchange="handleRegionChange"
			>
				<!-- 右下角定位按钮：使用 cover-view + cover-image 确保在 App 端原生地图上方正常展示 -->
				<cover-view class="map-floating-controls">
					<cover-view class="control-btn" @click="resetLocation(false)">
						<cover-image class="control-icon-img" src="/static/icons/locate.png"></cover-image>
					</cover-view>
				</cover-view>
			</map>
		</view>

		<!-- ============================================================================
		     3. 底部 TabBar 物理停靠留白区 (让原生地图物理边界止于 TabBar 上方，App 端 100% 露底展示)
		     ============================================================================ -->
		<view class="tabbar-dock-spacer"></view>
	</view>
</template>

<script setup>
import { ref, computed, watch, onMounted, getCurrentInstance } from 'vue'
import { useTab } from '@/composables/useTab'
import { getNearbyShops, getShopDetail } from '@/api/shop.js'

const instance = getCurrentInstance()
let mapCtx = null

/**
 * 1. 顶部分类胶囊配置
 */
const categories = ref([
	{ id: 'all', name: '全部美味', uniIcon: 'shop-filled' },
	{ id: 'hotpot', name: '火锅串串', uniIcon: 'fire-filled' },
	{ id: 'bbq', name: '地摊烧烤', uniIcon: 'star-filled' },
	{ id: 'snack', name: '风味小吃', uniIcon: 'medal-filled' },
	{ id: 'southeast_asia', name: '异域风情', uniIcon: 'gift-filled' },
	{ id: 'drink', name: '微醺饮品', uniIcon: 'heart-filled' }
])

const activeCategory = ref('all')
const searchKeyword = ref('')
const isSearchFocused = ref(false)

/**
 * 2. 微信小程序右上角原生胶囊位置与尺寸信息（H5 端自适应顶部安全留白）
 */
const menuButtonRect = ref({
	top: 14,
	height: 34,
	rightAvoid: 14
})

const initMenuButtonAlignment = () => {
	try {
		const sysInfo = uni.getSystemInfoSync()
		const statusBarH = sysInfo?.statusBarHeight || 0
		const screenW = sysInfo?.screenWidth || 375

		if (typeof uni.getMenuButtonBoundingClientRect === 'function') {
			const rect = uni.getMenuButtonBoundingClientRect()
			if (rect && rect.top > 0 && rect.height > 0 && rect.left > 0) {
				const rightGap = Math.max(screenW - rect.left + 8, 96)
				menuButtonRect.value = {
					top: rect.top,
					height: rect.height,
					rightAvoid: rightGap
				}
				return
			}
		}

		// H5 / App 端：若 statusBarHeight 为 0，采用清爽的 14px 顶部间距
		menuButtonRect.value = {
			top: statusBarH > 0 ? statusBarH + 6 : 14,
			height: 34,
			rightAvoid: 14
		}
	} catch (e) {
		menuButtonRect.value = {
			top: 14,
			height: 34,
			rightAvoid: 14
		}
	}
}

/**
 * 3. 地图中心视野状态与用户当前真实定位（不使用 Mock 数据，无数据时展示空状态）
 */
const DEFAULT_INIT_COORDS = {
	latitude: 30.535585,
	longitude: 104.079722,
	scale: 16
}

const mapCenter = ref({
	latitude: DEFAULT_INIT_COORDS.latitude,
	longitude: DEFAULT_INIT_COORDS.longitude
})

const mapScale = ref(DEFAULT_INIT_COORDS.scale)

// 当前地图可视视野中心（随拖动 @regionchange 或定位动态更新）
const viewportCenter = ref({
	latitude: DEFAULT_INIT_COORDS.latitude,
	longitude: DEFAULT_INIT_COORDS.longitude
})

// 用户自己当前的真实 GPS 定位坐标
const userLocation = ref(null)

// 真实商户列表（初始为空数组，仅由后端接口真实返回填充）
const allShops = ref([])
const activeShopId = ref(null)
const isLocating = ref(false)

// 接入全局抽屉控制器（打破子组件堆叠上下文限制）
const { activeShopDetail, openShopDetail } = useTab()

/**
 * 计算两点间的球面距离（米）
 */
const calcDistanceMeters = (lat1, lng1, lat2, lng2) => {
	const radLat1 = (lat1 * Math.PI) / 180.0
	const radLat2 = (lat2 * Math.PI) / 180.0
	const a = radLat1 - radLat2
	const b = (lng1 * Math.PI) / 180.0 - (lng2 * Math.PI) / 180.0
	const s =
		2 *
		Math.asin(
			Math.sqrt(
				Math.pow(Math.sin(a / 2), 2) +
					Math.cos(radLat1) * Math.cos(radLat2) * Math.pow(Math.sin(b / 2), 2)
			)
		)
	return Math.round(s * 6378137.0)
}

/**
 * 从后端真实接口拉取当前视野中心的美食档口数据（无数据时置空，展示空状态）
 */
const fetchShopsFromBackend = async (
	lat = viewportCenter.value.latitude,
	lng = viewportCenter.value.longitude
) => {
	try {
		const kw = searchKeyword.value.trim()
		const res = await getNearbyShops({
			latitude: lat,
			longitude: lng,
			radius: 3000,
			category: activeCategory.value !== 'all' ? activeCategory.value : undefined,
			keyword: kw || undefined,
			sort: 'distance',
			limit: 50
		})
		if (res && Array.isArray(res.list)) {
			allShops.value = res.list.map((item) => ({
				...item,
				id: Number(item.id),
				cover: item.cover || item.image || '',
				distanceText:
					item.distance !== undefined && item.distance !== null ? `${item.distance}m` : '-',
				rating: item.rating || '',
				heat: item.heat || '',
				avgPrice: item.avgPrice || item.price || '',
				recommendTitle:
					item.recommendTitle ||
					(Array.isArray(item.signatures) && item.signatures.length > 0
						? item.signatures.join(' · ')
						: item.address || '-'),
				tags: item.tags || item.signatures || []
			}))
		} else {
			allShops.value = []
		}
	} catch (e) {
		allShops.value = []
	}
}

/**
 * 4. 动态计算当前地图视野内的美食档口列表 (visibleShops)
 * 若后端无数据或视野内无档口，返回 []，底部直接展示“当前地图视野暂无收录档口”空状态
 */
const visibleShops = computed(() => {
	const kw = searchKeyword.value.trim().toLowerCase()

	return allShops.value.filter((shop) => {
		if (activeCategory.value !== 'all' && shop.category !== activeCategory.value) {
			return false
		}

		if (kw) {
			const hitName = (shop.name || '').toLowerCase().includes(kw)
			const hitDesc = (shop.recommendTitle || '').toLowerCase().includes(kw)
			const hitTag = (shop.tags || shop.signatures || []).some((t) =>
				String(t).toLowerCase().includes(kw)
			)
			if (!hitName && !hitDesc && !hitTag) return false
		}

		const lat = Number(shop.latitude)
		const lng = Number(shop.longitude)
		if (Number.isNaN(lat) || Number.isNaN(lng)) return false

		const dist = calcDistanceMeters(
			viewportCenter.value.latitude,
			viewportCenter.value.longitude,
			lat,
			lng
		)
		return dist <= 3000
	})
})

/**
 * 5. 生成跨端兼容的地图美食图钉与用户当前位置图钉
 * 参考高德地图交互规范：
 * - 统一使用原有的同一张 marker 图标 (/static/icons/marker.png)，不再切换额外图标；
 * - 被点击选中的 marker 图标等比放大 (30px -> 42px)，锚点保持 { x: 0.5, y: 1 }（底尖紧贴实际经纬度）；
 * - 选中态 Marker 层级提升至最顶层 (zIndex: 999)，避免被周围其它未选中的标记遮挡。
 */
const currentActiveShopId = computed(() => {
	if (activeShopDetail.value) {
		return Number(activeShopDetail.value.id)
	}
	return activeShopId.value ? Number(activeShopId.value) : null
})

const mapMarkers = computed(() => {
	const activeId = currentActiveShopId.value

	const markers = visibleShops.value.map((shop) => {
		const isSelected = activeId === Number(shop.id)
		const ratingLabel = shop.rating ? ` (${shop.rating}分)` : ''
		return {
			id: Number(shop.id),
			latitude: Number(shop.latitude),
			longitude: Number(shop.longitude),
			title: shop.name || '-',
			// 统一使用原有的同一张 marker 图标
			iconPath: '/static/icons/marker.png',
			// 参考高德地图逻辑：被点击选中的 marker 图标等比放大 (30px -> 44px)
			width: isSelected ? 44 : 30,
			height: isSelected ? 44 : 30,
			// 锚点锁定在底尖中心，放大时底尖物理坐标严丝合缝，不产生漂移
			anchor: { x: 0.5, y: 1 },
			// 选中的 marker 提升至最高层级 (zIndex: 999)，避免被周围标记覆盖
			zIndex: isSelected ? 999 : 1,
			callout: {
				content: `🔥 ${shop.name || '-'}${ratingLabel}`,
				color: isSelected ? '#0F172A' : '#475569',
				fontSize: isSelected ? 13 : 11,
				borderRadius: 16,
				borderWidth: isSelected ? 1.5 : 1,
				borderColor: isSelected ? '#FF5500' : '#E2E8F0',
				bgColor: '#FFFFFF',
				padding: isSelected ? 8 : 6,
				display: isSelected ? 'ALWAYS' : 'BYCLICK',
				textAlign: 'center'
			}
		}
	})

	if (userLocation.value) {
		markers.push({
			id: 999999,
			latitude: Number(userLocation.value.latitude),
			longitude: Number(userLocation.value.longitude),
			title: '我的当前位置',
			iconPath: '/static/icons/marker-user.png',
			width: 32,
			height: 32,
			anchor: { x: 0.5, y: 0.5 },
			zIndex: 10
		})
	}

	return markers
})

/**
 * 7. 监听地图视野变化 (@regionchange)：实时刷新当前视野内的真实档口列表
 */
const handleRegionChange = (e) => {
	const eventType = e?.type || e?.detail?.type
	if (eventType && eventType !== 'end') return

	if (!mapCtx) {
		mapCtx = uni.createMapContext('streetMap', instance)
	}

	const detailCenter = e?.detail?.centerLocation
	if (
		detailCenter &&
		typeof detailCenter.latitude === 'number' &&
		typeof detailCenter.longitude === 'number'
	) {
		viewportCenter.value = {
			latitude: detailCenter.latitude,
			longitude: detailCenter.longitude
		}
		fetchShopsFromBackend(detailCenter.latitude, detailCenter.longitude)
		return
	}

	if (mapCtx && typeof mapCtx.getCenterLocation === 'function') {
		mapCtx.getCenterLocation({
			success: (res) => {
				if (res && typeof res.latitude === 'number' && typeof res.longitude === 'number') {
					viewportCenter.value = {
						latitude: res.latitude,
						longitude: res.longitude
					}
					fetchShopsFromBackend(res.latitude, res.longitude)
				}
			}
		})
	}
}

/**
 * 8. 定位到用户自己当前的位置 (resetLocation)
 * 无论何时点击，均直接调用 uni.getLocation 定位到用户自己当前的真实 GPS 坐标并移动地图中心
 */
const resetLocation = (silent = false) => {
	if (isLocating.value) return
	if (!mapCtx) {
		mapCtx = uni.createMapContext('streetMap', instance)
	}
	isLocating.value = true
	if (!silent) {
		uni.showLoading({ title: '定位中...' })
	}

	uni.getLocation({
		type: 'gcj02',
		success: (res) => {
			isLocating.value = false
			if (!silent) {
				uni.hideLoading()
			}
			const lat = Number(res.latitude)
			const lng = Number(res.longitude)

			userLocation.value = { latitude: lat, longitude: lng }
			mapCenter.value = { latitude: lat, longitude: lng }
			viewportCenter.value = { latitude: lat, longitude: lng }
			mapScale.value = 16

			if (mapCtx && typeof mapCtx.moveToLocation === 'function') {
				mapCtx.moveToLocation({
					latitude: lat,
					longitude: lng
				})
			}

			fetchShopsFromBackend(lat, lng)
			if (!silent) {
				uni.showToast({ title: '已定位到当前位置', icon: 'none' })
			}
		},
		fail: () => {
			isLocating.value = false
			if (!silent) {
				uni.hideLoading()
				uni.showToast({
					title: '定位失败，请检查定位权限是否开启',
					icon: 'none'
				})
			}
			// 若已有上一次记录的用户位置，则回到该位置并刷新
			if (userLocation.value) {
				const { latitude, longitude } = userLocation.value
				mapCenter.value = { latitude, longitude }
				viewportCenter.value = { latitude, longitude }
				if (mapCtx && typeof mapCtx.moveToLocation === 'function') {
					mapCtx.moveToLocation({ latitude, longitude })
				}
				fetchShopsFromBackend(latitude, longitude)
			} else {
				fetchShopsFromBackend()
			}
		}
	})
}

const handleCategorySelect = (catId) => {
	activeCategory.value = catId
	fetchShopsFromBackend()
}

const handleSearchConfirm = async () => {
	await fetchShopsFromBackend()
	const kw = searchKeyword.value.trim()
	if (!kw) return
	if (visibleShops.value.length > 0) {
		handleFocusShop(visibleShops.value[0], false)
	} else {
		uni.showToast({
			title: `当前视野未找到“${kw}”`,
			icon: 'none'
		})
	}
}

const handleClearKeyword = () => {
	searchKeyword.value = ''
	fetchShopsFromBackend()
}

// 在 App 端原生地图层级高于普通 Webview 抽屉，抽屉弹出时在 App 端隐藏原生地图避免遮挡
const isAppDrawerHidden = computed(() => {
	// #ifdef APP-PLUS
	return !!activeShopDetail.value
	// #endif
	// #ifndef APP-PLUS
	return false
	// #endif
})

const handleMarkerTap = (e) => {
	const markerId = Number(e?.detail?.markerId ?? e?.markerId)
	if (!markerId) return
	if (markerId === 999999) {
		uni.showToast({ title: '这是您的当前位置', icon: 'none' })
		return
	}
	// 双重兜底查找对应商家实体（类型严格转换为数字对比）
	let target = allShops.value.find((s) => Number(s.id) === markerId)
	if (!target) {
		target = visibleShops.value.find((s) => Number(s.id) === markerId)
	}
	if (target) {
		handleFocusShop(target, true)
	}
}

const handleCalloutTap = (e) => {
	const markerId = Number(e?.detail?.markerId ?? e?.markerId)
	if (!markerId || markerId === 999999) return
	let target = allShops.value.find((s) => Number(s.id) === markerId)
	if (!target) {
		target = visibleShops.value.find((s) => Number(s.id) === markerId)
	}
	if (target) {
		handleFocusShop(target, true)
	}
}

const handleFocusShop = (shop, openDetail = true) => {
	if (!shop) return
	activeShopId.value = Number(shop.id)
	mapCenter.value = {
		latitude: Number(shop.latitude),
		longitude: Number(shop.longitude)
	}
	viewportCenter.value = {
		latitude: Number(shop.latitude),
		longitude: Number(shop.longitude)
	}
	if (openDetail) {
		handleOpenShopDetail(shop)
	}
}

const handleOpenShopDetail = async (shop) => {
	if (!shop) return
	activeShopId.value = Number(shop.id)
	// 立即调用全局开窗方法，0 毫秒即刻拉起最外层最高层级抽屉！
	openShopDetail(shop)

	try {
		const detail = await getShopDetail(shop.id, {
			latitude: mapCenter.value.latitude,
			longitude: mapCenter.value.longitude
		})
		if (detail && activeShopDetail.value && Number(activeShopDetail.value.id) === Number(shop.id)) {
			activeShopDetail.value = {
				...activeShopDetail.value,
				...detail
			}
		}
	} catch (e) {
		console.warn('获取商户详情异常:', e)
	}
}



const handleRefreshShopDetail = (shopId) => {
	fetchShopsFromBackend()
	const found = allShops.value.find((s) => s.id === Number(shopId))
	if (found) {
		handleOpenShopDetail(found)
	}
}

const handleNavigateToShop = (shop) => {
	if (!shop) return
	uni.openLocation({
		latitude: Number(shop.latitude),
		longitude: Number(shop.longitude),
		name: shop.name || '-',
		address: shop.address || '-'
	})
}

// 联动监听全局抽屉显隐：当用户关闭详情抽屉时，自动重置选中态，Marker 恢复默认尺寸
watch(activeShopDetail, (newVal) => {
	if (!newVal) {
		activeShopId.value = null
	} else {
		activeShopId.value = Number(newVal.id)
	}
})


onMounted(() => {
	initMenuButtonAlignment()
	mapCtx = uni.createMapContext('streetMap', instance)
	// 初始化时自动定位到用户自己当前位置并拉取附近真实档口
	resetLocation(true)
})
</script>

<style scoped lang="scss">
/* ==========================================================================
 * 1. 三段式弹性视口容器（兼容 App 端原生 map 层级机制，彻底杜绝原生地图遮挡顶部与底部 UI）
 * ========================================================================== */
.immersive-home-page {
	position: relative;
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 100vh;
	overflow: hidden;
	box-sizing: border-box;
	background: linear-gradient(180deg, #FDF8F5 0%, #F4F7FA 100%);
}

.map-viewport {
	position: relative;
	flex: 1;
	width: 100%;
	min-height: 0;
	overflow: hidden;
}

.fullscreen-map {
	width: 100%;
	height: 100%;
}

/* 地图内右下角原生 cover-view 定位按钮（App 端原生地图上方 100% 透出） */
.map-floating-controls {
	position: absolute;
	right: 28rpx;
	bottom: 24rpx;
	display: flex;
	flex-direction: column;
	z-index: 50;
}

.control-btn {
	width: 80rpx;
	height: 80rpx;
	border-radius: 24rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: rgba(255, 255, 255, 0.95);
	border: 1.5rpx solid rgba(255, 255, 255, 0.9);
	box-shadow: 0 6rpx 20rpx rgba(15, 23, 42, 0.14);
}

.control-icon-img {
	width: 44rpx;
	height: 44rpx;
}

/* ==========================================================================
 * 2. 顶部导航与搜索区 (独立于原生 map 上方，App 端 100% 可见可交互)
 * ========================================================================== */
.floating-top-header {
	position: relative;
	flex-shrink: 0;
	z-index: 30;
	padding: 0 24rpx 16rpx 24rpx;
	box-sizing: border-box;
	background: linear-gradient(
		180deg,
		rgba(255, 252, 249, 0.92) 0%,
		rgba(255, 249, 244, 0.82) 100%
	);
	-webkit-backdrop-filter: blur(20px) saturate(180%);
	backdrop-filter: blur(20px) saturate(180%);
	border-bottom: 1px solid rgba(255, 255, 255, 0.88);
	box-shadow: 0 6rpx 20rpx rgba(15, 23, 42, 0.04);
}

/* 2.1 严格对齐微信右上角原生胶囊按钮的单行标题栏 */
.capsule-aligned-bar {
	display: flex;
	align-items: center;
	box-sizing: border-box;
}

.title-district-row {
	display: flex;
	align-items: center;
	gap: 16rpx;
	min-width: 0;
}

.page-main-title {
	font-size: 38rpx;
	font-weight: 800;
	color: #0F172A;
	letter-spacing: 0.5rpx;
	white-space: nowrap;
}

/* 2.2 纯通栏毛玻璃胶囊搜索框（无右侧实体按钮） */
.search-capsule-row {
	margin-top: 14rpx;
}

.pure-glass-search-bar {
	display: flex;
	align-items: center;
	height: 76rpx;
	padding: 0 28rpx;
	border-radius: 9999rpx;
	background: rgba(255, 255, 255, 0.88);
	-webkit-backdrop-filter: blur(12px) saturate(180%);
	backdrop-filter: blur(12px) saturate(180%);
	border: 1px solid rgba(255, 255, 255, 0.96);
	box-shadow:
		0 6rpx 18rpx rgba(15, 23, 42, 0.05),
		inset 0 1px 2px rgba(255, 255, 255, 0.95);
	transition: all 0.2s ease;

	&.is-focused {
		background: rgba(255, 255, 255, 0.96);
		border-color: rgba(255, 85, 0, 0.45);
		box-shadow:
			0 8rpx 26rpx rgba(255, 85, 0, 0.14),
			inset 0 1px 2px rgba(255, 255, 255, 0.98);
	}
}

.search-leading-icon {
	display: flex;
	align-items: center;
	justify-content: center;
	margin-right: 14rpx;
	flex-shrink: 0;
}

.search-full-input {
	flex: 1;
	min-width: 0;
	height: 100%;
	font-size: 26rpx;
	color: #0F172A;
	background: transparent;
}

.search-full-placeholder {
	font-size: 25rpx;
	color: #64748B;
}

.search-clear-icon {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 8rpx;
	margin-left: 8rpx;
}

/* 2.3 分类横向滚动胶囊栏（背景透明，单胶囊独立毛玻璃白底） */
.category-pills-row {
	margin-top: 14rpx;
	background: transparent;
}

.category-scroll {
	width: 100%;
	white-space: nowrap;
	background: transparent;
}

.category-pills-track {
	display: inline-flex;
	align-items: center;
	gap: 14rpx;
	padding: 2rpx 2rpx 6rpx 2rpx;
}

.category-glass-pill {
	display: inline-flex;
	align-items: center;
	height: 58rpx;
	padding: 0 24rpx;
	border-radius: 9999rpx;
	background: rgba(255, 255, 255, 0.90);
	-webkit-backdrop-filter: blur(12px) saturate(180%);
	backdrop-filter: blur(12px) saturate(180%);
	border: 1px solid rgba(255, 255, 255, 0.95);
	box-shadow: 0 4rpx 14rpx rgba(15, 23, 42, 0.05);
	flex-shrink: 0;
	transition: all 0.2s cubic-bezier(0.22, 1, 0.36, 1);

	&:active {
		transform: scale(0.95);
	}

	&.is-active {
		background: linear-gradient(135deg, #FF6B2B, #FF4100);
		border-color: rgba(255, 255, 255, 0.45);
		box-shadow: 0 6rpx 18rpx rgba(255, 65, 0, 0.34);

		.category-pill-label {
			color: #FFFFFF;
			font-weight: 700;
		}
	}
}

.category-pill-label {
	font-size: 24rpx;
	font-weight: 600;
	color: #334155;
	margin-left: 8rpx;
	line-height: 1;
}

/* 底部 TabBar 物理停靠留白区（确保地图物理高度止于 TabBar 之上，App 端 100% 露底呈现） */
.tabbar-dock-spacer {
	position: relative;
	width: 100%;
	height: calc(env(safe-area-inset-bottom) + 148rpx);
	flex-shrink: 0;
	background: linear-gradient(
		180deg,
		rgba(255, 255, 255, 0.72) 0%,
		rgba(248, 250, 252, 0.96) 100%
	);
	-webkit-backdrop-filter: blur(20px);
	backdrop-filter: blur(20px);
	border-top: 1px solid rgba(255, 255, 255, 0.95);
	box-sizing: border-box;
	z-index: 10;
}
</style>

