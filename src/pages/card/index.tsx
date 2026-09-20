import Taro from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import { SPECIES, SpeciesKey, depthOf, isProtected } from '../../data/species'
import { CollectibleCard } from '../../components/CollectibleCard'
import { findCard } from '../../utils/observations'
import styles from './index.module.scss'

function legacyId(): SpeciesKey | null {
  const id = Taro.getCurrentInstance().router?.params?.id || ''
  return id && SPECIES[id] ? id as SpeciesKey : null
}

export default function Card() {
  const params = Taro.getCurrentInstance().router?.params ?? {}
  const collected = params.cardId ? findCard(params.cardId) : null
  if (collected) return <View className={styles.page}><Text className={styles.eyebrow}>去大自然里 · 你的实拍卡</Text><CollectibleCard card={collected} /><View className={styles.back} onTap={() => Taro.navigateBack()}><Text>‹ 返回收藏</Text></View></View>
  const id = legacyId()
  if (!id) return <View className={styles.page}><View className={styles.placeholder}><Text>未指定卡片</Text><Text className={styles.placeholderHint}>去取景页拍下一张，再由你确认生成。</Text></View></View>
  const s = SPECIES[id]
  const guard = isProtected(s)
  return <View className={styles.page}>
    <View className={styles.legacy}><Text className={styles.legacyName}>{s.zh}</Text><Text className={styles.legacyLatin}>{s.latin}</Text><Text className={styles.legacyText}>这是资料示例卡；生成你的卡片时会使用你拍摄的照片。</Text></View>
    <View className={styles.infoRow}><View className={styles.infoBox}><Text>栖息</Text><Text>{s.habitat}</Text></View><View className={styles.infoBox}><Text>季相</Text><Text>{s.season}</Text></View><View className={styles.infoBox}><Text>层级</Text><Text>{depthOf(id)}</Text></View></View>
    <View className={styles.section}><Text className={styles.sectionTitle}>观察要点</Text>{s.facts.map((fact, i) => <View key={i} className={styles.fact}><Text className={styles.factTitle}>· {fact.t}</Text><Text className={styles.factText}>{fact.d}</Text></View>)}</View>
    {guard && <View className={styles.guard}><Text>保护物种提示：请保持距离，不追逐、不诱拍，不公开敏感地点。</Text></View>}
  </View>
}
