<template>
	<view class="tab-page community-tab" :style="{ paddingTop: (statusBarHeight + 16) + 'px' }">
		<!-- 顶部导航栏（支持小程序胶囊避让） -->
		<view class="page-header" :style="{ paddingRight: capsulePaddingRight + 'px' }">
			<view class="header-left">
				<text class="page-title">食客交流</text>
				<text class="page-subtitle">街区探店心得与美味偶遇</text>
			</view>
			<view class="publish-btn" @click="handlePublishClick">
				<text class="publish-btn-text">+ 发动态</text>
			</view>
		</view>

		<!-- 话题频道快捷入口 -->
		<scroll-view class="topic-scroll" scroll-x :show-scrollbar="false">
			<view class="topic-list">
				<view
					v-for="topic in topicList"
					:key="topic.id"
					class="topic-chip"
					:class="{ 'is-active': activeTopicId === topic.id }"
					@click="handleSelectTopic(topic.id)"
				>
					<text class="topic-name"># {{ topic.name }}</text>
				</view>
			</view>
		</scroll-view>

		<!-- 动态内容区 -->
		<view class="content-body">
			<!-- 真实动态列表（后端接入后渲染） -->
			<view v-if="postList.length > 0" class="post-feed">
				<!-- 待接入动态流卡片 -->
			</view>

			<!-- 缺省状态处理（严格禁止假数据占位） -->
			<view v-else class="empty-state">
				<view class="empty-icon-wrap">
					<text class="empty-icon">💬</text>
				</view>
				<text class="empty-title">街区广场暂无新动态</text>
				<text class="empty-desc">成为首位分享探店发现的美食达人吧</text>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref } from 'vue'
import { useSafeArea } from '@/composables/useSafeArea'

const { statusBarHeight, capsulePaddingRight } = useSafeArea()

// 社区话题列表
const topicList = ref([
	{ id: 'all', name: '全广场' },
	{ id: 'hidden-gem', name: '巷弄私房' },
	{ id: 'night-snack', name: '深夜食堂' },
	{ id: 'thunder-warning', name: '避雷实录' },
	{ id: 'new-open', name: '新档开市' }
])

const activeTopicId = ref('all')

// 真实动态列表（初始为空）
const postList = ref([])

/**
 * 切换话题筛选
 * @param {string} id - 话题标识
 */
const handleSelectTopic = (id) => {
	activeTopicId.value = id
}

/**
 * 发动态点击事件
 */
const handlePublishClick = () => {
	uni.showToast({
		title: '发布探店功能待接入',
		icon: 'none'
	})
}
</script>

<style scoped lang="scss">
.community-tab {
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
	display: flex;
	align-items: center;
	justify-content: space-between;
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

.publish-btn {
	padding: 14rpx 28rpx;
	background: linear-gradient(135deg, #FF8A50 0%, #FF5722 100%);
	border-radius: 9999rpx;
	box-shadow: 0 6rpx 16rpx rgba(255, 87, 34, 0.25);
}

.publish-btn-text {
	font-size: 24rpx;
	font-weight: 600;
	color: #FFFFFF;
}

/* 话题栏 */
.topic-scroll {
	white-space: nowrap;
	width: 100%;
	margin-bottom: 28rpx;
}

.topic-list {
	display: flex;
	gap: 16rpx;
	padding: 4rpx 0;
}

.topic-chip {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: 10rpx 28rpx;
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
			0 8rpx 20rpx rgba(255, 87, 34, 0.32) !important;
		
		.topic-name {
			color: #FFFFFF;
			font-weight: 600;
		}
	}
}

.topic-name {
	font-size: 24rpx;
	color: #64748B;
}

/* 内容区域 */
.content-body {
	margin-top: 20rpx;
}

/* 缺省空状态 */
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
