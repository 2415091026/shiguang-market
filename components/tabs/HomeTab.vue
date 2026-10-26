<template>
	<view class="tab-page home-tab">
		<!-- 顶部 iOS 26 Liquid Glass 液态玻璃导航栏（多端自适应安全区与小程序胶囊避让） -->
		<view 
			class="header-section" 
			:style="{ 
				paddingTop: (statusBarHeight > 0 ? statusBarHeight : 44) + 'px' 
			}"
		>
			<!-- 顶部边缘高光反射层（不阻挡任何点击） -->
			<view class="header-glass-specular" aria-hidden="true"></view>

			<!-- 1. 品牌与操作栏（高度对齐安全基准，右侧动态避让小程序胶囊） -->
			<view 
				class="nav-headline-bar" 
				:style="{ 
					minHeight: navBarHeight + 'px',
					paddingRight: (capsulePaddingRight > 0 ? capsulePaddingRight : 0) + 'px' 
				}"
			>
				<!-- 左侧：品牌区域 + 商圈选择器 -->
				<view class="brand-identity-left">
					<!-- 美食主题 Logo -->
					<view class="brand-logo-frame" @click="handleResetDistrict">
						<image class="brand-logo-img" src="/static/logo.png" mode="aspectFit" />
					</view>
					
					<!-- 品牌标题、副标题与商圈选择器 -->
					<view class="brand-meta-column">
						<view class="brand-title-row">
							<text class="brand-main-title">美食地图</text>
							<!-- 当前商圈选择器胶囊（空间不足时优先压缩宽度，不挤压标题） -->
							<view 
								class="location-pill-chip" 
								:class="{ 'is-locating': isLocating }"
								@click="handleDistrictSelect"
							>
								<view class="chip-pin-icon">
									<uni-icons type="location-filled" size="12" color="#FF6B35"></uni-icons>
								</view>
								<text class="chip-location-name">{{ currentDistrictLabel }}</text>
								<view class="chip-arrow-icon">
									<uni-icons type="bottom" size="10" color="#FF6B35"></uni-icons>
								</view>
							</view>
						</view>
						<view class="brand-slogan-row">
							<text class="brand-sub-slogan">发现身边的美味</text>
						</view>
					</view>
				</view>

				<!-- 右侧：两个圆形快捷操作按钮（定位 + 扫码） -->
				<!-- #ifndef MP -->
				<view class="nav-right-tools">
					<view 
						class="tool-circle-btn tool-circle-btn--locate" 
						:class="{ 'is-loading': isLocating }"
						@click="handleLocate"
					>
						<view class="tool-icon-spin" v-if="isLocating">
							<uni-icons type="reload" size="17" color="#FF6B35"></uni-icons>
						</view>
						<uni-icons v-else type="location-filled" size="18" color="#FF6B35"></uni-icons>
					</view>
					<view 
						class="tool-circle-btn tool-circle-btn--scan" 
						@click="handleScanClick"
					>
						<uni-icons type="scan" size="17" color="#334155"></uni-icons>
					</view>
				</view>
				<!-- #endif -->
			</view>

			<!-- 2. 搜索栏：横向 Liquid Glass 搜索胶囊 -->
			<view class="search-box">
				<view 
					class="search-capsule" 
					:class="{ 'is-focused': isSearchFocused }"
				>
					<!-- 局部暖色微反射层（仅在搜索按钮侧产生克制的淡橙色环境漫反射） -->
					<view class="search-warm-reflection" aria-hidden="true"></view>

					<view class="search-left">
						<view class="search-icon-badge">
							<uni-icons type="search" size="16" color="#FF6B35"></uni-icons>
						</view>
						<input
							v-model="searchKeyword"
							class="search-input"
							type="text"
							confirm-type="search"
							placeholder="搜索心仪美味、特色档口、探店视频..."
							placeholder-class="search-placeholder"
							@focus="handleSearchFocus"
							@blur="handleSearchBlur"
							@confirm="handleSearchSubmit"
						/>
						<!-- 清空按钮：有输入内容时显示 -->
						<view 
							v-if="searchKeyword" 
							class="search-clear-btn" 
							@click.stop="handleClearSearch"
						>
							<uni-icons type="clear" size="16" color="#94A3B8"></uni-icons>
						</view>
					</view>

					<view class="search-action-btn" @click.stop="handleSearchSubmit">
						<text class="search-btn-txt">搜一下</text>
					</view>
				</view>
			</view>

			<!-- 顶部分类标签流：单行横向丝滑滑动胶囊流 -->
			<view class="category-scroll-wrapper">
				<scroll-view class="category-scroll-view" scroll-x :show-scrollbar="false" enhanced :bounces="true">
					<view class="category-scroll-inner">
						<view
							v-for="cat in categoryList"
							:key="cat.id"
							class="category-pill-chip"
							:class="{ 'is-active': activeCategoryId === cat.id }"
							@click="handleSelectCategory(cat.id)"
						>
							<view class="category-icon-wrap">
								<uni-icons 
									:type="cat.uniIcon || 'shop'" 
									size="13" 
									:color="activeCategoryId === cat.id ? '#FFFFFF' : '#FF6B35'"
								></uni-icons>
							</view>
							<text class="category-chip-name">{{ cat.name }}</text>
						</view>
					</view>
				</scroll-view>
			</view>
		</view>

		<!-- 中间地图核心视口区域（基于原生 map 组件，flex: 1 撑满剩余高度） -->
		<view class="map-viewport">
			<map
				id="streetMap"
				class="real-market-map"
				:latitude="mapState.latitude"
				:longitude="mapState.longitude"
				:scale="mapState.scale"
				:markers="displayMarkers"
				:show-location="true"
				:enable-scroll="true"
				:enable-zoom="true"
				:enable-rotate="false"
				:show-compass="false"
				@markertap="handleMarkerTap"
				@callouttap="handleCalloutTap"
				@tap="handleMapTap"
			>
				<!-- 右侧地图操作浮动工具栏（使用 cover-view 保证在 App 端原生地图上方透出） -->
				<cover-view class="map-floating-controls">
					<cover-view class="control-btn" @click="handleLocate">
						<cover-image class="control-icon-img" src="/static/icons/locate.png"></cover-image>
					</cover-view>
				</cover-view>
			</map>
		</view>

		<!-- 底部商户与推荐卡片独立停靠区（iOS 高透液态玻璃系统，抽屉式智能展开） -->
		<view class="bottom-card-section" :class="{ 'is-drawer-open': !!selectedShop }">
			<!-- 环境折射光晕层（为高透液态玻璃提供折射源，让纯净水滴与玻璃质感生动显现） -->
			<view class="ambient-glow glow-warm"></view>
			<view class="ambient-glow glow-cyan"></view>

			<!-- 底部抽屉式商户深度详情面板（已抽取为独立组件，实现高内聚解耦） -->
			<ShopDrawer 
				:shop="selectedShop" 
				@close="handleCloseShopDetail" 
				@navigate="handleNavigateToShop" 
				@refresh="handleRefreshShopDetail"
			/>

			<!-- 底部默认热门推荐快捷卡片（未选中商户时展示） -->
			<view 
				v-if="!selectedShop" 
				class="bottom-quick-card" 
				@click="handleNearbyClick"
			>
				<view class="quick-badge">
					<image class="quick-badge-icon" src="/static/icons/marker.png" mode="aspectFit"></image>
				</view>
				<view class="quick-info">
					<view class="quick-title-row">
						<text class="quick-title">附近精选档口 ({{ displayMarkers.length - (userLocation ? 1 : 0) }}家)</text>
						<view class="live-dot-pill">
							<text class="live-dot"></text>
							<text class="live-txt">探索中</text>
						</view>
					</view>
					<text class="quick-sub">点击地图上任意商户图钉，即可查看视频探店与点评</text>
				</view>
				<view class="quick-arrow-box">
					<uni-icons type="right" size="14" color="#94A3B8"></uni-icons>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, computed, onMounted, getCurrentInstance } from 'vue'
