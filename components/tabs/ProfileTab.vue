<template>
	<view class="tab-page profile-tab" :style="{ paddingTop: (statusBarHeight + 20) + 'px' }">
		<!-- 个人资料卡片 -->
		<view class="user-card" @click="handleUserCardClick">
			<view class="avatar-box">
				<text class="avatar-text">{{ userProfile ? userProfile.nickname.slice(0, 1) : '食' }}</text>
			</view>
			<view class="user-meta">
				<text class="user-name">{{ userProfile ? userProfile.nickname : '点击登录 / 注册' }}</text>
				<text class="user-desc">{{ userProfile ? userProfile.bio : '登录畅享街区美食福利与订单同步' }}</text>
			</view>
			<text class="arrow-right">›</text>
		</view>

		<!-- 统计看板（无数据时统一用 '-' 占位，严禁假数据） -->
		<view class="stat-board">
			<view class="stat-item" @click="handleStatClick('favorite')">
				<text class="stat-num">{{ statData.favoriteCount !== null ? statData.favoriteCount : '-' }}</text>
				<text class="stat-label">我的收藏</text>
			</view>
			<view class="stat-divider"></view>
			<view class="stat-item" @click="handleStatClick('footprint')">
				<text class="stat-num">{{ statData.footprintCount !== null ? statData.footprintCount : '-' }}</text>
				<text class="stat-label">探店足迹</text>
			</view>
			<view class="stat-divider"></view>
			<view class="stat-item" @click="handleStatClick('coupon')">
				<text class="stat-num">{{ statData.couponCount !== null ? statData.couponCount : '-' }}</text>
				<text class="stat-label">美食券包</text>
			</view>
		</view>

		<!-- 常用功能菜单列表 -->
		<view class="menu-card">
			<view
				v-for="(menu, index) in menuList"
				:key="menu.id"
				class="menu-row"
				:class="{ 'has-border': index < menuList.length - 1 }"
				@click="handleMenuClick(menu.id)"
			>
				<view class="menu-left">
					<text class="menu-icon">{{ menu.icon }}</text>
					<text class="menu-title">{{ menu.title }}</text>
				</view>
				<view class="menu-right">
					<text v-if="menu.extra" class="menu-extra">{{ menu.extra }}</text>
					<text class="menu-arrow">›</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref } from 'vue'
import { useSafeArea } from '@/composables/useSafeArea'

const { statusBarHeight } = useSafeArea()

// 用户真实信息（初始未登录）
const userProfile = ref(null)

// 统计数据（初始为 null，模板中将统一呈现 '-' 占位符）
const statData = ref({
	favoriteCount: null,
	footprintCount: null,
	couponCount: null
})

// 菜单配置
const menuList = [
	{ id: 'order', icon: '🧾', title: '我的点单记录' },
	{ id: 'address', icon: '📍', title: '收货地址 / 桌号' },
	{ id: 'feedback', icon: '✍️', title: '意见与反馈' },
	{ id: 'service', icon: '🎧', title: '街区客服' },
	{ id: 'settings', icon: '⚙️', title: '系统设置' }
]

/**
 * 个人卡片点击
 */
const handleUserCardClick = () => {
	if (!userProfile.value) {
		uni.showToast({
			title: '跳转登录页面',
			icon: 'none'
		})
	}
}

/**
 * 统计项点击
 * @param {string} type - 统计类型
 */
const handleStatClick = (type) => {
	uni.showToast({
		title: '查看详细统计',
		icon: 'none'
	})
}

/**
 * 菜单项点击
 * @param {string} id - 菜单项ID
 */
const handleMenuClick = (id) => {
	uni.showToast({
		title: `点击了菜单: ${id}`,
		icon: 'none'
	})
}
</script>

<style scoped lang="scss">
.profile-tab {
	height: 100vh;
	overflow-y: auto;
	overscroll-behavior-y: contain;
	-webkit-overflow-scrolling: touch;
	box-sizing: border-box;
	background-color: #F8FAFC;
	padding-top: calc(var(--status-bar-height, 20px) + 40rpx);
	padding-bottom: calc(180rpx + env(safe-area-inset-bottom));
	padding-left: 32rpx;
	padding-right: 32rpx;
}

/* 用户卡片 */
.user-card {
	display: flex;
	align-items: center;
	padding: 32rpx 28rpx;
	border-radius: 28rpx;
	margin-bottom: 24rpx;
	@include liquid-glass(22px, 0.84, 0.58);
}

.avatar-box {
	width: 108rpx;
	height: 108rpx;
	border-radius: 54rpx;
	background: linear-gradient(135deg, #FF8A50 0%, #FF5722 100%);
	display: flex;
	align-items: center;
	justify-content: center;
	margin-right: 24rpx;
	box-shadow: 0 6rpx 16rpx rgba(255, 87, 34, 0.28);
}

.avatar-text {
	font-size: 40rpx;
	font-weight: bold;
	color: #FFFFFF;
}

.user-meta {
	flex: 1;
	display: flex;
	flex-direction: column;
}

.user-name {
	font-size: 32rpx;
	font-weight: 700;
	color: #1E293B;
}

.user-desc {
	font-size: 22rpx;
	color: #94A3B8;
	margin-top: 6rpx;
}

.arrow-right {
	font-size: 36rpx;
	color: #CBD5E1;
}

/* 统计面板 */
.stat-board {
	display: flex;
	align-items: center;
	justify-content: space-around;
	padding: 24rpx 0;
	border-radius: 24rpx;
	margin-bottom: 24rpx;
	@include liquid-glass(22px, 0.84, 0.58);
}

.stat-item {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
}

.stat-num {
	font-size: 34rpx;
	font-weight: 700;
	color: #0F172A;
}

.stat-label {
	font-size: 22rpx;
	color: #64748B;
	margin-top: 4rpx;
}

.stat-divider {
	width: 1px;
	height: 36rpx;
	background: rgba(255, 255, 255, 0.6);
}

/* 菜单列表 */
.menu-card {
	border-radius: 24rpx;
	padding: 0 24rpx;
	@include liquid-glass(22px, 0.84, 0.58);
}

.menu-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 30rpx 8rpx;
	
	&.has-border {
		border-bottom: 1px solid #F8FAFC;
	}
}

.menu-left {
	display: flex;
	align-items: center;
}

.menu-icon {
	font-size: 32rpx;
	margin-right: 18rpx;
}

.menu-title {
	font-size: 28rpx;
	color: #334155;
	font-weight: 500;
}

.menu-right {
	display: flex;
	align-items: center;
}

.menu-extra {
	font-size: 22rpx;
	color: #94A3B8;
	margin-right: 8rpx;
}

.menu-arrow {
	font-size: 32rpx;
	color: #CBD5E1;
}
</style>
