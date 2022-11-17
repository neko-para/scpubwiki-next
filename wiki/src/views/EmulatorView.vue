<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute, type LocationQueryValue } from 'vue-router'
import { deflateRaw, inflateRaw } from 'pako'
import { Buffer } from 'buffer'
import EmuCardTemplate from '@/components/EmuCardTemplate.vue'
import EmuCard from '@/components/EmuCard.vue'
import EmuDiscover from '@/components/EmuDiscover.vue'
import { Game } from '../../../emulator'
import { AllCard, type CardKey } from '../../../data/pubdata'
import { getCard, order, type Card, type Upgrade } from '../../../data'
import { emuBus } from '@/bus'
import global from '../data'
import type { Replay } from '../../../emulator/game'

function shuffle<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
  return array
}

async function wait(time: number): Promise<void> {
  if (time < 0) {
    return
  }
  return new Promise(resolve => {
    setTimeout(resolve, time)
  })
}

function doEta() {
  return wait(eta)
}

const route = useRoute()
const router = useRouter()

function queryPack() {
  let p = route.query?.pack as LocationQueryValue
  const pack: Record<string, boolean> = {
    核心: true,
  }
  if (p) {
    p.split(',')
      .map(s => s.trim())
      .filter(s => order.pack.includes(s))
      .forEach(p => (pack[p] = true))
  }
  return pack
}

function querySeed() {
  return (
    (route.query?.seed as LocationQueryValue) ||
    Math.floor(Math.random() * 1000000).toString()
  )
}

const seed = ref(querySeed())
const pendingChoice: number[] = []
const eta = Number(route.query.eta || -1)

const handId = ref(1)
const storeId = ref(1)
const presId = ref(1)
const infoId = ref(1)

const game = new Game(queryPack(), seed.value, [seed.value])
const player = game.players[0]
const discover = ref<(Card | Upgrade)[]>([])
const discoverCancel = ref<(() => void) | null>(null)

global.player = player

const acts = ref<string[]>([])

function put(str: string) {
  if (acts.value.length > 10) {
    acts.value.shift()
  }
  acts.value.push(str)
}

game.logger = async (ev, obj) => {
  switch (ev) {
    case '$buy-card':
      put(`购买 ${player.store[obj.pos]?.name}`)
      break
    case '$cache-card':
      put(`暂存 ${player.store[obj.pos]?.name}`)
      break
    case '$combine-card':
      put(`三连 ${player.store[obj.pos]?.name}`)
      break
    case '$hand-combine-card':
      put(`三连暂存区 ${player.hand[obj.pos]?.name}`)
      break
    case '$hand-enter-card':
      put(`进场暂存区 ${player.hand[obj.pos]?.name}`)
      break
    case '$hand-sell-card':
      put(`出售暂存区 ${player.hand[obj.pos]?.name}`)
      break
    case '$imr':
      put(`I'm Rich!`)
      break
    case '$lock':
      put(`锁定`)
      break
    case '$next-round':
      put(`下一回合`)
      break
    case '$obtain-card':
      put(`获得 ${obj.cardt.name}`)
      break
    case '$refresh':
      put(`刷新`)
      break
    case '$sell-card':
      put(`出售 ${player.pres[obj.pos]?.name}`)
      break
    case '$upgrade':
      put(`升级酒馆 ${player.level + 1}`)
      break
    case '$upgrade-card':
      put(`升级卡牌 ${player.pres[obj.pos]?.name}`)
      break
    case '$choice':
      put(`选择 ${obj.pos}`)
      break
  }
}

player.choose = async () => {
  return new Promise<number>(resolve => {
    const f = async (p: { pos: number }) => {
      emuBus.off('chooseInsertDone', f)
      resolve(p.pos)
    }
    emuBus.on('chooseInsertDone', f)
    emuBus.async_emit('chooseInsert', {}).then(async () => {
      if (pendingChoice.length > 0) {
        await doEta()
        await emuBus.async_emit('chooseInsertDone', {
          pos: pendingChoice.shift() as number,
        })
      }
    })
  })
}

