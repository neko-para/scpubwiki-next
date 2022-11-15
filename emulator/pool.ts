import { type Card, getCard } from '../data'
import { AllCard } from '../data/pubdata'
import { shuffle } from './utils'
import type { PossibleLevel } from './types'

const poolCount: Record<PossibleLevel, number> = {
  1: 18,
  2: 15,
  3: 13,
  4: 11,
  5: 9,
  6: 6,
}

export class Pool {
  heap: Card[]

  constructor() {
    this.heap = []
    AllCard.map(c => getCard(c)).forEach(card => {
      if (!card.pool) {
        return
      }
      if (card.attr.rare) {
        if (Math.random() <= 0.15) {
          this.heap.push(card)
        }
      } else {
        this.drop(Array(poolCount[card.level as PossibleLevel]).fill(card))
      }
    })
  }

  discover(pred: (card: Card) => boolean, count: number) {
    const nh: Card[] = []
    const f: Card[] = []
    this.heap.forEach(card => {
      if (pred(card)) {
        f.push(card)
      } else {
        nh.push(card)
      }
    })
    if (f.length < count) {
      throw `Heap is not enough!`
    }
    shuffle(f)
    this.heap = nh
    this.drop(f.slice(count))
    shuffle(nh)
    return f.slice(0, count)
  }

  drop(card: Card[]) {
    this.heap.push(...card)
  }
}
