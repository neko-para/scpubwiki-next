import {
  elited,
  isBiological,
  isHero,
  isNormal,
  type UnitKey,
} from '../../data'
import type { CardInstance } from '../card'
import { type Description, InfrType } from '../types'
import { $, Binder, shuffle, 左侧, 相邻两侧, 获得, 获得N, 转换 } from '../utils'

function 任务(
  card: CardInstance,
  count: number,
  result: () => Promise<void>,
  check?: (...args: any) => boolean,
  renew?: (f: () => Promise<void>) => void
) {
  let n = 0
  if (renew) {
    renew(async () => {
      n = 0
      await card.announce(`任务: 0 / ${count}`)
    })
  }
  return async (...arg: any) => {
    if (n < count && (!check || check(...arg))) {
      n += 1
      await card.announce(`任务: ${n} / ${count}`)
      if (n === count) {
        await result()
        await card.post('task-done', {
          card,
        })
      }
    }
  }
}

function 改挂件(card: CardInstance) {
  return (binder: Binder) => {
    binder.for(card).bind('post-enter', () =>
      相邻两侧(card, async card => {
        if (card.template.race === 'T') {
          await card.post('switch-infr', {
            card,
          })
        }
      })
    )
  }
}

function 快产(card: CardInstance, result: () => Promise<void>) {
  return (binder: Binder) => {
    binder.for(card).bind('fast-prod', result)
  }
}

function 反应堆(card: CardInstance, unit: UnitKey) {
  return (binder: Binder) => {
    binder.for(card).bind('round-end', async () => {
      if (card.infr_type() === InfrType.Reactor) {
        await 获得N(card, unit, card.gold ? 2 : 1)
      }
    })
  }
}

export function 科挂(
  card: CardInstance,
  count: number,
  result: () => Promise<void>
) {
  return (binder: Binder) => {
    binder.for(card).bind('round-end', async () =>
      card.player.enum_present(async c => {
        count -= c.counts('科技实验室', '高级科技实验室')
        if (--count <= 0) {
          await result()
          return true
        }
      })
    )
  }
}

