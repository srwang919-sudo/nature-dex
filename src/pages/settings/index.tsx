import { useState, useEffect } from 'react'
import Taro from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import { getItem, setItem, KEYS } from '../../utils/storage'
import './index.module.scss'
import styles from './index.module.scss'

type Plan = 'free' | 'monthly' | 'yearly'

const PLAN_PRICE: Record<Plan, { name: string; price: string; unit: string }> = {
  free:    { name: '未订阅',  price: '¥0',   unit: '永久免费' },
  monthly: { name: '月订',    price: '¥18',  unit: '/ 月' },
  yearly:  { name: '年订',    price: '¥128', unit: '/ 年（省 41%）' }
}

export default function Settings() {
  const [plan, setPlan]     = useState<Plan>('free')
  const [total, setTotal]   = useState<number>(157)

  useEffect(() => {
    setPlan(getItem<Plan>(KEYS.PLAN, 'free'))
    setTotal(getItem<number>(KEYS.DEX_TOTAL, 157))
  }, [])

  const applyPlan = (next: Plan) => {
    setPlan(next)
    setItem(KEYS.PLAN, next)
    if (next === 'free') {
      Taro.showToast({ title: '已切到免费版', icon: 'none' })
    } else {
      Taro.showToast({ title: '订阅不是「买识别次数」', icon: 'none' })
    }
  }

  const openWeb = () => {
    Taro.setClipboardData({
      data: 'https://nature-card-app.app.workbuddy.host/',
      success: () => Taro.showToast({ title: '链接已复制', icon: 'success' })
    })
  }

  const clearStorage = () => {
    Taro.showModal({
      title: '清空本地数据？',
      content: '图鉴进度、笔记都会回到出厂状态。',
      success: ({ confirm }) => {
        if (!confirm) return
        try { Taro.clearStorageSync() } catch {}
        setPlan('free')
        setTotal(157)
        Taro.showToast({ title: '已清空', icon: 'success' })
      }
    })
  }

  const p = PLAN_PRICE[plan]

  return (
    <View className={styles.page}>
      <View className={styles.profile}>
        <View className={styles.avatar}><Text>林</Text></View>
        <View className={styles.meta}>
          <Text className={styles.metaName}>观察者</Text>
          <Text className={styles.metaSub}>已记录 {total} 种 · {p.name}</Text>
        </View>
      </View>

      <View className={styles.section}>
        <Text className={styles.sectionTitle}>订阅档位</Text>
        <View className={styles.plans}>
          {(Object.keys(PLAN_PRICE) as Plan[]).map(k => {
            const o = PLAN_PRICE[k]
            const on = plan === k
            return (
              <View
                key={k}
                className={`${styles.plan} ${on ? styles.planOn : ''}`}
                onTap={() => applyPlan(k)}
              >
                <View className={styles.planLeft}>
                  <Text className={styles.planName}>{o.name}</Text>
                  <Text className={styles.planPrice}>{o.price}{o.unit}</Text>
                </View>
                <Text className={`${styles.planTag} ${on ? styles.planTagOn : ''}`}>
                  {k === 'free' ? '当前' : (on ? '已选' : '切换')}
                </Text>
              </View>
            )
          })}
        </View>
        <Text className={styles.planNote}>
          免费版每天 1 次识别，最多攒 3 天。{'\n'}
          订阅不是「买识别次数」—— 你买的是更多卡面表达、云备份和实体印刷。
        </Text>
      </View>

      <View className={styles.section}>
        <Text className={styles.sectionTitle}>其他</Text>
        <View className={styles.list}>
          <View className={styles.row} onTap={openWeb}>
            <View className={styles.rowLeft}>
              <View className={styles.rowIcon}><Text>W</Text></View>
              <Text className={styles.rowText}>打开 Web 版</Text>
            </View>
            <Text className={styles.rowRight}>复制链接 ›</Text>
          </View>
          <View className={styles.row}>
            <View className={styles.rowLeft}>
              <View className={styles.rowIcon}><Text>约</Text></View>
              <Text className={styles.rowText}>关于去大自然里</Text>
            </View>
            <Text className={styles.rowRight}>v0.1.0</Text>
          </View>
          <View className={styles.row} onTap={clearStorage}>
            <View className={styles.rowLeft}>
              <View className={styles.rowIcon}><Text>清</Text></View>
              <Text className={styles.rowText}>清空本地数据</Text>
            </View>
            <Text className={styles.rowRight}>›</Text>
          </View>
        </View>
      </View>

      <View className={styles.about}>
        <Text>用 Taro 4 + React 重写自 WorkBuddy 发布页</Text>
        <Text>面向个人用户 · 原型期不接支付</Text>
      </View>
    </View>
  )
}