const app=getApp(),{chapter,computeChapterProgress}=require('../../lib/chapter-model'),{getExampleCards}=require('../../lib/example-cards')
Page({
  data:{cards:[],examples:[],chapter:null,ownedCount:0,speciesCount:0,reduceMotion:false,category:'all',finish:'all',categories:[['all','全部'],['bird','鸟类'],['plant','植物'],['insect','昆虫']],finishes:[['all','全部工艺'],['standard','标准'],['holo','闪卡'],['alt','异画'],['numbered','编号']]},
  onShow(){this.refresh();if(app.syncCards)app.syncCards().then(()=>{this.refresh();if(app.pollIllustrations)app.pollIllustrations().then(()=>this.refresh()).catch(()=>{})}).catch(()=>{})},
  refresh(){
    const owned=app.getCards().filter(card=>card&&card.kind!=='example'&&!card.sample).map(card=>app.decorate(card)).filter(Boolean)
    const cards=owned.filter(card=>app.matchesFilters(card,this.data.category,this.data.finish)).reverse()
    const examples=getExampleCards().map(card=>app.decorate(card)).filter(Boolean)
    const ownedBySpecies=owned.reduce((map,card)=>{if(!map[card.speciesId])map[card.speciesId]=card;return map},{})
    const progress=computeChapterProgress(chapter,owned)
    progress.cells=progress.cells.map(cell=>Object.assign({},cell,{image:cell.lit&&ownedBySpecies[cell.speciesId]?(ownedBySpecies[cell.speciesId].photoPath||ownedBySpecies[cell.speciesId].image||''):''}))
    this.setData({cards,examples,chapter:progress,ownedCount:owned.length,speciesCount:new Set(owned.map(c=>c.speciesId)).size,reduceMotion:!!wx.getStorageSync('nature.reduceMotion'),milestoneLabels:[3,6,7].map(need=>({need,earned:progress.found>=need}))})
  },
  category(e){this.setData({category:e.currentTarget.dataset.value},()=>this.refresh())},
  finish(e){this.setData({finish:e.currentTarget.dataset.value},()=>this.refresh())},
  resetFilters(){this.setData({category:'all',finish:'all'},()=>this.refresh())},
  open(e){wx.navigateTo({url:'/native/pages/card/index?id='+e.currentTarget.dataset.id})},
  openExample(e){wx.navigateTo({url:'/native/pages/card/index?id=sample_'+e.currentTarget.dataset.id})},
  explore(){wx.reLaunch({url:'/native/pages/home/index'})}
})
