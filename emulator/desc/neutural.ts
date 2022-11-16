import {
  type UnitKey,
  canElite,
  isBiological,
  elited,
  isNormal,
  getUnit,
  type UpgradeKey,
  getUpgrade,
  isHero,
} from '../../data'
import type { Race } from '../../data/types'
import type { CardInstance } from '../card'
import type { Description } from '../types'
import {
  Binder,
  右侧,
  获得N,
  获得,
  shuffle,
  转换,
  左侧,
  相邻两侧,
  夺取,
  摧毁,
  $,
  价值最高,
} from '../utils'

function 黑暗容器S(
  card: CardInstance
): (param: { selled: CardInstance }) => Promise<void> {
  return async ({ selled }) => {
    if (selled.pos + 1 === card.pos || selled.pos - 1 === card.pos) {
      if (selled.template.level >= 1) {
        await card.post('gain-darkness', {
          card,
          darkness: selled.template.level >= 4 ? 2 : 1,
        })
      }
    }
  }
}

function 黑暗容器D(
  card: CardInstance
): (param: { destroy: CardInstance }) => Promise<void> {
  return async ({ destroy }) => {
    if (destroy.pos + 1 === card.pos || destroy.pos - 1 === card.pos) {
      if (destroy.template.level >= 1) {
        await card.post('gain-darkness', {
          card,
          darkness: destroy.template.level >= 4 ? 2 : 1,
        })
      }
    }
  }
}

function 黑暗容器(card: CardInstance) {
  return (binder: Binder) => {
    binder
      .for(card)
      .bind('post-enter', async () => {
        card.flag.黑暗值 = 0
        await card.announce(`黑暗值: 0`)
      })
      .bind('card-selled', 黑暗容器S(card))
      .bind('destroy-card', 黑暗容器D(card))
      .bind('gain-darkness', async ({ darkness }) => {
        card.flag.黑暗值 += darkness
        await card.announce(`黑暗值: ${card.flag.黑暗值}`)
      })
  }
}

function 供养(card: CardInstance, unit: UnitKey, essence: number) {
  return (binder: Binder) => {
    binder.for(card).bind('post-sell', async () => {
      await 右侧(card, async c => {
        const n = card.count('精华')
        await 获得N(c, unit, Math.floor(n / essence))
        if (c.template.attr?.origin) {
          await 获得N(c, '精华', n)
        }
      })
    })
  }
}

