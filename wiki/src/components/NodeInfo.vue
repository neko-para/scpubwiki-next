<script setup lang="ts">
import type { PubNode } from '@/bus'
import CardInfo from '@/components/CardInfo.vue'
import UnitInfo from '@/components/UnitInfo.vue'
import TermInfo from '@/components/TermInfo.vue'
import UpgradeInfo from '@/components/UpgradeInfo.vue'

const props = defineProps<{
  node: PubNode
}>()

</script>

<template>
  <card-info v-if="node.type === 'card'" :card="node"></card-info>
  <unit-info v-else-if="node.type === 'unit'" :unit="node"></unit-info>
  <term-info v-else-if="node.type === 'term'" :term="node"></term-info>
  <upgrade-info v-else-if="node.type === 'upgrade'" :upgrade="node"></upgrade-info>
</template>
