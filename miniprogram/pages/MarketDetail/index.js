const {api} = require('../../utils/api.js')

Page({
  // 保存商品的 _id 和详细信息
  data: {
    _id: '',
    item: null,
    dateStr: '',
    timeStr: '',
    creditPercent: 0,
    from: '',
    to: '',
    maxCredit: getApp().globalData.maxItemCredit,
  },

  onLoad(options) {
    // 保存上一页传来的 id 字段，用于查询商品
    if (options.id !== undefined) {
      this.setData({
        _id: options.id
      })
    }
  },

  // 根据 id 值查询并显示商品
  async onShow() {
    if (this.data._id.length > 0) {
      try {
        const item = await api.getItem(this.data._id)
        const createdDate = new Date(item.created_at)
        
        // 确定上架者（owner）
        let fromName = '未知'
        if (item.owner) {
          fromName = item.owner.nickname || item.owner.name || '未知'
        }
        
        // 确定购买者（如果商品已被购买）
        let toName = ''
        if (item.order && item.order.user) {
          toName = item.order.user.nickname || item.order.user.name || '未知'
        }
        
        this.setData({
          item: item,
          dateStr: createdDate.toLocaleDateString(),
          timeStr: createdDate.toLocaleTimeString(),
          creditPercent: (item.cost_credit / this.data.maxCredit) * 100,
          from: fromName,
          to: toName,
        })
      } catch (error) {
        console.error('[MarketDetail] onShow failed:', error)
        wx.showToast({
          title: '加载失败',
          icon: 'error',
        })
      }
    }
  },
})