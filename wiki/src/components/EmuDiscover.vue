<script setup lang="ts">
import { ref } from 'vue'
import type { Card, Upgrade } from '../../../data'
import RaceIcon from './RaceIcon.vue'
import { emuBus } from '../bus'

const props = defineProps<{
  pos: number
  item: Card | Upgrade | null
}>()

const elv = ref(5)
const choose = ref(false)
const model = ref(false)

emuBus.on('chooseInsert', async () => {
  model.value = true
})

emuBus.on('chooseInsertDone', async () => {
  model.value = false
})

emuBus.on('chooseItem', async () => {
  choose.value = true
  model.value = true
})

emuBus.on('chooseItemDone', async () => {
  choose.value = true
  model.value = false
})

function chooseThis() {
  emuBus.async_emit('chooseItemDone', {
    pos: props.pos,
  })
}

function showCard() {
  if (props.item?.type === 'card') {
    emuBus.async_emit('showCard', {
      card: props.item,
    })
  }
}
</script>

<template>
  <v-card
    class="d-flex flex-column"
    v-if="item"
    id="item"
    :elevation="elv"
    @mouseover="elv = 10"
    @mouseout="elv = 5"
  >
    <template v-if="item">
      <div class="d-flex">
        <race-icon
          v-if="item.type === 'card'"
          :race="item.race"
          class="mt-1"
        ></race-icon>
        <span
          class="text-h5 ml-2 mt-2"
          style="cursor: pointer"
          @click="showCard()"
          >{{ item.name }}</span
        >
        <span v-if="item.type === 'card'" class="text-h5 mt-2 mr-4 ml-auto">{{
          item.level
        }}</span>
      </div>
      <div class="d-flex mt-auto">
        <v-btn v-if="choose" variant="flat" @click="chooseThis()">这个</v-btn>
      </div>
    </template>
  </v-card>
  <div v-else id="item"></div>
</template>

<style scoped>
#item {
  width: 200px;
  height: 100px;
}
</style>
