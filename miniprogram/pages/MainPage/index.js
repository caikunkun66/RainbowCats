/* Main page of the app */
const SUBSCRIBE_TEMPLATE_ID = 'z4n_ECy_C4oyEjONAPMOcXjR-aGO4a82mON85GwF7lY'

const SUBSCRIBE_STATUS_TEXT = {
    accept: '已开启提醒',
    reject: '已拒绝，可再次授权',
    ban: '被系统限制，请稍后再试',
    unset: '尚未授权',
    unknown: '状态未知'
}

Page({
    data: {
        creditA: 0,
        creditB: 0,
        userA: '',
        userB: '',
        _openidA: getApp().globalData._openidA,
        _openidB: getApp().globalData._openidB,
        subscribeTemplateId: SUBSCRIBE_TEMPLATE_ID,
        subscribeStatus: 'unknown',
        subscribeStatusText: SUBSCRIBE_STATUS_TEXT.unknown,
        subscribeButtonText: '检测并授权',
        isCheckingSubscribe: false,
        isRequestingSubscribe: false,
    },

    async onShow(){
        this.getCreditA()
        this.getCreditB()
        this.setData({
            userA: getApp().globalData.userA,
            userB: getApp().globalData.userB,
        })
        this.refreshSubscribeStatus()
    },

    updateSubscribeStatus(status = 'unknown') {
        const normalized = status || 'unset'
        const text = SUBSCRIBE_STATUS_TEXT[normalized] || SUBSCRIBE_STATUS_TEXT.unknown
        const buttonText = normalized === 'accept' ? '已开启' : '检测并授权'
        this.setData({
            subscribeStatus: normalized,
            subscribeStatusText: text,
            subscribeButtonText: buttonText
        })
    },

    async refreshSubscribeStatus() {
        if (this.data.isCheckingSubscribe) {
            return this.data.subscribeStatus
        }
        this.setData({ isCheckingSubscribe: true })
        try {
            const setting = await new Promise((resolve, reject) => {
                wx.getSetting({
                    withSubscriptions: true,
                    success: resolve,
                    fail: reject,
                })
            })
            const status = setting?.subscriptionsSetting?.itemSettings?.[SUBSCRIBE_TEMPLATE_ID] || 'unset'
            this.updateSubscribeStatus(status)
            return status
        } catch (error) {
            console.error('[MainPage] refreshSubscribeStatus failed:', error)
            this.updateSubscribeStatus('unknown')
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
            const status = result?.[templateId]
            this.updateSubscribeStatus(status)
            if (status === 'accept') {
                wx.showToast({ title: '已授权', icon: 'success' })
                return true
            }
            wx.showToast({ title: '未授权提醒', icon: 'none' })
            return false
        } catch (error) {
            console.error('[MainPage] requestSubscribeMessage failed:', error)
            wx.showToast({ title: '授权失败', icon: 'none' })
            return false
        } finally {
            this.setData({ isRequestingSubscribe: false })
        }
    },

    async handleSubscribeButtonTap() {
        const currentStatus = await this.refreshSubscribeStatus()
        if (currentStatus === 'accept') {
            wx.showToast({ title: '已开启提醒', icon: 'success' })
            return
        }
        await this.requestSubscribeMessage()
    },

    getCreditA(){
        wx.cloud.callFunction({name: 'getElementByOpenId', data: {list: getApp().globalData.collectionUserList, _openid: getApp().globalData._openidA}})
        .then(res => {
          this.setData({creditA: res.result.data[0].credit})
        })
    },
    
    getCreditB(){
        wx.cloud.callFunction({name: 'getElementByOpenId', data: {list: getApp().globalData.collectionUserList, _openid: getApp().globalData._openidB}})
        .then(res => {
            this.setData({creditB: res.result.data[0].credit})
        })
    },
})