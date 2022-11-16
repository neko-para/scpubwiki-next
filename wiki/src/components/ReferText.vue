<script setup lang="ts">
import { computed } from 'vue'
import { wikiBus } from '../bus'
import { getTerm, getUnit, splitText, Terms, Units } from '../../../data'
import type {
  TermKey,
  UnitKey,
  SplitResult,
  SplitResultRefer,
} from '../../../data'

const props = defineProps<{
  text: string
}>()

const nodes = computed(() => {
  const res: SplitResult = []
  props.text.split('\n').forEach(t => {
    res.push(...splitText(t))
    res.push({
      t: 'usr',
      s: 'br',
    })
  })
  return res
})

function queryBref(key: string): string | null {
  if (Units.has(key as UnitKey)) {
    return getUnit(key as UnitKey).bref || null
  } else if (Terms.has(key as TermKey)) {
    return getTerm(key as TermKey).bref
  } else {
    return null
  }
}

function request(node: SplitResultRefer) {
  wikiBus.emit('request', { term: node.s })
}
</script>

<template>
  <span>
    <span v-for="(node, idx) in nodes" :key="idx">
      <br v-if="node.t === 'usr' && node.s === 'br'" />
      <span v-else-if="node.t === 'str'" :class="{ modified: node.m }">{{
        node.s
      }}</span>
      <template v-else-if="node.t === 'ref'">
        <v-tooltip location="bottom" v-if="queryBref(node.s)">
          <template v-slot:activator="{ props: p }">
            <span
              v-bind="p"
              @click="request(node)"
              :class="{ ref: true, modified: node.m }"
            >
              {{ node.s }}
            </span>
          </template>
          <span>{{ queryBref(node.s) }}</span>
        </v-tooltip>
        <span
          v-else
          @click="request(node)"
          :class="{ ref: true, modified: node.m }"
        >
          {{ node.s }}
        </span>
      </template>
    </span>
  </span>
</template>

<style scoped>
.modified {
  color: red;
}

.ref {
  cursor: pointer;
  font-weight: bold;
}

.ref:hover {
  background-color: lightgray;
}

span {
  cursor: default;
}
</style>
