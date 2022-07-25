<template>
  <v-card
    max-width="400"
    class="mx-auto"
  >
  <v-list lines="two">
      <v-list-subheader inset>Folders</v-list-subheader>

      <v-list-item
        v-for="item in items"
        :key="item.name"
        :title="item.name"
        :subtitle="item.description"
      >
        <template v-slot:append>
         <span>{{item.value}}</span>
        </template>
      </v-list-item>

      <v-divider inset></v-divider>

      <v-list-item
        title="NET"
      >
        <template v-slot:append>
         <span>{{netValue}}</span>
        </template>
      </v-list-item>

    </v-list>
  </v-card>
</template>

<script lang='ts' setup>

import { ref, onMounted, computed } from 'vue';
import { useStore } from 'vuex';

const items = [
    {
        name: 'Current Assets',
        description: "Cash, Saving/checking accounts",
        value: 0
    },
    {
        name: 'Fixed Assets',
        description: "House, Car",
        value: 0
    },
    {
        name: 'Investments',
        description: "CDTs, ETFs, Stocks..",
        value: 0
    },
    {
        name: 'Receivables',
        description: "Money owned to me",
        value: 0
    },
    {
        name: 'Liabilities',
        description: "Credit Cards, Mortage, others",
        value: 0
    },
];

const netValue = ref(0);
const store = useStore();
const assets = computed(() => store.getters['accounts/accountsGroupedByTypes'] );

onMounted( () => {
  
});

</script>
