const {api} = require('../../utils/api.js')

const SUBSCRIBE_TEMPLATE_ID = 'z4n_ECy_C4oyEjONAPMOcXjR-aGO4a82mON85GwF7lY'

Page({
    //增加消息接收与发送功能
    async handleTap() {
        if (this.data.isSaving) {
            return
        }
        try {
            await this.ensureSubscriptionPermission()
        } catch (error) {
            console.warn('[MissionAdd] ensureSubscriptionPermission failed:', error)
        }

        this.data.isSaving = true
        this.setData({
            isSaving: true
        })
        try {
            await this.saveMission()
        } catch (error) {
            console.error('[MissionAdd] handleTap failed:', error)
        } finally {
            this.data.isSaving = false
            this.setData({
                isSaving: false
            })
        }
  },  
  //保存正在编辑的任务
  data: {
    title: '',
    desc: '',
    
    credit: 0,
    maxCredit: getApp().globalData.maxMissionCredit,
    presetIndex: 0,
    presets: [
      {
        name:"无预设",
        title:"",
        desc:"",
      },
      {
        name:"打瓦",
        title:"打瓦，打瓦，打瓦",
        desc:"来吧，让我们一起打瓦，一起快乐！",
      },
      {
        name:"早睡早起",
        title:"晚上要早睡，明天早起",
        desc:"熬夜对身体很不好，还是要早点睡觉第二天才能有精神！",
      },
      {
        name:"健康运动",
        title:"做些运动，注意身体",
        desc:"做一些健身运动吧，跳绳，跑步，训练动作什么的。",
      },
      {
        name:"打扫房间",
        title:"清扫房间，整理整理",
        desc:"有一段时间没有打扫房间了，一屋不扫，何以扫天下？",
      },
      {
        name:"戒烟戒酒",
        title:"烟酒不解真愁",
        desc:"维持一段时间不喝酒，不抽烟，保持健康生活！",
      },
      {
        name:"请客吃饭",
        title:"请客吃点好的",
        desc:"好吃的有很多，我可以让你尝到其中之一，好好享受吧！",
      },
      {
        name:"买小礼物",
        title:"整点小礼物",
        desc:"买点小礼物，像泡泡马特什么的。",
      },
      {
        name:"洗碗洗碟",
        title:"这碗碟我洗了",
        desc:"有我洗碗洗碟子，有你吃饭无它事。",
      },
      {
        name:"帮拿东西",
        title:"帮拿一天东西",
        desc:"有了我，你再也不需要移动了。拿外卖，拿零食，开空调，开电视，在所不辞。",
      },
      {
        name:"制作饭菜",
        title:"这道美食由我完成",
        desc:"做点可口的饭菜，或者专门被指定的美食。我这个大厨，随便下，都好吃。",
      }
    ],
    list: getApp().globalData.collectionMissionList,
    isSaving: false,
    ownerOptions: [],
    selectedOwnerOpenid: '',
    currentOpenid: '',
    subscribeTemplateId: SUBSCRIBE_TEMPLATE_ID,
    subscribeStatus: 'unknown',
    subscribeKeep: false,
    isCheckingSubscribe: false,
    isRequestingSubscribe: false,
    remindEnabled: false,
    remindDate: '',
    remindTime: '',
    minRemindDate: '',
    checkFlag: wx.getStorageSync('checkFlag') || false,
  },

  async onLoad() {
    await this.initOwnerOptions()
    this.initReminderDefaults()
    await this.refreshSubscribeStatus()
  },

  async initOwnerOptions() {
    try {
      const currentUser = await api.getCurrentUser()
      const partnerResult = await api.getPartner()
      
      const ownerOptions = [
        {
          name: currentUser.nickname || '我',
          openid: currentUser.openid,
        },
      ]
      
      if (partnerResult.partner) {
        ownerOptions.push({
          name: partnerResult.partner.nickname || '伙伴',
          openid: partnerResult.partner.openid,
        })
      }
      
      const defaultOwner = currentUser.openid
      this.setData({
        ownerOptions,
        selectedOwnerOpenid: defaultOwner,
        currentOpenid: currentUser.openid,
        checkFlag: !!currentUser.check_flag,
      })
      this.syncCheckFlag(!!currentUser.check_flag)
    } catch (error) {
      console.error('[MissionAdd] initOwnerOptions failed:', error)
      // 使用默认值
      const app = getApp()
      const ownerOptions = [
        {
          name: app.globalData.userA || '我',
          openid: app.globalData._openidA || '',
        },
      ]
      this.setData({
        ownerOptions,
        selectedOwnerOpenid: ownerOptions[0]?.openid || '',
        currentOpenid: ownerOptions[0]?.openid || '',
      })
    }
  },

  initReminderDefaults() {
    const now = new Date()
    const minDate = this.formatDate(now)
    const nextHour = new Date(now)
    this.setData({
      minRemindDate: minDate,
      remindDate: '',
      remindTime: this.formatTime(nextHour)
    })
  },

  formatDate(date) {
    const year = date.getFullYear()
    const month = `${date.getMonth() + 1}`.padStart(2, '0')
    const day = `${date.getDate()}`.padStart(2, '0')
    return `${year}-${month}-${day}`
  },

  formatTime(date) {
    const hours = `${date.getHours()}`.padStart(2, '0')
    const minutes = `${date.getMinutes()}`.padStart(2, '0')
    return `${hours}:${minutes}`
  },

  syncCheckFlag(flag) {
    const normalized = !!flag
    wx.setStorageSync('checkFlag', normalized)
    this.setData({ checkFlag: normalized })
  },

  onReminderToggle(e) {
    const enabled = !!e.detail.value
    this.setData({ remindEnabled: enabled })
    if (enabled && !this.data.remindDate) {
      const today = this.formatDate(new Date())
      this.setData({ remindDate: today })
    }
  },

  onReminderDateChange(e) {
    this.setData({ remindDate: e.detail.value })
  },

  onReminderTimeChange(e) {
    this.setData({ remindTime: e.detail.value })
  },

  combineReminderDateTime(dateStr, timeStr) {
    if (!dateStr || !timeStr) {
      return null
    }
    const dateTimeStr = `${dateStr} ${timeStr}`
    const timestamp = Date.parse(dateTimeStr.replace(/-/g, '/'))
    if (Number.isNaN(timestamp)) {
      return null
    }
    return new Date(timestamp).toISOString()
  },

  fetchSubscribeSetting() {
    return new Promise((resolve, reject) => {
      wx.getSetting({
        withSubscriptions: true,
        success: resolve,
        fail: reject,
      })
    })
  },

  extractKeepFromSetting(setting) {
    const templateId = this.data.subscribeTemplateId
    const itemSettings = setting?.subscriptionsSetting?.itemSettings || {}
    return Object.prototype.hasOwnProperty.call(itemSettings, templateId)
  },

  async persistSubscribeStatus(status, keep, scene) {
    try {
      const response = await api.updateSubscribeStatus({
        template_id: this.data.subscribeTemplateId,
        status,
        keep,
        scene,
      })
      if (response && Object.prototype.hasOwnProperty.call(response, 'check_flag')) {
        this.syncCheckFlag(response.check_flag)
      }
    } catch (error) {
      console.warn('[MissionAdd] persistSubscribeStatus failed:', error)
    }
  },

  async refreshSubscribeStatus() {
    if (this.data.isCheckingSubscribe) {
      return this.data.subscribeStatus
    }
    this.setData({ isCheckingSubscribe: true })
    try {
      const setting = await this.fetchSubscribeSetting()
      const status = setting?.subscriptionsSetting?.itemSettings?.[this.data.subscribeTemplateId] || 'unset'
      const keep = this.extractKeepFromSetting(setting)
      this.setData({
        subscribeStatus: status,
        subscribeKeep: keep
      })
      await this.persistSubscribeStatus(status, keep, 'mission_add_refresh')
      return status
    } catch (error) {
      console.error('[MissionAdd] refreshSubscribeStatus failed:', error)
      this.setData({ subscribeStatus: 'unknown' })
      return 'unknown'
    } finally {
      this.setData({ isCheckingSubscribe: false })
    }
  },

  async requestSubscribeMessage() {
    if (this.data.isRequestingSubscribe) {
      return false
    }
    this.setData({ isRequestingSubscribe: true })
    try {
      const templateId = this.data.subscribeTemplateId
      const result = await new Promise((resolve, reject) => {
        wx.requestSubscribeMessage({
          tmplIds: [templateId],
          success: resolve,
          fail: reject,
        })
      })
      const status = result?.[templateId] || 'unknown'
      const setting = await this.fetchSubscribeSetting()
      const keep = this.extractKeepFromSetting(setting)
      this.setData({
        subscribeStatus: status,
        subscribeKeep: keep
      })
      await this.persistSubscribeStatus(status, keep, 'mission_add_request')
      if (status === 'accept') {
        wx.showToast({ title: '已授权提醒', icon: 'success' })
        return true
      }
      wx.showToast({ title: '未开启提醒', icon: 'none' })
      return false
    } catch (error) {
      console.error('[MissionAdd] requestSubscribeMessage failed:', error)
      wx.showToast({ title: '授权失败', icon: 'none' })
      return false
    } finally {
      this.setData({ isRequestingSubscribe: false })
    }
  },

  async ensureSubscriptionPermission() {
    return this.requestSubscribeMessage()
  },

  //数据输入填写表单
  onTitleInput(e) {
    this.setData({
      title: e.detail.value
    })
  },
  onDescInput(e) {
    this.setData({
      desc: e.detail.value
    })
  },
  normalizeCredit(value) {
    const numeric = Number(value)
    if (Number.isNaN(numeric)) {
      return 0
    }
    const clamped = Math.max(0, Math.min(this.data.maxCredit, Math.round(numeric)))
    return clamped
  },
  onCreditInput(e) {
    this.setData({
      credit: this.normalizeCredit(e.detail.value)
    })
  },
  onCreditManualInput(e) {
    this.setData({
      credit: this.normalizeCredit(e.detail.value)
    })
  },
  onPresetChange(e){
    this.setData({
      presetIndex: e.detail.value,
      title: this.data.presets[e.detail.value].title,
      desc: this.data.presets[e.detail.value].desc,
    })
  },
  onOwnerChange(e) {
    this.setData({
      selectedOwnerOpenid: e.detail.value
    })
  },

  //保存任务
  async saveMission() {
    // 对输入框内容进行校验
    if (this.data.title === '') {
      wx.showToast({
        title: '标题未填写',
        icon: 'error',
        duration: 2000
      })
      return false
    }
    if (this.data.title.length > 120) {
      wx.showToast({
        title: '标题过长',
        icon: 'error',
        duration: 2000
      })
      return false
    }
    if (this.data.desc.length > 500) {
      wx.showToast({
        title: '描述过长',
        icon: 'error',
        duration: 2000
      })
      return false
    }
    if (this.data.credit <= 0) {
      wx.showToast({
        title: '一定要有积分',
        icon: 'error',
        duration: 2000
      })
      return false
    }
    if (!this.data.selectedOwnerOpenid) {
      wx.showToast({
        title: '请选择接收人',
        icon: 'error',
        duration: 2000
      })
      return false
    }
    let remindAt = null
    if (this.data.remindEnabled) {
      if (!this.data.remindDate || !this.data.remindTime) {
        wx.showToast({
          title: '请选择提醒时间',
          icon: 'error',
          duration: 2000
        })
        return false
      }
      const remindTimestamp = Date.parse(`${this.data.remindDate} ${this.data.remindTime}`.replace(/-/g, '/'))
      if (Number.isNaN(remindTimestamp)) {
        wx.showToast({
          title: '提醒时间无效',
          icon: 'error',
          duration: 2000
        })
        return false
      }
      if (remindTimestamp <= Date.now()) {
        wx.showToast({
          title: '提醒需晚于当前时间',
          icon: 'error',
          duration: 2000
        })
        return false
      }
      const localDate = new Date(remindTimestamp)
      remindAt = this.formatLocalDateTime(localDate)
    }
    
    wx.showLoading({
        title: '提交中...',
        mask: true
    })
    
    try{
        const payload = {
          title: this.data.title,
          description: this.data.desc,
          reward_credit: this.data.credit,
          owner_openid: this.data.selectedOwnerOpenid, // 后端支持通过 openid 指定 owner
        }

        if (remindAt) {
          payload.remind_at = remindAt
        }
        
        await api.createMission(payload)
        
        wx.hideLoading()
        wx.showToast({
            title: '添加成功',
            icon: 'success',
            duration: 1000
        })
        setTimeout(function () {
            wx.navigateBack()
        }, 1000)
        return true
    }catch(error){
        console.error('[MissionAdd] saveMission failed:', error)
        wx.hideLoading()
        wx.showToast({
            title: error.message || '提交失败',
            icon: 'error',
            duration: 2000
        })
        return false
    }
  },

  // 重置所有表单项
  resetMission() {
    this.initReminderDefaults()
    this.setData({
      title: '',
      desc: '',
      credit: 0,
      presetIndex: 0,
      list: getApp().globalData.collectionMissionList,
      selectedOwnerOpenid: this.data.currentOpenid || this.data.ownerOptions[0]?.openid || '',
      remindEnabled: false,
    })
  },

  formatLocalDateTime(date) {
    const year = date.getFullYear()
    const month = `${date.getMonth() + 1}`.padStart(2, '0')
    const day = `${date.getDate()}`.padStart(2, '0')
    const hours = `${date.getHours()}`.padStart(2, '0')
    const minutes = `${date.getMinutes()}`.padStart(2, '0')
    const seconds = `${date.getSeconds()}`.padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  }
})