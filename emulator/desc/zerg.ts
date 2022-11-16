import {
  isBiological,
  getCard,
  isNormal,
  isHero,
  getUnit,
  type UnitKey,
} from '../../data'
import { CardInstance } from '../card'
import type { Player } from '../player'
import type { Description } from '../types'
import { 获得, 相邻两侧, 摧毁, 获得N, 转换, $ } from '../utils'
import { 科挂 } from './terran'

function 虫卵牌描述(c: CardInstance) {
  return $()
    .for(c.player)
    .bind('inject', async ({ unit }) => {
      await 获得(c, unit)
    })
    .for(c)
    .bind('round-start', async () => {
      let k = 0
      await 相邻两侧(c, async card => {
        if (card.template.race === 'Z') {
          k++
        }
      })
      if (k === 2) {
        await 孵化(
          c,
          c.units.filter(u => isBiological(u))
        )
        await 摧毁(c)
        c.player.mine += 1
        await c.player.refresh('info')
      }
    })
}

async function 虫卵牌位(player: Player) {
  let idx = -1
  await player.enum_present(async c => {
    if (c.name === '虫卵') {
      idx = c.pos
      return true
    }
  })
  return idx
}

async function 注卵(card: CardInstance, unit: UnitKey[]) {
  if (unit.length === 0) {
    return
  }
  let idx = await 虫卵牌位(card.player)
  console.log(idx)
  if (idx === -1) {
    idx = card.player.pres.findIndex(c => !c)
    if (idx === -1) {
      return
    }
    const cc = new CardInstance(card.player, getCard('虫卵'))
    cc.gold = true
    cc.pos = idx
    cc.flag.derive = true
    cc.clear = 虫卵牌描述(cc).clear()
    card.player.pres[idx] = cc
  }
  await card.post('inject', {
    player: card.player,
    unit,
  })
}

async function 孵化(card: CardInstance, unit: UnitKey[]) {
  if (unit.length === 0) {
    return
  }
  await card.post('incubate', {
    card,
    unit,
  })
}