import { useSafeArea } from '@/composables/useSafeArea'
import ShopDrawer from '@/components/ShopDrawer.vue'
import { getNearbyShops, getShopDetail } from '@/api/shop.js'

// 获取多端状态栏与小程序胶囊安全区（支持运行时自愈校准）
const { statusBarHeight, navBarHeight, capsulePaddingRight, updateSafeArea } = useSafeArea()
const instance = getCurrentInstance()
let mapContext = null

// 美食街核心地理坐标（与后端 MySQL 8.2 数据库商户坐标系精准对齐：31.2304, 121.4737）
const DEFAULT_COORDS = {
	latitude: 31.2304,
	longitude: 121.4737,
	scale: 16
}

// 地图当前响应式状态
const mapState = ref({
	latitude: DEFAULT_COORDS.latitude,
	longitude: DEFAULT_COORDS.longitude,
	scale: DEFAULT_COORDS.scale
})

// 当前选中的商户（为空时展示总览推荐卡片）
const selectedShop = ref(null)

// 顶部分类列表（与后端真实品类字典对齐，统一使用矢量图标替换 Emoji）
const categoryList = ref([
	{ id: 'all', name: '全部美味', icon: '🍴', uniIcon: 'shop-filled' },
	{ id: 'hotpot', name: '火锅串串', icon: '🍲', uniIcon: 'fire-filled' },
	{ id: 'bbq', name: '地摊烧烤', icon: '🍢', uniIcon: 'star-filled' },
	{ id: 'snack', name: '风味小吃', icon: '🍜', uniIcon: 'medal-filled' },
	{ id: 'southeast_asia', name: '异域风情', icon: '🥥', uniIcon: 'gift-filled' },
	{ id: 'drink', name: '微醺饮品', icon: '🍺', uniIcon: 'heart-filled' }
])

// 当前选中的分类
const activeCategoryId = ref('all')

// 响应式商户列表（从后端真实 MySQL 数据库动态拉取）
const shopList = ref([])

// 用户当前物理 GPS 定位位置
const userLocation = ref(null)

// 定位加载状态（防止重复点击并提供按钮旋转反馈）
const isLocating = ref(false)

// 可切换商圈列表（复用美食街核心坐标与周边点位）
const districtOptions = [
	{ name: '望平街商圈', latitude: 31.2304, longitude: 121.4737, scale: 16 },
	{ name: '建设路夜市', latitude: 31.2328, longitude: 121.4765, scale: 16 },
	{ name: '玉林路街区', latitude: 31.2282, longitude: 121.4708, scale: 16 }
]

// 当前选中的商圈名称
const selectedDistrictName = ref('望平街商圈')

// 顶部商圈胶囊展示文本
const currentDistrictLabel = computed(() => {
	if (selectedDistrictName.value) {
		return selectedDistrictName.value
	}
	return userLocation.value ? '我的周边' : '望平街商圈'
})

// 搜索栏状态：输入关键词、已生效过滤关键词、输入框聚焦态
const searchKeyword = ref('')
const activeSearchKeyword = ref('')
const isSearchFocused = ref(false)

/**
 * 从后端 MySQL 8.0 接口真实召回附近美食商家（基于原生 ST_Distance_Sphere 空间计算）
 * @param {number} centerLat 
 * @param {number} centerLng 
 * @param {string} category 
 * @param {string} keyword 
 */
const fetchNearbyShops = async (
	centerLat,
	centerLng,
	category = activeCategoryId.value,
	keyword = activeSearchKeyword.value
) => {
	try {
		const res = await getNearbyShops({
			latitude: centerLat,
			longitude: centerLng,
			radius: 20000, // 覆盖 20km 范围内特色档口
			category: category !== 'all' ? category : undefined,
			keyword: keyword ? keyword.trim() : undefined,
			sort: 'distance',
			limit: 50
		})
		if (res && res.list) {
			shopList.value = res.list
		}
	} catch (err) {
		console.error('拉取附近商家失败:', err)
	}
}

/**
 * 计算两个经纬度坐标之间的直线物理距离（米）
 * @param {number} lat1 
 * @param {number} lng1 
 * @param {number} lat2 
 * @param {number} lng2 
 */
const getDistanceBetweenPoints = (lat1, lng1, lat2, lng2) => {
	const radLat1 = (lat1 * Math.PI) / 180.0
	const radLat2 = (lat2 * Math.PI) / 180.0
	const a = radLat1 - radLat2
	const b = (lng1 * Math.PI) / 180.0 - (lng2 * Math.PI) / 180.0
	const s = 2 * Math.asin(
		Math.sqrt(
			Math.pow(Math.sin(a / 2), 2) +
			Math.cos(radLat1) * Math.cos(radLat2) * Math.pow(Math.sin(b / 2), 2)
		)
	)
	return Math.round(s * 6378137.0)
}

