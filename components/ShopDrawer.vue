<template>
	<view 
		v-if="shop" 
		class="shop-drawer-panel" 
		:class="{ 'is-dragging': isDragging, 'is-closing': isClosing }"
		:style="drawerDynamicStyle"
		@click.stop
	>
		<!-- 1. 顶部抽屉拖拽把手栏（配备物理弹性手势引擎：下拉实时跟随手指 + 柔性阻尼回弹） -->
		<view 
			class="drawer-header-bar"
			@touchstart="handleTouchStart"
			@touchmove="handleTouchMove"
			@touchend="handleTouchEnd"
		>
			<view class="drawer-pill-handle" @click="handleSmoothClose"></view>
			<view class="drawer-close-btn" @click.stop="handleSmoothClose">
				<uni-icons type="closeempty" size="16" color="#64748B"></uni-icons>
			</view>
		</view>

		<!-- 2. 原生纵向滚动视图容器（原生硬件惯性滑动 + 弹性阻尼） -->
		<scroll-view 
			class="drawer-scroll-viewport" 
			scroll-y 
			:show-scrollbar="false"
			scroll-with-animation
			enhanced
			:bounces="true"
		>
			<!-- 商户主体头部信息区 -->
			<view class="drawer-main-profile">
				<image 
					class="shop-cover-thumb" 
					:src="shop.logo || shop.cover || '/static/icons/marker.png'" 
					mode="aspectFill"
				></image>
				<view class="drawer-profile-info">
					<view class="shop-name-row">
						<text class="shop-title-large">{{ shop.name || '-' }}</text>
						<text class="shop-stall-pill">{{ shop.stallNo || shop.categoryName || '-' }}</text>
					</view>
					<view class="shop-sub-row">
						<text class="shop-rating-highlight">★ {{ shop.rating || '-' }}</text>
						<text class="shop-split">·</text>
						<text class="shop-price">人均 ¥{{ shop.pricePerCapita || '-' }}</text>
						<text class="shop-split">·</text>
						<text class="shop-distance">距您 {{ shop.distanceFormatted || (shop.distance ? shop.distance + 'm' : '-') }}</text>
					</view>
					<view class="shop-status-row">
						<view class="status-dot" :class="{ 'is-closed': shop.status !== 'OPENING' }"></view>
						<text class="status-text">{{ shop.status === 'OPENING' ? '营业中' : '休息中' }} {{ shop.businessHours || '-' }}</text>
					</view>
					<text class="shop-address-text">{{ shop.address || '-' }}</text>
				</view>
			</view>

			<!-- 专区 1：🎬 网上探店评测视频 -->
			<view class="media-section">
				<view class="section-title-row">
					<view class="title-left">
						<text class="section-emoji">🎬</text>
						<text class="section-title">网上评测视频</text>
						<text class="section-count">({{ videoList.length }})</text>
					</view>
					<text v-if="videoList.length === 0" class="empty-hint">暂无网络评测</text>
				</view>

				<!-- 视频横向滚动流（加入横向硬件平滑滚动） -->
				<scroll-view 
					v-if="videoList.length > 0" 
					class="video-scroll-container" 
					scroll-x 
					:show-scrollbar="false"
					scroll-with-animation
				>
					<view class="video-scroll-track">
						<view 
							v-for="(video, vIdx) in videoList" 
							:key="video.id || vIdx" 
							class="video-card-item"
							@click.stop="handlePlayVideo(video)"
						>
							<view class="video-poster-box">
								<image 
									class="video-poster-img" 
									:src="video.coverUrl || '/static/icons/marker.png'" 
									mode="aspectFill"
								></image>
								<view class="video-play-glass-btn">
									<text class="play-icon">▶</text>
								</view>
								<view class="video-duration-tag">{{ video.duration || '视频' }}</view>
								<view class="video-platform-tag">{{ video.platform === 'bilibili' ? 'B站' : '短视频' }}</view>
							</view>
							<text class="video-card-title">{{ video.title || '-' }}</text>
							<view class="video-author-row">
								<text class="video-author-name">博主: {{ video.author || '-' }}</text>
							</view>
							<text v-if="video.highlight" class="video-highlight-text">{{ video.highlight }}</text>
						</view>
					</view>
				</scroll-view>
			</view>

			<!-- 专区 2：📸 吃货真实打卡推荐 (UGC) -->
			<view class="media-section">
				<view class="section-title-row">
					<view class="title-left">
						<text class="section-emoji">📸</text>
						<text class="section-title">大家推荐的美食</text>
						<text class="section-count">({{ recommendationList.length }})</text>
					</view>
					<view class="post-trigger-btn" @click.stop="openUploadModal">
						<text class="post-plus">+</text>
						<text class="post-btn-text">我要推荐</text>
					</view>
				</view>

				<!-- UGC 种草列表 -->
				<view v-if="recommendationList.length > 0" class="ugc-cards-list">
					<view 
						v-for="(rec, rIdx) in recommendationList" 
						:key="rec.id || rIdx" 
						class="ugc-card-item"
					>
						<view class="ugc-header-row">
							<image 
								class="ugc-user-avatar" 
								:src="rec.userAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80'" 
								mode="aspectFill"
							></image>
							<view class="ugc-user-meta">
								<text class="ugc-user-name">{{ rec.userName || '市集吃货' }}</text>
								<text class="ugc-time">{{ rec.createdAt ? rec.createdAt.slice(0, 16) : '-' }}</text>
							</view>
							<view class="ugc-rating-pill">
								<text class="ugc-star">★</text>
								<text class="ugc-score">{{ rec.rating || 5 }}星力荐</text>
							</view>
						</view>

						<view class="ugc-food-tag">
							<text class="tag-icon">🔥 推荐菜:</text>
							<text class="tag-food-name">{{ rec.foodName || '-' }}</text>
							<text v-if="rec.price" class="tag-price">（打卡约 ¥{{ rec.price }}）</text>
						</view>

						<text class="ugc-comment-text">{{ rec.comment || '-' }}</text>

						<!-- UGC 实拍相册 -->
						<view v-if="rec.images && rec.images.length > 0" class="ugc-images-grid">
							<image 
								v-for="(imgUrl, imgIdx) in rec.images" 
								:key="imgIdx" 
								class="ugc-food-img" 
								:src="imgUrl" 
								mode="aspectFill"
								@click.stop="handlePreviewImage(rec.images, imgIdx)"
							></image>
						</view>
					</view>
				</view>

				<!-- 空状态提示 -->
				<view v-else class="empty-ugc-box" @click.stop="openUploadModal">
					<text class="empty-icon">📝</text>
					<text class="empty-text">该档口暂无吃货打卡，快来做第一个推荐官吧！</text>
				</view>
			</view>

			<!-- 底部占位垫高，确保内容完全滚出吸底按钮上方 -->
			<view class="scroll-bottom-spacer"></view>
		</scroll-view>

		<!-- 3. 底部固定吸底行动栏 -->
		<view class="drawer-actions-matrix">
			<!-- 拨打电话 -->
			<view class="action-icon-btn" @click.stop="handleCallShop">
				<uni-icons type="phone-filled" size="20" color="#64748B"></uni-icons>
				<text class="action-btn-sub">电话</text>
			</view>

			<!-- 我要推荐快捷入口 -->
			<view class="action-icon-btn" @click.stop="openUploadModal">
				<uni-icons type="compose" size="20" color="#FF5722"></uni-icons>
				<text class="action-btn-sub" style="color: #FF5722;">推荐</text>
			</view>

			<!-- 立即导航到店 -->
			<view class="action-primary-btn" @click.stop="handleNavigate">
				<uni-icons type="paperplane-filled" size="18" color="#FFFFFF"></uni-icons>
				<text class="primary-btn-text">立即导航到店 ({{ shop.distanceFormatted || '-' }})</text>
			</view>
		</view>

		<!-- 弹窗 1：视频在线全屏播放器弹窗 -->
		<view v-if="activeVideo" class="video-modal-backdrop" @click="closeVideoModal">
			<view class="video-modal-wrapper" @click.stop>
				<view class="video-modal-header">
					<text class="modal-video-title">{{ activeVideo.title }}</text>
					<view class="modal-close-icon" @click="closeVideoModal">✕</view>
				</view>
				<video 
					class="native-video-player"
					:src="activeVideo.videoUrl"
					autoplay
					controls
					show-fullscreen-btn
					show-play-btn
					enable-play-gesture
				></video>
				<view class="modal-video-meta">
					<text class="modal-video-author">博主：{{ activeVideo.author }}</text>
					<text class="modal-video-highlight">{{ activeVideo.highlight }}</text>
				</view>
			</view>
		</view>

		<!-- 弹窗 2：用户自定义上传美食推荐弹窗 -->
		<view v-if="showUploadModal" class="upload-modal-backdrop" @click="closeUploadModal">
			<view class="upload-modal-container" @click.stop>
				<view class="modal-title-bar">
					<text class="modal-header-title">推荐 {{ shop.name }} 招牌美食</text>
					<view class="modal-close-icon" @click="closeUploadModal">✕</view>
				</view>

				<scroll-view class="upload-form-scroll" scroll-y>
					<!-- 推荐美食名 -->
					<view class="form-item">
						<text class="form-label">美食名称 <text class="required">*</text></text>
						<input 
							v-model="formFoodName" 
							class="form-input" 
							placeholder="如：秘制脆皮五花肉、手打柠檬茶" 
							placeholder-class="placeholder-dim"
						/>
					</view>

					<!-- 打卡消费与推荐星级 -->
					<view class="form-row-dual">
						<view class="form-item form-half">
							<text class="form-label">打卡人均(元)</text>
							<input 
								v-model="formPrice" 
								type="number" 
								class="form-input" 
								placeholder="如：28" 
								placeholder-class="placeholder-dim"
							/>
						</view>
						<view class="form-item form-half">
							<text class="form-label">推荐指数</text>
							<view class="star-picker">
								<text 
									v-for="star in 5" 
									:key="star" 
									class="star-item"
									:class="{ 'is-active': star <= formRating }"
									@click="formRating = star"
								>★</text>
							</view>
						</view>
					</view>

					<!-- 种草心得 -->
					<view class="form-item">
						<text class="form-label">种草心得 / 避坑建议 <text class="required">*</text></text>
						<textarea 
							v-model="formComment" 
							class="form-textarea" 
							placeholder="说说这道菜口感如何？有什么隐藏吃法或排队建议？" 
							placeholder-class="placeholder-dim"
							maxlength="300"
						></textarea>
					</view>

					<!-- 实拍照上传 -->
					<view class="form-item">
						<text class="form-label">现场实拍照 ({{ uploadedImages.length }}/3)</text>
						<view class="uploader-grid">
							<view 
								v-for="(img, iIdx) in uploadedImages" 
								:key="iIdx" 
								class="uploader-thumb-box"
							>
								<image class="uploader-thumb-img" :src="img" mode="aspectFill"></image>
								<view class="uploader-del-btn" @click="removeImage(iIdx)">✕</view>
							</view>
							<view 
								v-if="uploadedImages.length < 3" 
								class="uploader-add-btn" 
								@click="handleChooseImage"
							>
								<text class="add-icon">+</text>
								<text class="add-text">添加照片</text>
							</view>
						</view>
					</view>
				</scroll-view>

				<!-- 提交操作栏 -->
				<view class="modal-footer-bar">
					<button class="submit-btn" :loading="isSubmitting" @click="handleSubmitRecommendation">
						立即发布推荐
					</button>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { uploadRecommendation } from '@/api/shop.js'

