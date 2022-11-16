<script setup lang="ts">
import { ref, computed } from 'vue'
import ReferText from './ReferText.vue'
import RaceIcon from './RaceIcon.vue'
import type { CardInstance } from '../../../emulator'
import { emuBus } from '../bus'
import type { UnitKey } from '../../../data'
import type { InfrType } from '../../../emulator/types'
import global from '../data'

const props = defineProps<{
  pos: number
  card: CardInstance | null
}>()

const elv = ref(5)
const choose = ref(false)
const model = ref(false)

function requestSell() {
  emuBus.async_emit('requestSell', {
    pos: props.pos,
  })
}

emuBus.on('chooseInsert', async () => {
  choose.value = true
  model.value = true
})

emuBus.on('chooseInsertDone', async () => {
  choose.value = false
  model.value = false
})

emuBus.on('chooseItem', async () => {
  model.value = true
})

emuBus.on('chooseItemDone', async () => {
  model.value = false
})

function chooseHere() {
  emuBus.async_emit('chooseInsertDone', {
    pos: props.pos,
  })
}

function requestUpgrade() {
  emuBus.async_emit('requestUpgradeCard', {
    pos: props.pos,
  })
}

function getColor() {
  if (props.card) {
    if (props.card.gold) {
      return 'yellow'
    } else if (props.card.template.attr.gold) {
      return 'amber'
    }
  }
  return 'white'
}

const allUnit = computed(() => {
  const us: {
    [u in UnitKey]?: number
  } = {}
  props.card?.units.forEach(u => {
    us[u] = (us[u] || 0) + 1
  })
  return Object.keys(us).map(u => `${u}: ${us[u as UnitKey]}`)
})

const infrKey: Record<InfrType, string> = {
  0: '反应堆',
  1: '科技实验室',
  2: '高级科技实验室',
  3: '',
}
</script>

<template>
  <v-card
    class="d-flex flex-column"
    id="card"
    :elevation="elv"
    @mouseover="elv = 10"
    @mouseout="elv = 5"
    :color="getColor()"
  >
    <template v-if="card">
      <div class="d-flex">
        <race-icon
          :race="card.template.race"
          :bg="getColor()"
          class="mt-1"
        ></race-icon>
        <span class="text-h5 ml-2 mt-2">{{ card.name }}</span>
        <span class="text-h5 mt-2 mr-4 ml-auto">{{ card.template.level }}</span>
      </div>
      <div class="d-flex flex-column ma-1 h-100">
        <div class="d-flex">
          <span class="text-h6">{{ card.value() }}</span>
          <span class="ml-auto text-h6">{{ card.units.length }} / 200</span>
        </div>
        <div class="d-flex">
          <span class="text-h6" v-if="card.msg">{{ card.msg }}</span>
          <div class="ml-auto d-flex flex-column">
            <span v-for="(u, i) in card.upgrades" :key="`upgrade-${i}`">{{
              u
            }}</span>
          </div>
        </div>
        <div class="mt-auto d-flex">
          <div>
            <template v-if="allUnit.length <= 5">
              <refer-text :text="allUnit.join('\n')"></refer-text>
            </template>
            <template v-else>
              <refer-text :text="allUnit.slice(0, 5).join('\n')"></refer-text>
              <v-tooltip v-if="allUnit.length > 5" location="top">
                <template v-slot:activator="{ props: p }">
                  <refer-text v-bind="p" text="..."></refer-text>
                </template>
                <refer-text :text="allUnit.join('\n')"></refer-text>
              </v-tooltip>
            </template>
          </div>
          <div class="ml-auto d-flex flex-column align-self-end">
            <span v-if="card.power() > 0 || card.template.race === 'P'"
              >能量强度: {{ card.power() }}</span
            >
            <span v-if="card.template.race === 'T'">{{
              infrKey[card.infr_type()]
            }}</span>
            <span v-if="card.flag.void">虚影</span>
          </div>
        </div>
      </div>
      <div class="d-flex">
        <v-btn
          class="ml-auto"
          v-if="choose"
          variant="flat"
          @click="chooseHere()"
          >这里</v-btn
        >
        <v-btn v-else :disabled="model" variant="text" @click="requestSell()"
          >出售</v-btn
        >
        <v-btn
          :disabled="model || global.player?.gas as number < 2 || card.upgrades.length >= 5"
          variant="text"
          @click="requestUpgrade()"
          >升级</v-btn
        >
      </div>
    </template>
    <template v-else>
      <div class="d-flex mt-auto">
        <v-btn
          class="ml-auto"
          v-if="choose"
          variant="flat"
          @click="chooseHere()"
          >这里</v-btn
        >
      </div>
    </template>
  </v-card>
</template>

<style scoped>
#card {
  width: 250px;
  height: 350px;
}
</style>
