<script setup lang="ts">
import { ref } from 'vue'
import EmuCardTemplate from '@/components/EmuCardTemplate.vue'
import EmuCard from '@/components/EmuCard.vue'
import EmuDiscover from '@/components/EmuDiscover.vue'
import { Game } from '../../../emulator'
import type { Card, Upgrade } from '../../../data'
import { emuBus } from '@/bus'
import global from '../data'

const handId = ref(1)
const storeId = ref(1)
const presId = ref(1)
const infoId = ref(1)

const game = new Game()
const player = game.players[0]
const discover = ref<(Card | Upgrade)[]>([])

global.player = player

player.choose = async () => {
  return new Promise<number>(resolve => {
    const f = async (p: { pos: number }) => {
      emuBus.off('chooseInsertDone', f)
      resolve(p.pos)
    }
    emuBus.on('chooseInsertDone', f)
    emuBus.async_emit('chooseInsert', {})
  })
}

player.refresh = async (place) => {
  switch (place) {
    case 'hand':
      handId.value += 1
      break
    case 'store':
      storeId.value += 1
      break
    case 'present':
      presId.value += 1
      break
    case 'info':
      infoId.value += 1
      break
  }
}

player.discover = async (items) => {
  return new Promise<number>(resolve => {
    discover.value = items
    const f = async (p: { pos: number }) => {
      emuBus.off('chooseItemDone', f)
      discover.value = []
      resolve(p.pos)
    }
    emuBus.on('chooseItemDone', f)
    emuBus.async_emit('chooseItem', {})
  })
}

emuBus.on('requestBuy', async ({ pos }) => {
  await game.bus.async_emit('buy-card', {
    player, pos
  })
})

emuBus.on('requestCache', async ({ pos }) => {
  await game.bus.async_emit('cache-card', {
    player, pos
  })
})

emuBus.on('requestSell', async ({ pos }) => {
  await game.bus.async_emit('sell-card', {
    player, pos
  })
})

emuBus.on('requestCombine', async ({ pos }) => {
  await game.bus.async_emit('combine-card', {
    player, pos
  })
})

emuBus.on('requestUpgradeCard', async ({ pos }) => {
  await game.bus.async_emit('upgrade-card', {
    player, pos
  })
})

emuBus.on('requestHandEnter', async ({ pos }) => {
  await game.bus.async_emit('hand-enter-card', {
    player, pos
  })
})

emuBus.on('requestHandSell', async ({ pos }) => {
  await game.bus.async_emit('hand-sell-card', {
    player, pos
  })
})

emuBus.on('requestHandCombine', async ({ pos }) => {
  await game.bus.async_emit('hand-combine-card', {
    player, pos
  })
})

const model = ref(false)

emuBus.on('chooseInsert', async () => {
  model.value = true
})

emuBus.on('chooseInsertDone', async () => {
  model.value = false
})

emuBus.on('chooseItem', async () => {
  model.value = true
})

emuBus.on('chooseItemDone', async () => {
  model.value = false
})

game.bus.async_emit('round-start', {
  round: 1
})

function requestNextRound() {
  game.next_round()
}

function requestUpgrade() {
  player.upgrade()
}

function requestRefresh() {
  player.do_refresh()
}

const cheeted = ref(false)

function cheet() {
  player.mine = 999
  player.gas = 999
  infoId.value += 1
  storeId.value += 1
  presId.value += 1
  cheeted.value = true
}

</script>

<template>
  <div class="d-flex flex-column pa-1 h-100">
    <div class="d-flex">
      <div class="d-flex flex-column">
        <div class="d-flex flex-column" :key="`res-${infoId}`">
          <span class="text-h6">回合 {{ game.round }}</span>
          <span class="text-h6">等级 {{ player.level }}</span>
          <span class="text-h6">升级 {{ player.cost }}</span>
          <span class="text-h6">晶矿 {{ player.mine }} / {{ player.mineMax }}</span>
          <span class="text-h6">瓦斯 {{ player.gas }} / 6</span>
        </div>
        <div class="d-flex mb-4">
          <v-btn :disabled="model" class="mr-1" @click="requestNextRound()">下一回合</v-btn>
          <v-btn :disabled="model || player.cost > player.mine" class="mr-1" @click="requestUpgrade()">升级</v-btn>
          <v-btn :disabled="model || player.mine < 1" class="mr-1" @click="requestRefresh()">刷新</v-btn>
          <v-btn :disabled="model" class="mr-1" @click="player.lock = !player.lock; storeId += 1">{{ player.lock ? '解锁' : '锁定' }}</v-btn>
          <v-btn :disabled="model" @click="cheet()" :color="cheeted ? 'red' : 'white'">be a cheeter</v-btn>
        </div>
        <div class="d-flex">
          <div class="d-flex flex-column">
            <emu-card-template class="mb-2" :pos="i - 1" type="hand" :card="player.hand[i - 1]" v-for="i in 3" :key="`hand-${i}-${handId}`"></emu-card-template>
          </div>
          <div class="d-flex flex-column ml-1">
            <emu-card-template class="mb-2" :pos="i + 2" type="hand" :card="player.hand[i + 2]" v-for="i in 3" :key="`hand-${i + 3}-${handId}`"></emu-card-template>
          </div>
        </div>
      </div>
      <div class="d-flex flex-column ml-auto">
        <div class="d-flex">
          <emu-card-template class="mr-2" :pos="0" type="store" :card="undefined" :key="`store-@-${storeId}`"></emu-card-template>
          <emu-card-template class="mr-2" :pos="i - 1" type="store" :card="player.store[i - 1]" v-for="i in player.store.length" :key="`store-${i}-${storeId}`"></emu-card-template>
          <emu-card-template class="mr-2" :pos="0" type="store" :card="undefined" v-for="i in 6 - player.store.length" :key="`store-${player.store.length + i}-${storeId}`"></emu-card-template>
        </div>
        <div class="d-flex mt-auto mb-2">
          <emu-discover class="mr-2" :pos="0" :key="`discover-@`" :item="null"></emu-discover>
          <emu-discover class="mr-2" :pos="i" v-for="(it, i) in discover" :key="`discover-${i}`" :item="it"></emu-discover>
        </div>
      </div>
    </div>
    <div class="d-flex mt-auto">
      <emu-card class="mr-2" :pos="i - 1" type="store" :card="player.pres[i - 1]" v-for="i in 7" :key="`pres-${i}-${presId}`"></emu-card>
    </div>
  </div>
</template>