const props = defineProps({
	shop: {
		type: Object,
		default: null
	}
})

const emit = defineEmits(['close', 'navigate', 'refresh'])

// 评测视频列表
const videoList = computed(() => {
	return (props.shop && props.shop.videos) ? props.shop.videos : []
})

// UGC 推荐列表
const recommendationList = computed(() => {
	return (props.shop && props.shop.recommendations) ? props.shop.recommendations : []
})

// 物理拖拽跟随引擎状态
const dragTranslateY = ref(0)
const isDragging = ref(false)
const isClosing = ref(false)

const drawerDynamicStyle = computed(() => {
	if (isClosing.value) {
		return {
			transform: 'translate3d(0, 100%, 0)',
			opacity: '0.4'
		}
	}
	if (dragTranslateY.value > 0) {
		return {
			transform: `translate3d(0, ${dragTranslateY.value}px, 0)`
		}
	}
	return {}
})

// 视频全屏播放控制器
const activeVideo = ref(null)

const handlePlayVideo = (video) => {
	activeVideo.value = video
}

const closeVideoModal = () => {
	activeVideo.value = null
}

// 图片大图预览
const handlePreviewImage = (images, currentIdx) => {
	uni.previewImage({
		urls: images,
		current: images[currentIdx] || images[0]
	})
}