// 响应分类与搜索关键词动态筛选的地图标记点集合（Markers）
// 彻底去除 callout 气泡，点击 Marker 时不弹出 pop，直接聚焦并平滑拉起底部抽屉面板
const displayMarkers = computed(() => {
	let list = activeCategoryId.value === 'all'
		? shopList.value
		: shopList.value.filter(s => s.category === activeCategoryId.value)

	const kw = activeSearchKeyword.value.trim().toLowerCase()
	if (kw) {
		list = list.filter(shop => {
			const nameMatch = (shop.name || '').toLowerCase().includes(kw)
			const addrMatch = (shop.address || '').toLowerCase().includes(kw)
			const catMatch = (shop.categoryName || '').toLowerCase().includes(kw)
			const sigMatch = Array.isArray(shop.signatures)
				? shop.signatures.some(item => String(item).toLowerCase().includes(kw))
				: false
			return nameMatch || addrMatch || catMatch || sigMatch
		})
	}

	const markers = list.map(shop => {
		const isSelected = selectedShop.value && selectedShop.value.id === shop.id
		return {
			id: Number(shop.id),
			latitude: Number(shop.latitude),
			longitude: Number(shop.longitude),
			title: shop.name,
			// 商家选择与未选择均统一使用 /static/icons/marker.png 图标
			iconPath: '/static/icons/marker.png',
			width: isSelected ? 38 : 32,
			height: isSelected ? 38 : 32,
			anchor: { x: 0.5, y: 1 } // 底部针尖精准锚定地理坐标
		}
	})

	// 若存在用户真实物理定位，注入经典蓝色定位光环 Marker
	if (userLocation.value) {
		markers.push({
			id: 999999,
			latitude: Number(userLocation.value.latitude),
			longitude: Number(userLocation.value.longitude),
			title: '我的当前位置',
			iconPath: '/static/icons/marker-user.png',
			width: 32,
			height: 32,
			anchor: { x: 0.5, y: 0.5 }
		})
	}

	return markers
})

/**
 * 切换分类过滤
 * @param {string} id - 分类ID
 */
const handleSelectCategory = (id) => {
	activeCategoryId.value = id
	// 若当前选中的档口不在过滤结果中，则复位选中态
	if (selectedShop.value && activeCategoryId.value !== 'all' && selectedShop.value.category !== id) {
		selectedShop.value = null
	}
	// 重新向后端发起真实分类筛选召回
	fetchNearbyShops(mapState.value.latitude, mapState.value.longitude, id)
}

/**
 * 点击标记点事件
 * @param {object} e - 标记事件载荷
 */
// 标记 Marker 点击保护锁，杜绝微信小程序等平台点击 Marker 时冒泡连带触发 map 的 tap 事件
let isMarkerTapping = false
let lastMarkerTapTime = 0

/**
 * 点击标记点事件
 * @param {object} e - 标记事件载荷
 */
const handleMarkerTap = (e) => {
	isMarkerTapping = true
	lastMarkerTapTime = Date.now()
	const markerId = e.detail?.markerId ?? e.markerId
	selectShopById(Number(markerId))
	
	// 450ms 内锁定，阻止小程序同一动作连带触发 map 的 tap 事件
	setTimeout(() => {
		isMarkerTapping = false
	}, 450)
}

/**
 * 点击气泡事件
 * @param {object} e - 气泡事件载荷
 */
const handleCalloutTap = (e) => {
	isMarkerTapping = true
	lastMarkerTapTime = Date.now()
	const markerId = e.detail?.markerId ?? e.markerId
	selectShopById(Number(markerId))

	setTimeout(() => {
		isMarkerTapping = false
	}, 450)
}

/**
 * 根据ID选中商户并平滑聚焦展开抽屉，并异步从后端精准加载该商户完整的探店评测视频与真实用户 UGC 推荐列表
 * @param {number} id - 商户ID
 */
const selectShopById = async (id) => {
	if (id === 999999) {
		uni.showToast({
			title: '这是您的当前位置',
			icon: 'none'
		})
		return
	}
	const found = shopList.value.find(s => s.id === id)
	if (found) {
		selectedShop.value = found
		mapState.value.latitude = found.latitude
		mapState.value.longitude = found.longitude

		// 异步从 MySQL 联表精准获取评测视频流与 UGC 推荐
		try {
			const detail = await getShopDetail(found.id, {
				latitude: userLocation.value?.latitude || mapState.value.latitude,
				longitude: userLocation.value?.longitude || mapState.value.longitude
			})
			if (detail && selectedShop.value && selectedShop.value.id === found.id) {
				selectedShop.value = {
					...selectedShop.value,
					...detail
				}
			}
		} catch (err) {
			console.error('获取商户详情失败:', err)
		}
	}
}

/**
 * 刷新当前选中的商户详情（例如用户在抽屉内发布了新推荐）
 * @param {number} shopId
 */
const handleRefreshShopDetail = (shopId) => {
	if (shopId) {
		selectShopById(Number(shopId))
		// 同时刷新周边商户列表
		fetchNearbyShops(mapState.value.latitude, mapState.value.longitude)
	}
}

/**
 * 点击地图空白处（自动收起底部抽屉）
 */
const handleMapTap = () => {
	// 防冒泡拦截：若处于 Marker 点击后 450ms 保护期内，说明是小程序的事件连带冒泡，忽略该事件
	if (isMarkerTapping || (Date.now() - lastMarkerTapTime < 450)) {
		return
	}
	if (selectedShop.value) {
		handleCloseShopDetail()
	}
}

/**
 * 关闭商户详情抽屉，恢复总览推荐
 */
const handleCloseShopDetail = () => {
	selectedShop.value = null
}

/**
 * 唤起系统/小程序原生高精度地图导航
 * @param {object} shop - 目标商户
 */
const handleNavigateToShop = (shop) => {
	if (!shop) return
	uni.openLocation({
		latitude: shop.latitude,
		longitude: shop.longitude,
		name: shop.name,
		address: shop.address || (shop.signatures ? shop.signatures.join('、') : '美食街档口'),
		success: () => {
			console.log('唤起地图导航成功')
		},
		fail: () => {
			uni.showToast({
				title: '打开地图导航失败',
				icon: 'none'
			})
		}
	})
}

/**
 * 复位至默认核心商圈（点击品牌 Logo）
 */