const Data: Description = {
  原始蟑螂: c => $().apply(供养(c, '原始蟑螂', 1)),
  不死队: c =>
    $()
      .apply(黑暗容器(c))
      .bind('gain-darkness', () => 获得N(c, '不死队', c.gold ? 2 : 1)),
  紧急部署: () => $(),
  原始刺蛇: c =>
    $()
      .apply(供养(c, '原始刺蛇', 1))
      .for(c)
      .bind('round-end', () =>
        获得(c, [
          ...Array(c.gold ? 2 : 1).fill('原始刺蛇'),
          ...Array(c.gold ? 4 : 2).fill('精华'),
        ])
      ),
  原始异龙: c =>
    $()
      .for(c.player)
      .bind('card-entered', async () => {
        await 右侧(c, cc => 获得N(cc, '精华', c.gold ? 2 : 1))
      })
      .bind('round-end', async () => {
        let n = 0
        c.player.enum_present(async card => {
          const cnt = card.count('精华')
          n += cnt
          card.take_units('精华', cnt)
        })
        await 获得N(c, '原始异龙', Math.floor(n / 2))
      }),
  虚空大军: c =>
    $()
      .for(c)
      .bind('round-end', async () => {
        const rs: {
          [r in Race]?: true
        } = {}
        await c.player.enum_present(async card => {
          rs[card.template.race] = true
        })
        let units: UnitKey[] = []
        if (rs.T) {
          units.push(...Array(c.gold ? 2 : 1).fill('歌利亚'))
        }
        if (rs.Z) {
          units.push(...Array(c.gold ? 2 : 1).fill('刺蛇'))
        }
        if (rs.P) {
          units.push(...Array(c.gold ? 2 : 1).fill('龙骑士'))
        }
        console.log(units)
        await 获得(c, units)
      }),
  鲜血猎手: c =>
    $()
      .apply(黑暗容器(c))
      .bind('gain-darkness', () => 获得N(c, '鲜血猎手', c.gold ? 2 : 1)),
  暴掠龙: c =>
    $()
      .for(c)
      .apply(供养(c, '暴掠龙', 2))
      .bind('round-end', () =>
        获得(c, [
          ...Array(c.gold ? 2 : 1).fill('暴掠龙'),
          ...Array(c.gold ? 4 : 2).fill('精华'),
        ])
      ),
  适者生存: c =>
    $()
      .for(c)
      .bind('round-end', async () => {
        const choice: {
          card: CardInstance
          index: number
        }[] = []
        await c.player.enum_present(async card => {
          card
            .locateX(-1, unit => canElite(unit) && isBiological(unit))
            .forEach(index => {
              choice.push({
                card,
                index,
              })
            })
        })
        for (const { card, index } of shuffle(choice).slice(
          0,
          c.gold ? 8 : 5
        )) {
          await 转换(card, [index], elited(card.units[index]))
        }
      }),
  毁灭者: c =>
    $()
      .apply(黑暗容器(c))
      .bind('post-sell', async () => {
        await 左侧(c, async card =>
          获得N(card, '毁灭者', Math.min(c.flag.黑暗值, c.gold ? 30 : 10))
        )
      }),
  原始点火虫: c =>
    $()
      .for(c)
      .bind('round-end', () =>
        获得N(
          c,
          '原始点火虫',
          Math.max(0, 2 * Math.min(10, c.count('精华')) - c.count('原始点火虫'))
        )
      ),
  原始雷兽: c =>
    $()
      .apply(供养(c, '原始暴龙兽', 4))
      .for(c)
      .bind('round-end', async () => {
        await 获得N(c, '原始雷兽', c.gold ? 2 : 1)
        let n = 0
        await c.player.enum_present(async card => {
          if (card.template.race === 'N') {
            n++
          }
        })
        await 获得N(c, '精华', n)
      }),
  马拉什: c =>
    $()
      .for(c)
      .bind('round-end', () =>
        相邻两侧(c, async card => {
          card.flag.void = true
        })
      ),
  黑暗预兆: c =>
    $()
      .for(c)
      .bind('round-end', async () => {
        const rs: {
          [r in Race]?: true
        } = {}
        await c.player.enum_present(async card => {
          rs[card.template.race] = true
        })
        if (rs.T && rs.P && rs.Z && rs.N) {
          await 获得N(c, '混合体毁灭者', c.gold ? 4 : 2)
        }
      }),
  阿拉纳克: c =>
    $()
      .for(c)
      .bind('post-enter', async () => {
        const cs: CardInstance[] = []
        await c.player.enum_present(async card => {
          if (card !== c) {
            cs.push(card)
          }
        })
        shuffle(cs)
        for (const card of cs.slice(0, 2)) {
          await 夺取(c, card, true, true)
        }
      }),
  天罚行者: c =>
    $()
      .apply(黑暗容器(c))
      .bind('post-enter', async () => {
        let n = 0
        await c.player.enum_present(async card => {
          if (card.flag.黑暗值 && card.template.level <= 4) {
            n += card.flag.黑暗值
            card.flag.黑暗值 = 0
            await card.announce('黑暗值: 0')
          }
        })
        await c.post('gain-darkness', {
          card: c,
          darkness: n,
        })
        await 获得N(c, '天罚行者', Math.floor(n / 5))
      })
      .bind('round-end', () =>
        获得N(
          c,
          '天罚行者',
          (c.gold ? 2 : 1) * Math.min(2, Math.floor(c.flag.黑暗值 / 10))
        )
      ),
  德哈卡: c =>
    $()
      .for(c)
      .bind('round-start', async () => {
        if (c.player.glob.德哈卡) {
          c.player.glob.德哈卡 = 0
          await c.post('discover', {
            player: c.player,
            item: c.player.game.pool.discover(c => {
              return c.level < 5 && !!c.attr?.origin
            }, 3),
          })
        }
      })
      .bind('card-selled', async ({ selled }) => {
        if (selled.count('精华') >= 3) {
          await 获得N(c, '德哈卡分身', c.gold ? 4 : 2)
        }
      })
      .bind('round-end', async () => {
        if (c.player.mine >= 1) {
          c.player.glob.德哈卡 = 1
        }
      }),
  我叫小明: c =>
    $()
      .for(c)
      .bind('post-enter', () =>
        左侧(c, async card => {
          if (card.template.pool) {
            await c.post('obtain-card', {
              player: c.player,
              cardt: card.template,
            })
          }
        })
      )
      .bind('post-sell', () =>
        左侧(c, async card => {
          await c.post('obtain-upgrade', {
            card,
            upgrade: getUpgrade('星空加速'),
          })
        })
      ),
  豆浆油条KT1: c =>
    $()
      .for(c)
      .bind('post-enter', async () => {
        await c.post('obtain-upgrade', {
          card: c,
          upgrade: null,
        })
        await 相邻两侧(c, async card => {
          await c.post('obtain-upgrade', {
            card,
            upgrade: null,
          })
        })
      }),
  豆浆油条: c =>
    $()
      .for(c)
      .bind('round-end', async () => {
        await c.player.enum_present(async card => {
          if (card.pos > c.pos) {
            card.flag.void = true
          }
        })
        await c.player.refresh('present')
      }),
  战斗号角: c =>
    $()
      .for(c.player)
      .bind('card-selled', async ({ selled }) => {
        if (selled.template.level >= 6) {
          return
        }
        const u = 价值最高(selled)
        if (!u) {
          return
        }
        await 获得(c, [u])
      }),
  凯瑞甘: c =>
    $()
      .for(c)
      .bind('post-enter', () =>
        相邻两侧(c, async card => {
          if (!c.flag.凯瑞甘 && card.name === '凯瑞甘') {
            c.flag.凯瑞甘 = 1
            card.flag.deriveCount = 2
            await c.post('switch-desc', {
              card,
              desc: '刀锋女王',
            })
            await 摧毁(c)
          }
        })
      )
      .bindAfter('post-enter', async () => {
        if (!c.flag.凯瑞甘) {
          await 左侧(c, async card => {
            await 夺取(c, card, false)
          })
          await c.post('obtain-upgrade', {
            card: c,
            upgrade: getUpgrade('献祭'),
          })
        }
      }),
  刀锋女王: c =>
    $()
      .for(c)
      .bind('post-enter', async () => {
        await 转换(c, [c.locate('莎拉·凯瑞甘')], '刀锋女王')
      }),
  死亡舰队: c =>
    $()
      .apply(黑暗容器(c))
      .bind('gain-darkness', () => 获得N(c, '毁灭者', c.gold ? 2 : 1)),
  虚空裂痕: c =>
    $()
      .apply(黑暗容器(c))
      .bind('gain-darkness', () => 获得N(c, '百夫长', c.gold ? 2 : 1))
      .bind('round-end', async () => {
        if (c.player.mine >= 1) {
          await 获得N(c, '百夫长', c.gold ? 4 : 2)
        }
      }),
  死亡之翼: c =>
    $()
      .for(c.player)
      .bindBefore('seize', async ({ card, target, real }) => {
        if (!real || target !== c) {
          return
        }
        await 获得N(c, '天霸', c.gold ? 2 : 1)
      })
      .bind('card-combined', async ({ target }) => {
        if (target === c) {
          return
        }
        await 夺取(target, c)
      }),
  虚空援军: c =>
    $()
      .for(c)
      .bind('post-enter', async () => {
        if (c.player.gas > 0) {
          c.player.gas -= 1
          await c.player.refresh('info')
          await c.post('obtain-upgrade', {
            card: c,
            upgrade: null,
          })
        }
      })
      .bind('round-end', async () => {
        let maxi = 0
        let exp: CardInstance | null = null
        await c.player.enum_present(async card => {
          if (card.value() > maxi) {
            maxi = card.value()
            exp = card
          }
        })
        if (c === exp || !exp) {
          return
        }
        await 夺取(exp, c, true, true)
      }),
  深渊行者: c =>
    $()
      .apply(黑暗容器(c))
      .for(c.player)
      .bind('seize', async ({ real }) => {
        if (real) {
          await 获得N(c, '先锋', c.gold ? 2 : 1)
        }
      }),
  黑暗祭坛: c =>
    $()
      .apply(黑暗容器(c))
      .bind('gain-darkness', () => 获得N(c, '凤凰', c.gold ? 2 : 1))
      .bind('round-end', async () => {
        let mini = 9999999
        let exp: CardInstance | null = null
        await c.player.enum_present(async card => {
          if (card.value() < mini) {
            mini = card.value()
            exp = card
          }
        })
        if (c === exp || !exp) {
          return
        }
        await 夺取(c, exp)
      }),
  混合体巨兽: c =>
    $()
      .for(c)
      .bind('round-end', async () => {
        const rs: {
          [r in Race]?: true
        } = {}
        await c.player.enum_present(async card => {
          rs[card.template.race] = true
        })
        if (rs.T && rs.P && rs.Z && rs.N) {
          await 获得N(c, '混合体巨兽', c.gold ? 2 : 1)
        }
      }),
  埃蒙仆从: c =>
    $()
      .for(c)
      .bind('round-end', async () => {
        const zi = c.player.pres.findIndex(ci => ci?.template.race === 'Z')
        const pi = c.player.pres.findIndex(ci => ci?.template.race === 'P')
        if (zi !== -1 && pi !== -1) {
          await 摧毁(c.player.pres[zi] as CardInstance)
          await 摧毁(c.player.pres[pi] as CardInstance)
          await c.player.enum_present(async card => {
            if (card.flag.void) {
              await 获得N(card, '混合体毁灭者', c.gold ? 3 : 2)
            }
          })
        }
      }),
  风暴英雄: c =>
    $()
      .for(c)
      .bind('obtain-upgrade', () =>
        获得(c, [
          shuffle<UnitKey>([
            '马拉什',
            '阿拉纳克',
            '利维坦',
            '虚空构造体',
            '科罗拉里昂',
          ])[0],
        ])
      ),
  死亡之握: c =>
    $()
      .for(c)
      .bind('round-end', async () => {
        if (c.player.flag.死亡之握) {
          return
        }
        c.player.flag.死亡之握 = 1
        for (const ct of c.player.store) {
          if (!ct) {
            return
          }
          const us = ct.unit
          const r: UnitKey[] = []
          for (const k in us) {
            const unit = k as UnitKey
            if (!isNormal(unit) || isHero(unit)) {
              continue
            }
            r.push(...Array(us[unit]).fill(unit))
          }
          await 获得(c, shuffle(r).slice(0, c.gold ? 2 : 1))
        }
      })
      .bind('refresh', async () => {
        if (c.player.flag.死亡之握) {
          return
        }
        c.player.flag.死亡之握 = 1
        await 获得(
          c,
          shuffle(c.units.filter(isNormal).filter(u => !isHero(u))).slice(
            0,
            c.gold ? 2 : 1
          )
        )
      })
      .for(c.player)
      .bind('round-end', async () => {
        delete c.player.flag.死亡之握
      })
      .bind('refresh', async () => {
        delete c.player.flag.死亡之握
      }),
  黄金矿工: c =>
    $()
      .for(c)
      .bind('post-enter', async () => {
        c.gold = true
      })
      .bind('post-sell', async () => {
        c.player.mine += 2
      })
      .for(c.player)
      .bind('round-start', async () => {
        c.player.mine += 1
        await c.player.refresh('info')
      }),
}

export default Data
