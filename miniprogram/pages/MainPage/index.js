/* Main page of the app */
const {api} = require('../../utils/api.js')

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
        partner: null,
        inviteCode: '',
        subscribeTemplateId: SUBSCRIBE_TEMPLATE_ID,
        subscribeStatus: 'unknown',
        subscribeStatusText: SUBSCRIBE_STATUS_TEXT.unknown,
        subscribeButtonText: '检测并授权',
        isCheckingSubscribe: false,
        isRequestingSubscribe: false,
    },

    async onShow(){
          // 统一在 loadUserData 中获取并设置用户、伙伴及积分信息，避免重复请求
          await this.loadUserData()
        this.refreshSubscribeStatus()
    },

    async loadUserData() {
        try {
            const app = getApp()
            const currentUser = await api.getCurrentUser()
            const partnerResult = await api.getPartner()
            
            this.setData({
                userA: currentUser.nickname || '我',
                userB: partnerResult.partner ? (partnerResult.partner.nickname || '伙伴') : '未绑定',
                currentUser: currentUser,
                partner: partnerResult.partner,
                // 直接使用当前接口结果设置积分和邀请码，避免额外请求
                creditA: currentUser.credit || 0,
                creditB: partnerResult.partner ? (partnerResult.partner.credit || 0) : 0,
                inviteCode: currentUser.invite_code || '',
            })
            // 同步到全局缓存，供其他页面复用
            app.globalData.currentUser = currentUser
            app.globalData.partner = partnerResult.partner || null
        } catch (error) {
            console.error('[MainPage] loadUserData failed:', error)
            this.setData({
                userA: '我',
                userB: '未绑定',
                  creditA: 0,
                  creditB: 0,
            })
        }
    },

    showBindDialog() {
        wx.showModal({
            title: '绑定伙伴',
            editable: true,
            placeholderText: '请输入6位邀请码',
            success: async (res) => {
                if (res.confirm && res.content) {
                    await this.bindPartner(res.content.trim().toUpperCase())
                }
            },
        })
    },

    async bindPartner(inviteCode) {
        if (!inviteCode || inviteCode.length !== 6) {
            wx.showToast({
                title: '邀请码格式错误',
                icon: 'none',
            })
            return
        }

        wx.showLoading({title: '绑定中...'})
        try {
            const result = await api.bindPartner(inviteCode)
            wx.hideLoading()
            wx.showToast({
                title: '绑定成功',
                icon: 'success',
            })
            // 重新加载数据
            await this.loadUserData()
        } catch (error) {
            wx.hideLoading()
            wx.showToast({
                title: error.message || '绑定失败',
                icon: 'none',
            })
        }
    },

    async copyInviteCode() {
        try {
            await wx.setClipboardData({
                data: this.data.inviteCode,
            })
            wx.showToast({
                title: '已复制',
                icon: 'success',
            })
        } catch (error) {
            wx.showToast({
                title: '复制失败',
                icon: 'none',
            })
        }
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

    async getCreditA(){
        try {
            // 获取当前用户积分
            const user = await api.getCurrentUser()
            this.setData({creditA: user.credit || 0})
        } catch (error) {
            console.error('[MainPage] getCreditA failed:', error)
            this.setData({creditA: 0})
        }
    },
    
    async getCreditB(){
        try {
            // 获取绑定伙伴的积分
            const partnerResult = await api.getPartner()
            if (partnerResult.partner) {
                this.setData({creditB: partnerResult.partner.credit || 0})
            } else {
                this.setData({creditB: 0})
            }
        } catch (error) {
            console.error('[MainPage] getCreditB failed:', error)
            this.setData({creditB: 0})
        }
    },
})