const handleResetDistrict = () => {
	selectedDistrictName.value = '望平街商圈'
	activeSearchKeyword.value = ''
	searchKeyword.value = ''
	selectedShop.value = null
	mapState.value.latitude = DEFAULT_COORDS.latitude
	mapState.value.longitude = DEFAULT_COORDS.longitude
	mapState.value.scale = DEFAULT_COORDS.scale
	fetchNearbyShops(DEFAULT_COORDS.latitude, DEFAULT_COORDS.longitude, activeCategoryId.value, '')
}

/**
 * 商圈选择器点击事件：支持切换核心美食街商圈或触发实时定位
 */
const handleDistrictSelect = () => {
	const itemList = [
		...districtOptions.map(item => item.name),
		'定位到我的周边'
	]
	uni.showActionSheet({
		itemList,
		success: (res) => {
			const idx = res.tapIndex
			if (idx === districtOptions.length) {
				handleLocate()
				return
			}
			const target = districtOptions[idx]
			if (target) {
				selectedDistrictName.value = target.name
				selectedShop.value = null
				mapState.value.latitude = target.latitude
				mapState.value.longitude = target.longitude
				mapState.value.scale = target.scale
				fetchNearbyShops(target.latitude, target.longitude)
				uni.showToast({
					title: `已切换至${target.name}`,
					icon: 'none'
				})
			}
		}
	})
}

/**
 * 搜索输入框聚焦与失焦处理
 */
const handleSearchFocus = () => {
	isSearchFocused.value = true
}

const handleSearchBlur = () => {
	isSearchFocused.value = false
}

/**
 * 清空搜索关键词并恢复当前街区全部档口
 */
const handleClearSearch = () => {
	searchKeyword.value = ''
	if (activeSearchKeyword.value) {
		activeSearchKeyword.value = ''
		fetchNearbyShops(mapState.value.latitude, mapState.value.longitude, activeCategoryId.value, '')
	}
}

/**
 * 提交搜索（支持点击“搜一下”按钮或软键盘/回车键 Enter 提交）
 */
const handleSearchSubmit = async () => {
	const kw = searchKeyword.value.trim()
	activeSearchKeyword.value = kw

	if (!kw) {
		await fetchNearbyShops(mapState.value.latitude, mapState.value.longitude, activeCategoryId.value, '')
		uni.showToast({
			title: '请输入想寻找的美味或档口名称',
			icon: 'none'
		})
		return
	}

	await fetchNearbyShops(mapState.value.latitude, mapState.value.longitude, activeCategoryId.value, kw)

	const kwLower = kw.toLowerCase()
	const matched = shopList.value.filter(shop => {
		const nameMatch = (shop.name || '').toLowerCase().includes(kwLower)
		const addrMatch = (shop.address || '').toLowerCase().includes(kwLower)
		const catMatch = (shop.categoryName || '').toLowerCase().includes(kwLower)
		const sigMatch = Array.isArray(shop.signatures)
			? shop.signatures.some(item => String(item).toLowerCase().includes(kwLower))
			: false
		return nameMatch || addrMatch || catMatch || sigMatch
	})

	if (matched.length > 0) {
		selectShopById(Number(matched[0].id))
		uni.showToast({
			title: `找到 ${matched.length} 家相关美味档口`,
			icon: 'none'
		})
	} else {
		selectedShop.value = null
		uni.showToast({
			title: `未找到与“${kw}”相关的档口`,
			icon: 'none'
		})
	}
}

/**
 * 兼容保留原有搜索框点击方法
 */
const handleSearchClick = () => {
	handleSearchSubmit()
}

/**
 * 扫码快捷入口点击事件（保留现有提示机制，绝不伪造扫码成功结果）
 */
const handleScanClick = () => {
	// #ifdef APP-PLUS || MP
	if (typeof uni.scanCode === 'function') {
		uni.scanCode({
			onlyFromCamera: false,
			success: (res) => {
				if (res && res.result) {
					searchKeyword.value = String(res.result)
					handleSearchSubmit()
				}
			},
			fail: (err) => {
				if (err && err.errMsg && !err.errMsg.includes('cancel')) {
					uni.showToast({
						title: '扫码未识别，请重试',
						icon: 'none'
					})
				}
			}
		})
		return
	}
	// #endif
	uni.showToast({
		title: '打开扫码识别',
		icon: 'none'
	})
}

/**
 * 地图定位点击事件（真机高精度定位 + 加载态与错误提示机制，不伪造定位成功）
 */
const handleLocate = () => {
	if (isLocating.value) return
	if (!mapContext) {
		mapContext = uni.createMapContext('streetMap', instance)
	}
	isLocating.value = true
	uni.showLoading({ title: '定位中...' })
	uni.getLocation({
		type: 'gcj02',
		success: (res) => {
			isLocating.value = false
			uni.hideLoading()
			const userLat = Number(res.latitude)
			const userLng = Number(res.longitude)

			// 记录用户当前 GPS 真实位置
			userLocation.value = {
				latitude: userLat,
				longitude: userLng
			}
			selectedDistrictName.value = '我的周边'

			// 计算与默认美食商圈的物理距离
			const distToDefault = getDistanceBetweenPoints(
				userLat,
				userLng,
				DEFAULT_COORDS.latitude,
				DEFAULT_COORDS.longitude
			)

			// 向后端 MySQL 真实接口拉取以用户当前位置为中心的附近美食商户
			fetchNearbyShops(userLat, userLng)

			// 更新地图视口与缩放
			mapState.value.latitude = userLat
			mapState.value.longitude = userLng
			mapState.value.scale = 16

			if (mapContext) {
				mapContext.moveToLocation({
					latitude: userLat,
					longitude: userLng
				})
			}
			uni.showToast({ title: '已定位到当前位置', icon: 'none' })
		},
		fail: () => {
			isLocating.value = false
			uni.hideLoading()
			selectedDistrictName.value = '望平街商圈'
			// 若定位未开启或权限受限，平滑复位到美食街核心区域并拉取数据
			fetchNearbyShops(DEFAULT_COORDS.latitude, DEFAULT_COORDS.longitude)
			mapState.value.latitude = DEFAULT_COORDS.latitude
			mapState.value.longitude = DEFAULT_COORDS.longitude
			mapState.value.scale = DEFAULT_COORDS.scale
			if (mapContext) {
				mapContext.moveToLocation({
					latitude: DEFAULT_COORDS.latitude,
					longitude: DEFAULT_COORDS.longitude
				})
			}
			uni.showToast({ title: '已定位至美食街核心区', icon: 'none' })
		}
	})
}

/**
 * 地图放大
 */
