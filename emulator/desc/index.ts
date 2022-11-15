import type { CardKey } from '../../data'
import type { DescClearGen } from '../types'
import TDesc from './terran'
import ZDesc from './zerg'
import PDesc from './protoss'
import NDesc from './neutural'

export const Desc: {
  [key in CardKey]?: DescClearGen
} = {
  ...TDesc,
  ...ZDesc,
  ...PDesc,
  ...NDesc,
}
