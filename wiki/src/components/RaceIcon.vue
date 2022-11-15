<script setup lang="ts">
import { raceSvg } from '@/assets/raceSvg'
import type { Race } from '../../../data/types'

const props = defineProps<{
  race: Race
}>()

</script>

<template>
  <div id="root" class="d-flex align-center justify-space-around">
    <embed v-if="race !== 'G'" :src="raceSvg[race]" type="image/svg+xml" />
  </div>
</template>

<style scoped>
#root {
  width: 36px;
  height: 36px;
}
</style>
