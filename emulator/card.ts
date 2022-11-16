import { Emitter } from '@nekosu/async-emitter'
import {
  getCard,
  getUnit,
  getUpgrade,
  isNormal,
  type Card,
  type UnitKey,
  type Upgrade,
  type UpgradeKey,
} from '../data'
import { AllUpgrade, type CardKey } from '../data/pubdata'
import { Desc } from './desc'
import type { Player } from './player'
import { type AllBus, InfrType, type DescClearGen } from './types'
import { 价值最高, 相邻两侧, 获得, 获得N } from './utils'

export type CardBus = {
  'obtain-unit': {
    card: CardInstance
    unit: UnitKey[]
  }
  'obtain-upgrade': {
    card: CardInstance
    upgrade: Upgrade | null
  }
  'switch-desc': {
    card: CardInstance
    desc: CardKey
  }
  'replace-unit': {
    card: CardInstance
    index: number[]
    unit: UnitKey
  }
  seize: {
    card: CardInstance
    target: CardInstance
    real: boolean
    keep: boolean
  }

  'post-enter': {
    card: CardInstance
  }
  'post-sell': {
    card: CardInstance
  }
  'task-done': {
    card: CardInstance
  }

  'switch-infr': {
    card: CardInstance
  }
  'upgrade-infr': {
    card: CardInstance
  }
  'fast-prod': {
    card: CardInstance
  }

  incubate: {
    card: CardInstance
    unit: UnitKey[]
  }
  'incubate-into': {
    card: CardInstance
    unit: UnitKey[]
  }

  regroup: {
    card: CardInstance
    id: number
  }
  'regroup-count': {
    card: CardInstance
    info: {
      count: number
    }
  }
  'wrap-into': {
    card: CardInstance
    unit: UnitKey[]
  }

  'gain-darkness': {
    card: CardInstance
    darkness: number
  }
}

export class CardInstance {
  bus: Emitter<AllBus>
  player: Player
  template: Card
  name: string
  pos: number
  gold: boolean
  flag: Record<string, any>

  msg: string

  units: UnitKey[]
  upgrades: UpgradeKey[]

  clear: () => void

  constructor(p: Player, t: Card) {
    this.bus = new Emitter()
    this.player = p
    this.template = t
    this.name = this.template.name
    this.pos = -1
    this.gold = false
    this.flag = {}

    this.msg = ''

    this.units = []
    this.upgrades = []

    this.clear = () => {}

    for (const k in t.unit) {
      this.units.push(...(Array(t.unit[k as UnitKey]).fill(k) as UnitKey[]))
    }

    if (t.attr.void) {
      this.flag.void = true
    }

    this.bus.on('obtain-unit', async ({ unit }) => {
      this.units = this.units.concat(unit).slice(0, 200)
      if (this.upgrades.includes('献祭')) {
        this.sacrifice()
        this.announce(`献祭: ${this.flag.献祭}`)
      }
      await this.player.refresh('present')
    })

    this.bus.on('obtain-upgrade', async ({ upgrade }) => {
      const u =
        upgrade || getUpgrade(this.player.shuffle(AllUpgrade.map(u => u))[0])
      if (
        (!u.override && this.upgrades.includes(u.name)) ||
        this.upgrades.length >= 5
      ) {
        return
      }
      this.upgrades.push(u.name)
      switch (u.name) {
        case '黄金矿工':
          await this.post('switch-desc', {
            card: this,
            desc: '黄金矿工',
          })
          break
        case '修理无人机':
          await 获得N(this, '修理无人机', this.player.level + 3)
          break
        case '原始尖塔':
          break
        case '折跃援军':
          await 获得N(this, '水晶塔', 2)
          await 获得N(this, '狂热者', 2)
          await 获得N(this, '激励者', 2)
          break
        case '献祭': {
          this.sacrifice()
          this.announce(`献祭: ${this.flag.献祭}`)
          break
        }
      }
      await this.player.refresh('present')
    })

    this.bus.on('switch-desc', async ({ desc }) => {
      this.flag.deriveCount = this.gold ? 3 : 1
      this.clear()
      this.name = desc
      this.clear = (Desc[desc] as DescClearGen)(this).clear()
      await this.post('post-enter', {
        // really need it?
        card: this,
      })
      await this.player.refresh('present')
    })

    this.bus.on('replace-unit', async ({ index, unit }) => {
      index.forEach(i => {
        this.units[i] = unit
      })
      await this.player.refresh('present')
    })

    this.bus.on('seize', async ({ target, keep }) => {
      await this.post('obtain-unit', {
        card: this,
        unit: target.units.filter(isNormal),
      })
      await this.post('destroy-card', {
        player: this.player,
        destroy: target,
      })
      if (keep) {
        for (const u of target.upgrades) {
          await this.post('obtain-upgrade', {
            card: this,
            upgrade: getUpgrade(u),
          })
        }
      }
      await this.player.refresh('present')
    })

    this.bus.on('card-selled', async ({ selled }) => {
      if (selled.template.race === 'N') {
        await 获得N(
          this,
          '原始异龙',
          this.upgrades.filter(u => u === '原始尖塔').length
        )
      }
    })

    this.bus.on('post-sell', async () => {
      const n = this.count('虚空水晶塔')
      if (n === 0) {
        return
      }
      if (
        this.pos > 0 &&
        this.player.pres[this.pos - 1]?.template.race === 'P'
      ) {
        await 获得N(
          this.player.pres[this.pos - 1] as CardInstance,
          '虚空水晶塔',
          n
        )
      } else if (
        this.pos < 6 &&
        this.player.pres[this.pos + 1]?.template.race === 'P'
      ) {
        await 获得N(
          this.player.pres[this.pos + 1] as CardInstance,
          '虚空水晶塔',
          n
        )
      }
    })

    this.bus.on('switch-infr', async () => {
      if (
        this.template.race !== 'T' ||
        this.infr_type() === InfrType.HighTech
      ) {
        return
      }
      if (this.infr_type() === InfrType.Reactor) {
        this.set_infr(InfrType.SciLab)
      } else {
        this.set_infr(InfrType.Reactor)
      }
      await this.player.refresh('present')
    })

    this.bus.on('upgrade-infr', async () => {
      if (
        this.template.race !== 'T' ||
        this.infr_type() === InfrType.HighTech
      ) {
        return
      }
      this.set_infr(InfrType.HighTech)
      await this.player.refresh('present')
    })

    this.bus.on('round-end', async () => {
      if (
        this.template.race === 'T' &&
        this.infr_type() === InfrType.HighTech
      ) {
        await this.post('fast-prod', {
          card: this,
        })
      }
    })

    this.bus.on('incubate', async ({ unit }) => {
      await 相邻两侧(this, async c => {
        if (c.template.race === 'Z') {
          await this.post('incubate-into', {
            card: c,
            unit,
          })
        }
      })
      await this.player.refresh('present')
    })

    this.bus.on('incubate-into', async ({ unit }) => 获得(this, unit))

    this.bus.on('wrap-into', async ({ unit }) => 获得(this, unit))
  }

