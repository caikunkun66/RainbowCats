const BASE_URL = 'https://76614b38.r6.cpolar.top/api/v1'

function getToken() {
  return wx.getStorageSync('token') || ''
}

function setToken(token) {
  wx.setStorageSync('token', token)
}

function clearToken() {
  wx.removeStorageSync('token')
}

// 登录函数（内部使用）
function loginRequest(code) {
  return request('/auth/login', {
    method: 'POST',
    data: {code},
    timeout: 60000, // 登录请求使用 60 秒超时
  })
}

// 自动登录函数
async function autoLogin() {
  try {
    const code = await new Promise((resolve, reject) => {
      wx.login({
        success: (res) => {
          if (res.code) {
            resolve(res.code)
          } else {
            reject(new Error('获取 code 失败'))
          }
        },
        fail: reject,
      })
    })

    // 使用 loginRequest 函数，它已经设置了 60 秒超时
    const result = await loginRequest(code)
    
    if (result.token) {
      setToken(result.token)
      return result
    }
    throw new Error('登录失败：未获取到 token')
  } catch (error) {
    console.error('[API] 自动登录失败:', error)
    // 如果是超时错误，提供更友好的错误信息
    if (error.timeout || (error.errMsg && error.errMsg.includes('timeout'))) {
      throw new Error('登录超时，请检查网络连接或确保后端服务器正在运行')
    }
    throw error
  }
}

function request(path, options = {}) {
  const {method = 'GET', data = {}, header = {}, timeout = 30000} = options
  return new Promise(async (resolve, reject) => {
    // 如果请求失败且是 401，尝试重新登录（但登录接口本身不重试）
    const makeRequest = async (retry = true) => {
      // 如果是登录接口，不重试
      if (path === '/auth/login' && !getToken()) {
        retry = false
      }

      wx.request({
        url: `${BASE_URL}${path}`,
        method,
        data,
        header: {
          'Content-Type': 'application/json',
          Authorization: getToken() ? `Bearer ${getToken()}` : '',
          ...header,
        },
        timeout: timeout, // 设置超时时间（毫秒），默认 30 秒
        success(res) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res.data)
          } else if (res.statusCode === 401 && retry && path !== '/auth/login') {
            // Token 过期，尝试重新登录（但登录接口本身不重试）
            clearToken()
            autoLogin()
              .then(() => makeRequest(false)) // 重试请求，不再重试登录
              .catch(reject)
          } else {
            reject(res.data || {message: 'Request failed', statusCode: res.statusCode})
          }
        },
        fail(error) {
          // 处理超时错误
          if (error.errMsg && error.errMsg.includes('timeout')) {
            reject({
              message: '请求超时，请检查网络连接或稍后重试',
              errMsg: error.errMsg,
              timeout: true
            })
          } else {
            reject(error)
          }
        },
      })
    }

    await makeRequest()
  })
}

export const api = {
  login(code) {
    return loginRequest(code)
  },
  autoLogin,
  getCurrentUser() {
    return request('/users/me')
  },
  getUserByOpenid(openid) {
    return request(`/users/by-openid/${openid}`)
  },
  getInviteCode() {
    return request('/users/invite-code')
  },
  bindPartner(inviteCode) {
    return request('/users/bind-partner', {
      method: 'POST',
      data: {invite_code: inviteCode},
    })
  },
  getPartner() {
    return request('/users/partner')
  },
  listMissions(params = {}) {
    return request('/missions', {data: params})
  },
  getMission(id) {
    return request(`/missions/${id}`)
  },
  createMission(payload) {
    return request('/missions', {method: 'POST', data: payload})
  },
  completeMission(id) {
    return request(`/missions/${id}/complete`, {method: 'POST'})
  },
  toggleMissionStar(id) {
    return request(`/missions/${id}/star`, {method: 'POST'})
  },
  deleteMission(id) {
    return request(`/missions/${id}`, {method: 'DELETE'})
  },
  listItems() {
    return request('/items')
  },
  getItem(id) {
    return request(`/items/${id}`)
  },
  createItem(payload) {
    return request('/items', {method: 'POST', data: payload})
  },
  toggleItemStar(id) {
    return request(`/items/${id}/star`, {method: 'POST'})
  },
  deleteItem(id) {
    return request(`/items/${id}`, {method: 'DELETE'})
  },
  redeemItem(itemId) {
    return request('/orders', {method: 'POST', data: {item_id: itemId}})
  },
  listOrders() {
    return request('/orders')
  },
  getOrder(id) {
    return request(`/orders/${id}`)
  },
  useOrder(id) {
    return request(`/orders/${id}/use`, {method: 'POST'})
  },
  toggleOrderStar(id) {
    return request(`/orders/${id}/star`, {method: 'POST'})
  },
  deleteOrder(id) {
    return request(`/orders/${id}`, {method: 'DELETE'})
  },
  updateSubscribeStatus(status) {
    return request('/notifications/subscribe-status', {
      method: 'POST',
      data: status,
    })
  },
  updateProfile(nickname) {
    return request('/users/me', {
      method: 'PUT',
      data: {nickname},
    })
  },
}

