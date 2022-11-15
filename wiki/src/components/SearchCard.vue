<script setup lang="ts">
import { ref, watch } from 'vue'
import { attr, getCard, getTerm, getUnit, getUpgrade, order, tr } from '../../../data'
import type { PubNode } from '@/bus'
import { wikiBus } from '@/bus'
import { AllCard, AllTerm, AllUnit, AllUpgrade } from '../../../data/pubdata';

const type = ref('card')
const race = ref('any')
const starCheck = ref<Record<number, boolean>>({
  0: false,
  1: true,
  2: true,
  3: true,
  4: true,
  5: true,
  6: true,
  7: false
})

let timer: number | null = null
const len = ref(0)
const page = ref(1)

function getRace(type: string) {
  return order[`${type}_race`]
}

function doSearch(): PubNode[] {
  const res: PubNode[] = []
  switch (type.value) {
    case 'card':
      return AllCard.map(card => getCard(card)).filter(card => {
        if (race.value !== 'any' && race.value !== card.race) {
          return false
        }
        if (!starCheck.value[Number(card.level)]) {
          return false
        }
        return true
      })
    case 'unit':
      return AllUnit.map(unit => getUnit(unit)).filter(unit => {
        if (race.value !== 'any' && race.value !== unit.race) {
          return false
        }
        return true
      })
    case 'term':
      return AllTerm.map(term => getTerm(term)).filter(term => {
        if (race.value !== 'any' && race.value !== term.race) {
          return false
        }
        return true
      })
    case 'upgrade':
      return AllUpgrade.map(up => getUpgrade(up)).filter(up => {
        if (race.value !== 'any' && race.value !== up.category) {
          return false
        }
        return true
      })
  }
  return res
}

function updateTimer () {
  if (timer) {
    clearTimeout(timer)
  }
  timer = setTimeout(() => {
    console.log('updated')
    const node = doSearch()
    wikiBus.emit('search', {
      node
    })
    len.value = Math.ceil(node.length / 8)
    page.value = 1
  }, 1000)
}

watch(page, () => {
  wikiBus.emit('searchPos', {
    page: page.value
  })
})

watch(type, updateTimer)
watch(type, t => {
  if (!getRace(t).includes(race.value)) {
    race.value = 'any'
  }
})
watch(race, updateTimer)
watch(starCheck, updateTimer, {
  deep: true
})

updateTimer()
</script>

<template>
  <v-card class="d-flex">
    <div class="d-flex flex-column">
      <v-radio-group inline v-model="type" hide-details color="primary">
        <v-radio value="card" label="卡牌"></v-radio>
        <v-radio value="unit" label="单位"></v-radio>
        <v-radio value="term" label="术语"></v-radio>
        <v-radio value="upgrade" label="升级"></v-radio>
      </v-radio-group>
      
      <v-radio-group inline v-model="race" hide-details color="primary">
        <v-radio value="any" label="任意"></v-radio>
        <v-radio v-for="(r, i) in getRace(type)" :key="`race-${i}`" :value="r" :label="tr[r]"></v-radio>
      </v-radio-group>
    </div>
    <div v-if="type === 'card'" class="d-flex flex-column">
      <div class="d-flex">
        <v-checkbox v-for="i in 8" :key="`star-${i}`" v-model="starCheck[i - 1]" :label="`${i - 1}`"></v-checkbox>
      </div>
    </div>
    <v-pagination :length="len" v-model="page" total-visible="5"></v-pagination>
    <v-btn class="ml-auto align-self-center" to="emulator">模拟器</v-btn>
  </v-card>
</template>
