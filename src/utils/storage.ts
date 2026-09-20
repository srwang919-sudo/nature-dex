import Taro from '@tarojs/taro'

/* ============================================================
   存储封装 —— Web 版的 localStorage 在小程序里对应 wx.setStorageSync。
   小程序同步 API 总配额 1MB，不够分片用异步版。
   ============================================================ */

export function getItem<T>(key: string, fallback: T): T {
  try {
    const v = Taro.getStorageSync(key)
    if (v === '' || v == null) return fallback
    return v as T
  } catch {
    return fallback
  }
}

export function setItem(key: string, value: unknown): void {
  try {
    Taro.setStorageSync(key, value)
  } catch (e) {
    console.warn('[storage] set failed:', key, e)
  }
}

export function removeItem(key: string): void {
  try {
    Taro.removeStorageSync(key)
  } catch {}
}

export const KEYS = {
  DEX_COLLECTED: 'dex.collected',
  DEX_TOTAL:     'dex.total',
  PLAN:          'plan',
  NOTES:         'notes',
  OBSERVATION_DRAFTS: 'observation.drafts.v1',
  OBSERVATION_CARDS: 'observation.cards.v1'
} as const
