<template>
	<LiquidGlassDock
		v-model="currentTab"
		:items="tabList"
		theme="light"
		:safe-area="true"
		max-width="720rpx"
		@change="handleTabChange"
	/>
</template>

<script setup>
import { computed } from 'vue'
import { useTab } from '@/composables/useTab'
import LiquidGlassDock from '@/components/LiquidGlassDock.vue'

// 引入全局 Tab 控制器
const { currentTab, switchTab } = useTab()

// 静态独立矢量 SVG 图标配置
const tabList = computed(() => [
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
])

/**
 * 响应 Dock 切换事件并同步全局状态
 * @param {string} key - 激活的 tab key
 */
const handleTabChange = (key) => {
	switchTab(key)
}
</script>

