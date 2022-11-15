import { Emitter } from '@nekosu/async-emitter'
import type { CardInstance } from './card'
import { Player } from './player'
import { Pool } from './pool'
import type { AllBus } from './types'

export type GameBus = {
  'round-start': {
    round: number
  }
  'round-end': {
    round: number
  }
}

export class Game {
  bus: Emitter<AllBus>
  players: Player[]
  pool: Pool
  round: number

  constructor() {
    this.bus = new Emitter()
    this.players = [new Player(this)]
    this.pool = new Pool()
    this.round = 1

    this.bus.wildcast(async (e, p: any) => {
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
  }

  async next_round() {
    await this.bus.async_emit('round-end', {
      round: this.round,
    })
    this.round += 1
    await this.bus.async_emit('round-start', {
      round: this.round,
    })
  }
}
