const app = getApp()
Page({
  data: { notes: [], count: 0 },
  onShow() { this.refresh() },
  refresh() {
    const cards = app.getCards().filter(c => c && !c.sample).map(c => app.decorate(c)).filter(Boolean)
    const notes = cards.map(c => {
      const text = wx.getStorageSync('nature.note.' + c.id) || ''
      if (!text) return null
      return { id: c.id, zh: c.zh, latin: c.latin, text, photoPath: c.photoPath, image: c.image, finish: c.finish, date: c.date }
    }).filter(Boolean)
    this.setData({ notes: notes.slice().reverse(), count: notes.length })
  },
  open(e) { wx.navigateTo({ url: '/native/pages/card/index?id=' + e.currentTarget.dataset.id }) },
  shoot() { wx.reLaunch({ url: '/native/pages/observe/index' }) }
})
