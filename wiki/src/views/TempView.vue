<script setup lang="ts">
import { raceSvg } from '@/assets/raceSvg'
import type { Race } from '../../../data/types'

const races = ['T', 'P', 'Z', 'N']
</script>

<template>
  <div class="d-flex" style="background: #ffc107">
    <div
      class="d-flex align-center justify-center"
      style="width: 36px; height: 36px"
      v-for="k in races"
      :key="k"
    >
      <embed type="image/svg+xml" :src="raceSvg[k as Race]" />
    </div>
  </div>
</template>