// UGC 自定义推荐上传弹窗
const showUploadModal = ref(false)
const isSubmitting = ref(false)
const formFoodName = ref('')
const formPrice = ref('')
const formRating = ref(5)
const formComment = ref('')
const uploadedImages = ref([])

const openUploadModal = () => {
	formFoodName.value = ''
	formPrice.value = ''
	formRating.value = 5
	formComment.value = ''
	uploadedImages.value = []
	showUploadModal.value = true
}

const closeUploadModal = () => {
	showUploadModal.value = false
}

// 选择实拍照
const handleChooseImage = () => {
	uni.chooseImage({
		count: 3 - uploadedImages.value.length,
		sizeType: ['compressed'],
		sourceType: ['album', 'camera'],
		success: (res) => {
			if (res.tempFilePaths && res.tempFilePaths.length > 0) {
				uploadedImages.value = [...uploadedImages.value, ...res.tempFilePaths].slice(0, 3)
			}
		},
		fail: () => {
			if (uploadedImages.value.length === 0) {
				uploadedImages.value.push('https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80')
			}
		}
	})
}

const removeImage = (index) => {
	uploadedImages.value.splice(index, 1)
}

// 提交推荐至后端真实数据库持久化
const handleSubmitRecommendation = async () => {
	if (!formFoodName.value.trim()) {
		uni.showToast({ title: '请填写推荐美食名称', icon: 'none' })
		return
	}
	if (!formComment.value.trim()) {
		uni.showToast({ title: '请填写种草心得或避坑建议', icon: 'none' })
		return
	}

	isSubmitting.value = true
	try {
		const finalImages = uploadedImages.value.length > 0
			? uploadedImages.value
			: ['https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80']

		await uploadRecommendation({
			shopId: props.shop.id,
			foodName: formFoodName.value.trim(),
			images: finalImages,
			comment: formComment.value.trim(),
			price: formPrice.value ? Number(formPrice.value) : undefined,
			rating: formRating.value,
			userName: '市集新食客'
		})

		uni.showToast({ title: '发布成功！已存入数据库', icon: 'success' })
		closeUploadModal()
		emit('refresh', props.shop.id)
	} catch (err) {
		console.error('发布推荐失败:', err)
	} finally {
		isSubmitting.value = false
	}
}

