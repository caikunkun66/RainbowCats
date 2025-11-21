const {api} = require('../../utils/api.js')

Page({
  data: {
    screenWidth: 1000,
    screenHeight: 1000,

    search: "",
    filterOpenid: "",

    allMissions: [],
    unfinishedMissions: [],
    finishedMissions: [],

    _openidA : '',
    _openidB : '',

    slideButtons: [
      {extClass: 'markBtn', text: '标记', src: "Images/icon_mark.svg"},
      {extClass: 'starBtn', text: '星标', src: "Images/icon_star.svg"},
      {extClass: 'removeBtn', text: '删除', src: 'Images/icon_del.svg'}
    ],
    isFinishing: false,
  },

  //页面加载时运行
  async onShow(){
    try {
      // 先获取用户信息，用于设置 _openidA 和 _openidB
      await this.loadUserInfo()
      
      const result = await api.listMissions()
      // 转换 API 返回的数据格式，添加兼容字段
      const missions = (result.data || []).map(mission => this.normalizeMission(mission))
      this.setData({allMissions: missions})
      this.filterMission()
      this.getScreenSize()
    } catch (error) {
      console.error('[Mission] onShow failed:', error)
      this.setData({allMissions: []})
      this.filterMission()
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
      console.error('[Mission] loadUserInfo failed:', error)
      // 使用 fallback 值
      const app = getApp()
      this.setData({
        _openidA: app.globalData._openidA || '',
        _openidB: app.globalData._openidB || '',
      })
    }
  },

  // 标准化任务数据，添加兼容字段
  normalizeMission(mission) {
    const ownerOpenid = this.getMissionOwnerOpenid(mission)
    const createdDate = mission.created_at ? new Date(mission.created_at) : new Date()
    
    return {
      ...mission,
      // 兼容旧字段
      ownerOpenid: ownerOpenid,
      _openid: ownerOpenid, // 兼容旧字段
      credit: mission.reward_credit || 0, // 兼容旧字段
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

  //转到任务详情
  async toDetailPage(element, isUpper) {
    const missionIndex = element.currentTarget.dataset.index
    const mission = isUpper ? this.data.unfinishedMissions[missionIndex] : this.data.finishedMissions[missionIndex]
    wx.navigateTo({url: '../MissionDetail/index?id=' + (mission.id || mission._id)})
  },
  //转到任务详情[上]
  async toDetailPageUpper(element) {
    this.toDetailPage(element, true)
  },  
  //转到任务详情[下]
  async toDetailPageLower(element) {
    this.toDetailPage(element, false)
  },
  //转到添加任务
  async toAddPage() {
    wx.navigateTo({url: '../MissionAdd/index'})
  },

  //设置搜索
  onSearch(element){
    this.setData({
      search: element.detail.value
    })

    this.filterMission()
  },
  //筛选任务所属人
  onFilterOwnerTap(event) {
    const {openid} = event.currentTarget.dataset
    const nextFilter = this.data.filterOpenid === openid ? '' : openid
    this.setData({
      filterOpenid: nextFilter
    })
    this.filterMission()
  },

  getMissionOwnerOpenid(mission) {
    if (!mission) return ''
    // 新 API 返回 owner.openid 或 owner_id
    if (mission.owner && mission.owner.openid) {
      return mission.owner.openid
    }
    return mission.owner_id || ''
  },

  //将任务划分为：完成，未完成
  filterMission(){
    let missionList = this.data.allMissions
    const {search, filterOpenid} = this.data
    if(search){
      missionList = missionList.filter(item => (item.title || '').match(search))
    }
    if(filterOpenid){
      // 使用标准化后的 ownerOpenid 字段进行过滤
      missionList = missionList.filter(item => (item.ownerOpenid || this.getMissionOwnerOpenid(item)) === filterOpenid)
    }

    // 新 API 使用 status 字段：'open' 或 'finished'
    this.setData({
      unfinishedMissions: missionList.filter(item => item.status === 'open'),
      finishedMissions: missionList.filter(item => item.status === 'finished'),
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

    //根据序号获得任务
    const missionIndex = element.currentTarget.dataset.index
    const mission = isUpper === true ? this.data.unfinishedMissions[missionIndex] : this.data.finishedMissions[missionIndex]

    try {
      const currentUser = await api.getCurrentUser()
      const ownerOpenid = this.getMissionOwnerOpenid(mission)

      //处理完成点击事件
      if (index === 0) {
          if(isUpper) {
              this.finishMission(element)
          }else{
              wx.showToast({
                  title: '任务已经完成',
                  icon: 'error',
                  duration: 2000
              })
          }
      }else if(ownerOpenid === currentUser.openid){
          //处理星标按钮点击事件
          if (index === 1) {
              try {
                  await api.toggleMissionStar(mission.id)
                  //更新本地数据
                  mission.star = !mission.star
                  this.setData({
                    finishedMissions: this.data.finishedMissions,
                    unfinishedMissions: this.data.unfinishedMissions
                  })
              } catch (error) {
                  console.error('[Mission] toggleStar failed:', error)
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
                  await api.deleteMission(mission.id)
                  wx.hideLoading()
                  
                  // 删除成功后重新加载任务列表
                  await this.onShow()
                  
                  wx.showToast({
                      title: '删除成功',
                      icon: 'success',
                      duration: 2000
                  })
              } catch (error) {
                  wx.hideLoading()
                  console.error('[Mission] deleteMission failed:', error)
                  wx.showToast({
                      title: error.message || '删除失败',
                      icon: 'error',
                      duration: 2000
                  })
              }
          }

      //如果编辑的不是自己的任务，显示提醒
      }else{
          wx.showToast({
          title: '只能编辑自己的任务',
          icon: 'error',
          duration: 2000
          })
      }
    } catch (error) {
      console.error('[Mission] slideButtonTap failed:', error)
      wx.showToast({
        title: '操作失败',
        icon: 'error',
        duration: 2000
      })
    }
  },

  //完成任务
  async finishMission(element) {
    if (this.data.isFinishing) {
      return
    }
    const missionIndex = element.currentTarget.dataset.index
    const mission = this.data.unfinishedMissions[missionIndex]

    this.setData({isFinishing: true})
    let loadingShown = false
    try {
      const currentUser = await api.getCurrentUser()
      const ownerOpenid = this.getMissionOwnerOpenid(mission)
      
      if (ownerOpenid === currentUser.openid) {
        wx.showToast({
          title: '不能完成自己的任务',
          icon: 'error',
          duration: 2000
        })
        return
      }

      wx.showLoading({
        title: '完成中...',
        mask: true
      })
      loadingShown = true

      // 使用新 API 完成任务（会自动处理积分）
      await api.completeMission(mission.id)

      // 刷新列表
      await this.onShow()

      if (loadingShown) {
        wx.hideLoading()
        loadingShown = false
      }
      wx.showToast({
        title: '任务完成',
        icon: 'success',
        duration: 2000
      })
    } catch (error) {
      console.error('[Mission] finishMission failed:', error)
      wx.showToast({
        title: error.message || '完成失败',
        icon: 'error',
        duration: 2000
      })
    } finally {
      if (loadingShown) {
        wx.hideLoading()
      }
      this.setData({isFinishing: false})
    }
  },
})