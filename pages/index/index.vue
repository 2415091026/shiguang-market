<template>
	<view class="app-shell">
		<!-- 动态子视图容器（通过 v-show 保活，切换时杜绝销毁与白屏） -->
		<view class="tab-view-container">
			<HomeTab v-show="currentTab === 'home'" />
			<FavoriteTab v-show="currentTab === 'favorite'" />
			<CommunityTab v-show="currentTab === 'community'" />
			<ProfileTab v-show="currentTab === 'profile'" />
		</view>

		<!-- 常驻全局悬浮毛玻璃胶囊 TabBar（抽屉打开时优雅避让） -->
		<view class="global-tabbar-wrapper" v-show="!activeShopDetail">
			<TabBar />
		</view>

		<!-- 全局最高层级商户深度探店详情抽屉（独立于所有子视图之上，100% 毫无遮挡） -->
		<ShopDrawer
			:shop="activeShopDetail"
			@close="closeShopDetail"
			@navigate="handleGlobalNavigate"
		/>
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

// 导入 Tab 导航组件与全局商户详情抽屉
import TabBar from '@/components/TabBar.vue'
import ShopDrawer from '@/components/ShopDrawer.vue'

// 响应式 Tab 状态与全局抽屉控制
const { currentTab, activeShopDetail, closeShopDetail } = useTab()

const handleGlobalNavigate = (shop) => {
	if (!shop) return
	uni.openLocation({
		latitude: Number(shop.latitude),
		longitude: Number(shop.longitude),
		name: shop.name || '-',
		address: shop.address || '-'
	})
}

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

.global-tabbar-wrapper {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 999;
	pointer-events: none;
}
</style>
