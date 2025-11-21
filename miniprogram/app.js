const {api} = require('./utils/api.js')

App({
  globalData: {
    //用于存储待办记录的集合名称（保留用于兼容）
    collectionMissionList: 'MissionList',
    collectionMarketList: 'MarketList',
    collectionStorageList: 'StorageList',
    collectionUserList: 'UserList',

    //最多单次商品兑换积分
    maxItemCredit: 2000,
    //最多单次任务奖励积分
    maxMissionCredit: 100,

    // 当前登录用户和已绑定伙伴的缓存数据，供各页面复用，减少重复请求
    currentUser: null,
    partner: null,
  },

  async onLaunch() {
    // 初始化 API 登录
    await this.initApi()
  },

  /**
   * 初始化 API 并自动登录
   */
  async initApi() {
    try {
      const result = await api.autoLogin()
      console.log('[App] 登录成功:', result)
      // 可以在这里保存用户信息到 globalData
      if (result.user) {
        this.globalData.currentUser = result.user
      }
    } catch (error) {
      console.error('[App] 登录失败:', error)
      // 登录失败不阻塞应用启动，只在控制台记录错误
      // 用户在使用需要登录的功能时会自动重试登录
      const errorMessage = error.message || error.errMsg || '登录失败'
      if (errorMessage.includes('超时') || errorMessage.includes('timeout')) {
        console.warn('[App] 登录超时，应用将继续运行，使用需要登录的功能时会自动重试')
      } else {
        console.warn('[App] 登录失败，应用将继续运行，使用需要登录的功能时会自动重试')
      }
    }
  },

  flag: false,

  /**
   * 初始化云开发环境
   */
  async initcloud() {
    const {envList = [], PLACEHOLDER_ENV_ID} = require('./envList.js') // 读取 envlist 文件
    const rawEnvId = envList.length > 0 ? envList[0].envId : ''
    const trimmedEnvId = typeof rawEnvId === 'string' ? rawEnvId.trim() : ''
    const placeholderCandidates = [
      '',
      PLACEHOLDER_ENV_ID,
      'cloud1-3g5nuxjl3e5dbf25',
    ].filter(Boolean).map(item => item.toLowerCase())
    const envIdIsConfigured = trimmedEnvId !== '' && !placeholderCandidates.includes(trimmedEnvId.toLowerCase())
    const initOptions = {
      traceUser: true,
    }
    if (envIdIsConfigured) {
      initOptions.env = trimmedEnvId
    } else {
      console.warn('[cloud] 未在 miniprogram/envList.js 配置可用的 envId，默认使用开发工具当前选择的云环境')
    }
    wx.cloud.init(initOptions) // 初始化云开发环境
    // 装载云函数操作对象返回方法
    this.cloud = () => {
      return wx.cloud // 直接返回 wx.cloud
    }
    if (!envIdIsConfigured) {
      try {
        const accountInfo = typeof wx.getAccountInfoSync === 'function' ? wx.getAccountInfoSync() : null
        const envVersion = accountInfo && accountInfo.miniProgram ? accountInfo.miniProgram.envVersion : undefined
        if (!envVersion || envVersion === 'develop') {
          wx.showModal({
            title: '请配置云环境',
            content: '尚未在 miniprogram/envList.js 设置自己的 envId，已使用当前默认云环境。',
            showCancel: false
          })
        }
      } catch (error) {
        console.warn('[cloud] 检查 envId 配置时失败', error)
      }
    }
  },

  // 获取云数据库实例
  async database() {
    return (await this.cloud()).database()
  },
})