// 电话与导航
const handleCallShop = () => {
	if (!props.shop || !props.shop.phone || props.shop.phone === '-') {
		uni.showToast({ title: '该档口暂未登记联系电话', icon: 'none' })
		return
	}
	uni.makePhoneCall({ phoneNumber: props.shop.phone })
}

const handleNavigate = () => {
	emit('navigate', props.shop)
}

/**
 * 平滑顺畅收起抽屉
 */
const handleSmoothClose = () => {
	isClosing.value = true
	setTimeout(() => {
		emit('close')
		isClosing.value = false
		dragTranslateY.value = 0
	}, 260)
}

// 顶部把手触摸下拉物理跟手手势
let touchStartY = 0
let touchMoveY = 0

const handleTouchStart = (e) => {
	if (e.touches && e.touches[0]) {
		touchStartY = e.touches[0].clientY
		touchMoveY = touchStartY
		isDragging.value = true
	}
}

const handleTouchMove = (e) => {
	if (e.touches && e.touches[0]) {
		touchMoveY = e.touches[0].clientY
		const delta = touchMoveY - touchStartY
		if (delta > 0) {
			// 加入柔性物理橡皮筋阻尼（越往下拖阻力越平稳，位移缩减至 0.72）
			dragTranslateY.value = Math.round(delta * 0.72)
		} else {
			// 向上拖拽阻尼更大（防止穿透）
			dragTranslateY.value = Math.round(delta * 0.2)
		}
	}
}

const handleTouchEnd = () => {
	isDragging.value = false
	const delta = touchMoveY - touchStartY

	// 若下拉位移超过 75px，判定为意图收起抽屉，执行向下滑出动效
	if (delta > 75) {
		handleSmoothClose()
	} else {
		// 否则以弹簧物理曲线回弹至顶部初始位置
		dragTranslateY.value = 0
	}
	touchStartY = 0
	touchMoveY = 0
}
</script>

<style scoped lang="scss">
/* 抽屉面板主体容器（液态拟物高透玻璃质感 + 苹果级平滑弹簧缓动） */
.shop-drawer-panel {
	position: relative;
	z-index: 99;
	width: 100%;
	box-sizing: border-box;
	border-radius: 40rpx;
	padding: 16rpx 24rpx 16rpx 24rpx;
	height: 62vh;
	display: flex;
	flex-direction: column;
	@include liquid-glass(32px, 0.82, 0.52);
	border: 1.5rpx solid rgba(255, 255, 255, 0.95);
	box-shadow: 
		inset 0 2.5rpx 3rpx rgba(255, 255, 255, 0.98),
		inset 0 -1.5rpx 2rpx rgba(255, 255, 255, 0.45),
		0 16rpx 48rpx rgba(25, 45, 65, 0.16);
	
	/* 开启 GPU 独立合成层加速 */
	will-change: transform, opacity;
	/* 苹果级高平滑阻尼贝塞尔回弹曲线 */
	transition: transform 0.36s cubic-bezier(0.18, 0.89, 0.32, 1.05), opacity 0.28s ease;
	transform: translate3d(0, 0, 0);

	/* 拖拽状态下必须消除过渡延迟，实现 0 毫秒极致绝对跟手 */
	&.is-dragging {
		transition: none !important;
	}

	/* 关闭滑落动画 */
	&.is-closing {
		transition: transform 0.26s cubic-bezier(0.32, 0, 0.67, 0), opacity 0.22s ease !important;
	}
}

