<template>
	<view class="tab-page favorite-tab" :style="{ paddingTop: (statusBarHeight + 16) + 'px' }">
		<!-- 顶部导航栏 -->
		<view class="page-header">
			<text class="page-title">我的收藏</text>
			<text class="page-subtitle">心仪档口与美味清单</text>
		</view>

		<!-- 分类切换标签 -->
		<view class="filter-tab-bar">
			<view
				v-for="tab in filterTabs"
				:key="tab.key"
				class="filter-tab-item"
				:class="{ 'is-active': activeFilter === tab.key }"
				@click="handleFilterChange(tab.key)"
			>
				<text class="filter-tab-label">{{ tab.name }}</text>
			</view>
		</view>

		<!-- 列表展示与缺省状态 -->
		<view class="content-body">
			<!-- 真实数据列表（当有数据时渲染） -->
			<view v-if="favoriteList.length > 0" class="favorite-list">
				<!-- 待接入真实收藏数据渲染 -->
			</view>

			<!-- 无数据缺省空状态（符合真实数据规范） -->
			<view v-else class="empty-state">
				<view class="empty-icon-wrap">
					<text class="empty-icon">⭐</text>
				</view>
				<text class="empty-title">暂无收藏内容</text>
				<text class="empty-desc">在地图或探店中点击心愿星，将美食收藏于此</text>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref } from 'vue'
import { useSafeArea } from '@/composables/useSafeArea'

const { statusBarHeight } = useSafeArea()

// 过滤标签
const filterTabs = [
	{ key: 'all', name: '全部' },
	{ key: 'store', name: '美食商户' },
	{ key: 'dish', name: '招牌菜品' }
]

const activeFilter = ref('all')

// 真实收藏数据列表（初始为空，严禁伪造假数据）
const favoriteList = ref([])

/**
 * 切换收藏过滤项
 * @param {string} key - 过滤项标识
 */
const handleFilterChange = (key) => {
	activeFilter.value = key
}
</script>

<style scoped lang="scss">
.favorite-tab {
	height: 100vh;
	overflow-y: auto;
	overscroll-behavior-y: contain;
	-webkit-overflow-scrolling: touch;
	box-sizing: border-box;
	background-color: #F8FAFC;
	padding-top: calc(var(--status-bar-height, 20px) + 32rpx);
	padding-bottom: calc(180rpx + env(safe-area-inset-bottom));
	padding-left: 32rpx;
	padding-right: 32rpx;
}

.page-header {
	margin-bottom: 24rpx;
}

.page-title {
	font-size: 40rpx;
	font-weight: 800;
	color: #1E293B;
	display: block;
}

.page-subtitle {
	font-size: 24rpx;
	color: #94A3B8;
	margin-top: 6rpx;
	display: block;
}

/* 分类过滤器 */
.filter-tab-bar {
	display: flex;
	gap: 16rpx;
	margin-bottom: 32rpx;
}

.filter-tab-item {
	padding: 12rpx 32rpx;
	border-radius: 9999rpx;
	@include liquid-glass(20px, 0.82, 0.58);
	transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
	
	&:active {
		transform: scale(0.95);
	}
	
	&.is-active {
		background: linear-gradient(135deg, #FF8A50 0%, #FF5722 100%) !important;
		border-color: rgba(255, 255, 255, 0.6) !important;
		box-shadow: 
			inset 0 1.5rpx 2rpx rgba(255, 255, 255, 0.6),
			0 8rpx 22rpx rgba(255, 87, 34, 0.32) !important;
		
		.filter-tab-label {
			color: #FFFFFF;
			font-weight: 600;
		}
	}
}

.filter-tab-label {
	font-size: 24rpx;
	color: #64748B;
}

/* 内容区域 */
.content-body {
	margin-top: 20rpx;
}

/* 缺省空状态规范 */
.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding-top: 140rpx;
}

.empty-icon-wrap {
	width: 120rpx;
	height: 120rpx;
	border-radius: 60rpx;
	background: #F1F5F9;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-bottom: 24rpx;
}

.empty-icon {
	font-size: 52rpx;
	color: #CBD5E1;
}

.empty-title {
	font-size: 30rpx;
	font-weight: 600;
	color: #475569;
	margin-bottom: 10rpx;
}

.empty-desc {
	font-size: 24rpx;
	color: #94A3B8;
	text-align: center;
	max-width: 440rpx;
	line-height: 1.5;
}
</style>
