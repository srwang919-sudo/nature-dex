import { useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Image } from '@tarojs/components'
import { SPECIES, SpeciesKey, SPECIES_KEYS } from '../../data/species'
import { confirmCard, createDraft, identifyDemo, markUnknown, ObservationDraft } from '../../utils/observations'
import styles from './index.module.scss'

type ScreenState = 'empty' | 'saving' | 'ready' | 'identifying' | 'candidate' | 'unknown'
const DEFAULT_TARGET: SpeciesKey = 'kingfisher'

export default function Viewfinder() {
  const [state, setState] = useState<ScreenState>('empty')
  const [draft, setDraft] = useState<ObservationDraft | null>(null)
  const [target, setTarget] = useState<SpeciesKey>(DEFAULT_TARGET)
  const [optionsOpen, setOptionsOpen] = useState(false)

  const selectPhoto = async (sourceType: 'camera' | 'album') => {
    try {
      const result = await Taro.chooseMedia({ count: 1, mediaType: ['image'], sourceType: [sourceType], sizeType: ['compressed'], camera: 'back' })
      const path = result.tempFiles?.[0]?.tempFilePath
      if (!path) return
      setState('saving')
      const saved = await createDraft(path, sourceType)
      setDraft(saved)
      setState('ready')
    } catch (error: any) {
      if (error?.errMsg && !/cancel/i.test(error.errMsg)) Taro.showToast({ title: '照片保存失败，请重试', icon: 'none' })
      setState(draft ? 'ready' : 'empty')
    }
  }

  const startIdentify = async () => {
    if (!draft) return
    setState('identifying')
    const result = await identifyDemo(draft, target)
    if (result.kind === 'unknown') { markUnknown(draft.id); setState('unknown'); return }
    setState('candidate')
  }
  const createCard = () => {
    if (!draft) return
    try {
      const card = confirmCard(draft, target)
      Taro.navigateTo({ url: `/pages/reveal/index?cardId=${card.id}` })
    } catch { Taro.showToast({ title: '卡片暂时无法生成，请重新选择照片', icon: 'none' }) }
  }
  const unknown = () => { if (draft) markUnknown(draft.id); setState('unknown') }
  const chooseManual = () => { const i = SPECIES_KEYS.indexOf(target); setTarget(SPECIES_KEYS[(i + 1) % SPECIES_KEYS.length]); setState('candidate') }

  return <View className={styles.page}>
    <View className={styles.header}><Text className={styles.eyebrow}>去大自然里 · 观察</Text><Text className={styles.title}>先记录，再认识</Text><Text className={styles.subtitle}>拍下你遇见的自然，再由你确认它是谁。</Text></View>
    <View className={styles.viewport}>
      {draft ? <Image src={draft.photoPath} className={styles.viewportImg} mode='aspectFill' /> : <View className={styles.emptyPhoto}><Text className={styles.emptyIcon}>⌁</Text><Text>拍一张属于你的观察</Text></View>}
      {draft && <View className={styles.photoFlag}><Text>{draft.source === 'camera' ? '刚刚拍摄' : '从相册选择'}</Text></View>}
    </View>
    {(state === 'empty' || state === 'ready') && <View className={styles.actions}>
      <View className={`${styles.btn} ${styles.btnSecondary}`} onTap={() => selectPhoto('album')}><Text>从相册选</Text></View>
      <View className={`${styles.btn} ${styles.btnPrimary}`} onTap={() => selectPhoto('camera')}><Text>{draft ? '重新拍摄' : '拍照'}</Text></View>
    </View>}
    {state === 'ready' && <View className={styles.identifyPanel}><Text className={styles.panelTitle}>照片已保存</Text><Text className={styles.panelText}>下一步由你主动开始鉴别。未接入真实识别服务前，结果仅作本地演示。</Text><View className={`${styles.btn} ${styles.btnPrimary}`} onTap={startIdentify}><Text>开始鉴别</Text></View></View>}
    {state === 'saving' && <View className={styles.status}><Text>正在保存你的照片…</Text></View>}
    {state === 'identifying' && <View className={styles.status}><Text>正在准备演示候选…</Text><Text className={styles.statusHint}>这不是对照片像素的真实判断</Text></View>}
    {state === 'candidate' && draft && <View className={styles.result}>
      <Text className={styles.demo}>本地演示结果 · 请根据照片核对</Text><Text className={styles.resultName}>{SPECIES[target].zh}</Text><Text className={styles.resultLatin}>{SPECIES[target].latin}</Text><Text className={styles.resultText}>{SPECIES[target].tagline}</Text>
      <View className={`${styles.btn} ${styles.btnPrimary}`} onTap={createCard}><Text>确认生成卡片</Text></View>
      <View className={styles.minorActions}><View onTap={unknown}><Text>不是这个</Text></View><View onTap={chooseManual}><Text>换一个候选</Text></View></View>
    </View>}
    {state === 'unknown' && <View className={styles.result}><Text className={styles.resultName}>暂未确认</Text><Text className={styles.resultText}>照片已经保留。你可以再试一次，或手动选择候选；现在不会生成卡片。</Text><View className={`${styles.btn} ${styles.btnPrimary}`} onTap={startIdentify}><Text>重新鉴别</Text></View><View className={styles.minorActions}><View onTap={chooseManual}><Text>手动选择物种</Text></View></View></View>}
    {draft && <View className={styles.demoOptions} onTap={() => setOptionsOpen(value => !value)}><Text>演示选项 {optionsOpen ? '−' : '+'}</Text></View>}
    {optionsOpen && <View className={styles.targets}>{SPECIES_KEYS.map(id => <View key={id} className={target === id ? styles.targetOn : styles.target} onTap={() => setTarget(id)}><Text>{SPECIES[id].zh}</Text></View>)}</View>}
  </View>
}
