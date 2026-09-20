import { useRef, useState } from 'react'
import { View, Text, Image } from '@tarojs/components'
import { SPECIES } from '../../data/species'
import type { CollectedCard } from '../../utils/observations'
import styles from './index.module.scss'

export function CollectibleCard({ card, reducedMotion = false, compact = false }: { card: CollectedCard; reducedMotion?: boolean; compact?: boolean }) {
  const [back, setBack] = useState(false)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const start = useRef<{ x: number; y: number; moved: boolean } | null>(null)
  const species = SPECIES[card.speciesId]
  const date = new Date(card.createdAt).toLocaleDateString('zh-CN').replace(/\//g, '.')
  const style = reducedMotion ? {} : { transform: `perspective(1200px) rotateX(${tilt.x}deg) rotateY(${back ? 180 + tilt.y : tilt.y}deg)` }
  const onStart = (event: any) => {
    const touch = event.touches?.[0]
    if (touch) start.current = { x: touch.pageX, y: touch.pageY, moved: false }
  }
  const onMove = (event: any) => {
    if (!start.current || reducedMotion) return
    const touch = event.touches?.[0]
    if (!touch) return
    const dx = touch.pageX - start.current.x
    const dy = touch.pageY - start.current.y
    if (Math.abs(dx) + Math.abs(dy) > 12) start.current.moved = true
    setTilt({ x: Math.max(-8, Math.min(8, -dy / 14)), y: Math.max(-8, Math.min(8, dx / 14)) })
  }
  const onEnd = () => {
    const moved = start.current?.moved
    start.current = null
    setTilt({ x: 0, y: 0 })
    if (!moved) setBack(value => !value)
  }
  return <View className={`${styles.wrap} ${compact ? styles.compact : ''}`}>
    <View className={styles.scene} onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd}>
      <View className={`${styles.card} ${styles[card.finish]} ${back ? styles.back : ''}`} style={style}>
        {!back ? <View className={styles.frontFace}>
          <Image src={card.photoPath} mode='aspectFill' className={styles.photo} />
          <View className={styles.scrim} />
          <View className={styles.top}><Text>去大自然里</Text><Text>{species.finishLabel}</Text></View>
          <View className={styles.frontInfo}><Text className={styles.name}>{species.zh}</Text><Text className={styles.latin}>{species.latin}</Text><Text className={styles.meta}>{date} · 用户实拍</Text></View>
          {!reducedMotion && <View className={styles.shine} />}
        </View> : <View className={styles.backFace}>
          <Text className={styles.backBrand}>去大自然里 · 观察档案</Text><Text className={styles.backName}>{species.zh}</Text>
          <Text className={styles.backText}>{species.habitat} · {species.season}</Text><Text className={styles.backText}>{species.tagline}</Text>
          <Text className={styles.backRule}>本卡使用你的本机照片生成 · 本地演示</Text>
        </View>}
      </View>
    </View>
    {!compact && <View className={styles.control} onTap={() => setBack(value => !value)}><Text>{back ? '看正面' : '看背面'} ↻</Text></View>}
  </View>
}
