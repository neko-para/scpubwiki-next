<script setup lang="ts">
import RacePng from '@/assets/race.png'
import RacePngYellow from '@/assets/raceYellow.png'
import RacePngAmber from '@/assets/raceAmber.png'
import type { Race } from '../../../data/types'

const props = withDefaults(
  defineProps<{
    race: Race
    bg?: 'white' | 'yellow' | 'amber'
  }>(),
  {
    bg: 'white',
  }
)

const ofs = {
  T: 0,
  P: -36,
  Z: -72,
  N: -108,
  G: -144,
}

const img = {
  white: RacePng,
  yellow: RacePngYellow,
  amber: RacePngAmber,
}
</script>

<template>
  <div
    id="root"
    :style="{
      'background-image': `url(${img[bg]})`,
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
