<template>
    <v-tabs v-model="tab">
      <v-tab value="expenses">Expenses</v-tab>
      <v-tab value="assets">Assets</v-tab>
      <v-tab value="investments">Investments</v-tab>
    </v-tabs>

  <v-container fluid>
    <v-card-text>
      <v-window v-model="tab">
        <v-window-item value="expenses">
          <Expenses />
        </v-window-item>

        <v-window-item value="assets">
          <Assets />
          
        </v-window-item>

        <v-window-item value="investments">
          Three
        </v-window-item>
      </v-window>
    </v-card-text>
  </v-container>
</template>

<script lang="ts" setup>
    import { ref, onMounted } from 'vue';
    import { useStore } from 'vuex';
    import Assets from '@/components/Assets.vue'
    import Expenses from '@/components/Expenses.vue'

    const tab = ref('expenses');
    const store = useStore();

    onMounted(()=> {
      store.dispatch('accounts/loadAccounts');
    });

</script>
