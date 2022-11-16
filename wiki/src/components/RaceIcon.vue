<script setup lang="ts">
import RacePng from '@/assets/race.png'
import type { Race } from '../../../data/types'

const props = defineProps<{
  race: Race
}>()

const ofs = {
  T: 0,
  P: -36,
  Z: -72,
  N: -108,
  G: -144,
}
</script>

<template>
  <div
    id="root"
    :style="{
      'background-image': `url(${RacePng})`,
      'background-size': '144px 36px',
      'background-position': `${ofs[race]}px 0`,
    }"
  ></div>
</template>

<style scoped>
#root {
  width: 36px;
  height: 36px;
}
</style>