/* 顶部把手栏（下拉收起操作区） */
.drawer-header-bar {
	display: flex;
	align-items: center;
	justify-content: center;
	position: relative;
	height: 44rpx;
	margin-bottom: 12rpx;
	flex-shrink: 0;
	cursor: pointer;
}

.drawer-pill-handle {
	width: 88rpx;
	height: 10rpx;
	border-radius: 5rpx;
	background: rgba(148, 163, 184, 0.65);
	box-shadow: 0 1rpx 3rpx rgba(0, 0, 0, 0.08);
	transition: background 0.2s ease, transform 0.2s ease;

	&:active {
		background: rgba(100, 116, 139, 0.9);
		transform: scale(1.08);
	}
}

.drawer-close-btn {
	position: absolute;
	right: 0;
	top: 0;
	width: 44rpx;
	height: 44rpx;
	border-radius: 22rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	background: rgba(255, 255, 255, 0.9);
	box-shadow: 0 2rpx 8rpx rgba(25, 45, 65, 0.08);
	transition: all 0.18s ease;

	&:active {
		transform: scale(0.92);
		background: #F1F5F9;
	}
}

/* 纵向可滚动内容视口（极速惯性滚动 + 阻尼隔离） */
.drawer-scroll-viewport {
	flex: 1;
	width: 100%;
	height: 0; // flex 布局下必须设置 height: 0 激活内部精准滚动
	box-sizing: border-box;
	-webkit-overflow-scrolling: touch;
	overscroll-behavior-y: contain;
}

/* 商户头部信息 */
.drawer-main-profile {
	display: flex;
	align-items: flex-start;
	margin-bottom: 22rpx;
}

.shop-cover-thumb {
	width: 108rpx;
	height: 108rpx;
	border-radius: 24rpx;
	border: 2rpx solid rgba(255, 255, 255, 0.95);
	box-shadow: 0 6rpx 18rpx rgba(25, 45, 65, 0.12);
	margin-right: 20rpx;
	flex-shrink: 0;
}

.drawer-profile-info {
	flex: 1;
	min-width: 0;
}

.shop-name-row {
	display: flex;
	align-items: center;
	gap: 12rpx;
}

.shop-title-large {
	font-size: 32rpx;
	font-weight: bold;
	color: #1E293B;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.shop-stall-pill {
	font-size: 20rpx;
	color: #FF5722;
	background: rgba(255, 87, 34, 0.12);
	padding: 2rpx 12rpx;
	border-radius: 8rpx;
	font-weight: 600;
	flex-shrink: 0;
}

.shop-sub-row {
	display: flex;
	align-items: center;
	gap: 8rpx;
	margin-top: 8rpx;
}

.shop-rating-highlight {
	font-size: 24rpx;
	color: #FF8A00;
	font-weight: bold;
}

.shop-split {
	font-size: 20rpx;
	color: #CBD5E1;
}

.shop-price {
	font-size: 22rpx;
	color: #64748B;
}

.shop-distance {
	font-size: 22rpx;
	color: #0284C7;
	font-weight: 600;
}

.shop-status-row {
	display: flex;
	align-items: center;
	gap: 8rpx;
	margin-top: 8rpx;
}

.status-dot {
	width: 12rpx;
	height: 12rpx;
	border-radius: 6rpx;
	background-color: #10B981;
	box-shadow: 0 0 8rpx rgba(16, 185, 129, 0.6);

	&.is-closed {
		background-color: #94A3B8;
		box-shadow: none;
	}
}

.status-text {
	font-size: 20rpx;
	color: #10B981;
	font-weight: 500;
}