const handleZoomIn = () => {
	mapState.value.scale = Math.min(mapState.value.scale + 1, 18)
}

/**
 * 地图缩小
 */
const handleZoomOut = () => {
	mapState.value.scale = Math.max(mapState.value.scale - 1, 5)
}

/**
 * 点击附近推荐卡片
 */
const handleNearbyClick = () => {
	uni.showToast({
		title: `当前街区共 ${displayMarkers.value.length} 家精选档口`,
		icon: 'none'
	})
}

onMounted(() => {
	// 主动触发系统安全区与小程序胶囊绝对尺寸校准
	updateSafeArea()

	mapContext = uni.createMapContext('streetMap', instance)
	// 初始化从后端真实 MySQL 数据库拉取商户与评测视频数据
	fetchNearbyShops(DEFAULT_COORDS.latitude, DEFAULT_COORDS.longitude)
})
</script>

<style scoped lang="scss">
.home-tab {
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 100vh;
	box-sizing: border-box;
	background-color: #F4F7F9;
	overflow: hidden;
}

/* ==========================================================================
 * 顶部 iOS 26 Liquid Glass 液态玻璃导航栏系统
 * 通过 CSS 自定义属性集中管理玻璃颜色、模糊强度、描边、内高光与环境阴影
 * ========================================================================== */
.header-section {
	/* 玻璃材质与色彩设计令牌 (Design Tokens) */
	--glass-header-bg: linear-gradient(
		180deg,
		rgba(255, 253, 250, 0.76) 0%,
		rgba(255, 250, 245, 0.66) 62%,
		rgba(255, 247, 240, 0.56) 100%
	);
	--glass-header-blur: 24px;
	--glass-header-border: rgba(255, 255, 255, 0.76);
	--glass-header-inner-light: rgba(255, 255, 255, 0.90);
	--glass-header-shadow: 0 8px 24px rgba(20, 35, 55, 0.045);

	--glass-capsule-bg: linear-gradient(
		135deg,
		rgba(255, 255, 255, 0.74) 0%,
		rgba(255, 252, 248, 0.54) 52%,
		rgba(255, 246, 238, 0.68) 100%
	);
	--glass-capsule-bg-focus: linear-gradient(
		135deg,
		rgba(255, 255, 255, 0.86) 0%,
		rgba(255, 252, 249, 0.70) 55%,
		rgba(255, 247, 240, 0.80) 100%
	);
	--glass-capsule-blur: 20px;
	--glass-capsule-border: rgba(255, 255, 255, 0.88);
	--glass-capsule-shadow: 0 6px 18px rgba(20, 35, 55, 0.05), 0 1px 3px rgba(255, 107, 53, 0.04);

	--glass-accent-orange: #FF6B35;
	--glass-accent-orange-deep: #F9561F;
	--glass-accent-soft-bg: rgba(255, 107, 53, 0.09);
	--glass-accent-soft-border: rgba(255, 107, 53, 0.22);
	--glass-text-primary: #0F172A;
	--glass-text-secondary: #64748B;
	--glass-text-muted: #94A3B8;

	position: relative;
	z-index: 30;
	box-sizing: border-box;
	padding-left: 14px;
	padding-right: 14px;
	padding-bottom: 10px;
	/* 双重保险：优先通过 CSS 原生安全区环境变量避开状态栏与灵动岛 */
	padding-top: constant(safe-area-inset-top);
	padding-top: env(safe-area-inset-top);

	/* 1. 半透明温暖奶油白背景层 + 2. 背景模糊层 */
	background: var(--glass-header-bg);
	-webkit-backdrop-filter: blur(var(--glass-header-blur)) saturate(185%) contrast(103%);
	backdrop-filter: blur(var(--glass-header-blur)) saturate(185%) contrast(103%);

	/* 3. 细腻描边 + 5. 内部高光 + 6. 环境阴影 */
	border-bottom: 1px solid var(--glass-header-border);
	box-shadow:
		inset 0 -1px 1.5px var(--glass-header-inner-light),
		var(--glass-header-shadow);
}

/* 4. 顶部高光：柔和的线性渐变边缘反射层 */
.header-glass-specular {
	position: absolute;
	top: 0;
	left: 8%;
	right: 8%;
	height: 1px;
	background: linear-gradient(
		90deg,
		rgba(255, 255, 255, 0) 0%,
		rgba(255, 255, 255, 0.92) 50%,
		rgba(255, 255, 255, 0) 100%
	);
	pointer-events: none;
}

/* --------------------------------------------------------------------------
 * 1. 品牌与操作栏 (.nav-headline-bar)
 * -------------------------------------------------------------------------- */
.nav-headline-bar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	box-sizing: border-box;
	gap: 8px;
	padding-top: 4px;
	padding-bottom: 6px;
}

.brand-identity-left {
	display: flex;
	align-items: center;
	min-width: 0;
	flex: 1;
	overflow: hidden;
}

/* 美食主题 Logo 玻璃底座 */
.brand-logo-frame {
	position: relative;
	width: 38px;
	height: 38px;
	border-radius: 12px;
	background: linear-gradient(145deg, rgba(255, 251, 245, 0.92) 0%, rgba(255, 238, 220, 0.78) 100%);
	border: 1px solid rgba(255, 255, 255, 0.94);
	box-shadow:
		inset 0 1px 1.5px rgba(255, 255, 255, 0.95),
		0 3px 10px rgba(255, 107, 53, 0.12);
	display: flex;
	align-items: center;
	justify-content: center;
	margin-right: 10px;
	flex-shrink: 0;
	cursor: pointer;
	transition: transform 0.18s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.18s ease;

	&:active {
		transform: scale(0.93);
	}
}

.brand-logo-img {
	width: 26px;
	height: 26px;
}

.brand-meta-column {
	display: flex;
	flex-direction: column;
	justify-content: center;
	min-width: 0;
	flex: 1;
	overflow: hidden;
}

.brand-title-row {
	display: flex;
	align-items: center;
	gap: 7px;
	min-width: 0;
	width: 100%;
}

/* 主标题：突出且严禁换行或被挤压 */
.brand-main-title {
	font-size: 18px;
	font-weight: 800;
	color: var(--glass-text-primary);
	letter-spacing: 0.3px;
	line-height: 1.2;
	white-space: nowrap;
	flex-shrink: 0;
}

