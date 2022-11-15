import type { Emitter } from '@nekosu/async-emitter'
import { getUnit, isNormal, type UnitKey } from '../data'
import type { CardInstance } from './card'
import type { AllBus } from './types'

export function shuffle<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
  return array
}

export class Binder {
  clf: {
    (): void
  }[]
  bus: Emitter<AllBus> | null

  constructor() {
    this.clf = []
    this.bus = null
  }

  for(t: { bus: Emitter<AllBus> }) {
    this.bus = t.bus
    return this
  }

  bind<K extends keyof AllBus & string>(
    ev: K,
    func: (param: AllBus[K]) => Promise<void>
  ) {
    this.bus?.on(ev, func)
    this.clf.push(() => {
      this.bus?.off(ev, func)
    })
    return this
  }

  bindBefore<K extends keyof AllBus & string>(
    ev: K,
    func: (param: AllBus[K]) => Promise<void>
  ) {
    this.bus?.before(ev, func)
    this.clf.push(() => {
      this.bus?.off(ev, func)
    })
    return this
  }

  bindAfter<K extends keyof AllBus & string>(
    ev: K,
    func: (param: AllBus[K]) => Promise<void>
  ) {
    this.bus?.after(ev, func)
    this.clf.push(() => {
      this.bus?.off(ev, func)
    })
    return this
  }

  apply(...func: ((binder: Binder) => void)[]) {
    for (const f of func) {
      f(this)
    }
    return this
  }

  clear() {
    return () => {
      this.clf.forEach(f => f())
    }
  }
}

export function $() {
  return new Binder()
}

export async function 获得(card: CardInstance, unit: UnitKey[]) {
  if (unit.length === 0) {
    return
  }
  await card.player.bus.async_emit('obtain-unit', {
    card,
    unit,
  })
}

export function 获得N(card: CardInstance, unit: UnitKey, number: number) {
  return 获得(card, Array(number).fill(unit))
}

export async function 转换(card: CardInstance, index: number[], to: UnitKey) {
  if (index.length === 0) {
    return
  }
  await card.player.bus.async_emit('replace-unit', {
    card,
    index,
    unit: to,
  })
}

export function 摧毁(card: CardInstance) {
  return card.player.bus.async_emit('destroy-card', {
    player: card.player,
    destroy: card,
  })
}

export function 夺取(
  card: CardInstance,
  target: CardInstance,
  real: boolean = true,
  keep: boolean = false
) {
  return card.player.bus.async_emit('seize', {
    card,
    target,
    real,
    keep,
  })
}

export function 价值最高(card: CardInstance) {
  let v = 0
  let u: UnitKey | null = null
  card.units.forEach(unit => {
    if (!isNormal(unit)) {
      return
    }
    const uu = getUnit(unit)
    const vl = ['莎拉·凯瑞甘', '刀锋女王'].includes(uu.name) ? 10000 : uu.value
    if (vl > v) {
      v = vl
      u = unit
    }
  })
  return u
}

export async function 左侧(
  card: CardInstance,
  func: (card: CardInstance) => Promise<void>
) {
  if (card.pos > 0) {
    const c = card.player.pres[card.pos - 1]
    if (c) {
      await func(c)
    }
  }
}

export async function 右侧(
  card: CardInstance,
  func: (card: CardInstance) => Promise<void>
) {
  if (card.pos < 6) {
    const c = card.player.pres[card.pos + 1]
    if (c) {
      await func(c)
    }
  }
}

export async function 相邻两侧(
  card: CardInstance,
  func: (card: CardInstance) => Promise<void>
) {
  await 左侧(card, func)
  await 右侧(card, func)
}
