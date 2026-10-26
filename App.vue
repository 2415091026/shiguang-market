<script>
	export default {
		onLaunch: function() {
			console.log('App Launch')
			// 全局异步注册沐瑶软笔手写体
			uni.loadFontFace({
				global: true,
				family: 'MuyaoSoftBrush',
				source: 'url("/static/font/muyaoruanbishouxieti.ttf")',
				success: () => {
					console.log('沐瑶软笔手写体加载成功')
				},
				fail: (err) => {
					console.warn('各端优先自动通过 CSS @font-face 解析:', err)
				}
			})
		},
		onShow: function() {
			console.log('App Show')
		},
		onHide: function() {
			console.log('App Hide')
		}
	}
</script>

<style lang="scss">
	/* 引入全局 iOS 液态毛玻璃设计系统 */
	@import '@/styles/glass.scss';

	/* 全局引入沐瑶软笔手写体（治愈手绘风） */
	@font-face {
		font-family: 'MuyaoSoftBrush';
		src: url('~@/static/font/muyaoruanbishouxieti.ttf') format('truetype'),
		     url('/static/font/muyaoruanbishouxieti.ttf') format('truetype');
		font-weight: normal;
		font-style: normal;
	}

	.font-muyao {
		font-family: 'MuyaoSoftBrush', cursive, -apple-system, sans-serif;
	}

	/* 全局公共基础样式与移动端体验优化 */
	page {
		width: 100%;
		height: 100%;
		overflow: hidden; /* 彻底锁定外层窗口，杜绝全屏位移 */
		overscroll-behavior-y: none; /* 禁用系统级橡皮筋回弹拉伸 */
		background-color: #F8FAFC;
		font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', STHeiti, 'Microsoft Yahei', Tahoma, Simsun, sans-serif;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
	}

	view, scroll-view, swiper, text {
		box-sizing: border-box;
		-webkit-tap-highlight-color: transparent;
	}

	/* 隐藏原生各端默认滚动条 */
	::-webkit-scrollbar {
		display: none;
		width: 0 !important;
		height: 0 !important;
		-webkit-appearance: none;
		background: transparent;
	}
</style>
