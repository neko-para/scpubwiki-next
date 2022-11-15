<script setup lang="ts">
import CardInfo from '@/components/CardInfo.vue'
import SearchCard from '@/components/SearchCard.vue'
import SearchResult from '@/components/SearchResult.vue'
import { getCard } from '../../../data'

</script>

<template>
  <!-- <card-info class="ma-6" :card="getCard('酒馆后勤处')"></card-info> -->
  <search-card></search-card>
  <search-result></search-result>
</template>
