import { Emitter } from '@nekosu/async-emitter'
import type { Card, UnitKey, Upgrade } from '../data'
import { getUpgrade } from '../data'
import { CardInstance } from './card'
import type { Game } from './game'
import { InfrType } from './types'
import type { AllBus, DescClearGen, PossibleLevel } from './types'
import { Desc } from './desc'
import { AllUpgrade } from '../data/pubdata'
import { Shuffler } from './utils'

export type PlayerBus = {
  $upgrade: {
    player: Player
  }
  $refresh: {
    player: Player
  }
  '$obtain-card': {
    player: Player
    cardt: Card
  }
  '$buy-card': {
    player: Player
    pos: number
  }
  '$cache-card': {
    player: Player
    pos: number
  }
  '$sell-card': {
    player: Player
    pos: number
  }
  '$combine-card': {
    player: Player
    pos: number
  }
  '$upgrade-card': {
    player: Player
    pos: number
  }
  '$hand-enter-card': {
    player: Player
    pos: number
  }
  '$hand-sell-card': {
    player: Player
    pos: number
  }
  '$hand-combine-card': {
    player: Player
    pos: number
  }
  $imr: {
    player: Player
  }

  upgraded: {
    player: Player
    level: number
  }
  refresh: {
    player: Player
  }
  'destroy-card': {
    player: Player
    destroy: CardInstance
  }
  discover: {
    player: Player
    item: (Card | Upgrade)[]
    target?: CardInstance
    cancel?: () => Promise<void>
  }

  'card-entered': {
    player: Player
    target: CardInstance
  }
  'card-combined': {
    player: Player
    target: CardInstance
  }
  'card-selled': {
    player: Player
    selled: CardInstance
  }
  inject: {
    player: Player
    unit: UnitKey[]
  }
  wrap: {
    player: Player
    unit: UnitKey[]
    info: {
      to: CardInstance | null
    }
  }
}

const StoreCount: Record<PossibleLevel, number> = {
  1: 3,
  2: 4,
  3: 4,
  4: 5,
  5: 5,
  6: 6,
}

export class Player {
  bus: Emitter<AllBus>
  game: Game
  pos: number

  hand: (Card | null)[]
  store: (Card | null)[]
  pres: (CardInstance | null)[]

  level: PossibleLevel
  cost: number
  mineMax: number
  mine: number
  gas: number
  lock: boolean

  flag: Record<string, any>
  glob: Record<string, any>

  choose: () => Promise<number>
  refresh: (place: 'hand' | 'store' | 'present' | 'info') => Promise<void>
  discover: (item: (Card | Upgrade)[], allowCancel: boolean) => Promise<number>

  shuffler: Shuffler

  choices: number[]

