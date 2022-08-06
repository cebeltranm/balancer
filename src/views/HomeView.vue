<template>
  <TreeTable :value="byCategory">
    <Column field="name" header="Name" footer="Total" :expander="true"></Column>
    <Column header="Value">
      <template #body="{node}"><div class="text-right">
        {{ $format.currency(node.data.values[0], 'cop') }}
        </div></template>
      <template #footer><div class="text-right">{{ $format.currency(getTotal, 'cop')}}</div></template>
    </Column>
  </TreeTable>
</template>

<script lang="ts" setup>
  import { useStore } from 'vuex';
  import { computed, ref, onMounted } from 'vue'
  import { Period } from '@/types';

  const period = ref('month');
  const options = [
        {name: 'This month', value: 'month'},
        {name: 'This quarter', value: 'quarter'},
        {name: 'This year', value: 'year'},
	]

    const store = useStore();

    function getTotalByCategory( category: any, balance: any) {
        var children = undefined;
        var values = category.type === 'Category' ? [] : balance[category.id];
        if ( category.children ) {
          children = Object.keys(category.children).map((key) => getTotalByCategory(category.children[key], balance));
          values = children.reduce( (ant, child) => {
              if (!ant) {
                return child.data.values;
              }
              return ant.map( (v, index) => v + child.data.values[index]  );
          }, undefined );
        }

        return { 
          key: category.type === 'Category' ? category.name : category.id,
          data: {
            name: category.name,
            values: values
          },
          children
        };
    }

    const byCategory = computed(() => {
        const balance = store.getters['balance/getBalanceGroupedByPeriods'](Period.Month, 2);
        const expences = store.getters['accounts/expensesByCategories'];

        return Object.keys(expences).map( (key) => getTotalByCategory(expences[key], balance));
    });

    const getTotal = computed(() => {
      
      return byCategory.value.reduce( (ant, v) => ant + v.data.values[0] , 0);
    });

</script>
