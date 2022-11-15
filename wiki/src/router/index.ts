import { createRouter, createWebHistory } from 'vue-router'
import WikiView from '../views/WikiView.vue'
import EmulatorView from '../views/EmulatorView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'wiki',
      component: WikiView,
    },
    {
      path: '/emulator',
      name: 'emulator',
      component: EmulatorView,
    },
  ],
})

export default router