  constructor(g: Game, seed: string, pos: number) {
    this.bus = new Emitter()
    this.game = g
    this.pos = pos

    this.hand = Array(6).fill(null)
    this.store = Array(3).fill(null)
    this.pres = Array(7).fill(null)

    this.level = 1 as PossibleLevel
    this.cost = 6
    this.mineMax = 2
    this.mine = 0
    this.gas = -1
    this.lock = false

    this.flag = {}
    this.glob = {}

    this.choose = async () => 0
    this.refresh = async () => {}
    this.discover = async () => 0

    this.shuffler = new Shuffler(seed)

    this.choices = []

    this.bus.wildcastAfter(async (e, p: any) => {
      if (p.card) {
        await (p.card as CardInstance).bus.async_emit(e as keyof AllBus, p)
      } else {
        await this.enum_present(async ci => {
          await ci.bus.async_emit(e as keyof AllBus, p)
          return false
        })
      }
    })

    this.bus.on('$upgrade', async () => {
      await this.upgrade()
    })

    this.bus.on('$refresh', async () => {
      await this.do_refresh()
    })

    this.bus.on('round-start', async () => {
      this.flag = {}
      if (this.cost > 0) {
        this.cost -= 1
      }
      if (this.mineMax < 10) {
        this.mineMax += 1
      }
      this.mine = this.mineMax
      if (this.gas < 6) {
        this.gas += 1
      }
      if (!this.lock) {
        this.store = Array(StoreCount[this.level]).fill(null)
      }
      this.lock = false
      await this.fill_store()
      await this.refresh('info')
      await this.refresh('present')
    })

    this.bus.on('$obtain-card', async ({ cardt }) => {
      for (let i = 0; i < 6; i++) {
        if (!this.hand[i]) {
          this.hand[i] = cardt
          break
        }
      }
      await this.refresh('hand')
    })

    this.bus.on('$buy-card', async ({ pos }) => {
      if (!this.store[pos] || this.mine < 3 || !this.can_enter()) {
        return
      }
      const cardt = this.store[pos] as Card
      this.mine -= 3
      this.store[pos] = null
      await this.enter(cardt)
      await this.refresh('info')
      await this.refresh('store')
      await this.refresh('present')
    })

    this.bus.on('$cache-card', async ({ pos }) => {
      if (!this.store[pos] || this.mine < 3 || !this.can_cache()) {
        return
      }
      const cardt = this.store[pos] as Card
      this.mine -= 3
      this.store[pos] = null
      await this.game.bus.async_emit('$obtain-card', {
        player: this,
        cardt,
      })
      await this.refresh('info')
      await this.refresh('store')
    })

    this.bus.on('$sell-card', async ({ pos }) => {
      if (!this.pres[pos]) {
        return
      }
      const ci = this.pres[pos] as CardInstance
      this.pres[pos] = null
      this.mine += 1
      await this.sell(ci)
      await this.refresh('info')
      await this.refresh('store')
      await this.refresh('present')
    })

    this.bus.on('$combine-card', async ({ pos }) => {
      if (!this.store[pos] || this.mine < 3) {
        return
      }
      const c = this.store[pos] as Card
      this.store[pos] = null
      this.mine -= 3
      await this.combine(c)
      await this.refresh('hand')
      await this.refresh('store')
      await this.refresh('present')
    })

    this.bus.on('$upgrade-card', async ({ pos }) => {
      if (!this.pres[pos] || this.gas < 2) {
        return
      }
      const c = this.pres[pos] as CardInstance
      if (c.upgrades.length >= 5) {
        return
      }
      const comm: Upgrade[] = [],
        spec: Upgrade[] = []
      AllUpgrade.filter(u => !c.upgrades.includes(u))
        .map(getUpgrade)
        .forEach(u => {
          switch (u.category) {
            case 'O':
              if (c.template.attr.origin) {
                spec.push(u)
              }
              break
            case 'V':
              if (c.template.attr.void) {
                spec.push(u)
              }
              break
            case 'T':
            case 'P':
            case 'Z':
              if (c.template.race === u.category) {
                spec.push(u)
              }
              break
            case 'C':
              comm.push(u)
              break
          }
        })
      this.shuffle(spec)
      const firstUpgrade = c.upgrades.length === 0
      const sp = spec.slice(
        0,
        firstUpgrade ? (c.template.attr.origin ? 3 : 2) : 1
      )
      const item = this.shuffle(comm)
        .slice(0, 4 - sp.length)
        .concat(sp)
      this.gas -= 2
      await this.refresh('info')
      await this.game.bus.async_emit('discover', {
        player: this,
        item,
        target: c,
        cancel: async () => {
          this.gas += 1
          this.refresh('info')
        },
      })
    })

    this.bus.on('$hand-enter-card', async ({ pos }) => {
      if (!this.hand[pos] || !this.can_enter()) {
        return
      }
      const cardt = this.hand[pos] as Card
      this.hand[pos] = null
      await this.enter(cardt)
      await this.refresh('info')
      await this.refresh('store') // check if can combo
      await this.refresh('hand')
      await this.refresh('present')
    })

    this.bus.on('$hand-sell-card', async ({ pos }) => {
      const cardt = this.hand[pos]
      if (!cardt) {
        return
      }
      if (cardt.pool) {
        this.game.pool.drop([cardt])
      }
      this.hand[pos] = null
      this.mine += 1
      await this.refresh('info')
      await this.refresh('hand')
    })

    this.bus.on('$hand-combine-card', async ({ pos }) => {
      if (!this.hand[pos]) {
        return
      }
      const c = this.hand[pos] as Card
      this.hand[pos] = null
      await this.combine(c)
      await this.refresh('hand')
      await this.refresh('store')
      await this.refresh('present')
    })

    this.bus.on('$imr', async () => {
      this.mine = 999
      this.gas = 999
      await this.refresh('info')
      await this.refresh('store')
      await this.refresh('present')
    })

    this.bus.on('destroy-card', async ({ destroy }) => {
      if (!destroy.flag.derive) {
        this.game.pool.drop(
          Array(destroy.flag.deriveCount || (destroy.gold ? 3 : 1)).fill(
            destroy.template
          )
        )
      }
      this.pres[destroy.pos] = null
    })

    this.bus.on('discover', async ({ item, target, cancel }) => {
      const rc = await this.game.queryChoice(this, async () => {
        this.game.pollChoice(this, await this.discover(item, !!cancel))
      })
      if (rc === -1) {
        if (cancel) {
          await cancel()
        }
        return
      }
      const cho = item[rc]
      if (cho.type === 'card') {
        await this.game.bus.async_emit('$obtain-card', {
          player: this,
          cardt: cho,
        })
      } else {
        if (!target) {
          return
        }
        await this.game.bus.async_emit('obtain-upgrade', {
          card: target,
          upgrade: cho,
        })
      }
      item.splice(rc, 1)
      this.game.pool.drop(item.filter(it => it.type === 'card') as Card[])
    })

    this.bus.after('wrap', async ({ unit, info }) => {
      if (!info.to) {
        const cs = this.pres.filter(c => c?.template.race === 'P')
        this.shuffle(cs)
        if (cs.length === 0) {
          return
        }
        info.to = cs[0]
        console.log(`choose ${cs[0]?.pos}`)
      }
      await this.game.bus.async_emit('wrap-into', {
        card: info.to as CardInstance,
        unit,
      })
    })
  }

