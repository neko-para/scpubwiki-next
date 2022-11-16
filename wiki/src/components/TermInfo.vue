<script setup lang="ts">
import { ref } from 'vue'
import type { Term } from '../../../data'
import ReferText from './ReferText.vue'

const props = defineProps<{
  term: Term
}>()

const elv = ref(5)
</script>

<template>
  <v-card
    :elevation="elv"
    id="term"
    class="d-flex flex-column px-2"
    @mouseover="elv = 10"
    @mouseout="elv = 5"
  >
    <div class="d-flex">
      <span class="text-h5 mt-2">{{ term.name }}</span>
    </div>
    <refer-text :text="term.bref"></refer-text>
    <refer-text v-if="term.extr" :text="term.extr"></refer-text>
  </v-card>
</template>

<style scoped>
#term {
  width: 300px;
  height: 400px;
}
</style>
