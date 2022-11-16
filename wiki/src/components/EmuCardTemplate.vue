<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Card } from '../../../data'
import RaceIcon from './RaceIcon.vue'
import { emuBus } from '../bus'
import global from '../data'

const props = defineProps<{
  pos: number
  card: Card | null | undefined
  type: 'hand' | 'store'
}>()

const elv = ref(5)
const model = ref(false)

const canCombine = computed(() => {
  return props.card ? global.player?.can_combine(props.card) : false
})

function requestEnter() {
  emuBus.async_emit('requestHandEnter', {
    pos: props.pos,
  })
}

function requestSell() {
  emuBus.async_emit('requestHandSell', {
    pos: props.pos,
  })
}

function requestHandCombine() {
  emuBus.async_emit('requestHandCombine', {
    pos: props.pos,
  })
}

function requestCombine() {
  emuBus.async_emit('requestCombine', {
    pos: props.pos,
  })
}

function requestBuy() {
  emuBus.async_emit('requestBuy', {
    pos: props.pos,
  })
}

function requestCache() {
  emuBus.async_emit('requestCache', {
    pos: props.pos,
  })
}

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

function getColor() {
  return props.type === 'store' && global.player?.lock ? 'cyan' : 'white'
}
</script>

<template>
  <v-card
    class="d-flex flex-column"
    v-if="card !== undefined"
    id="card"
    :elevation="elv"
    @mouseover="elv = 10"
    @mouseout="elv = 5"
    :color="getColor()"
  >
    <template v-if="card">
      <div class="d-flex">
        <race-icon :race="card.race" class="mt-1"></race-icon>
        <span class="text-h5 ml-2 mt-2">{{ card.name }}</span>
        <span class="text-h5 mt-2 mr-4 ml-auto">{{ card.level }}</span>
      </div>
      <div class="d-flex mt-auto">
        <template v-if="type === 'hand'">
          <v-btn
            v-if="canCombine"
            :disabled="model || global.player?.mine as number < 3"
            variant="flat"
            @click="requestHandCombine()"
            color="yellow"
            >三连</v-btn
          >
          <v-btn v-else :disabled="model" variant="text" @click="requestEnter()"
            >进场</v-btn
          >
          <v-btn :disabled="model" variant="text" @click="requestSell()"
            >出售</v-btn
          >
        </template>
        <template v-else-if="type === 'store'">
          <v-btn
            v-if="canCombine"
            :disabled="model || global.player?.mine as number < 3"
            variant="flat"
            @click="requestCombine()"
            color="yellow"
            >三连</v-btn
          >
          <v-btn
            v-else
            :disabled="model || global.player?.mine as number < 3"
            variant="text"
            @click="requestBuy()"
            >购买</v-btn
          >
          <v-btn
            :disabled="model || global.player?.mine as number < 3"
            variant="text"
            @click="requestCache()"
            >暂存</v-btn
          >
        </template>
      </div>
    </template>
  </v-card>
  <div v-else id="card"></div>
</template>

<style scoped>
#card {
  width: 200px;
  height: 100px;
}
</style>
