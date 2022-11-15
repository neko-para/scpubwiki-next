<script setup lang="ts">
import { ref } from 'vue'
import { order, attr } from '../../../data'
import type { Card, UnitKey } from '../../../data'
import ReferText from './ReferText.vue'
import RaceIcon from './RaceIcon.vue'

const props = defineProps<{
  card: Card
}>()

const elv = ref(5)
const isGold = ref(false)
const showRmrk = ref(false)

</script>

<template>
  <v-card :elevation="elv" id="card" class="d-flex flex-column" @mouseover="elv = 10" @mouseout="elv = 5">
    <div class="d-flex">
      <race-icon :race="card.race" class="mt-1"></race-icon>
      <span class="text-h5 ml-2 mt-2">{{ card.name }}</span>
      <span class="text-h5 mt-2 mr-4 ml-auto">{{ card.level }}</span>
    </div>
    <template v-if="showRmrk">
      <refer-text v-if="card.rmrk" :text="card.rmrk" class="mx-2 mb-4"></refer-text>
    </template>
    <template v-else>
      <span class="mx-2" v-if="card.banner">{{ card.banner }}</span>
      <template v-for="(a, i) in order.attr" :key="`attr-${i}`">
        <refer-text class="mx-2 mt-1" v-if="a in card.attr" :text="attr[a]"></refer-text>
      </template>
      <refer-text class="mx-2 mt-4" v-for="(s, i) in card.desc" :key="`desc-${i}`" :text="isGold ? s[1] : s[0]"></refer-text>
    </template>
    <div class="d-flex mt-auto">
      <v-btn class="ml-4 mr-4 mb-4 align-self-end" :disabled="card.attr.gold" @click="isGold = !isGold" :color="isGold ? 'yellow' : 'white'">三连</v-btn>
      <v-btn class="mb-4 align-self-end" v-if="card.rmrk" @click="showRmrk = !showRmrk">{{ showRmrk ? '描述' : '备注' }}</v-btn>
      <div class="d-flex flex-column ml-auto mr-2 mb-2 align-self-end">
        <div v-for="(u, i) in Object.keys(card.unit)" :key="`unit-${i}`" class="d-flex">
          <refer-text class="mr-auto" :text="u"></refer-text>
          <span class="ml-1">{{ card.unit[u as UnitKey] }}</span>
        </div>
      </div>
    </div>
  </v-card>
</template>

<style scoped>
#card {
  width: 300px;
  height: 400px;
}

</style>