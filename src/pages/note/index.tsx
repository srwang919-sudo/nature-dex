import { useState, useEffect, useRef } from 'react'
import Taro from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import { getItem, setItem, KEYS } from '../../utils/storage'
import './index.module.scss'
import styles from './index.module.scss'

interface Note {
  id: string
  duration: number   // ms
  filePath: string
  createdAt: number
  wave?: number[]    // 模拟波形（演示用，纯随机）
}

function fmtDuration(ms: number): string {
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s} 秒`
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m} 分 ${r} 秒`
}
function fmtDate(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function Note() {
  const [notes, setNotes]   = useState<Note[]>([])
  const [recording, setRec] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const recMgrRef   = useRef<ReturnType<typeof Taro.getRecorderManager> | null>(null)
  const innerRef    = useRef<ReturnType<typeof Taro.createInnerAudioContext> | null>(null)
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTsRef  = useRef<number>(0)

  useEffect(() => {
    setNotes(getItem<Note[]>(KEYS.NOTES, []))
    return () => {
      try { timerRef.current && clearInterval(timerRef.current) } catch {}
      try { innerRef.current?.destroy() } catch {}
    }
  }, [])

  const persist = (next: Note[]) => {
    setNotes(next)
    setItem(KEYS.NOTES, next)
  }

  const startRecord = async () => {
    try {
      const auth = await Taro.authorize({ scope: 'scope.record' })
      if (auth.errMsg && auth.errMsg.includes('fail')) {
        Taro.showToast({ title: '请授权麦克风', icon: 'none' })
        return
      }
    } catch {
      Taro.showToast({ title: '请授权麦克风', icon: 'none' })
      return
    }
    const mgr = Taro.getRecorderManager()
    recMgrRef.current = mgr
    mgr.onStop(res => {
      const dur = Date.now() - startTsRef.current
      const wave = Array.from({ length: 48 }, () => 6 + Math.random() * 24)
      const next: Note = {
        id: String(Date.now()),
        duration: dur,
        filePath: res.tempFilePath,
        createdAt: Date.now(),
        wave
      }
      persist([next, ...notes])
      setRec(false)
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      setElapsed(0)
      Taro.showToast({ title: '已保存', icon: 'success', duration: 800 })
    })
    mgr.onError(err => {
      console.error('[recorder]', err)
      Taro.showToast({ title: '录音失败', icon: 'none' })
      setRec(false)
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    })
    mgr.start({ format: 'mp3', duration: 60000 })
    startTsRef.current = Date.now()
    setElapsed(0)
    setRec(true)
    timerRef.current = setInterval(() => setElapsed(Date.now() - startTsRef.current), 100)
  }

  const stopRecord = () => {
    try { recMgrRef.current?.stop() } catch {}
  }

  const onTouchStart = () => startRecord()
  const onTouchEnd   = () => { if (recording) stopRecord() }

  const playNote = (n: Note) => {
    try { innerRef.current?.destroy() } catch {}
    const audio = Taro.createInnerAudioContext()
    innerRef.current = audio
    audio.src = n.filePath
    audio.onError(err => {
      console.warn('[audio play] error', err)
      Taro.showToast({ title: '播放失败：录音文件可能已失效', icon: 'none' })
    })
    audio.play()
  }

  const delNote = (id: string) => {
    persist(notes.filter(n => n.id !== id))
  }

  return (
    <View className={styles.page}>
      <View className={styles.intro}>
        <Text className={styles.introTitle}>观察笔记</Text>
        <Text className={styles.introHint}>
          按住底部按钮说话，松手即停。{'\n'}
          笔记保存到本机，暂不同步 —— 真正上线前需接入云端存储。
        </Text>
      </View>

      <View className={styles.list}>
        {notes.length === 0 && (
          <View className={styles.empty}>
            <Text>还没有笔记。按住下面按钮开始记录。</Text>
          </View>
        )}
        {notes.map(n => (
          <View key={n.id} className={styles.item}>
            <View className={styles.itemHead}>
              <Text className={styles.itemDate}>{fmtDate(n.createdAt)}</Text>
              <Text className={styles.itemDur}>{fmtDuration(n.duration)}</Text>
            </View>
            <View className={styles.itemWave}>
              {(n.wave || []).map((h, i) => (
                <View key={i} className={styles.bar} style={{ height: `${h * 2}rpx` }} />
              ))}
            </View>
            <View className={styles.itemFoot}>
              <View className={styles.playBtn} onTap={() => playNote(n)}>
                <Text>播放</Text>
              </View>
              <View className={styles.delBtn} onTap={() => delNote(n.id)}>
                <Text>删除</Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      <View className={styles.recordBar}>
        <View
          className={`${styles.recordBtn} ${recording ? styles.recording : ''}`}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          onTouchCancel={onTouchEnd}
        >
          <Text>{recording ? `松开结束 · ${fmtDuration(elapsed)}` : '按住开始录音'}</Text>
        </View>
        <Text className={styles.hint}>单次最长 60 秒</Text>
      </View>
    </View>
  )
}