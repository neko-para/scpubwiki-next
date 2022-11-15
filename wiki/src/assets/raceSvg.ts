import TSVG from '@/assets/terran.svg'
import PSVG from '@/assets/protoss.svg'
import ZSVG from '@/assets/zerg.svg'
import NSVG from '@/assets/random.svg'
import type { Race } from '../../../data/types'

export const raceSvg: Record<Race, string> = {
  T: TSVG,
  P: PSVG,
  Z: ZSVG,
  N: NSVG,
  G: '',
}