  sacrifice() {
    const high = 价值最高(this)
    if (!high) {
      this.flag.献祭 = this.flag.献祭 || 0
      return
    }
    let meet = false
    let sum = this.flag.献祭 || 0
    this.units.forEach(u => {
      if (u === high && !meet) {
        meet = true
        return
      }
      const uu = getUnit(u)
      sum += uu.health * 1.5
      if (uu.shield) {
        sum += uu.shield * 1.5
      }
    })
    this.units = [high]
    this.flag.献祭 = sum
  }

  value() {
    let sum = 0
    this.units.forEach(u => {
      sum += getUnit(u).value
    })
    return sum
  }

  async post<T extends string & keyof AllBus>(ev: T, param: AllBus[T]) {
    return this.player.game.bus.async_emit(ev, param)
  }

  async announce(m: string) {
    this.msg = m
    await this.player.refresh('present')
  }

  count(unit: UnitKey) {
    return this.units.filter(u => u === unit).length
  }

  counts(...units: UnitKey[]) {
    return this.units.filter(u => units.includes(u)).length
  }

  locate(unit: UnitKey) {
    return this.units.indexOf(unit)
  }

  locates(...unit: UnitKey[]) {
    return this.units.findIndex(u => unit.includes(u))
  }

  locateSome(cnt: number, unit: UnitKey) {
    if (cnt === -1) {
      cnt = this.units.length
    }
    return (this.units.map((u, i) => [u, i]) as [UnitKey, number][])
      .filter(u => u[0] === unit)
      .map(u => u[1])
      .slice(0, cnt)
  }

  locateSomes(cnt: number, ...units: UnitKey[]) {
    if (cnt === -1) {
      cnt = this.units.length
    }
    return (this.units.map((u, i) => [u, i]) as [UnitKey, number][])
      .filter(u => units.includes(u[0]))
      .map(u => u[1])
      .slice(0, cnt)
  }

  locateX(cnt: number, pred: (u: UnitKey) => boolean) {
    if (cnt === -1) {
      cnt = this.units.length
    }
    return (this.units.map((u, i) => [u, i]) as [UnitKey, number][])
      .filter(([u]) => pred(u))
      .map(u => u[1])
      .slice(0, cnt)
  }

  take(pos: number) {
    if (pos >= this.units.length || pos < 0) {
      return null
    }
    const u = this.units[pos]
    this.units[pos] = this.units.pop() as UnitKey
    return u
  }

  take_unit(unit: UnitKey) {
    return this.take(this.units.indexOf(unit))
  }

  take_units(unit: UnitKey, cnt: number) {
    while (cnt--) {
      this.take_unit(unit)
    }
  }

  infr_type(): InfrType {
    if (this.count('高级科技实验室') > 0) {
      return InfrType.HighTech
    } else if (this.count('反应堆') > 0) {
      return InfrType.Reactor
    } else if (this.count('科技实验室') > 0) {
      return InfrType.SciLab
    } else {
      return InfrType.None
    }
  }

  async set_infr(infr: InfrType.HighTech | InfrType.Reactor | InfrType.SciLab) {
    const oif = this.infr_type()
    if (oif === InfrType.HighTech || oif === InfrType.None) {
      return
    }
    if (oif === infr) {
      return
    }
    await this.post('replace-unit', {
      card: this,
      index: [this.locates('反应堆', '科技实验室')],
      unit:
        infr === InfrType.Reactor
          ? '反应堆'
          : infr === InfrType.SciLab
          ? '科技实验室'
          : '高级科技实验室',
    })
    await this.post('fast-prod', {
      card: this,
    })
  }

  power() {
    let p = this.counts('水晶塔', '虚空水晶塔')
    if (this.pos > 0 && this.player.pres[this.pos - 1]) {
      p += (this.player.pres[this.pos - 1] as CardInstance).counts(
        '水晶塔',
        '虚空水晶塔'
      )
    }
    if (this.pos < 6 && this.player.pres[this.pos + 1]) {
      p += (this.player.pres[this.pos + 1] as CardInstance).counts(
        '水晶塔',
        '虚空水晶塔'
      )
    }
    return p
  }
}
