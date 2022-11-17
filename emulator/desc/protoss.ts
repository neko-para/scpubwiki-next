import {
  isBiological,
  isHero,
  canElite,
  isHeavy,
  elited,
  isNormal,
  getUpgrade,
  type UnitKey,
} from '../../data'
import type { CardInstance } from '../card'
import type { Description } from '../types'
import { Binder, 获得N, 相邻两侧, 获得, 转换, $ } from '../utils'

async function 折跃(card: CardInstance, unit: UnitKey[]) {
  await card.post('wrap', {
    player: card.player,
    unit,
    info: {
      to: null,
    },
  })
}

async function 集结部队(card: CardInstance, id: number) {
  await card.post('regroup', {
    card,
    id,
  })
}

function 集结(card: CardInstance, power: number, id: number) {
  return (binder: Binder) => {
    binder.for(card).bind('round-end', async () => {
      let n = 0
      if (card.power() >= power * 2) {
        n++
      }
      if (card.power() >= power) {
        n++
      }
      if (card.player.flag.阿塔尼斯) {
        n++
      }
      while (n--) {
        await 集结部队(card, id)
      }
    })
  }
}

const Data: Description = {
  折跃援军: c =>
    $()
      .for(c)
      .bind('post-sell', () =>
        折跃(c, [
          ...Array(c.gold ? 2 : 1).fill('狂热者'),
          ...Array(c.gold ? 4 : 2).fill('追猎者'),
        ])
      ),
  发电站: () => $(),
  供能中心: c =>
    $()
      .for(c.player)
      .bind('upgraded', () => 获得N(c, '水晶塔', c.gold ? 2 : 1)),
  龙骑兵团: c =>
    $()
      .for(c)
      .bind('round-end', () => 获得N(c, '零件', c.gold ? 4 : 2))
      .bind('post-sell', () => 折跃(c, Array(c.count('零件')).fill('龙骑士'))),
  万叉奔腾: c =>
    $()
      .for(c)
      .apply(集结(c, 2, 0))
      .bind('regroup', () => 获得N(c, '狂热者', c.gold ? 2 : 1)),
  折跃信标: c =>
    $()
      .for(c)
      .bind('wrap', async ({ info }) => {
        // 消息下传时天然按照顺序, 因此不用额外判断
        if (info.to === null) {
          info.to = c
        }
      }),
  艾尔之刃: c =>
    $()
      .for(c)
      .bind('post-enter', () =>
        相邻两侧(c, async card => {
          if (card.template.race === 'P') {
            await 获得N(card, '水晶塔', c.gold ? 2 : 1)
          }
        })
      ),
  折跃部署: c =>
    $()
      .for(c)
      .bind('round-end', () => 折跃(c, Array(c.gold ? 3 : 2).fill('追猎者')))
      .bind('round-start', () => 折跃(c, Array(c.gold ? 2 : 1).fill('狂热者'))),
  暗影卫队: c =>
    $()
      .for(c)
      .bind('post-enter', () =>
        c.post('obtain-upgrade', {
          card: c,
          upgrade: getUpgrade('暗影战士'),
        })
      )
      .apply(集结(c, 3, 0))
      .bind('regroup', () => 获得N(c, '黑暗圣堂武士', c.gold ? 2 : 1))
      .bind('round-end', async () => {
        if (c.power() >= 6) {
          await 获得(c, ['黑暗圣堂武士'])
        }
      }),
  重回战场: c =>
    $()
      .for(c)
      .bind('post-enter', () =>
        c.player.enum_present(async card => {
          if (card.template.race === 'P') {
            const idx = card.locateX(c.gold ? 2 : 1, unit => isBiological(unit))
            for (const i of idx) {
              await 转换(
                card,
                [i],
                isHero(card.units[i]) ? '英雄不朽者' : '不朽者'
              )
            }
          }
        })
      )
      .bind('post-sell', () => 折跃(c, Array(c.gold ? 2 : 1).fill('不朽者'))),
  折跃攻势: c =>
    $()
      .for(c)
      .bind('wrap', () => 获得N(c, '追猎者', c.gold ? 2 : 1)),
  净化者军团: c =>
    $()
      .for(c)
      .apply(集结(c, 5, 0))
      .bind('regroup', async () => {
        const unit: UnitKey[] = []
        await c.player.enum_present(async card => {
          if (card.template.race === 'P') {
            const us = card
              .locateX(-1, unit => canElite(unit) && !isHeavy(unit))
              .map(i => card.units[i])
            c.player.shuffle(us)
            us.slice(0, c.gold ? 2 : 1).forEach(u => {
              unit.push(elited(card.take_unit(u) as UnitKey))
            })
          }
        })
        await 折跃(c, unit)
      }),
  凯拉克斯: c =>
    $()
      .for(c)
      .bind('round-end', () =>
        折跃(
          c,
          Array(c.gold ? 2 : 1).fill(
            c.player.shuffle(['不朽者', '巨像', '掠夺者'])[0]
          )
        )
      ),
  虚空舰队: c =>
    $()
      .for(c)
      .apply(集结(c, 5, 0))
      .bind('regroup', () => 折跃(c, Array(c.gold ? 2 : 1).fill('虚空辉光舰'))),
  势不可挡: c =>
    $()
      .for(c)
      .bind('post-enter', () => 折跃(c, ['执政官(精英)']))
      .apply(集结(c, 5, 0))
      .bind('regroup', () => 折跃(c, Array(c.gold ? 2 : 1).fill('执政官')))
      .bind('round-end', async () => {
        if (c.power() >= 15) {
          await 折跃(c, ['执政官(精英)'])
        }
      }),
  黄金舰队: c =>
    $()
      .for(c)
      .apply(集结(c, 5, 0))
      .apply(集结(c, 7, 1))
      .bind('regroup', async ({ id }) => {
        if (id === 0) {
          await 获得(c, Array(c.gold ? 2 : 1).fill('侦察机'))
        } else if (id === 1) {
          await 获得(c, Array(c.gold ? 2 : 1).fill('风暴战舰'))
        }
      })
      .bind('regroup-count', async ({ info }) => {
        info.count = 2
      }),
  莫汗达尔: c =>
    $()
      .for(c)
      .bind('wrap', async ({ unit }) => {
        if (!c.player.flag.莫汗达尔) {
          c.player.flag.莫汗达尔 = 1
          await 获得(c, unit.slice(unit.length - (c.gold ? 2 : 1)))
        }
      })
      .for(c.player)
      .bindAfter('wrap', async () => {
        delete c.player.flag.莫汗达尔
      }),
  光复艾尔: c =>
    $()
      .for(c)
      .bind('post-enter', () => c.announce('已展开'))
      .bind('obtain-upgrade', async () => {
        c.flag.已收起 = 0
        await c.announce('已展开')
      })
      .bind('card-selled', async ({ selled: card }) => {
        if (card === c || c.flag.已收起 || c.player.flag.光复艾尔) {
          return
        }
        if (card.template.race === 'P') {
          const unit: UnitKey[] = []
          card.units = card.units.filter(u => {
            if (!isNormal(u) && u !== '水晶塔') {
              return true
            } else if (c.gold || !isHero(u)) {
              unit.push(u)
            }
          })
          c.flag.已收起 = 1
          await c.announce('已收起')
          c.player.flag.光复艾尔 = 1
          await 获得(c, unit)
        }
      })
      .for(c.player)
      .bindAfter('card-selled', async () => {
        c.player.flag.光复艾尔 = 0
      }),
  菲尼克斯: c =>
    $()
      .for(c)
      .bind('post-enter', () =>
        相邻两侧(c, async card => {
          await 转换(card, card.locateSome(-1, '狂热者'), '旋风狂热者')
          await 转换(card, card.locateSome(-1, '使徒'), '旋风狂热者')
          await 转换(
            card,
            card.locateSome(-1, '狂热者(精英)'),
            '旋风狂热者(精英)'
          )
          await 转换(
            card,
            card.locateSome(-1, '使徒(精英)'),
            '旋风狂热者(精英)'
          )
        })
      )
      .apply(集结(c, 5, 0))
      .bind('regroup', () => 获得N(c, '掠夺者', c.gold ? 2 : 1)),
  酒馆后勤处: c =>
    $()
      .for(c)
      .bind('post-enter', async () => {
        await c.player.enum_present(async card => {
          const info = {
            count: 1,
          }
          await c.post('regroup-count', { card, info })
          for (let i = 0; i < info.count; i++) {
            await 集结部队(card, i)
            await 集结部队(card, i)
          }
        })
      }),
  净化一切: c =>
    $()
      .for(c)
      .apply(集结(c, 4, 0))
      .bind('regroup', () =>
        折跃(c, Array(c.gold ? 2 : 1).fill('狂热者(精英)'))
      )
      .bind('round-end', async () => {
        if (c.power() >= 7) {
          await 折跃(c, Array(c.gold ? 2 : 1).fill('巨像(精英)'))
        }
      }),
  阿尔达瑞斯: c =>
    $()
      .for(c)
      .bind('round-end', async () => {
        if (c.player.flag.阿尔达瑞斯) {
          return
        }
        if (
          c.player.pres.filter(card => card?.template.race === 'P').length >= 5
        ) {
          c.player.flag.阿尔达瑞斯 = 1
          await 获得(c, Array(c.gold ? 2 : 1).fill('英雄不朽者'))
        }
      }),
  阿塔尼斯: c =>
    $()
      .for(c)
      .bind('round-end', async () => {
        await 获得N(c, '旋风狂热者(精英)', 2)
        if (c.gold) {
          await 获得N(c, '阿塔尼斯', 2)
        }
      })
      .for(c.player)
      .bind('round-end', async () => {
        c.player.flag.阿塔尼斯 = 1
      }),
  净化之光: c =>
    $()
      .for(c)
      .bind('round-end', () => 获得N(c, '虚空辉光舰', c.gold ? 2 : 1))
      .apply(集结(c, 4, 0))
      .bind('regroup', () =>
        c.player.enum_present(async card =>
          转换(
            card,
            card.locateSome(c.gold ? 2 : 1, '虚空辉光舰'),
            '虚空辉光舰(精英)'
          )
        )
      ),
  生物质发电: c =>
    $()
      .for(c.player)
      .bind('card-selled', async ({ selled }) => {
        if (selled.template.race === 'Z' && selled.template.level >= 3) {
          await 获得N(c, '水晶塔', c.gold ? 2 : 1)
        }
      }),
  黑暗教长: c =>
    $()
      .for(c)
      .bind('post-enter', () =>
        c.post('obtain-upgrade', {
          card: c,
          upgrade: getUpgrade('暗影战士'),
        })
      )
      .apply(集结(c, 5, 0))
      .bind('regroup', () => 获得N(c, '黑暗圣堂武士(精英)', c.gold ? 2 : 1)),
  六脉神剑: c =>
    $()
      .for(c.player)
      .bind('card-entered', async () => {
        if (c.count('先知') < c.power()) {
          await 折跃(c, Array(c.gold ? 2 : 1).fill('先知'))
        }
      }),
  晋升仪式: c =>
    $()
      .for(c)
      .apply(集结(c, 4, 0))
      .bind('regroup', async () => {
        await 转换(c, c.locateSome(c.gold ? 2 : 1, '不朽者'), '英雄不朽者')
        await 转换(
          c,
          c.locateX(c.gold ? 2 : 1, u => isBiological(u)),
          '高阶圣堂武士'
        )
      }),
  英雄叉: c =>
    $()
      .for(c)
      .bindBefore('wrap-into', async ({ unit }) => {
        for (let i = 0; i < unit.length; i++) {
          if (unit[i] === '狂热者(精英)') {
            unit[i] = '卡尔达利斯'
          }
        }
      }),
}

export default Data
