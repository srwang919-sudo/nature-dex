import { useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import { CollectibleCard } from '../../components/CollectibleCard'
import { findCard, markRevealSeen } from '../../utils/observations'
import styles from './index.module.scss'

export default function Reveal() {
  const params = Taro.getCurrentInstance().router?.params ?? {}
  const cardId = params.cardId ?? ''
  const card = findCard(cardId)
  const [open, setOpen] = useState(Boolean(card?.revealSeen))
  if (!card) return <View className={styles.page}><View className={styles.missing}><Text>这张卡暂时无法读取</Text><Text className={styles.missingHint}>返回取景页重新选择一张照片即可。</Text></View></View>
  const reveal = () => { markRevealSeen(card.id); setOpen(true) }
  return <View className={styles.page}>
    <Text className={styles.eyebrow}>去大自然里 · 收藏一份遇见</Text>
    {!open ? <View className={styles.seal} onTap={reveal}><Text className={styles.sealBrand}>去大自然里</Text><View className={styles.rule} /><Text className={styles.sealTitle}>遇见</Text><Text className={styles.sealHint}>轻点揭晓</Text></View> : <View className={styles.opened}><Text className={styles.title}>你的观察已收录</Text><CollectibleCard card={card} /><Text className={styles.hint}>轻点卡面翻转，拖动可以感受它的光。</Text><View className={styles.collection} onTap={() => Taro.switchTab({ url: '/pages/home/index' })}><Text>查看收藏</Text></View></View>}
  </View>
}
