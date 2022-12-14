import { type Card, getCard } from '../data'
import { AllCard, type CardKey } from '../data/pubdata'
import { Shuffler } from './utils'
import type { PossibleLevel } from './types'

const poolCount: Record<PossibleLevel, number> = {
  1: 18,
  2: 15,
  3: 13,
  4: 11,
  5: 9,
  6: 6,
}

type HeapType = {
  [key in CardKey]?: number
}

export class Pool {
  rheap: HeapType
  gen: Shuffler

  constructor(pack: Record<string, boolean>, seed: string) {
    this.rheap = {}
    this.gen = new Shuffler(seed)

    AllCard.map(c => getCard(c)).forEach(card => {
      if (!card.pool || !pack[card.pack]) {
        return
      }
      if (card.attr.rare) {
        if (this.gen.gen.float() <= 0.15) {
          this.rheap[card.name] = 1
        }
      } else {
        this.rheap[card.name] = poolCount[card.level as PossibleLevel]
      }
    })
  }

  discover(pred: (card: Card) => boolean, count: number, unique = false) {
    const nh: HeapType = {}
    const f: Card[] = []
    const mf: Card[] = []
    Object.keys(this.rheap).forEach(k => {
      const ck = k as CardKey
      const card = getCard(ck)

      if (pred(card)) {
        if (unique) {
          f.push(card)
          mf.push(...Array((this.rheap[ck] || 1) - 1).fill(card))
        } else {
          f.push(...Array(this.rheap[ck] || 0).fill(card))
        }
      } else {
        nh[ck] = this.rheap[ck]
      }
    })
    if (f.length + mf.length < count) {
      throw `Heap is not enough!`
    }
    this.rheap = nh
    this.gen.shuffle(f)
    if (f.length < count) {
      this.gen.shuffle(mf)
      f.push(...mf.slice(0, count - f.length))
      this.drop(mf.slice(count - f.length))
    } else {
      this.drop(mf)
    }
    this.drop(f.slice(count))
    return f.slice(0, count)
  }

  drop(card: Card[]) {
    card.forEach(c => {
      let cnt = (this.rheap[c.name] || 0) + 1
      if (cnt > poolCount[c.level as PossibleLevel]) {
        cnt = poolCount[c.level as PossibleLevel]
      }
      this.rheap[c.name] = cnt
    })
  }
}
