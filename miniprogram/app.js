App({
  async onLaunch() {
    this.initcloud()

    this.globalData = {
      //记录使用者的openid
      _openidA: 'oeZlx1yvWK6tAUk3Q7C0ZX5Hn4RQ',
      _openidB: 'oeZlx158xDcD1gESG4BqTusC55kg',

      //记录使用者的名字
      userA: '坤神',
      userB: '小金人',

      //用于存储待办记录的集合名称
      collectionMissionList: 'MissionList',
      collectionMarketList: 'MarketList',
      collectionStorageList: 'StorageList',
      collectionUserList: 'UserList',

      //最多单次商品兑换积分
      maxItemCredit: 9100,
      //最多单次任务奖励积分
      maxMissionCredit: 91,
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