const Data: Description = {
  虫卵: 虫卵牌描述,
  虫群先锋: c =>
    $()
      .for(c)
      .bind('round-end', () => 获得N(c, '跳虫', c.gold ? 4 : 2)),
  蟑螂小队: c =>
    $()
      .for(c)
      .bind('round-start', () =>
        转换(c, c.locateSome(c.gold ? 2 : 1, '蟑螂'), '破坏者')
      )
      .bind('post-sell', () => 注卵(c, Array(c.gold ? 4 : 2).fill('蟑螂'))),
  屠猎者: c =>
    $()
      .for(c)
      .bind('round-end', () => 转换(c, c.locateSome(-1, '刺蛇'), '刺蛇(精英)'))
      .bind('upgraded', () =>
        获得(c, Array(c.gold ? 2 : 1).fill('刺蛇(精英)'))
      ),
  埋地刺蛇: c =>
    $()
      .for(c)
      .bind('post-sell', () => 注卵(c, Array(c.gold ? 6 : 3).fill('刺蛇'))),
  变异军团: c =>
    $()
      .for(c.player)
      .bind('inject', () => 获得N(c, '被感染的陆战队员', c.gold ? 2 : 1)),
  孵化蟑螂: c =>
    $()
      .for(c)
      .bind('round-end', () => 孵化(c, Array(c.gold ? 4 : 2).fill('蟑螂'))),
  爆虫滚滚: c =>
    $()
      .for(c)
      .bind('round-end', async () => {
        let count = c.counts('爆虫', '爆虫(精英)')
        await 孵化(
          c,
          Array(Math.floor(count / (c.gold ? 15 : 20))).fill('爆虫')
        )
      })
      .for(c.player)
      .bind('card-selled', async ({ selled: card }) => {
        if (c.player.flag.爆虫滚滚) {
          return
        }
        const unit: UnitKey[] = []
        card.units = card.units.filter(u => {
          if (u === '跳虫') {
            unit.push('爆虫')
            return false
          } else if (u === '跳虫(精英)') {
            unit.push('爆虫(精英)')
            return false
          } else {
            return true
          }
        })
        c.player.flag.爆虫滚滚 = 1
        await 获得(c, unit)
      })
      .bindAfter('card-selled', async () => {
        c.player.flag.爆虫滚滚 = 0
      }),
  飞龙骑脸: c =>
    $()
      .for(c)
      .bind('post-sell', () => 孵化(c, Array(c.gold ? 4 : 2).fill('异龙'))),
  凶残巨兽: c =>
    $()
      .for(c)
      .bind('post-sell', () => 注卵(c, Array(c.gold ? 2 : 1).fill('雷兽'))),
  注卵虫后: c =>
    $()
      .for(c)
      .bind('round-start', () =>
        注卵(c, [
          ...Array(c.gold ? 2 : 1).fill('蟑螂'),
          ...Array(c.gold ? 2 : 1).fill('刺蛇'),
        ])
      ),
  孵化所: c =>
    $()
      .for(c.player)
      .bind('incubate', async () => {
        c.player.flag.孵化所 = null
      })
      .bindBefore('incubate-into', async () => {
        if (c.player.flag.孵化所) {
          if (c.pos < c.player.flag.孵化所.pos) {
            c.player.flag.孵化所 = c
          }
        } else {
          c.player.flag.孵化所 = c
        }
      })
      .bindAfter('incubate-into', async ({ unit, card }) => {
        if (card !== c || c.player.flag.孵化所 !== c) {
          return
        }
        if (unit.length > 0) {
          await 获得N(c, unit[unit.length - 1], c.gold ? 3 : 2)
        }
      }),
  地底伏击: c =>
    $()
      .for(c)
      .bind('post-enter', () => 孵化(c, Array(c.gold ? 2 : 1).fill('潜伏者'))),
  孵化刺蛇: c =>
    $()
      .for(c)
      .bind('round-end', () =>
        孵化(c, Array(c.gold ? 2 : 1).fill('刺蛇(精英)'))
      ),
  感染深渊: c =>
    $()
      .for(c)
      .bind('round-end', async () => {
        let n = 0
        await c.player.enum_present(async card => {
          let nn = card.locateSome(c.gold ? 4 : 2, '陆战队员').length
          n += nn
          card.take_units('陆战队员', nn)
        })
        await 注卵(c, Array(n).fill('被感染的陆战队员'))
      })
      .bind('round-start', () =>
        c.player.enum_present(async card =>
          转换(
            card,
            card.locateSome(c.gold ? 2 : 1, '被感染的陆战队员'),
            '畸变体'
          )
        )
      ),
  腐化大龙: c =>
    $()
      .for(c)
      .bind('round-end', () =>
        转换(c, c.locateSome(c.gold ? 4 : 2, '腐化者'), '巢虫领主')
      )
      .bind('post-sell', () => 注卵(c, Array(c.gold ? 4 : 2).fill('巢虫领主'))),
  空中管制: c =>
    $()
      .for(c)
      .bind('post-enter', () => 孵化(c, Array(c.gold ? 6 : 3).fill('爆蚊')))
      .bind('round-end', () =>
        孵化(c, Array(c.gold ? 2 : 1).fill('异龙(精英)'))
      ),
  虫群大军: c =>
    $()
      .for(c)
      .bind('round-end', async () => {
        if (
          c.player.pres.filter(card => card?.template.race === 'Z').length >= 4
        ) {
          await 注卵(c, Array(c.gold ? 2 : 1).fill('雷兽'))
        }
      }),
  终极进化: c =>
    $()
      .for(c)
      .bind('post-enter', () =>
        相邻两侧(c, async card =>
          转换(
            card,
            card.locateSomes(c.gold ? 2 : 1, '蟑螂', '蟑螂(精英)'),
            '莽兽'
          )
        )
      ),
  凶猛巨兽: c =>
    $()
      .for(c)
      .bind('post-enter', () =>
        c.player.enum_present(async card => {
          if (card.template.race === 'Z') {
            await 获得N(card, '腐化者', c.gold ? 4 : 2)
          }
        })
      )
      .bind('round-end', () =>
        相邻两侧(c, async card => {
          if (card.template.race === 'Z') {
            await 获得N(card, '守卫', c.gold ? 4 : 2)
          }
        })
      ),
  扎加拉: c =>
    $()
      .for(c.player)
      .bind('incubate', async ({ unit }) => {
        if (!c.player.flag.扎加拉) {
          c.player.flag.扎加拉 = 1
          await c.post('incubate-into', {
            card: c,
            unit,
          })
          if (c.gold) {
            await 获得(c, ['巢虫领主'])
          }
        }
      })
      .bindAfter('incubate', async () => {
        c.player.flag.扎加拉 = 0
      }),
  斯托科夫: c =>
    $()
      .for(c)
      .bind('post-enter', async () => {
        if (!('斯托科夫' in c.player.glob)) {
          c.player.glob.斯托科夫 = 0
        }
      })
      .for(c.player)
      .bindBefore('card-entered', async ({ target }) => {
        if (target.template.level > 5 || target.template.race === 'Z') {
          return
        }
        c.player.flag.斯托科夫E = 0
        c.player.flag.斯托科夫 = 0
        c.player.glob.斯托科夫 = 1 - c.player.glob.斯托科夫
      })
      .bind('card-entered', async ({ target }) => {
        if (target.template.level > 5 || target.template.race === 'Z') {
          return
        }
        if (c.gold) {
          if (c.player.flag.斯托科夫) {
            return
          }
          c.player.flag.斯托科夫 = 1
          c.player.flag.斯托科夫C = c
        } else {
          if (c.player.glob.斯托科夫 === 0) {
            if (c.player.flag.斯托科夫) {
              return
            }
            c.player.flag.斯托科夫 = 1
            c.player.flag.斯托科夫C = c
          }
        }
      })
      .bindAfter('card-entered', async ({ target }) => {
        if (target.template.level > 5 || target.template.race === 'Z') {
          return
        }
        if (c.player.flag.斯托科夫E) {
          return
        }
        c.player.flag.斯托科夫E = 1
        if (c.player.flag.斯托科夫) {
          await 注卵(
            c.player.flag.斯托科夫C,
            target.units.filter(u => isNormal(u) && !isHero(u))
          )
        }
      }),
  守卫巢穴: c =>
    $()
      .for(c)
      .bind('round-end', async () => {
        await 注卵(c, Array(c.gold ? 2 : 1).fill('守卫'))
        await c.player.enum_present(async card =>
          转换(
            card,
            card.locateSomes(c.gold ? 2 : 1, '异龙', '异龙(精英)'),
            '守卫'
          )
        )
      }),
  生化危机: c =>
    $().apply(
      科挂(c, 2, () =>
        注卵(c, [
          ...Array(c.gold ? 2 : 1).fill('牛头人陆战队员'),
          ...Array(c.gold ? 4 : 2).fill('科技实验室'),
        ])
      )
    ),
  雷兽窟: c =>
    $()
      .for(c)
      .bind('round-start', () =>
        转换(c, c.locateSome(c.gold ? 2 : 1, '幼雷兽'), '雷兽')
      )
      .bind('round-end', () => 孵化(c, Array(c.gold ? 2 : 1).fill('幼雷兽'))),
  优质基因: c =>
    $()
      .for(c)
      .bind('round-end', async () => {
        const idx = await 虫卵牌位(c.player)
        if (idx === -1) {
          return
        }
        const egg = c.player.pres[idx] as CardInstance
        let v = 0
        let u: UnitKey | null = null
        egg.units.forEach(unit => {
          if (!isNormal(unit)) {
            return
          }
          if (!c.gold && isHero(unit)) {
            return
          }
          const uu = getUnit(unit)
          if (uu.value > v) {
            v = uu.value
            u = unit
          }
        })
        if (!u) {
          return
        }
        await c.player.enum_present(async card => {
          if (card.template.race === 'Z') {
            await 获得(card, [u as UnitKey])
          }
        })
        await 摧毁(egg)
      }),
  基因突变: c => {
    const f = () =>
      相邻两侧(c, async card => {
        if (card.template.race === 'Z') {
          const us = card.units
            .map((u, i) => ({
              idx: i,
              unit: u,
              value: getUnit(u).value,
              hero: isHero(u),
            }))
            .sort((a, b) => {
              if (a.value === b.value) {
                return a.idx - b.idx
              } else {
                return a.value - b.value
              }
            })
          let v = 0
          let u: string | null = null
          us.forEach(ui => {
            if (ui.hero) {
              return
            }
            if (ui.value > v) {
              v = ui.value
              u = ui.unit
            }
          })
          if (!u) {
            return
          }
          await 转换(
            card,
            us.slice(0, c.gold ? 2 : 1).map(ui => ui.idx),
            u
          )
        }
      })
    return $().for(c).bind('post-enter', f).bind('post-sell', f)
  },
  机械感染: c =>
    $()
      .for(c)
      .bind('round-start', async () => {
        if (c.counts('雷兽', '雷兽(精英)') >= 4) {
          c.clear()
          c.clear = $().clear()
        }
      })
      .bind('round-end', () => 孵化(c, ['被感染的女妖'])),
}

export default Data