/* 当前商圈选择器：带局部暖色反射的半透明玻璃胶囊，空间不足时优先压缩自身宽度 */
.location-pill-chip {
	position: relative;
	display: inline-flex;
	align-items: center;
	height: 23px;
	padding: 0 8px 0 7px;
	border-radius: 9999px;
	background: linear-gradient(
		135deg,
		rgba(255, 248, 243, 0.85) 0%,
		rgba(255, 237, 224, 0.68) 100%
	);
	border: 1px solid var(--glass-accent-soft-border);
	box-shadow:
		inset 0 1px 1px rgba(255, 255, 255, 0.90),
		0 2px 6px rgba(255, 107, 53, 0.08);
	flex-shrink: 1;
	min-width: 0;
	max-width: 100%;
	overflow: hidden;
	cursor: pointer;
	transition: transform 0.18s cubic-bezier(0.22, 1, 0.36, 1), background 0.18s ease, border-color 0.18s ease;

	/* 顶部边缘微高光 */
	&::before {
		content: '';
		position: absolute;
		top: 0;
		left: 14%;
		right: 14%;
		height: 1px;
		background: linear-gradient(90deg, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0));
		pointer-events: none;
	}

	&:active {
		transform: scale(0.95);
		background: rgba(255, 232, 216, 0.88);
		border-color: rgba(255, 107, 53, 0.36);
	}
}

.chip-pin-icon {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	margin-right: 3px;
	flex-shrink: 0;
}

