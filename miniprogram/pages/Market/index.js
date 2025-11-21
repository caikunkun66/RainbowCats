const {api} = require('../../utils/api.js')

Page({
  data: {
    screenWidth: 1000,
    screenHeight: 1000,

    search: "",
    filterOpenid: "",
    credit: 0,
    user: "",

    allItems: [], //所有商品
    unboughtItems: [], //上架商品
    boughtItems: [], //下架商品

    _openidA : '',
    _openidB : '',

    slideButtons: [
      {extClass: 'buyBtn', text: '购买', src: "Images/icon_buy.svg"},
      {extClass: 'starBtn', text: '星标', src: "Images/icon_star.svg"},
      {extClass: 'removeBtn', text: '删除', src: 'Images/icon_del.svg'}
    ],
  },

  //页面加载时运行
  async onShow(){
    // 先获取用户信息，用于设置 _openidA 和 _openidB，并从中设置昵称和积分
    await this.loadUserInfo()
    try {
      const app = getApp()
      const currentUser = app.globalData.currentUser
      if (currentUser) {
        this.setData({
          credit: currentUser.credit || 0,
          user: currentUser.nickname || '我',
        })
      }

      const result = await api.listItems()
      // 转换 API 返回的数据格式，添加兼容字段
      const items = (result.data || []).map(item => this.normalizeItem(item))
      this.setData({allItems: items})
      this.filterItem()
      this.getScreenSize()
    } catch (error) {
      console.error('[Market] onShow failed:', error)
      this.setData({allItems: []})
      this.filterItem()
    }
  },

  // 加载用户信息，根据 role 固定设置 _openidA 和 _openidB
  async loadUserInfo() {
    try {
      const app = getApp()

      // 优先使用全局缓存，减少重复请求
      let currentUser = app.globalData.currentUser
      let partner = app.globalData.partner

      if (!currentUser) {
        currentUser = await api.getCurrentUser()
        app.globalData.currentUser = currentUser
      }

      // partner 可能为 null，这里用 hasOwnProperty 判断是否已经拉取过
      if (!app.globalData.hasOwnProperty('partner')) {
        const partnerResult = await api.getPartner()
        partner = partnerResult.partner || null
        app.globalData.partner = partner
      } else {
        partner = app.globalData.partner
      }
      
      let _openidA = ''
      let _openidB = ''
      
      // 根据 role 字段来确定 A 和 B
      // admin 角色 → A
      // member 角色（或没有 role）→ B
      if (currentUser.role === 'admin') {
        // 当前用户是 admin，所以是 A
        _openidA = currentUser.openid || ''
        // B 是伙伴
        _openidB = partner ? (partner.openid || '') : ''
      } else {
        // 当前用户是 member 或没有 role，所以是 B
        _openidB = currentUser.openid || ''
        // A 是伙伴
        _openidA = partner ? (partner.openid || '') : ''
      }
      
      this.setData({
        _openidA,
        _openidB,
      })
    } catch (error) {
      console.error('[Market] loadUserInfo failed:', error)
      // 使用 fallback 值
      const app = getApp()
      this.setData({
        _openidA: app.globalData._openidA || '',
        _openidB: app.globalData._openidB || '',
      })
    }
  },

  // 获取商品 owner 的 openid
  getItemOwnerOpenid(item) {
    if (!item) return ''
    // 新 API 返回 owner.openid 或 owner_id
    if (item.owner && item.owner.openid) {
      return item.owner.openid
    }
    return item.owner_id || ''
  },

  // 标准化商品数据，添加兼容字段
  normalizeItem(item) {
    // 获取 owner 的 openid
    const ownerOpenid = this.getItemOwnerOpenid(item)
    const createdDate = item.created_at ? new Date(item.created_at) : new Date()
    
    return {
      ...item,
      // 兼容旧字段
      ownerOpenid: ownerOpenid,
      _openid: ownerOpenid, // 兼容旧字段
      title: item.name || item.title || '', // 兼容旧字段，使用 name 作为 title
      credit: item.cost_credit || 0, // 兼容旧字段
      date: createdDate.toLocaleString('zh-CN'), // 兼容旧字段，格式化为中文本地化字符串
    }
  },

  //获取页面大小
  async getScreenSize(){
    wx.getSystemInfo({
      success: (res) => {
        this.setData({
          screenWidth: res.windowWidth,
          screenHeight: res.windowHeight
        })
      }
    })
  },

  //转到商品详情
  async toDetailPage(element, isUpper) {
    const itemIndex = element.currentTarget.dataset.index
    const item = isUpper ? this.data.unboughtItems[itemIndex] : this.data.boughtItems[itemIndex]
    wx.navigateTo({url: '../MarketDetail/index?id=' + (item.id || item._id)})
  },
  //转到商品详情[上]
  async toDetailPageUpper(element) {
    this.toDetailPage(element, true)
  },  
  //转到商品详情[下]
  async toDetailPageLower(element) {
    this.toDetailPage(element, false)
  },
  //转到添加商品
  async toAddPage() {
    wx.navigateTo({url: '../MarketAdd/index'})
  },

  //设置搜索
  onSearch(element){
    this.setData({
      search: element.detail.value
    })

    this.filterItem()
  },

  //筛选商品所属人
  onFilterOwnerTap(event) {
    const {openid} = event.currentTarget.dataset
    const nextFilter = this.data.filterOpenid === openid ? '' : openid
    this.setData({
      filterOpenid: nextFilter
    })
    this.filterItem()
  },

  //将商品划分为：上架，下架
  filterItem(){
    let itemList = this.data.allItems || []
    const {search, filterOpenid} = this.data
    if (search) {
      itemList = itemList.filter(item => (item.name || item.title || '').match(search))
    }
    if (filterOpenid) {
      // 使用标准化后的 ownerOpenid 字段进行过滤
      itemList = itemList.filter(item => (item.ownerOpenid || item._openid || (item.owner && item.owner.openid)) === filterOpenid)
    }

    // 新 API 使用 status 字段：'active' 表示上架，'archived' 表示下架
    this.setData({
      unboughtItems: itemList.filter(item => item.status === 'active'),
      boughtItems: itemList.filter(item => item.status === 'archived'),
    })
  },

  //响应左划按钮事件[上]
  async slideButtonTapUpper(element) {
    this.slideButtonTap(element, true)
  },

  //响应左划按钮事件[下]
  async slideButtonTapLower(element) {
    this.slideButtonTap(element, false)
  },

  //响应左划按钮事件逻辑
  async slideButtonTap(element, isUpper){
    //得到UI序号
    const {index} = element.detail

    //根据序号获得商品
    const itemIndex = element.currentTarget.dataset.index
    const item = isUpper === true ? this.data.unboughtItems[itemIndex] : this.data.boughtItems[itemIndex]

    try {
      //处理购买点击事件
      if (index === 0) {
          if(isUpper) {
              this.buyItem(element)
          }else{
              wx.showToast({
                  title: '物品已被购买',
                  icon: 'error',
                  duration: 2000
              })
          }
      }else{
          const app = getApp()
          // 优先使用全局缓存的当前用户，仅在没有缓存时请求一次
          let currentUser = app.globalData.currentUser
          if (!currentUser) {
            currentUser = await api.getCurrentUser()
            app.globalData.currentUser = currentUser
          }
          const ownerOpenid = this.getItemOwnerOpenid(item)
          
          //处理星标按钮点击事件
          if (index === 1) {
              if(ownerOpenid === currentUser.openid){
                  try {
                      await api.toggleItemStar(item.id)
                      //更新本地数据
                      item.star = !item.star
                      this.setData({
                        boughtItems: this.data.boughtItems,
                        unboughtItems: this.data.unboughtItems
                      })
                  } catch (error) {
                      console.error('[Market] toggleStar failed:', error)
                      wx.showToast({
                          title: '操作失败',
                          icon: 'error',
                          duration: 2000
                      })
                  }
              }else{
                  wx.showToast({
                      title: '只能编辑自己的商品',
                      icon: 'error',
                      duration: 2000
                  })
              }
          }
          
          //处理删除按钮点击事件
          else if (index === 2) {
              if(ownerOpenid === currentUser.openid){
                  wx.showLoading({
                      title: '删除中...',
                      mask: true
                  })
                  try {
                      await api.deleteItem(item.id)
                      wx.hideLoading()
                      
                      // 删除成功后重新加载商品列表
                      await this.onShow()
                      
                      wx.showToast({
                          title: '删除成功',
                          icon: 'success',
                          duration: 2000
                      })
                  } catch (error) {
                      wx.hideLoading()
                      console.error('[Market] deleteItem failed:', error)
                      wx.showToast({
                          title: error.message || '删除失败',
                          icon: 'error',
                          duration: 2000
                      })
                  }
              }else{
                  wx.showToast({
                      title: '只能删除自己的商品',
                      icon: 'error',
                      duration: 2000
                  })
              }
          }
      }
    } catch (error) {
      console.error('[Market] slideButtonTap failed:', error)
      wx.showToast({
        title: '操作失败',
        icon: 'error',
        duration: 2000
      })
    }
  },

  //购买商品
  async buyItem(element) {
    //根据序号获得商品
    const itemIndex = element.currentTarget.dataset.index
    const item = this.data.unboughtItems[itemIndex]

    try {
      const app = getApp()
      // 使用最新的当前用户数据进行校验；若缓存不存在则请求一次
      let currentUser = app.globalData.currentUser
      if (!currentUser) {
        currentUser = await api.getCurrentUser()
        app.globalData.currentUser = currentUser
      }

      //如果没有积分，显示提醒
      if(this.data.credit < item.cost_credit){
        wx.showToast({
          title: '积分不足...',
          icon: 'error',
          duration: 2000
        })
        return
      }

      wx.showLoading({
        title: '购买中...',
        mask: true
      })

      // 使用新 API 购买商品（会自动扣除积分）
      await api.redeemItem(item.id)

      wx.hideLoading()
      
      //显示提示
      wx.showToast({
          title: '购买成功',
          icon: 'success',
          duration: 2000
      })

      //刷新数据
      // 重新从服务器拉取最新积分并更新全局缓存和当前页面
      const refreshedUser = await api.getCurrentUser()
      app.globalData.currentUser = refreshedUser
      this.setData({
        credit: refreshedUser.credit || 0,
        user: refreshedUser.nickname || '我',
      })
      await this.onShow()
    } catch (error) {
      wx.hideLoading()
      console.error('[Market] buyItem failed:', error)
      wx.showToast({
        title: error.message || '购买失败',
        icon: 'error',
        duration: 2000
      })
    }
  },
})