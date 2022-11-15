import { Emitter, SyncEmitter } from '@nekosu/async-emitter'
import type { Card, PossibleKey, Term, Unit, Upgrade } from '../../data'

export type PubNode = Card | Unit | Term | Upgrade

export const wikiBus: SyncEmitter<{
  request: {
    term: PossibleKey
  }
  search: {
    node: PubNode[]
  }
  searchPos: {
    page: number
  }
}> = new SyncEmitter()

export const emuBus: Emitter<{
  requestSell: {
    pos: number
  }
  requestBuy: {
    pos: number
  }
  requestCache: {
    pos: number
  }
  requestCombine: {
    pos: number
  }
  requestUpgradeCard: {
    pos: number
  }
  requestHandEnter: {
    pos: number
  }
  requestHandSell: {
    pos: number
  }
  requestHandCombine: {
    pos: number
  }
  chooseInsert: {}
  chooseInsertDone: {
    pos: number
  }
  chooseItem: {}
  chooseItemDone: {
    pos: number
  }
}> = new Emitter()
