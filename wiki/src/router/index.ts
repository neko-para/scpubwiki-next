import { createRouter, createWebHashHistory } from 'vue-router'
import WikiView from '../views/WikiView.vue'
import EmulatorView from '../views/EmulatorView.vue'
import TempView from '../views/TempView.vue'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
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
    {
      path: '/temp',
      name: 'temp',
      component: TempView,
    },
  ],
})

export default router