.chip-location-name {
	font-size: 11.5px;
	color: var(--glass-accent-orange);
	font-weight: 600;
	line-height: 1.2;
	min-width: 0;
	flex: 1;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.chip-arrow-icon {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	margin-left: 3px;
	flex-shrink: 0;
}

/* 副标题：柔和灰蓝色，优雅弱化 */
.brand-slogan-row {
	display: flex;
	align-items: center;
	margin-top: 2px;
	min-width: 0;
}

.brand-sub-slogan {
	font-size: 11px;
	color: var(--glass-text-secondary);
	font-weight: 400;
	letter-spacing: 0.4px;
	line-height: 1.2;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

/* 右侧快捷操作区域（定位按钮 + 扫码按钮） */
.nav-right-tools {
	display: flex;
	align-items: center;
	gap: 8px;
	flex-shrink: 0;
}

.tool-circle-btn {
	position: relative;
	width: 34px;
	height: 34px;
	border-radius: 9999px;
	background: linear-gradient(145deg, rgba(255, 255, 255, 0.84) 0%, rgba(255, 250, 245, 0.66) 100%);
	-webkit-backdrop-filter: blur(14px) saturate(180%);
	backdrop-filter: blur(14px) saturate(180%);
	border: 1px solid rgba(255, 255, 255, 0.90);
	box-shadow:
		inset 0 1px 1.5px rgba(255, 255, 255, 0.95),
		0 3px 10px rgba(20, 35, 55, 0.055);
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	transition: transform 0.18s cubic-bezier(0.22, 1, 0.36, 1), background 0.18s ease, box-shadow 0.18s ease;

	&:active {
		transform: scale(0.91);
		background: rgba(255, 244, 236, 0.92);
	}

	&.is-loading {
		border-color: rgba(255, 107, 53, 0.32);
		background: rgba(255, 245, 238, 0.92);
	}
}

.tool-icon-spin {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	animation: headerLocateSpin 0.9s linear infinite;
}

@keyframes headerLocateSpin {
	from {
		transform: rotate(0deg);
	}
	to {
		transform: rotate(360deg);
	}
}

/* --------------------------------------------------------------------------
 * 2. 搜索栏：横向 Liquid Glass 搜索胶囊 (.search-box / .search-capsule)
 * -------------------------------------------------------------------------- */
.search-box {
	margin-top: 2px;
	margin-bottom: 9px;
}

.search-capsule {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: space-between;
	height: 40px;
	padding: 0 5px 0 11px;
	border-radius: 9999px;
	overflow: hidden;

	/* 半透明液态玻璃基底 + 背景模糊 */
	background: var(--glass-capsule-bg);
	-webkit-backdrop-filter: blur(var(--glass-capsule-blur)) saturate(190%) contrast(104%);
	backdrop-filter: blur(var(--glass-capsule-blur)) saturate(190%) contrast(104%);

	/* 细腻浅色边缘描边 + 内部厚度高光 + 柔和环境阴影 */
	border: 1px solid var(--glass-capsule-border);
	box-shadow:
		inset 0 1.5px 2px rgba(255, 255, 255, 0.96),
		inset 0 -1px 1.5px rgba(255, 255, 255, 0.42),
		var(--glass-capsule-shadow);

	transition: background 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease;

	/* 顶部伪元素线性渐变反射高光（不阻挡输入框点击） */
	&::before {
		content: '';
		position: absolute;
		top: 0;
		left: 10%;
		right: 10%;
		height: 1px;
		background: linear-gradient(
			90deg,
			rgba(255, 255, 255, 0) 0%,
			rgba(255, 255, 255, 0.96) 50%,
			rgba(255, 255, 255, 0) 100%
		);
		pointer-events: none;
		z-index: 2;
	}

	&.is-focused {
		background: var(--glass-capsule-bg-focus);
		border-color: rgba(255, 107, 53, 0.34);
		box-shadow:
			inset 0 1.5px 2px rgba(255, 255, 255, 0.98),
			0 6px 20px rgba(255, 107, 53, 0.09),
			0 2px 6px rgba(20, 35, 55, 0.04);
	}
}

/* 7. 局部暖色反射：仅在搜索按钮附近呈现柔和淡橙色反射 */
.search-warm-reflection {
	position: absolute;
	right: 4px;
	top: 50%;
	width: 86px;
	height: 36px;
	transform: translateY(-50%);
	background: radial-gradient(
		ellipse at center,
		rgba(255, 122, 69, 0.16) 0%,
		rgba(255, 122, 69, 0) 72%
	);
	pointer-events: none;
	z-index: 0;
}

.search-left {
	position: relative;
	z-index: 1;
	display: flex;
	align-items: center;
	flex: 1;
	min-width: 0;
	height: 100%;
	margin-right: 6px;
}

.search-icon-badge {
	width: 24px;
	height: 24px;
	border-radius: 9999px;
	background: rgba(255, 107, 53, 0.10);
	display: flex;
	align-items: center;
	justify-content: center;
	margin-right: 8px;
	flex-shrink: 0;
}

.search-input {
	flex: 1;
	min-width: 0;
	height: 100%;
	font-size: 13px;
	color: var(--glass-text-primary);
	background: transparent;
	border: none;
	padding: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.search-placeholder {
	font-size: 12.5px;
	color: var(--glass-text-secondary);
	font-weight: 400;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.search-clear-btn {
	width: 24px;
	height: 24px;
	border-radius: 9999px;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-left: 4px;
	flex-shrink: 0;
	cursor: pointer;

	&:active {
		opacity: 0.7;
	}
}

/* 搜索按钮：温暖克制的橙色渐变液态胶囊 */
.search-action-btn {
	position: relative;
	z-index: 1;
	height: 30px;
	padding: 0 13px;
	border-radius: 9999px;
	background: linear-gradient(135deg, #FF7A45 0%, #FF5722 100%);
	border: 1px solid rgba(255, 255, 255, 0.36);
	box-shadow:
		inset 0 1px 1px rgba(255, 255, 255, 0.45),
		0 3px 9px rgba(255, 87, 34, 0.24);
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	cursor: pointer;
	transition: transform 0.16s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.16s ease, filter 0.16s ease;

	&:active {
		transform: scale(0.94);
		filter: brightness(0.96);
	}
}

.search-btn-txt {
	font-size: 12px;
	color: #FFFFFF;
	font-weight: 600;
	letter-spacing: 0.5px;
	line-height: 1;
	white-space: nowrap;
}

/* --------------------------------------------------------------------------
 * 3. 顶部分类标签流 (.category-scroll-wrapper)
 * -------------------------------------------------------------------------- */
.category-scroll-wrapper {
	width: 100%;
	overflow: hidden;
}

.category-scroll-view {
	width: 100%;
	white-space: nowrap;
}

.category-scroll-inner {
	display: inline-flex;
	align-items: center;
	gap: 7px;
	padding: 2px 1px;
}

.category-pill-chip {
	display: inline-flex;
	align-items: center;
	height: 28px;
	padding: 0 11px;
	border-radius: 9999px;
	background: rgba(255, 255, 255, 0.72);
	border: 1px solid rgba(255, 255, 255, 0.88);
	box-shadow:
		inset 0 1px 1px rgba(255, 255, 255, 0.9),
		0 2px 6px rgba(20, 35, 55, 0.035);
	transition: all 0.2s cubic-bezier(0.22, 1, 0.36, 1);
	flex-shrink: 0;
	cursor: pointer;

	&:active {
		transform: scale(0.95);
	}

	&.is-active {
		background: linear-gradient(135deg, #FF7A45 0%, #FF5722 100%);
		border-color: rgba(255, 255, 255, 0.65);
		box-shadow:
			inset 0 1px 1.5px rgba(255, 255, 255, 0.5),
			0 4px 10px rgba(255, 87, 34, 0.24);

		.category-chip-name {
			color: #FFFFFF;
			font-weight: 600;
		}
	}
}

.category-icon-wrap {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	margin-right: 4px;
	line-height: 1;
}

.category-chip-name {
	font-size: 12px;
	color: #475569;
	white-space: nowrap;
	line-height: 1;
}

/* --------------------------------------------------------------------------
 * 4. 窄屏响应式适配 (320px ~ 360px) 与 backdrop-filter 降级方案
 * -------------------------------------------------------------------------- */
@media screen and (max-width: 360px) {
	.header-section {
		padding-left: 10px;
		padding-right: 10px;
	}

	.brand-logo-frame {
		width: 34px;
		height: 34px;
		border-radius: 10px;
		margin-right: 8px;
	}

	.brand-logo-img {
		width: 23px;
		height: 23px;
	}

	.brand-main-title {
		font-size: 16px;
	}

	.location-pill-chip {
		height: 21px;
		padding: 0 6px;
	}

	.chip-location-name {
		font-size: 11px;
	}

	.tool-circle-btn {
		width: 31px;
		height: 31px;
	}

	.nav-right-tools {
		gap: 6px;
	}

	.search-capsule {
		height: 38px;
		padding: 0 4px 0 9px;
	}

	.search-action-btn {
		height: 28px;
		padding: 0 10px;
	}
}

@supports not ((-webkit-backdrop-filter: blur(10px)) or (backdrop-filter: blur(10px))) {
	.header-section {
		background: rgba(255, 252, 248, 0.94);
	}
	.search-capsule,
	.tool-circle-btn {
		background: rgba(255, 255, 255, 0.95);
	}
}

/* 中间地图视口（flex: 1 撑满中间剩余物理空间） */
.map-viewport {
	position: relative;
	flex: 1;
	width: 100%;
	min-height: 0;
	overflow: hidden;
}

/* 原生地图全屏渲染 */
.real-market-map {
	width: 100%;
	height: 100%;
}

/* 右侧地图悬浮操作工具栏（cover-view 实现，原生层之上展示） */
.map-floating-controls {
	position: absolute;
	right: 24rpx;
	bottom: 24rpx;
	display: flex;
	flex-direction: column;
	gap: 16rpx;
	z-index: 50;
}

.control-btn {
	width: 78rpx;
	height: 78rpx;
	border-radius: 24rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	background: rgba(255, 255, 255, 0.95);
	border: 1.5rpx solid rgba(255, 255, 255, 0.9);
	box-shadow: 
		inset 0 1.5rpx 2rpx rgba(255, 255, 255, 0.95),
		0 6rpx 20rpx rgba(25, 45, 65, 0.12);
	transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);

	&:active {
		transform: scale(0.92);
		background: rgba(241, 245, 249, 0.96);
	}
}

.control-icon-img {
	width: 44rpx;
	height: 44rpx;
}

/* 底部商户与推荐停靠托架（安全流式排布，彻底规避 App 端原生地图控件层级遮挡） */
.bottom-card-section {
	position: relative;
	z-index: 25;
	padding: 16rpx 28rpx calc(178rpx + env(safe-area-inset-bottom)) 28rpx;
	box-sizing: border-box;
	
	/* 极通透空气融光环境渐变：顶部自然微虚化透光，向下优雅沉淀，绝无死白塑料感 */
	background: linear-gradient(
		180deg,
		rgba(244, 247, 250, 0.55) 0%,
		rgba(246, 249, 252, 0.82) 50%,
		rgba(255, 255, 255, 0.92) 100%
	);
	-webkit-backdrop-filter: blur(28px) saturate(190%) contrast(105%);
	backdrop-filter: blur(28px) saturate(190%) contrast(105%);
	
	/* 柔和微光发丝线与顶部漫反射折射光 */
	border-top: 1rpx solid rgba(255, 255, 255, 0.95);
	box-shadow: 
		inset 0 1.5rpx 2rpx rgba(255, 255, 255, 0.98),
		0 -10rpx 36rpx rgba(20, 35, 55, 0.05);
	
	overflow: hidden;
	transition: all 0.32s cubic-bezier(0.18, 0.89, 0.32, 1);

	&.is-drawer-open {
		padding-bottom: calc(210rpx + env(safe-area-inset-bottom));
	}
}

/* 环境折射光晕层（为高透液态玻璃提供折射源，让纯净水滴与玻璃质感生动显现） */
.ambient-glow {
	position: absolute;
	border-radius: 9999rpx;
	pointer-events: none;
	filter: blur(48px);
	z-index: 1;
}

.glow-warm {
	top: -20rpx;
	left: 40rpx;
	width: 260rpx;
	height: 140rpx;
	background: radial-gradient(circle, rgba(255, 171, 145, 0.40) 0%, rgba(255, 209, 188, 0) 70%);
}

.glow-cyan {
	bottom: 40rpx;
	right: 40rpx;
	width: 300rpx;
	height: 160rpx;
	background: radial-gradient(circle, rgba(125, 211, 252, 0.35) 0%, rgba(186, 230, 253, 0) 70%);
}

/* 核心：高通透纯净水滴液态微晶悬浮推荐卡片（直接透射下方生动地图与道路色彩） */
.bottom-quick-card {
	position: relative;
	pointer-events: auto;
	z-index: 2;
	width: 100%;
	box-sizing: border-box;
	height: 122rpx;
	border-radius: 36rpx;
	padding: 0 24rpx;
	display: flex;
	align-items: center;
	
	/* 极通透 3 阶物理光学透镜底色：两端温润晶莹，中段轻薄剔透 */
	background: linear-gradient(
		135deg,
		rgba(255, 255, 255, 0.82) 0%,
		rgba(255, 255, 255, 0.45) 45%,
		rgba(255, 255, 255, 0.72) 100%
	);
	
	/* 28px 高精采样高斯模糊 + 200% 色彩饱和度增润（彻底激活底层地图道路与建筑光斑） */
	-webkit-backdrop-filter: blur(28px) saturate(200%) contrast(106%);
	backdrop-filter: blur(28px) saturate(200%) contrast(106%);
	transform: translate3d(0, 0, 0);

	/* 物理棱镜折射光边与多阶漫射软投影 */
	border: 1.5rpx solid rgba(255, 255, 255, 0.95);
	box-shadow: 
		/* 顶部微弧高折射白光棱边 */
		inset 0 2rpx 3rpx rgba(255, 255, 255, 0.98),
		/* 底部折射环境光 */
		inset 0 -1.5rpx 2rpx rgba(255, 255, 255, 0.40),
		/* 内层晶莹润泽微泛光 */
		inset 0 0 24rpx rgba(255, 255, 255, 0.35),
		/* 悬浮立体柔和软阴影 */
		0 14rpx 38rpx rgba(15, 30, 50, 0.12),
		0 2rpx 8rpx rgba(0, 0, 0, 0.04);
	
	transition: all 0.22s cubic-bezier(0.25, 0.8, 0.25, 1);
	cursor: pointer;

	/* 顶部极致高光亮丝（蓝宝石表盘级微切面折射） */
	&::before {
		content: '';
		position: absolute;
		top: 1rpx;
		left: 16%;
		right: 16%;
		height: 3rpx;
		background: linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.98) 50%, rgba(255, 255, 255, 0) 100%);
		border-radius: 9999rpx;
		pointer-events: none;
		filter: drop-shadow(0 0 2rpx rgba(255, 255, 255, 0.95));
	}

	&:active {
		transform: scale(0.985);
		background: linear-gradient(
			135deg,
			rgba(255, 255, 255, 0.90) 0%,
			rgba(255, 255, 255, 0.55) 100%
		);
	}
}

.quick-badge {
	width: 72rpx;
	height: 72rpx;
	border-radius: 24rpx;
	background: linear-gradient(135deg, #FFF9F0 0%, #FFEED9 100%);
	border: 1.5rpx solid #FFFFFF;
	box-shadow: 
		inset 0 1.5rpx 2rpx rgba(255, 255, 255, 0.9),
		0 4rpx 14rpx rgba(255, 112, 67, 0.20);
	display: flex;
	align-items: center;
	justify-content: center;
	margin-right: 18rpx;
	flex-shrink: 0;
}

.quick-badge-icon {
	width: 48rpx;
	height: 48rpx;
}

.quick-info {
	flex: 1;
	display: flex;
	flex-direction: column;
	min-width: 0;
	justify-content: center;
}

.quick-title-row {
	display: flex;
	align-items: center;
	gap: 10rpx;
}

.quick-title {
	font-size: 27rpx;
	font-weight: 800;
	color: #0F172A;
	letter-spacing: 0.5rpx;
	line-height: 1.2;
}

/* 呼吸绿色活跃状态药丸 */
.live-dot-pill {
	display: inline-flex;
	align-items: center;
	background: rgba(16, 185, 129, 0.10);
	border: 1rpx solid rgba(16, 185, 129, 0.25);
	border-radius: 12rpx;
	padding: 2rpx 8rpx;
	gap: 6rpx;
}

.live-dot {
	width: 8rpx;
	height: 8rpx;
	border-radius: 4rpx;
	background: #10B981;
	box-shadow: 0 0 6rpx rgba(16, 185, 129, 0.8);
}

.live-txt {
	font-size: 18rpx;
	color: #10B981;
	font-weight: 600;
	line-height: 1;
}

.quick-sub {
	font-size: 21rpx;
	color: #64748B;
	margin-top: 4rpx;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	line-height: 1.2;
}

/* 右侧箭头圆形微透镜 */
.quick-arrow-box {
	width: 48rpx;
	height: 48rpx;
	border-radius: 24rpx;
	background: rgba(255, 255, 255, 0.70);
	border: 1rpx solid rgba(255, 255, 255, 0.90);
	box-shadow: 0 2rpx 8rpx rgba(25, 45, 65, 0.05);
	display: flex;
	align-items: center;
	justify-content: center;
	margin-left: 12rpx;
	flex-shrink: 0;
	transition: transform 0.18s ease;

	&:active {
		transform: scale(0.90);
	}
}
</style>