  shuffle<T>(arr: T[]): T[] {
    return this.shuffler.shuffle(arr)
  }

  async enum_present(func: (card: CardInstance) => Promise<boolean | void>) {
    for (const ci of this.pres) {
      if (ci && (await func(ci))) {
        return
      }
    }
  }

  value() {
    let sum = 0
    this.pres.forEach(p => {
      if (p) {
        sum += p.value()
      }
    })
    return sum
  }

  async upgrade() {
    if (this.level === 6) {
      return
    }
    if (this.mine < this.cost) {
      return
    }
    this.mine -= this.cost
    const upgrades = [0, 5, 7, 8, 9, 11, 0]
    this.level += 1
    this.cost = upgrades[this.level]
    await this.game.bus.async_emit('upgraded', {
      player: this,
      level: this.level,
    })
    if (this.store.length < StoreCount[this.level as PossibleLevel]) {
      this.store.push(null)
    }
    await this.refresh('info')
    await this.refresh('store')
  }

  async fill_store() {
    const nf = this.store.filter(c => !c).length
    const nc = this.game.pool.discover(card => card.level <= this.level, nf)
    for (let i = 0; i < this.store.length; i++) {
      if (!this.store[i]) {
        this.store[i] = nc.shift() || null
      }
    }
    await this.refresh('store')
  }

  async do_refresh() {
    if (this.mine < 1) {
      return
    }
    this.mine -= 1
    this.game.pool.drop(this.store.filter(c => c) as Card[])
    this.store = Array(StoreCount[this.level]).fill(null)
    await this.fill_store()
    await this.game.bus.async_emit('refresh', {
      player: this,
    })
    await this.refresh('info')
  }

  can_combine(cardt: Card) {
    return (
      !cardt.attr.gold &&
      this.pres.filter(c => c?.name === cardt.name && !c.gold).length >= 2
    )
  }

