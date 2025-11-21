const {api} = require('../../utils/api.js')

Page({
  // 保存订单的 id 和详细信息
  data: {
    _id: '',
    order: null,
    dateStr: '',
    timeStr: '',
    creditPercent: 0,
    from: '',
    to: '',
    maxCredit: getApp().globalData.maxItemCredit,
  },

  onLoad(options) {
    // 保存上一页传来的 id 字段，用于查询订单
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

  // 根据 id 值查询并显示订单
  async onShow() {
    if (this.data._id.length > 0) {
      try {
        // 使用新 API 获取订单详情
        const order = await api.getOrder(this.data._id)
        
        const createdDate = new Date(order.created_at)
        this.setData({
          order: order,
          dateStr: createdDate.toLocaleDateString(),
          timeStr: createdDate.toLocaleTimeString(),
          creditPercent: order.item ? (order.item.cost_credit / this.data.maxCredit) * 100 : 0,
        })

        // 确定订单关系：from 是上架者（商品创建者），to 是购买者
        let fromName = '未知'
        if (order.item && order.item.owner) {
          fromName = order.item.owner.nickname || order.item.owner.name || '未知'
        }
        
        let toName = '未知'
        if (order.user) {
          toName = order.user.nickname || order.user.name || '未知'
        }
        
        this.setData({
          from: fromName,
          to: toName,
        })
      } catch (error) {
        console.error('[ItemDetail] onShow failed:', error)
        wx.showToast({
          title: '加载失败',
          icon: 'error',
        })
      }
    }
  },
})