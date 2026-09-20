import { useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Image, ScrollView } from '@tarojs/components'
import { SPECIES } from '../../data/species'
import { listCards, CollectedCard } from '../../utils/observations'
import styles from './index.module.scss'

export default function Home() {
  const [cards, setCards] = useState<CollectedCard[]>(() => listCards())
  return <View className={styles.page}>
    <View className={styles.hero}><Text className={styles.brand}>去大自然里</Text><Text className={styles.title}>收藏你的遇见</Text><Text className={styles.meta}>已收藏 <Text className='f-num'>{cards.length}</Text> 张实拍卡</Text><View className={styles.observe} onTap={() => Taro.switchTab({ url: '/pages/viewfinder/index' })}><Text>去观察</Text></View></View>
    <ScrollView scrollY className={styles.scroll}>
      {cards.length === 0 ? <View className={styles.empty}><Text className={styles.emptyTitle}>去拍一只吧</Text><Text className={styles.emptyText}>你的第一张实拍卡，会从一次主动确认的观察开始。</Text><View className={styles.emptyAction} onTap={() => Taro.switchTab({ url: '/pages/viewfinder/index' })}><Text>打开取景</Text></View></View> : <View className={styles.grid}>{cards.slice().reverse().map(card => { const species = SPECIES[card.speciesId]; return <View key={card.id} className={styles.card} onTap={() => Taro.navigateTo({ url: `/pages/card/index?cardId=${card.id}` })}><Image src={card.photoPath} mode='aspectFill' className={styles.photo} /><View className={styles.scrim} /><View className={styles.finish}><Text>{species.finishLabel}</Text></View><View className={styles.info}><Text className={styles.name}>{species.zh}</Text><Text className={styles.latin}>{species.latin}</Text></View></View> })}</View>}
      <View className={styles.note}><Text>本机收藏 · 用户实拍照片仅保存在这台设备</Text></View>
    </ScrollView>
  </View>
}
