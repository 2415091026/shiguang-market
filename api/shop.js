/**
 * 拾光市集 - 美食商户与探店视频网络请求模块
 */

// 后端 API 基础服务地址（真机 App 测试时必须使用电脑的局域网真实 IP，不可使用 localhost）
const BASE_URL = 'http://192.168.1.3:3000/api/v1'

/**
 * 统一网络请求封装
 * @param {Object} options - 请求配置
 */
const request = (options) => {
	return new Promise((resolve, reject) => {
		uni.request({
			url: `${BASE_URL}${options.url}`,
			method: options.method || 'GET',
			data: options.data || {},
			header: {
				'Content-Type': 'application/json',
				...(options.header || {})
			},
			timeout: 10000,
			success: (res) => {
				if (res.statusCode >= 200 && res.statusCode < 300) {
					// 兼容后端统一响应拦截器格式 { code: 200, message, data }
					if (res.data && res.data.code === 200) {
						resolve(res.data.data)
					} else if (res.data && res.data.code) {
						uni.showToast({
							title: res.data.message || '业务处理失败',
							icon: 'none'
						})
						reject(res.data)
					} else {
						resolve(res.data)
					}
				} else {
					uni.showToast({
						title: `网络异常(${res.statusCode})`,
						icon: 'none'
					})
					reject(res)
				}
			},
			fail: (err) => {
				console.error('[API Error]:', err)
				uni.showToast({
					title: '服务连接超时，请确认后端已启动',
					icon: 'none'
				})
				reject(err)
			}
		})
	})
}

/**
 * 召回附近美食商家列表（含实时距离与精选评测视频摘要）
 * @param {Object} params - { latitude, longitude, radius, category, sort, page, limit }
 */
export const getNearbyShops = (params) => {
	return request({
		url: '/shops/nearby',
		method: 'GET',
		data: params
	})
}

/**
 * 获取商家完整详情（含全部评测视频与用户 UGC 推荐）
 * @param {number|string} id - 商家ID
 * @param {Object} params - { latitude, longitude }
 */
export const getShopDetail = (id, params = {}) => {
	return request({
		url: `/shops/${id}`,
		method: 'GET',
		data: params
	})
}

/**
 * 获取美食街所有分类元数据
 */
export const getCategories = () => {
	return request({
		url: '/shops/categories/all',
		method: 'GET'
	})
}

/**
 * 用户自定义上传美食推荐卡片
 * @param {Object} data - { shopId, foodName, images, videoUrl, comment, price, rating, userName }
 */
export const uploadRecommendation = (data) => {
	return request({
		url: '/shops/recommendations',
		method: 'POST',
		data
	})
}
