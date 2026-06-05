import type { ReactNode } from 'react'
import type { StationType } from '@/types'
import { LiveBatIcon, TeeIcon, BuntIcon, KorkenIcon, HuetchenIcon, OtherStationIcon } from './StationIcons'

interface StationMeta {
  label: string
  Icon: (p: { size?: number; className?: string }) => ReactNode
  /** true = Softball-Red-Akzent (Live-Station), sonst Navy. */
  accent: boolean
}

export const STATION_META: Record<StationType, StationMeta> = {
  LIVE: { label: 'Live', Icon: LiveBatIcon, accent: true },
  TEE: { label: 'Tee', Icon: TeeIcon, accent: false },
  BUNT: { label: 'Bunt', Icon: BuntIcon, accent: false },
  KORKEN: { label: 'Korken', Icon: KorkenIcon, accent: false },
  HUETCHEN: { label: 'Hütchen', Icon: HuetchenIcon, accent: false },
  OTHER: { label: 'Sonstiges', Icon: OtherStationIcon, accent: false },
}

export const STATION_TYPE_ORDER: StationType[] = ['LIVE', 'TEE', 'BUNT', 'KORKEN', 'HUETCHEN', 'OTHER']