const Data: Description = {
  死神火车: c =>
    $()
      .for(c)
      .bind('post-enter', async () => {
        if (c.gold) {
          c.announce(`任务: 0 / 2`)
        }
      })
      .for(c.player)
      .bind(
        'card-entered',
        任务(c, 2, async () => {
          c.player.mine += c.gold ? 2 : 1
          await c.player.refresh('info')
        })
      ),
  好兄弟: c =>
    $().apply(
      快产(c, () => 获得N(c, '陆战队员', c.gold ? 6 : 4)),
      反应堆(c, '陆战队员')
    ),
  挖宝奇兵: c =>
    $()
      .for(c)
      .bind('post-enter', () => c.announce(`任务: 0 / 5`))
      .for(c.player)
      .bind(
        'refresh',
        任务(c, 5, async () => {
          await c.post('discover', {
            player: c.player,
            item: c.player.game.pool.discover(
              card => {
                return card.level === c.player.level
              },
              3,
              true
            ),
          })
        })
      ),
  实验室安保: c => $().apply(反应堆(c, '陆战队员'), 改挂件(c)),
  征兵令: c =>
    $()
      .for(c)
      .bind('post-enter', () =>
        相邻两侧(c, async card => {
          const taked: UnitKey[] = []
          card.units.forEach((unit, index) => {
            if (index % 3 === 0) {
              return
            }
            if (!isNormal(unit)) {
              return
            }
            taked.push(unit)
          })
          taked.forEach(unit => {
            card.take_unit(unit)
          })
          await 获得(c, taked)
        })
      ),
  恶火小队: c =>
    $()
      .for(c)
      .apply(
        反应堆(c, '恶火'),
        科挂(c, 2, () => 获得N(c, '歌利亚', c.gold ? 2 : 1)),
        快产(c, () => 获得N(c, '攻城坦克', 1))
      ),
  空投地雷: c =>
    $()
      .for(c.player)
      .bind('card-entered', () => 获得N(c, '寡妇雷', c.gold ? 2 : 1))
      .apply(快产(c, () => 获得N(c, '寡妇雷', c.gold ? 3 : 2))),
  步兵连队: c =>
    $()
      .for(c)
      .apply(
        快产(c, () => 获得N(c, '劫掠者', c.gold ? 5 : 3)),
        反应堆(c, '劫掠者')
      ),
  飙车流: c =>
    $()
      .for(c)
      .bind('post-enter', async () => {
        if (c.gold) {
          c.announce(`任务: 0 / 3`)
        }
      })
      .apply(快产(c, () => 获得N(c, '秃鹫', c.gold ? 5 : 3)))
      .for(c.player)
      .bind(
        'card-entered',
        任务(
          c,
          3,
          async () => {
            await 左侧(c, async card => {
              if (card.template.race === 'T') {
                await c.post('upgrade-infr', {
                  card,
                })
              }
            })
          },
          ({ target }) => {
            return target.template.race === 'T'
          }
        )
      ),
  科考小队: c => {
    let rn = async () => {}
    return $()
      .for(c)
      .bind('post-enter', () => c.announce(`任务: 0 / 2`))
      .bind('post-enter', () =>
        相邻两侧(c, async card => {
          if (card.template.race === 'T') {
            await c.post('switch-infr', {
              card,
            })
          }
        })
      )
      .for(c.player)
      .bind(
        'refresh',
        任务(
          c,
          2,
          () => 获得N(c, '歌利亚', c.gold ? 2 : 1),
          () => true,
          renew => {
            rn = renew
          }
        )
      )
      .for(c)
      .bind('round-end', rn)
  },
  陆军学院: c =>
    $()
      .for(c)
      .apply(
        快产(c, () => 获得N(c, '维京战机', c.gold ? 5 : 3)),
        科挂(c, 3, () => 获得N(c, '战狼', c.gold ? 2 : 1))
      ),
  空军学院: c =>
    $()
      .for(c)
      .apply(快产(c, () => 获得N(c, '维京战机', c.gold ? 5 : 3)))
      .for(c.player)
      .bind('task-done', () => 获得N(c, '解放者', c.gold ? 2 : 1)),
  交叉火力: c =>
    $()
      .for(c)
      .apply(
        快产(c, () => 获得N(c, '歌利亚', c.gold ? 5 : 3)),
        科挂(c, 4, () => 获得N(c, '攻城坦克', c.gold ? 2 : 1))
      ),
  枪兵坦克: c =>
    $()
      .for(c)
      .bind('round-end', () =>
        c.player.enum_present(async card => {
          if (card.infr_type() === 0) {
            await 获得N(card, '陆战队员', c.gold ? 4 : 2)
          }
        })
      ),
  斯台特曼: c =>
    $()
      .for(c)
      .apply(
        快产(c, () =>
          相邻两侧(c, async card => {
            const us: UnitKey[] = ['歌利亚', '维京战机']
            for (const u of us) {
              await 转换(card, card.locateSome(c.gold ? 2 : 1, u), elited(u))
            }
          })
        )
      )
      .bind('post-enter', async () => {
        await 左侧(c, async card => {
          if (card.template.race === 'T') {
            await c.post('upgrade-infr', {
              card,
            })
          }
        })
      }),
  护航中队: c =>
    $()
      .for(c)
      .apply(快产(c, () => 获得N(c, '黄昏之翼', c.gold ? 2 : 1)))
      .for(c.player)
      .bind('card-entered', () => 获得N(c, '怨灵战机', c.gold ? 2 : 1)),
  泰凯斯: c =>
    $()
      .for(c)
      .apply(反应堆(c, '陆战队员(精英)'))
      .bind('round-end', () =>
        c.player.enum_present(async card => {
          if (card.template.race === 'T') {
            const us: UnitKey[] = ['陆战队员', '劫掠者']
            for (const u of us) {
              await 转换(card, card.locateSome(c.gold ? 5 : 3, u), elited(u))
            }
          }
        })
      )
      .bind('round-end', () => 获得N(c, '医疗运输机', c.gold ? 2 : 1)),
  外籍军团: c =>
    $()
      .for(c)
      .apply(反应堆(c, '牛头人陆战队员'))
      .bind('post-enter', () =>
        相邻两侧(c, async card => {
          let nPro = 0,
            nNor = 0
          card.units.forEach(u => {
            if (u === '陆战队员') {
              nNor++
            } else if (u === '陆战队员(精英)') {
              nPro++
            }
          })
          const nProRest = nPro % 3
          let nProTran = nPro - nProRest,
            nNorTran = 0
          let cnt = nProTran / 3
          if (6 - nProRest * 2 <= nNor) {
            nNorTran += 6 - nProRest * 2
            nNor -= 6 - nProRest * 2
            nProTran += nProRest
            cnt++
          }
          const nNorRest = nNor % 6
          cnt += (nNor - nNorRest) / 6
          nNorTran += nNor - nNorRest
          card.take_units('陆战队员(精英)', nProTran)
          card.take_units('陆战队员', nNorTran)
          await 获得N(card, '牛头人陆战队员', cnt)
        })
      ),
  钢铁洪流: c =>
    $()
      .for(c)
      .apply(
        快产(c, () => 获得N(c, '雷神', c.gold ? 2 : 1)),
        科挂(c, 5, () =>
          c.player.enum_present(async card => {
            const us: UnitKey[] = ['攻城坦克', '战狼']
            for (const u of us) {
              await 转换(card, card.locateSome(c.gold ? 2 : 1, u), elited(u))
            }
          })
        )
      ),
  游骑兵: c =>
    $()
      .for(c.player)
      .bind(
        'switch-infr',
        async ({ card }) => await 获得N(card, '雷诺(狙击手)', c.gold ? 2 : 1)
      )
      .bind(
        'upgrade-infr',
        async ({ card }) => await 获得N(card, '雷诺(狙击手)', c.gold ? 2 : 1)
      )
      .apply(反应堆(c, '雷诺(狙击手)')),
  沃菲尔德: c =>
    $()
      .for(c.player)
      .bind('card-selled', async ({ selled: card }) => {
        c.player.flag.沃菲尔德 = c.player.flag.沃菲尔德 || 0
        if (card.template.race === 'T') {
          if (c.player.flag.沃菲尔德 < (c.gold ? 2 : 1)) {
            c.player.flag.沃菲尔德 += 1
            const unit: UnitKey[] = []
            card.units = card.units.filter(u => {
              if (!isNormal(u)) {
                return true
              } else {
                unit.push(u)
                return false
              }
            })
            await 获得(c, unit)
          }
        }
      })
      .for(c)
      .bind('round-end', () =>
        c.player.enum_present(async card =>
          转换(
            card,
            card.locateSome(c.gold ? 2 : 1, '陆战队员(精英)'),
            '帝盾卫兵'
          )
        )
      ),
  帝国舰队: c => {
    let rn = async () => {}
    return $()
      .for(c)
      .bind('post-enter', () => c.announce(`任务: 0 / 3`))
      .for(c.player)
      .bind(
        'sell-card',
        任务(
          c,
          3,
          async () => {
            await 获得N(c, '战列巡航舰', c.gold ? 2 : 1)
            await rn()
          },
          () => true,
          renew => {
            rn = renew
          }
        )
      )
      .apply(科挂(c, 4, () => 获得N(c, '黄昏之翼', c.gold ? 4 : 2)))
  },
  黄昏之翼: c =>
    $()
      .for(c)
      .apply(
        快产(c, () => 获得N(c, '黄昏之翼', c.gold ? 2 : 1)),
        反应堆(c, '女妖')
      ),
  艾尔游骑兵: c =>
    $()
      .apply(
        快产(c, () =>
          左侧(c, async card => 获得N(card, '水晶塔', c.gold ? 2 : 1))
        )
      )
      .for(c)
      .bind('round-end', async () => {
        let n = 0
        await 相邻两侧(c, async card => {
          const idx = card.units.indexOf('水晶塔')
          if (idx !== -1) {
            card.take(idx)
            n += c.gold ? 8 : 4
          }
        })
        await 获得N(c, '陆战队员', n)
      }),
  帝国敢死队: c =>
    $()
      .apply(
        快产(c, () => 获得N(c, '诺娃', 2)),
        反应堆(c, '诺娃')
      )
      .for(c.player)
      .bind('task-done', () => 获得N(c, '诺娃', c.gold ? 2 : 1)),
  以火治火: c =>
    $()
      .for(c)
      .bind('round-end', () =>
        c.player.enum_present(async card => {
          if (card.infr_type() === 0) {
            await 获得N(card, '火蝠', c.gold ? 2 : 1)
          }
        })
      )
      .apply(
        快产(c, () =>
          c.player.enum_present(async card => {
            if (card.template.race === 'T') {
              await 转换(
                card,
                card.locateSome(c.gold ? 3 : 2, '火蝠'),
                '火蝠(精英)'
              )
            }
          })
        )
      ),
  复制中心: c =>
    $()
      .for(c)
      .apply(
        快产(c, async () => {
          for (const card of c.player.hand) {
            if (!card) {
              continue
            }
            const us = card.unit
            const r: UnitKey[] = []
            for (const k in us) {
              const unit = k as UnitKey
              if (!isNormal(unit) || isHero(unit) || !isBiological(unit)) {
                continue
              }
              r.push(...Array(us[unit]).fill(unit))
            }
            const n = c.gold ? 2 : 1
            await 获得(c, shuffle(r).slice(0, n))
          }
        })
      ),
  黑色行动: c =>
    $()
      .apply(
        快产(c, () => 获得N(c, '恶蝠游骑兵', c.gold ? 2 : 1)),
        反应堆(c, '修理无人机')
      )
      .for(c)
      .bind('round-end', async () => {
        await 转换(c, c.locateSome(-1, '陆战队员'), '陆战队员(精英)')
      }),
}

export default Data