.shop-address-text {
	font-size: 20rpx;
	color: #94A3B8;
	margin-top: 4rpx;
	display: block;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

/* 专区样式 */
.media-section {
	margin-bottom: 22rpx;
	background: rgba(255, 255, 255, 0.72);
	border-radius: 26rpx;
	padding: 20rpx 22rpx;
	border: 1.5rpx solid rgba(255, 255, 255, 0.95);
	box-shadow: 0 4rpx 16rpx rgba(25, 45, 65, 0.04);
}

.section-title-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 16rpx;
}

.title-left {
	display: flex;
	align-items: center;
	gap: 8rpx;
}

.section-emoji {
	font-size: 26rpx;
}

.section-title {
	font-size: 24rpx;
	font-weight: bold;
	color: #334155;
}

.section-count {
	font-size: 22rpx;
	color: #94A3B8;
}

.empty-hint {
	font-size: 20rpx;
	color: #94A3B8;
}

.post-trigger-btn {
	display: flex;
	align-items: center;
	gap: 6rpx;
	background: linear-gradient(135deg, #FF6E40 0%, #FF5722 100%);
	padding: 6rpx 18rpx;
	border-radius: 22rpx;
	box-shadow: 0 4rpx 12rpx rgba(255, 87, 34, 0.28);
	transition: all 0.18s ease;

	&:active {
		transform: scale(0.95);
		filter: brightness(0.96);
	}
}

.post-plus {
	color: #FFFFFF;
	font-size: 24rpx;
	font-weight: bold;
	line-height: 1;
}

.post-btn-text {
	color: #FFFFFF;
	font-size: 20rpx;
	font-weight: 600;
}

/* 视频横向流 */
.video-scroll-container {
	width: 100%;
	white-space: nowrap;
	-webkit-overflow-scrolling: touch;
}

.video-scroll-track {
	display: inline-flex;
	gap: 18rpx;
	padding: 4rpx 0;
}

.video-card-item {
	width: 290rpx;
	display: inline-flex;
	flex-direction: column;
	background: rgba(255, 255, 255, 0.98);
	border-radius: 20rpx;
	padding: 12rpx;
	box-shadow: 0 6rpx 16rpx rgba(25, 45, 65, 0.06);
	cursor: pointer;
	transition: all 0.18s ease;

	&:active {
		transform: scale(0.97);
	}
}

.video-poster-box {
	position: relative;
	width: 100%;
	height: 160rpx;
	border-radius: 16rpx;
	overflow: hidden;
}

.video-poster-img {
	width: 100%;
	height: 100%;
}

.video-play-glass-btn {
	position: absolute;
	left: 50%;
	top: 50%;
	transform: translate(-50%, -50%);
	width: 52rpx;
	height: 52rpx;
	border-radius: 26rpx;
	background: rgba(0, 0, 0, 0.58);
	display: flex;
	align-items: center;
	justify-content: center;
	border: 1.5rpx solid rgba(255, 255, 255, 0.85);
	backdrop-filter: blur(4px);
}

.play-icon {
	color: #FFFFFF;
	font-size: 22rpx;
	margin-left: 4rpx;
}

.video-duration-tag {
	position: absolute;
	right: 8rpx;
	bottom: 8rpx;
	background: rgba(0, 0, 0, 0.65);
	color: #FFFFFF;
	font-size: 16rpx;
	padding: 2rpx 8rpx;
	border-radius: 6rpx;
}

.video-platform-tag {
	position: absolute;
	left: 8rpx;
	top: 8rpx;
	background: #0284C7;
	color: #FFFFFF;
	font-size: 16rpx;
	padding: 2rpx 8rpx;
	border-radius: 6rpx;
	font-weight: 600;
}

.video-card-title {
	font-size: 22rpx;
	font-weight: bold;
	color: #1E293B;
	margin-top: 10rpx;
	white-space: normal;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
	line-height: 1.35;
	height: 60rpx;
}

.video-author-row {
	display: flex;
	align-items: center;
	margin-top: 6rpx;
}

.video-author-name {
	font-size: 18rpx;
	color: #64748B;
}

.video-highlight-text {
	font-size: 18rpx;
	color: #FF5722;
	background: rgba(255, 87, 34, 0.08);
	padding: 4rpx 10rpx;
	border-radius: 8rpx;
	margin-top: 8rpx;
	white-space: normal;
	display: -webkit-box;
	-webkit-line-clamp: 1;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

/* UGC 推荐卡片 */
.ugc-cards-list {
	display: flex;
	flex-direction: column;
	gap: 18rpx;
}

.ugc-card-item {
	background: rgba(255, 255, 255, 0.98);
	border-radius: 20rpx;
	padding: 18rpx;
	box-shadow: 0 4rpx 14rpx rgba(25, 45, 65, 0.04);
}

.ugc-header-row {
	display: flex;
	align-items: center;
}

.ugc-user-avatar {
	width: 56rpx;
	height: 56rpx;
	border-radius: 28rpx;
	margin-right: 14rpx;
}

.ugc-user-meta {
	flex: 1;
	display: flex;
	flex-direction: column;
}

.ugc-user-name {
	font-size: 22rpx;
	font-weight: 600;
	color: #1E293B;
}

.ugc-time {
	font-size: 18rpx;
	color: #94A3B8;
}

.ugc-rating-pill {
	display: flex;
	align-items: center;
	gap: 4rpx;
	background: rgba(255, 138, 0, 0.12);
	padding: 4rpx 12rpx;
	border-radius: 10rpx;
}

.ugc-star {
	color: #FF8A00;
	font-size: 20rpx;
}

.ugc-score {
	color: #FF8A00;
	font-size: 18rpx;
	font-weight: bold;
}

.ugc-food-tag {
	display: flex;
	align-items: center;
	margin-top: 10rpx;
	background: rgba(255, 87, 34, 0.06);
	padding: 6rpx 14rpx;
	border-radius: 10rpx;
	width: fit-content;
}

.tag-icon {
	font-size: 20rpx;
	color: #FF5722;
	font-weight: bold;
	margin-right: 6rpx;
}

.tag-food-name {
	font-size: 20rpx;
	color: #FF5722;
	font-weight: bold;
}

.tag-price {
	font-size: 18rpx;
	color: #64748B;
	margin-left: 6rpx;
}

.ugc-comment-text {
	font-size: 22rpx;
	color: #334155;
	line-height: 1.48;
	margin-top: 12rpx;
	display: block;
}

.ugc-images-grid {
	display: flex;
	gap: 14rpx;
	margin-top: 14rpx;
}

.ugc-food-img {
	width: 148rpx;
	height: 148rpx;
	border-radius: 14rpx;
	box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
	transition: transform 0.15s ease;

	&:active {
		transform: scale(0.96);
	}
}

.empty-ugc-box {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 32rpx 0;
	cursor: pointer;
}

.empty-icon {
	font-size: 44rpx;
	margin-bottom: 8rpx;
}

.empty-text {
	font-size: 20rpx;
	color: #94A3B8;
}

.scroll-bottom-spacer {
	width: 100%;
	height: 36rpx;
}

/* 底部操作 */
.drawer-actions-matrix {
	display: flex;
	align-items: center;
	gap: 16rpx;
	margin-top: 14rpx;
	padding-top: 8rpx;
	flex-shrink: 0;
}

.action-icon-btn {
	width: 90rpx;
	height: 80rpx;
	border-radius: 24rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 4rpx;
	background: rgba(255, 255, 255, 0.92);
	border: 1.5rpx solid rgba(255, 255, 255, 0.95);
	box-shadow: 0 4rpx 14rpx rgba(25, 45, 65, 0.05);
	flex-shrink: 0;
	transition: all 0.18s ease;

	&:active {
		transform: scale(0.92);
		background: #F1F5F9;
	}
}

.action-btn-sub {
	font-size: 18rpx;
	color: #64748B;
}

.action-primary-btn {
	flex: 1;
	height: 80rpx;
	border-radius: 40rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 10rpx;
	background: linear-gradient(135deg, #FF6E40 0%, #FF5722 100%);
	box-shadow: 0 6rpx 20rpx rgba(255, 87, 34, 0.35);
	transition: all 0.18s ease;

	&:active {
		transform: scale(0.96);
		filter: brightness(0.95);
	}
}

.primary-btn-text {
	font-size: 24rpx;
	color: #FFFFFF;
	font-weight: 600;
}

/* 视频播放弹窗 */
.video-modal-backdrop {
	position: fixed;
	left: 0;
	top: 0;
	right: 0;
	bottom: 0;
	z-index: 999;
	background: rgba(0, 0, 0, 0.85);
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 24rpx;
	animation: modalFadeIn 0.22s ease;
}

@keyframes modalFadeIn {
	from { opacity: 0; }
	to { opacity: 1; }
}

.video-modal-wrapper {
	width: 100%;
	background: #1E293B;
	border-radius: 24rpx;
	overflow: hidden;
	display: flex;
	flex-direction: column;
	box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.5);
}

.video-modal-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 20rpx 24rpx;
	border-bottom: 1rpx solid rgba(255, 255, 255, 0.1);
}

.modal-video-title {
	font-size: 24rpx;
	color: #FFFFFF;
	font-weight: bold;
	flex: 1;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.modal-close-icon {
	color: #94A3B8;
	font-size: 32rpx;
	padding: 0 10rpx;
	cursor: pointer;
}

.native-video-player {
	width: 100%;
	height: 420rpx;
}

.modal-video-meta {
	padding: 20rpx 24rpx;
}

.modal-video-author {
	font-size: 20rpx;
	color: #38BDF8;
	font-weight: 600;
	display: block;
}

.modal-video-highlight {
	font-size: 20rpx;
	color: #E2E8F0;
	margin-top: 8rpx;
	display: block;
	line-height: 1.4;
}

/* 自定义上传弹窗 */
.upload-modal-backdrop {
	position: fixed;
	left: 0;
	top: 0;
	right: 0;
	bottom: 0;
	z-index: 999;
	background: rgba(15, 23, 42, 0.65);
	backdrop-filter: blur(8px);
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 30rpx;
	animation: modalFadeIn 0.22s ease;
}

.upload-modal-container {
	width: 100%;
	max-height: 80vh;
	background: #FFFFFF;
	border-radius: 32rpx;
	padding: 24rpx;
	display: flex;
	flex-direction: column;
	box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.25);
}

.modal-title-bar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding-bottom: 16rpx;
	border-bottom: 1rpx solid #F1F5F9;
}