  async combine(cardt: Card) {
    if (!this.can_combine(cardt)) {
      return false
    }
    const cs = this.pres
      .filter(c => c?.name === cardt.name && !c.gold)
      .slice(0, 2) as [CardInstance, CardInstance]

    const card = new CardInstance(this, cardt)
    card.gold = true
    card.pos = cs[0].pos
    if (cardt.race === 'T') {
      const ifrs: UnitKey[] = ['反应堆', '科技实验室', '高级科技实验室']
      card.units = [
        ...cs[0].units.filter(u => !ifrs.includes(u)),
        ...cs[1].units.filter(u => !ifrs.includes(u)),
      ].slice(0, 199)
      const if1 = cs[0].infr_type(),
        if2 = cs[1].infr_type()
      if (if1 === InfrType.HighTech || if2 === InfrType.HighTech) {
        card.units.push('高级科技实验室')
      } else if (if1 === InfrType.Reactor) {
        card.units.push('反应堆')
      } else if (if1 === InfrType.SciLab) {
        card.units.push('科技实验室')
      }
    } else {
      card.units = [...cs[0].units, ...cs[1].units]
    }
    card.upgrades = cs[0].upgrades.map(x => x)
    cs[1].upgrades.map(getUpgrade).forEach(u => {
      if (card.upgrades.includes(u.name) && !u.override) {
        return
      }
      card.upgrades.push(u.name)
    })
    card.upgrades = card.upgrades.slice(0, 5)
    card.flag.void = cs[0].flag.void && cs[1].flag.void

    cs[0].clear()
    cs[1].clear()

    this.pres[cs[0].pos] = card
    this.pres[cs[1].pos] = null

    card.clear = (Desc[cardt.name] as DescClearGen)(card).clear()

    await this.game.bus.async_emit('card-combined', {
      player: this,
      target: card,
    })
    await this.game.bus.async_emit('post-enter', {
      card,
    })
    await this.refresh('hand')
    await this.refresh('present')
    const reward: (Card | Upgrade)[] = this.game.pool.discover(
      c => c.level === Math.min(6, this.level + 1),
      3,
      true
    )
    if (card.upgrades.length < 5) {
      reward.push(
        this.shuffle(
          AllUpgrade.map(getUpgrade)
            .filter(u => u.category === '3')
            .filter(u => !card.upgrades.includes(u.name))
        )[0]
      )
    }
    await this.bus.async_emit('discover', {
      player: this,
      item: reward,
      target: card,
    })
    return true
  }

  can_enter() {
    return this.pres.filter(p => p).length < 7
  }

  async enter(cardt: Card) {
    if (!this.can_enter()) {
      return false
    }
    const pos = cardt.attr.insert
      ? await this.game.queryChoice(this, async () => {
          this.game.pollChoice(this, await this.choose())
        })
      : this.pres.findIndex(card => !card)
    const ci = new CardInstance(this, cardt)
    await this.make_room(pos)
    ci.pos = pos
    this.pres[pos] = ci

    ci.clear = (Desc[cardt.name] as DescClearGen)(ci).clear()

    await this.game.bus.async_emit('card-entered', {
      player: this,
      target: ci,
    })
    await this.game.bus.async_emit('post-enter', {
      card: ci,
    })
    return true
  }

  async make_room(pos: number) {
    if (!this.pres[pos]) {
      return
    }
    for (let i = pos + 1; i < 7; i++) {
      if (!this.pres[i]) {
        while (i > pos) {
          this.pres[i] = this.pres[i - 1]
          ;(this.pres[i] as CardInstance).pos = i
          i--
        }
        this.pres[pos] = null
        return
      }
    }
    for (let i = pos - 1; i >= 0; i--) {
      if (!this.pres[i]) {
        while (i < pos) {
          this.pres[i] = this.pres[i + 1]
          ;(this.pres[i] as CardInstance).pos = i
          i++
        }
        this.pres[pos] = null
        return
      }
    }
  }

  async can_cache() {
    return this.hand.filter(p => p).length < 6
  }

  async sell(card: CardInstance) {
    await this.game.bus.async_emit('post-sell', {
      card,
    })
    card.clear()
    if (!card.flag.derive) {
      this.game.pool.drop(
        Array(card.flag.deriveCount || (card.gold ? 3 : 1)).fill(card.template)
      ) // 雷诺可以用flag处理
    }
    await this.game.bus.async_emit('card-selled', {
      player: card.player,
      selled: card,
    })
  }
}
