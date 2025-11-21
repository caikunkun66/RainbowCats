const {api} = require('../../utils/api.js')

Page({
    //增加消息接收与发送功能
    async handleTap() {
        if (this.data.isSaving) {
            return
        }
        this.data.isSaving = true
        this.setData({
            isSaving: true
        })
        try {
            const saved = await this.saveMission()
            // 注意：订阅消息功能已迁移到后端，这里不再需要调用云函数
            // 如果需要发送订阅消息，应该通过后端 API 处理
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
  },

  async onLoad() {
    await this.initOwnerOptions()
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
      })
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
    
    wx.showLoading({
        title: '提交中...',
        mask: true
    })
    
    try{
        await api.createMission({
          title: this.data.title,
          description: this.data.desc,
          reward_credit: this.data.credit,
          owner_openid: this.data.selectedOwnerOpenid, // 后端支持通过 openid 指定 owner
        })
        
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
    this.setData({
      title: '',
      desc: '',
      credit: 0,
      presetIndex: 0,
      list: getApp().globalData.collectionMissionList,
      selectedOwnerOpenid: this.data.currentOpenid || this.data.ownerOptions[0]?.openid || '',
    })
  }
})