import { Emitter } from '@nekosu/async-emitter'
import type { CardInstance } from './card'
import { Player } from './player'
import { Pool } from './pool'
import type { AllBus } from './types'

export type GameBus = {
  $next_round: {}

  'round-start': {
    round: number
  }
  'round-end': {
    round: number
  }
}

export interface Replay {
  pack: Record<string, boolean>
  gseed: string
  pseed: string[]
  choice: number[][]
  msg: {
    ev: keyof AllBus
    obj: any
  }[]
}

export class Game {
  bus: Emitter<AllBus>
  players: Player[]
  pool: Pool
  round: number

  log: Replay

  constructor(
    pack: Record<string, boolean>,
    poolSeed: string,
    playerSeed: string[]
  ) {
    // Only one player now
    this.bus = new Emitter()
    this.players = []
    playerSeed.forEach(ps => {
      this.players.push(new Player(this, ps))
    })
    this.pool = new Pool(pack, poolSeed)
    this.round = 1

    this.log = {
      pack,
      gseed: poolSeed,
      pseed: playerSeed,
      choice: Array(playerSeed.length)
        .fill(0)
        .map(() => []),
      msg: [],
    }

    this.bus.wildcastBefore(async (e, p) => {
      console.log(e, p)
    })

    this.bus.wildcastAfter(async (e, p: any) => {
      if (p.player || p.card) {
        await (
          (p.player as Player) || (p.card as CardInstance).player
        ).bus.async_emit(e as keyof AllBus, p)
      } else {
        for (const pl of this.players) {
          await pl.bus.async_emit(e as keyof AllBus, p)
        }
      }
    })

    this.bus.on('$next_round', async () => {
      await this.bus.async_emit('round-end', {
        round: this.round,
      })
      this.round += 1
      await this.bus.async_emit('round-start', {
        round: this.round,
      })
    })
  }

  async queryChoice(
    player: Player,
    activator: () => Promise<void> = async () => {}
  ) {
    if (player.choices.length === 0) {
      await activator()
    }
    return player.choices.shift() as number
  }

  p2i(player: Player) {
    return this.players.indexOf(player)
  }

  pollChoice(player: Player, pos: number) {
    this.log.choice[this.p2i(player)].push(pos)
    player.choices.push(pos)
  }

  async poll<T extends keyof AllBus>(ev: T, obj: AllBus[T]) {
    const mobj: any = {}
    for (const k in obj) {
      if (k === 'player') {
        mobj[k] = this.p2i((obj as any)[k])
      } else {
        mobj[k] = (obj as any)[k]
      }
    }
    this.log.msg.push({
      ev,
      obj: mobj,
    })
    await this.bus.async_emit(ev, obj)
  }
}
