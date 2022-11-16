<script setup lang="ts">
import { ref, computed } from 'vue'
import NodeInfo from '@/components/NodeInfo.vue'
import type { PubNode } from '@/bus'
import { wikiBus } from '@/bus'
import {
  AllCard,
  AllTerm,
  AllUnit,
  AllUpgrade,
  type CardKey,
  type TermKey,
  type UnitKey,
  type UpgradeKey,
} from '../../../data/pubdata'
import { getCard, getTerm, getUnit, getUpgrade } from '../../../data'
const nodes = ref<PubNode[]>([])

const base = ref(0)
const requ = ref<PubNode | null>(null)
const reqd = ref<PubNode | null>(null)

wikiBus.on('search', ({ node }) => {
  nodes.value = node
})

wikiBus.on('searchPos', ({ page }) => {
  base.value = (page - 1) * 8
})

wikiBus.on('request', ({ term }) => {
  if (AllCard.includes(term as CardKey)) {
    requ.value = getCard(term as CardKey)
  } else if (AllTerm.includes(term as TermKey)) {
    requ.value = getTerm(term as TermKey)
  } else if (AllUpgrade.includes(term as UpgradeKey)) {
    requ.value = getUpgrade(term as UpgradeKey)
  } else {
    requ.value = null
  }
  if (AllUnit.includes(term as UnitKey)) {
    reqd.value = getUnit(term as UnitKey)
  } else {
    reqd.value = null
  }
})

const range = computed(() => {
  return nodes.value.slice(base.value, base.value + 4)
})
const range2 = computed(() => {
  return nodes.value.slice(base.value + 4, base.value + 8)
})
</script>

<template>
  <div class="d-flex mt-4">
    <node-info
      class="ml-4"
      v-for="(p, i) in range"
      :key="`card-${i}`"
      :node="p"
    ></node-info>
    <node-info v-if="requ" class="ml-auto mr-4" :node="requ"></node-info>
  </div>
  <div class="d-flex mt-4">
    <node-info
      class="ml-4"
      v-for="(p, i) in range2"
      :key="`card-${i}`"
      :node="p"
    ></node-info>
    <node-info v-if="reqd" class="ml-auto mr-4" :node="reqd"></node-info>
  </div>
</template>
