<template>
	<view class="app-shell">
		<!-- 动态子视图容器（通过 v-show 保活，切换时杜绝销毁与白屏） -->
		<view class="tab-view-container">
			<HomeTab v-show="currentTab === 'home'" />
			<FavoriteTab v-show="currentTab === 'favorite'" />
			<CommunityTab v-show="currentTab === 'community'" />
			<ProfileTab v-show="currentTab === 'profile'" />
		</view>

		<!-- 常驻全局悬浮毛玻璃胶囊 TabBar -->
		<TabBar />
	</view>
</template>

<script setup>
import { onMounted } from 'vue'
import { useTab } from '@/composables/useTab'

// 导入 4 个核心 Tab 视图
import HomeTab from '@/components/tabs/HomeTab.vue'
import FavoriteTab from '@/components/tabs/FavoriteTab.vue'
import CommunityTab from '@/components/tabs/CommunityTab.vue'
import ProfileTab from '@/components/tabs/ProfileTab.vue'

// 导入 Tab 导航组件
import TabBar from '@/components/TabBar.vue'

// 响应式 Tab 状态控制
const { currentTab } = useTab()

onMounted(() => {
	// 页面初始化完成
})
</script>

<style scoped lang="scss">
.app-shell {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	width: 100%;
	height: 100%;
	overflow: hidden;
	box-sizing: border-box;
	background-color: #F8FAFC;
}

.tab-view-container {
	width: 100%;
	height: 100%;
	position: relative;
	overflow: hidden;
}
</style>
