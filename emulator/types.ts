import type { CardKey } from '../data'
import type { CardBus, CardInstance } from './card'
import type { GameBus } from './game'
import type { PlayerBus } from './player'
import type { Binder } from './utils'

export type PossibleLevel = 1 | 2 | 3 | 4 | 5 | 6

export type AllBus = GameBus & PlayerBus & CardBus

export type DescClearGen = (card: CardInstance) => Binder

export type Description = {
  [key in CardKey]?: DescClearGen
}

export enum InfrType {
  Reactor,
  SciLab,
  HighTech,
  None,
}
