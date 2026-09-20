import Taro from '@tarojs/taro'

/* ============================================================
   字体加载 —— 小程序不走 @font-face，必须用 wx.loadFontFace 异步加载
   Web 版注释里的硬规矩：霞鹜文楷是子集裁剪，改文案必重裁
   - 加载顺序：霞鹜文楷先（最长最关键），3 套数字字体后跟
   - 失败兜底：wx 加载失败自动用系统字体，不抛错
   - 开发期 CDN：直接复用 workbuddy 已部署的资产
   - 生产环境：把下面 URL 换成你自己的 CDN 域名（推荐放对象存储 + CDN）
   ============================================================ */

// 生产版接入已备案且已配置到小程序后台的 CDN 后，才在这里填写域名。
// 开发/预览阶段宁可使用系统字体，也不要请求一个不可访问的占位地址。
const FONT_CDN = ''

type FontDefinition = { family: string; weight: 'normal' | '500' | 'bold'; source: string }

const FONTS: FontDefinition[] = FONT_CDN ? [
  { family: 'WenKai SC', weight: 'normal', source: `url("${FONT_CDN}/lxgw-wenkai-sc.woff2")` },
  { family: 'DaziranliNum', weight: 'normal', source: `url("${FONT_CDN}/DaziranliNum-Regular.woff2")` },
  { family: 'DaziranliNum', weight: '500',   source: `url("${FONT_CDN}/DaziranliNum-SemiBold.woff2")` },
  { family: 'DaziranliNum', weight: 'bold',  source: `url("${FONT_CDN}/DaziranliNum-Bold.woff2")` }
] : []

let loaded = false

/**
 * 全局异步加载 4 套字体。App 启动时调用一次即可。
 * 返回的 Promise 在所有字体加载完成后 resolve，渲染层据此避免闪屏。
 */
export async function ensureFontsReady(): Promise<void> {
  if (loaded) return
  if (FONTS.length === 0) { loaded = true; return }
  await Promise.all(FONTS.map(f => new Promise<void>(resolve => {
    Taro.loadFontFace({
      ...f,
      success: () => resolve(),
      fail: err => {
        console.warn('[fonts] load failed', f.family, f.weight, err)
        resolve() // 失败兜底：不阻塞渲染
      }
    })
  })))
  loaded = true
}

/** 同步探测（用于组件层面避免闪屏时显示占位文本） */
export const fontsReady = (): boolean => loaded
