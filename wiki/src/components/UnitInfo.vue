<script setup lang="ts">
import { ref } from 'vue'
import type { Weapon, Armor, SArmor, Unit } from '../../../data'
import { tr } from '../../../data'
import ReferText from './ReferText.vue'
import RaceIcon from './RaceIcon.vue'

const props = defineProps<{
  unit: Unit
}>()

const elv = ref(5)
const target = {
  G: '地面单位',
  A: '空中单位',
  GA: '空中和地面单位'
}

function calcWeapon (wp: Weapon) {
  const r: string[] = []
  r.push(`伤害: ${wp.damage}`)
  if (wp.multiple) {
    r.push(`多重攻击: ${wp.multiple}`)
  }
  r.push(`攻击范围: ${wp.range}`)
  r.push(`武器速度: ${wp.speed}`)
  r.push(`目标: ${target[wp.target]}`)
  return r.join('\n')
}

function calcArmor (a: Armor) {
  const r: string[] = []
  r.push(`护甲: ${a.defense}`)
  if (a.speed) {
    r.push(`移动速度: ${a.speed}`)
  }
  return r.join('\n')
}

function calcSArmor (a: SArmor) {
  const r: string[] = []
  r.push(`护甲: ${a.defense}`)
  return r.join('\n')
}

</script>

<template>
  <v-card :elevation="elv" id="unit" class="d-flex flex-column" @mouseover="elv = 10" @mouseout="elv = 5">
    <div class="d-flex">
      <race-icon :race="unit.race" class="mt-1"></race-icon>
      <span class="text-h5 ml-2 mt-2">{{ unit.name }}</span>
      <span class="text-h5 mt-2 mr-4 ml-auto">{{ unit.value }}</span>
    </div>
    <div class="mx-2">
      <div v-if="unit.utype === 'normal'" class="d-flex">
        <span>生命 {{ unit.health }}</span>
        <span class="ml-2" v-if="unit.shield">护盾 {{ unit.shield }}</span>
        <span class="ml-2" v-if="unit.power">能量 {{ unit.power }}</span>
      </div>
      <div v-else>{{ tr[unit.utype] }}</div>
      <div v-for="(w, i) in unit.weapon || []" :key="`wp-${i}`">
        <v-tooltip location="bottom">
          <template v-slot:activator="{ props: p }">
            <span v-bind="p">武器 {{ w.name }}</span>
          </template>
          <refer-text :text="calcWeapon(w)"></refer-text>
        </v-tooltip>
      </div>
      <div v-if="unit.armor">
        <v-tooltip location="bottom">
          <template v-slot:activator="{ props: p }">
            <span v-bind="p">护甲 {{ unit.armor.name }}</span>
          </template>
          <refer-text :text="calcArmor(unit.armor)"></refer-text>
        </v-tooltip>
      </div>
      <div v-if="unit.sarmor">
        <v-tooltip location="bottom">
          <template v-slot:activator="{ props: p }">
            <span v-bind="p">护盾 {{ unit.sarmor.name }}</span>
          </template>
          <refer-text :text="calcSArmor(unit.sarmor)"></refer-text>
        </v-tooltip>
      </div>
      <div v-if="unit.bref">
        <refer-text :text="unit.bref"></refer-text>
      </div>
      <div v-if="unit.rmrk">
        <refer-text :text="unit.rmrk"></refer-text>
      </div>
    </div>
  </v-card>
</template>

<style scoped>
#unit {
  width: 300px;
  height: 400px;
}

</style>