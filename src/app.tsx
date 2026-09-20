import { PropsWithChildren } from 'react'
import Taro, { useLaunch } from '@tarojs/taro'
import { ensureFontsReady } from './utils/fonts'
import './app.scss'

function App({ children }: PropsWithChildren) {
  useLaunch(() => {
    console.log('[App] launched')
    // 异步预热字体，不阻塞首屏渲染；loadFontFace 内部失败兜底
    ensureFontsReady().catch(err => console.warn('[fonts] init failed', err))
    // 同步拿一下用户系统信息（仅用于适配），不影响主流程
    const info = Taro.getSystemInfoSync()
    console.log('[App] system', info.platform, info.screenWidth + 'x' + info.screenHeight)
  })
  return children as any
}

export default App