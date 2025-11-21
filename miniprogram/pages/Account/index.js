const {api} = require('../../utils/api.js')

Page({
    data: {
        search: "",

        allItems: [],
        unusedItems: [],
        usedItems: [],
    
        _openidA : '',
        _openidB : '',
    
        slideButtons: [
            {extClass: 'useBtn', text: '使用', src: "Images/icon_use.svg"},
            {extClass: 'starBtn', text: '星标', src: "Images/icon_star.svg"},
            {extClass: 'removeBtn', text: '删除', src: 'Images/icon_del.svg'}
        ],
    },
    
    //页面加载时运行
    async onShow(){
        try {
            // 先获取用户信息，用于设置 _openidA 和 _openidB
            await this.loadUserInfo()
            
            // 获取订单列表（仓库）
            const result = await api.listOrders()
            // 转换 API 返回的数据格式，添加兼容字段
            const orders = (result.data || []).map(order => this.normalizeOrder(order))
            this.setData({allItems: orders})
            this.filterItem()
        } catch (error) {
            console.error('[Account] onShow failed:', error)
            this.setData({
                allItems: [],
                unusedItems: [],
                usedItems: [],
            })
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
            console.error('[Account] loadUserInfo failed:', error)
            // 使用 fallback 值
            const app = getApp()
            this.setData({
                _openidA: app.globalData._openidA || '',
                _openidB: app.globalData._openidB || '',
            })
        }
    },

    // 标准化订单数据，添加兼容字段
    normalizeOrder(order) {
        const createdDate = order.created_at ? new Date(order.created_at) : new Date()
        const itemName = (order.item && order.item.name) || (order.item && order.item.title) || ''
        
        return {
            ...order,
            // 兼容旧字段
            _id: order.id, // 兼容旧字段
            title: itemName, // 兼容旧字段
            date: createdDate.toLocaleString('zh-CN'), // 兼容旧字段，格式化为中文本地化字符串
        }
    },
  
    //转到物品详情
    async toDetailPage(element, isUpper) {
      const itemIndex = element.currentTarget.dataset.index
      const order = isUpper ? this.data.unusedItems[itemIndex] : this.data.usedItems[itemIndex]
      wx.navigateTo({url: '../ItemDetail/index?id=' + (order.id || order._id)})
    },
    //转到物品详情[上]
    async toDetailPageUpper(element) {
      this.toDetailPage(element, true)
    },  
    //转到物品详情[下]
    async toDetailPageLower(element) {
      this.toDetailPage(element, false)
    },
  
    //设置搜索
    onSearch(element){
      this.setData({
        search: element.detail.value
      })
  
      this.filterItem()
    },
  
    //将物品划分为：未使用，已使用
    filterItem(){
      let itemList = this.data.allItems || []
      const {search} = this.data
      
      if (search) {
        itemList = itemList.filter(item => {
          const title = item.title || item.item?.name || ''
          return title.match(search)
        })
      }

      this.setData({
        unusedItems: itemList.filter(item => item.available === true),
        usedItems: itemList.filter(item => item.available === false),
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

      //根据序号获得订单
      const itemIndex = element.currentTarget.dataset.index
      const order = isUpper === true ? this.data.unusedItems[itemIndex] : this.data.usedItems[itemIndex]

      try {
        //处理使用点击事件
        if (index === 0) {
            if(isUpper) {
                this.useOrder(element)
            }else{
                wx.showToast({
                    title: '物品已使用',
                    icon: 'error',
                    duration: 2000
                })
            }
        }
        //处理星标按钮点击事件
        else if (index === 1) {
            try {
                await api.toggleOrderStar(order.id)
                //更新本地数据
                order.star = !order.star
                this.setData({
                  usedItems: this.data.usedItems,
                  unusedItems: this.data.unusedItems
                })
            } catch (error) {
                console.error('[Account] toggleStar failed:', error)
                wx.showToast({
                    title: '操作失败',
                    icon: 'error',
                    duration: 2000
                })
            }
        }
        
        //处理删除按钮点击事件
        else if (index === 2) {
            wx.showLoading({
                title: '删除中...',
                mask: true
            })
            try {
                await api.deleteOrder(order.id)
                wx.hideLoading()
                
                // 删除成功后重新加载订单列表
                await this.onShow()
                
                wx.showToast({
                    title: '删除成功',
                    icon: 'success',
                    duration: 2000
                })
            } catch (error) {
                wx.hideLoading()
                console.error('[Account] deleteOrder failed:', error)
                wx.showToast({
                    title: error.message || '删除失败',
                    icon: 'error',
                    duration: 2000
                })
            }
        }
      } catch (error) {
        console.error('[Account] slideButtonTap failed:', error)
        wx.showToast({
          title: '操作失败',
          icon: 'error',
          duration: 2000
        })
      }
    },
  
    //使用订单
    async useOrder(element) {
        const itemIndex = element.currentTarget.dataset.index
        const order = this.data.unusedItems[itemIndex]

        wx.showLoading({
            title: '使用中...',
            mask: true
        })
        
        try {
            await api.useOrder(order.id)
            
            wx.hideLoading()
            
            // 使用成功后重新加载订单列表
            await this.onShow()
            
            wx.showToast({
                title: '使用成功',
                icon: 'success',
                duration: 2000
            })
        } catch (error) {
            wx.hideLoading()
            console.error('[Account] useOrder failed:', error)
            wx.showToast({
                title: error.message || '使用失败',
                icon: 'error',
                duration: 2000
            })
        }
    },
  })