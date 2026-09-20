import { defineConfig } from '@tarojs/cli'
import { dirname } from 'path'

export default defineConfig(async (ctx, options) => ({
  projectName: 'daziranli-mini',
  date: '2026-9-13',
  designWidth: 750,
  deviceRatio: { 640: 2.34 / 2, 750: 1, 828: 1.81 / 2, 375: 2 / 1 },
  sourceRoot: 'src',
  outputRoot: 'dist',
  plugins: ['@tarojs/plugin-framework-react', '@tarojs/plugin-platform-weapp'],
  defineConstants: {},
  copy: {
    patterns: [
      { from: 'assets/images/', to: 'dist/assets/images/' },
      { from: 'assets/fonts/', to: 'dist/assets/fonts/' }
    ],
    options: { ignore: ['*.DS_Store', 'Thumbs.db'] }
  },
  framework: 'react',
  compiler: 'webpack5',
  cache: { enable: false },
  sass: {
    resource: []
  },
  mini: {
    webpackChain(chain) {
      // 字体 woff2 不需要额外 loader，小程序原生支持
    },
    postcss: {
      pxtransform: { enable: true, config: {} },
      cssModules: { enable: true }
    }
  },
  h5: { publicPath: '/', staticDirectory: 'static' }
}))