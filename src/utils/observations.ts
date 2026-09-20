import Taro from '@tarojs/taro'
import { SpeciesKey } from '../data/species'
import { getItem, KEYS, setItem } from './storage'

export type DraftSource = 'camera' | 'album'
export type DraftStatus = 'ready' | 'identifying' | 'unknown' | 'confirmed'
export type CardFinish = 'standard' | 'holo' | 'alt' | 'numbered'

export type ObservationDraft = {
  id: string
  photoPath: string
  createdAt: string
  source: DraftSource
  status: DraftStatus
  candidateId?: SpeciesKey
}

export type CollectedCard = {
  id: string
  draftId: string
  speciesId: SpeciesKey
  photoPath: string
  createdAt: string
  finish: CardFinish
  revealSeen: boolean
}

export type IdentifyResult =
  | { kind: 'candidate'; speciesId: SpeciesKey }
  | { kind: 'unknown' }

const finishes: CardFinish[] = ['standard', 'holo', 'alt', 'numbered']
const createId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
const readDrafts = () => getItem<ObservationDraft[]>(KEYS.OBSERVATION_DRAFTS, [])
const writeDrafts = (drafts: ObservationDraft[]) => setItem(KEYS.OBSERVATION_DRAFTS, drafts)

export const listCards = () => getItem<CollectedCard[]>(KEYS.OBSERVATION_CARDS, []).filter(card => Boolean(card.photoPath))
const writeCards = (cards: CollectedCard[]) => setItem(KEYS.OBSERVATION_CARDS, cards)
export const findCard = (cardId: string) => listCards().find(card => card.id === cardId) ?? null

export async function createDraft(tempPath: string, source: DraftSource): Promise<ObservationDraft> {
  const saved = await Taro.saveFile({ tempFilePath: tempPath })
  if (!('savedFilePath' in saved) || !saved.savedFilePath) throw new Error('PHOTO_SAVE_FAILED')
  const draft: ObservationDraft = {
    id: createId('draft'), photoPath: saved.savedFilePath, createdAt: new Date().toISOString(), source, status: 'ready'
  }
  writeDrafts([...readDrafts(), draft])
  return draft
}

export async function identifyDemo(draft: ObservationDraft, target: SpeciesKey): Promise<IdentifyResult> {
  writeDrafts(readDrafts().map(item => item.id === draft.id ? { ...item, status: 'identifying' } : item))
  await new Promise(resolve => setTimeout(resolve, 800))
  return { kind: 'candidate', speciesId: target }
}

export function markUnknown(draftId: string): void {
  writeDrafts(readDrafts().map(item => item.id === draftId ? { ...item, status: 'unknown' } : item))
}

export function confirmCard(draft: ObservationDraft, speciesId: SpeciesKey): CollectedCard {
  const current = readDrafts().find(item => item.id === draft.id)
  if (!current || !current.photoPath) throw new Error('DRAFT_NOT_CONFIRMABLE')
  const card: CollectedCard = {
    id: createId('card'), draftId: draft.id, speciesId, photoPath: draft.photoPath, createdAt: new Date().toISOString(),
    finish: finishes[Math.abs(draft.id.length + draft.createdAt.length) % finishes.length], revealSeen: false
  }
  writeCards([...listCards(), card])
  writeDrafts(readDrafts().map(item => item.id === draft.id ? { ...item, status: 'confirmed', candidateId: speciesId } : item))
  return card
}

export function markRevealSeen(cardId: string): void {
  writeCards(listCards().map(card => card.id === cardId ? { ...card, revealSeen: true } : card))
}

export async function deleteDraft(draft: ObservationDraft): Promise<void> {
  try { await Taro.removeSavedFile({ filePath: draft.photoPath }) } catch { /* 文件已被系统清理时仍删除草稿元数据。 */ }
  writeDrafts(readDrafts().filter(item => item.id !== draft.id))
}
