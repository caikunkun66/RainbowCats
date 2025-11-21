const {api} = require('../../utils/api.js')

Page({
  // 保存任务的 _id 和详细信息
  data: {
    _id: '',
    mission: null,
    dateStr: '',
    timeStr: '',
    creditPercent: 0,
    from: '',
    to: '',
    maxCredit: getApp().globalData.maxMissionCredit,
  },

  onLoad(options) {
    // 保存上一页传来的 id 字段，用于查询任务
    if (options.id !== undefined) {
      this.setData({
        _id: options.id
      })
    }
  },
  
  getDate(dateStr){
    const milliseconds = Date.parse(dateStr)
    const date = new Date()
    date.setTime(milliseconds)
    return date
  },

  // 根据 id 值查询并显示任务
  async onShow() {
    if (this.data._id.length > 0) {
      try {
        // 使用新 API 获取任务详情
        const mission = await api.getMission(this.data._id)
        
        const createdDate = new Date(mission.created_at)
        this.setData({
          mission: mission,
          dateStr: createdDate.toLocaleDateString(),
          timeStr: createdDate.toLocaleTimeString(),
          creditPercent: (mission.reward_credit / this.data.maxCredit) * 100,
        })

        //确定任务关系并保存到本地
        const ownerOpenid = mission.owner?.openid || ''
        const currentUser = await api.getCurrentUser()
        const partnerResult = await api.getPartner()
        
        if(ownerOpenid === currentUser.openid){
          this.setData({
            from: currentUser.nickname || '我',
            to: partnerResult.partner ? (partnerResult.partner.nickname || '伙伴') : '未绑定',
          })
        }else if(partnerResult.partner && ownerOpenid === partnerResult.partner.openid){
          this.setData({
            from: partnerResult.partner.nickname || '伙伴',
            to: currentUser.nickname || '我',
          })
        }else{
          this.setData({
            from: mission.owner?.nickname || '未知',
            to: '未知',
          })
        }
      } catch (error) {
        console.error('[MissionDetail] onShow failed:', error)
        wx.showToast({
          title: '加载失败',
          icon: 'error',
        })
      }
    }
  },
})