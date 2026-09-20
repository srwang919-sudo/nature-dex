export default defineAppConfig({
  pages: [
    'pages/home/index',
    'pages/viewfinder/index',
    'pages/note/index',
    'pages/settings/index',
    'pages/card/index',
    'pages/reveal/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#F4EFE3',
    navigationBarTitleText: '去大自然里',
    navigationBarTextStyle: 'black',
    backgroundColor: '#F4EFE3'
  },
  tabBar: {
    color: '#5b6b62',
    selectedColor: '#6E9479',
    backgroundColor: '#FFFCF5',
    borderStyle: 'white',
    list: [
      { pagePath: 'pages/home/index',       text: '图鉴' },
      { pagePath: 'pages/viewfinder/index', text: '取景' },
      { pagePath: 'pages/note/index',       text: '笔记' },
      { pagePath: 'pages/settings/index',   text: '我的' }
    ]
  }
})