async function refreshPlace(place: 'hand' | 'store' | 'present' | 'info') {
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

player.refresh = refreshPlace

player.discover = async (items, allow) => {
  return new Promise<number>(resolve => {
    discover.value = items
    const f = async (p: { pos: number }) => {
      emuBus.off('chooseItemDone', f)
      discover.value = []
      discoverCancel.value = null
      resolve(p.pos)
    }
    if (allow) {
      discoverCancel.value = () => {
        emuBus.async_emit('chooseItemDone', {
          pos: -1,
        })
      }
    }
    emuBus.on('chooseItemDone', f)
    emuBus.async_emit('chooseItem', {}).then(async () => {
      if (pendingChoice.length > 0) {
        await doEta()
        await emuBus.async_emit('chooseItemDone', {
          pos: pendingChoice.shift() as number,
        })
      }
    })
  })
}

emuBus.on('requestBuy', async ({ pos }) => {
  await game.poll('$buy-card', {
    player,
    pos,
  })
})

emuBus.on('requestCache', async ({ pos }) => {
  await game.poll('$cache-card', {
    player,
    pos,
  })
})

emuBus.on('requestSell', async ({ pos }) => {
  await game.poll('$sell-card', {
    player,
    pos,
  })
})

emuBus.on('requestCombine', async ({ pos }) => {
  await game.poll('$combine-card', {
    player,
    pos,
  })
})

emuBus.on('requestUpgradeCard', async ({ pos }) => {
  await game.poll('$upgrade-card', {
    player,
    pos,
  })
})

emuBus.on('requestHandEnter', async ({ pos }) => {
  await game.poll('$hand-enter-card', {
    player,
    pos,
  })
})

emuBus.on('requestHandSell', async ({ pos }) => {
  await game.poll('$hand-sell-card', {
    player,
    pos,
  })
})

emuBus.on('requestHandCombine', async ({ pos }) => {
  await game.poll('$hand-combine-card', {
    player,
    pos,
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

function requestNextRound() {
  if (player.lock) {
    game.poll('$lock', {
      player,
    })
  }
  game.poll('$next-round', {})
}

function requestUpgrade() {
  game.poll('$upgrade', {
    player,
  })
}

function requestRefresh() {
  game.poll('$refresh', {
    player,
  })
}

function switchLock() {
  player.lock = !player.lock
  storeId.value += 1
}

const cheeted = ref(false)

const cheetChoose = ref(false)
const cheetChooseCard = ref('紧急部署')

function cheetChoosed() {
  if (AllCard.includes(cheetChooseCard.value as CardKey)) {
    game.poll('$obtain-card', {
      player,
      cardt: getCard(cheetChooseCard.value as CardKey),
    })
  }
  cheetChoose.value = false
  handId.value += 1
}

function cheetResource() {
  game.poll('$imr', {
    player,
  })
}

const packDlg = ref(false)
const packConfig = ref(queryPack())

function applyPackChange() {
  router.push({
    name: 'emulator',
    query: {
      pack: Object.keys(packConfig.value).join(','),
      seed: seed.value,
      time: new Date().getTime(),
    },
  })
}

function genPackConfig() {
  const res: Record<string, boolean> = {
    核心: true,
  }
  shuffle(order.pack.slice(1))
    .slice(0, 2)
    .forEach(p => {
      res[p] = true
    })
  packConfig.value = res
}

function genSeed() {
  seed.value = Math.floor(Math.random() * 1000000).toString()
}

const expDlg = ref(false)
const impDlg = ref(false)

function dump() {
  return Buffer.from(deflateRaw(JSON.stringify(game.log))).toString('base64')
}

function copyLog() {
  navigator.clipboard.writeText(dump())
}

const impBuf = ref('')
const etaChoice = ref('-1')

function impLog() {
  const log = JSON.parse(
    Buffer.from(inflateRaw(Buffer.from(impBuf.value, 'base64'))).toString(
      'utf-8'
    )
  ) as Replay
  router.push({
    name: 'emulator',
    query: {
      pack: Object.keys(log.pack).join(','),
      seed: log.gseed,
      replay: impBuf.value,
      eta: etaChoice.value,
      time: new Date().getTime(),
    },
  })
}

let nextStep: (() => Promise<boolean>) | null = null
const doStep = ref<((res: boolean) => void) | null>(null)
const loading = ref(false)

async function loadLog() {
  const log = JSON.parse(
    Buffer.from(
      inflateRaw(Buffer.from(route.query.replay as string, 'base64'))
    ).toString('utf-8')
  ) as Replay
  console.log(log)
  if (eta < 0) {
    player.refresh = async () => {}
  } else {
    loading.value = true
  }
  for (const msg of log.msg) {
    if (msg.ev === '$choice') {
      pendingChoice.push(msg.obj.pos)
    }
  }
  for (const msg of log.msg) {
    if (msg.ev === '$choice') {
      continue
    }
    await game.loadMsg(msg)
    await doEta()
    if (nextStep && (await nextStep())) {
      break
    }
  }
  if (eta < 0) {
    player.refresh = refreshPlace
    refreshPlace('info')
    refreshPlace('hand')
    refreshPlace('store')
    refreshPlace('present')
  } else {
    loading.value = false
  }
}

function setSteping() {
  nextStep = () => {
    return new Promise(resolve => {
      doStep.value = resolve
    })
  }
}

function clearSteping() {
  nextStep = null
  const f = doStep.value
  doStep.value = null
  f && f(false)
}

function endLoading() {
  pendingChoice.splice(0)
  nextStep = null
  const f = doStep.value
  doStep.value = null
  f && f(true)
}

if (route.query.replay) {
  loadLog()
} else {
  game.poll('round-start', {
    round: 1,
  })
}
</script>

<template>
  <div class="d-flex flex-column pa-1 h-100">
    <v-card
      style="position: fixed; right: 0; top: 0; width: 150px"
      class="d-flex flex-column mt-1 mr-1"
    >
      <span v-for="(s, i) in acts" :key="`act-${i}`">{{ s }}</span>
    </v-card>
    <div class="d-flex">
      <div class="d-flex flex-column">
        <div class="d-flex flex-column" :key="`res-${infoId}`">
          <span class="text-h6"
            >回合 {{ game.round }} 等级 {{ player.level }} 升级
            {{ player.cost }} 总价值 {{ player.value() }}</span
          >
          <span class="text-h6"
            >晶矿 {{ player.mine }} / {{ player.mineMax }} 瓦斯
            {{ player.gas }} / 6</span
          >
        </div>
        <div class="d-flex mb-2">
          <v-btn
            :disabled="model || loading"
            class="mr-1"
            @click="requestNextRound()"
            >下一回合</v-btn
          >
          <v-btn
            :disabled="
              model ||
              loading ||
              player.cost > player.mine ||
              player.level === 6
            "
            class="mr-1"
            @click="requestUpgrade()"
            >升级</v-btn
          >
          <v-btn
            :disabled="model || loading || player.mine < 1"
            class="mr-1"
            @click="requestRefresh()"
            >刷新</v-btn
          >
          <v-btn
            :disabled="model || loading"
            class="mr-1"
            @click="switchLock()"
            >{{ '锁定' }}</v-btn
          >
        </div>
        <div class="d-flex mb-2">
          <v-dialog v-model="packDlg" class="w-25">
            <template v-slot:activator="{ props }">
              <v-btn v-bind="props">配置</v-btn>
            </template>
            <v-card>
              <v-card-title> 配置 </v-card-title>
              <v-card-text>
                <v-text-field v-model="seed" label="种子"></v-text-field>
                <v-checkbox
                  hide-details
                  :disabled="i === 0"
                  v-for="(p, i) in order.pack"
                  :key="`pack-${i}`"
                  v-model="packConfig[p]"
                  :label="p"
                ></v-checkbox>
              </v-card-text>
              <v-card-actions>
                <v-btn @click="applyPackChange()" color="red"
                  >确认(会刷新当前游戏)</v-btn
                >
                <v-btn @click="genPackConfig()">随机两个扩展包</v-btn>
                <v-btn @click="genSeed()">随机种子</v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>
          <v-dialog v-model="expDlg" class="w-25">
            <template v-slot:activator="{ props }">
              <v-btn class="ml-1" v-bind="props" :disabled="model">导出</v-btn>
            </template>
            <v-card>
              <v-card-text>
                <v-textarea readonly hide-details :value="dump()"></v-textarea>
              </v-card-text>
              <v-card-actions>
                <v-btn @click="copyLog()">复制</v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>
          <v-dialog v-model="impDlg" class="w-25">
            <template v-slot:activator="{ props }">
              <v-btn class="ml-1" v-bind="props">导入</v-btn>
            </template>
            <v-card>
              <v-card-text>
                <v-textarea v-model="impBuf" hide-details></v-textarea>
              </v-card-text>
              <v-card-actions>
                <v-btn @click="impLog()">确定</v-btn>
                <v-radio-group inline v-model="etaChoice" hide-details>
                  <v-radio value="-1" label="无延时"></v-radio>
                  <v-radio value="0" label="快速"></v-radio>
                  <v-radio value="500" label="慢速"></v-radio>
                </v-radio-group>
              </v-card-actions>
            </v-card>
          </v-dialog>
          <v-btn class="ml-1" v-if="loading && !doStep" @click="setSteping()"
            >暂停</v-btn
          >
          <v-btn class="ml-1" v-if="doStep" @click="clearSteping()">继续</v-btn>
          <v-btn class="ml-1" v-if="doStep" @click="doStep && doStep(false)"
            >步进</v-btn
          >
          <v-btn class="ml-1" v-if="doStep" @click="endLoading()">停止</v-btn>
        </div>
        <div class="d-flex mb-2">
          <v-btn
            class="ml-1"
            :disabled="model || loading"
            @click="cheeted = true"
            :color="cheeted ? 'red' : 'white'"
            >be a cheeter</v-btn
          >
          <template v-if="cheeted">
            <v-dialog v-model="cheetChoose">
              <template v-slot:activator="{ props }">
                <v-btn :disabled="model || loading" v-bind="props" class="ml-1">
                  获取卡牌
                </v-btn>
              </template>
              <v-card>
                <v-card-text>
                  <v-autocomplete
                    label="卡牌"
                    v-model="cheetChooseCard"
                    :items="AllCard"
                  ></v-autocomplete>
                </v-card-text>
                <v-card-actions>
                  <v-btn color="primary" @click="cheetChoosed()">确定</v-btn>
                </v-card-actions>
              </v-card>
            </v-dialog>
            <v-btn
              :disabled="model || loading"
              @click="cheetResource()"
              class="ml-1"
              >获取资源</v-btn
            >
          </template>
        </div>
        <div class="d-flex">
          <div class="d-flex flex-column">
            <emu-card-template
              class="mb-2"
              :pos="i - 1"
              type="hand"
              :card="player.hand[i - 1]"
              v-for="i in 3"
              :key="`hand-${i}-${handId}`"
            ></emu-card-template>
          </div>
          <div class="d-flex flex-column ml-1">
            <emu-card-template
              class="mb-2"
              :pos="i + 2"
              type="hand"
              :card="player.hand[i + 2]"
              v-for="i in 3"
              :key="`hand-${i + 3}-${handId}`"
            ></emu-card-template>
          </div>
        </div>
      </div>
      <div class="d-flex flex-column mr-auto">
        <div class="d-flex">
          <emu-card-template
            class="mr-2"
            :pos="i - 1"
            type="store"
            :card="player.store[i - 1]"
            v-for="i in player.store.length"
            :key="`store-${i}-${storeId}`"
          ></emu-card-template>
          <emu-card-template
            class="mr-2"
            :pos="0"
            type="store"
            :card="undefined"
            v-for="i in 6 - player.store.length"
            :key="`store-${player.store.length + i}-${storeId}`"
          ></emu-card-template>
        </div>
        <div class="d-flex mt-auto mb-2">
          <div style="width: 200px" class="d-flex align-center">
            <v-btn
              v-if="discoverCancel"
              @click="discoverCancel && discoverCancel()"
              class="ml-auto mr-auto"
              color="red"
              >放弃</v-btn
            >
          </div>
          <emu-discover
            class="mr-2"
            :pos="i"
            v-for="(it, i) in discover"
            :key="`discover-${i}`"
            :item="it"
          ></emu-discover>
        </div>
      </div>
    </div>
    <div class="d-flex mt-auto">
      <emu-card
        class="mr-2"
        :pos="i - 1"
        type="store"
        :card="player.pres[i - 1]"
        v-for="i in 7"
        :key="`pres-${i}-${presId}`"
      ></emu-card>
    </div>
  </div>
</template>
