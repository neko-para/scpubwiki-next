import { Emitter } from '@nekosu/async-emitter'
import type { CardInstance } from './card'
import { Player } from './player'
import { Pool } from './pool'
import type { AllBus } from './types'

export type GameBus = {
  '$next-round': {}

  'round-start': {
    round: number
  }
  'round-end': {
    round: number
  }
}

interface ReplayStep {
  ev: keyof AllBus
  obj: any
}

export interface Replay {
  pack: Record<string, boolean>
  gseed: string
  pseed: string[]
  msg: ReplayStep[]
}

export class Game {
  bus: Emitter<AllBus>
  players: Player[]
  pool: Pool
  round: number

  log: Replay

  logger: (ev: keyof AllBus, obj: any) => Promise<void>

  constructor(
    pack: Record<string, boolean>,
    poolSeed: string,
    playerSeed: string[]
  ) {
    // Only one player now
    this.bus = new Emitter()
    this.players = []
    playerSeed.forEach((ps, i) => {
      this.players.push(new Player(this, ps, i))
    })
    this.pool = new Pool(pack, poolSeed)
    this.round = 1

    this.log = {
      pack,
      gseed: poolSeed,
      pseed: playerSeed,
      msg: [],
    }

    this.logger = async () => {}

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

    this.bus.on('$next-round', async () => {
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
    await activator()
    return player.choice
  }

  async poll<T extends keyof AllBus>(ev: T, obj: AllBus[T]) {
    const mobj: any = {}
    for (const k in obj) {
      if (k === 'player') {
        mobj[k] = (obj as any)[k].pos
      } else {
        mobj[k] = (obj as any)[k]
      }
    }
    await this.logger(ev, mobj)
    this.log.msg.push({
      ev,
      obj: mobj,
    })
    await this.bus.async_emit(ev, obj)
  }

  async loadMsg(msg: ReplayStep) {
    const mobj: any = {}
    for (const k in msg.obj) {
      if (k === 'player') {
        mobj[k] = this.players[(msg.obj as any)[k]]
      } else {
        mobj[k] = (msg.obj as any)[k]
      }
    }
    await this.poll(msg.ev, msg.obj)
  }
}
