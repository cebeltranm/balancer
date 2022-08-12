import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import Transactions from '@/views/Transactions.vue'
import Expenses from '@/views/Expenses.vue'
import Values from '@/views/Values.vue'
import Budget from '@/views/Budget.vue'

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

export default router