.modal-header-title {
	font-size: 28rpx;
	font-weight: bold;
	color: #1E293B;
}

.upload-form-scroll {
	max-height: 55vh;
	padding: 20rpx 0;
}

.form-item {
	margin-bottom: 20rpx;
}

.form-row-dual {
	display: flex;
	gap: 16rpx;
}

.form-half {
	flex: 1;
}

.form-label {
	font-size: 22rpx;
	color: #475569;
	font-weight: 600;
	margin-bottom: 8rpx;
	display: block;
}

.required {
	color: #EF4444;
}

.form-input {
	height: 72rpx;
	background: #F8FAFC;
	border: 1.5rpx solid #E2E8F0;
	border-radius: 16rpx;
	padding: 0 16rpx;
	font-size: 22rpx;
	color: #1E293B;
}

.form-textarea {
	width: 100%;
	height: 140rpx;
	box-sizing: border-box;
	background: #F8FAFC;
	border: 1.5rpx solid #E2E8F0;
	border-radius: 16rpx;
	padding: 14rpx 16rpx;
	font-size: 22rpx;
	color: #1E293B;
}

.star-picker {
	display: flex;
	align-items: center;
	height: 72rpx;
	gap: 8rpx;
}

.star-item {
	font-size: 38rpx;
	color: #CBD5E1;
	cursor: pointer;

	&.is-active {
		color: #FF8A00;
	}
}

