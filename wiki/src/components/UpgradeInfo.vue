<script setup lang="ts">
import { ref } from 'vue'
import type { Upgrade } from '../../../data'
import { tr } from '../../../data'
import ReferText from './ReferText.vue'

const props = defineProps<{
  upgrade: Upgrade
}>()

const elv = ref(5)

</script>

<template>
  <v-card :elevation="elv" id="upgrade" class="d-flex flex-column px-2" @mouseover="elv = 10" @mouseout="elv = 5">
    <div class="d-flex">
      <span class="text-h5 mt-2">{{ tr[upgrade.category] }}</span>
      <span class="text-h5 mt-2 ml-4 ">{{ upgrade.name }}</span>
    </div>
    <refer-text v-if="!upgrade.override" text="无法叠加"></refer-text>
    <refer-text :text="upgrade.bref"></refer-text>
  </v-card>
</template>

<style scoped>
#upgrade {
  width: 300px;
  height: 400px;
}

</style>