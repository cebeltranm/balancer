import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import Transactions from '@/views/Transactions.vue'
import Expenses from '@/views/Expenses.vue'
import Values from '@/views/Values.vue'
import Budget from '@/views/Budget.vue'
import Assets from '@/views/Assets.vue'
import Investments from '@/views/Investments.vue'
import { EVENTS, FORM_WITH_PENDING_EVENTS } from '@/helpers/events'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/Transactions',
      name: 'transactions',
      component: Transactions
    },
    {
      path: '/expenses',
      name: 'expenses',
      component: Expenses
    },
    {
      path: '/assets',
      name: 'assets',
      component: Assets
    },
    {
      path: '/investments',
      name: 'investments',
      component: Investments
    },
    {
      path: '/settings/values',
      name: 'settings_values',
      component: Values
    },
    {
      path: '/settings/budget',
      name: 'budget',
      component: Budget
    },
  ]
})

var __pendingChanges = false;
EVENTS.on(FORM_WITH_PENDING_EVENTS, (pendingChanges: boolean) => {
  __pendingChanges = pendingChanges;
})

router.beforeEach((to, from) => {
  return !__pendingChanges;
})

export default router