.uploader-grid {
	display: flex;
	gap: 16rpx;
	margin-top: 8rpx;
}

.uploader-thumb-box {
	position: relative;
	width: 130rpx;
	height: 130rpx;
	border-radius: 16rpx;
	overflow: hidden;
}

.uploader-thumb-img {
	width: 100%;
	height: 100%;
}

.uploader-del-btn {
	position: absolute;
	right: 6rpx;
	top: 6rpx;
	width: 32rpx;
	height: 32rpx;
	border-radius: 16rpx;
	background: rgba(0, 0, 0, 0.6);
	color: #FFFFFF;
	font-size: 18rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.uploader-add-btn {
	width: 130rpx;
	height: 130rpx;
	border-radius: 16rpx;
	background: #F8FAFC;
	border: 2rpx dashed #CBD5E1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	cursor: pointer;
}

.add-icon {
	font-size: 36rpx;
	color: #94A3B8;
	line-height: 1;
}

.add-text {
	font-size: 18rpx;
	color: #94A3B8;
	margin-top: 4rpx;
}

.placeholder-dim {
	color: #94A3B8;
}

.modal-footer-bar {
	padding-top: 16rpx;
	border-top: 1rpx solid #F1F5F9;
}

.submit-btn {
	width: 100%;
	height: 80rpx;
	border-radius: 40rpx;
	background: linear-gradient(135deg, #FF6E40 0%, #FF5722 100%);
	color: #FFFFFF;
	font-size: 26rpx;
	font-weight: bold;
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 8rpx 24rpx rgba(255, 87, 34, 0.35);

	&:active {
		transform: scale(0.98);
	}
}
</style>
