<template>
<Card>
    <template #title>
        <span class="block text-500 font-medium text-md mb-3">Expenses</span>
    </template>
    <template #subtitle>Total: {{$format.currency(total, 'cop')}} </template>
    <template #content><div class="text-900 font-medium text-xl">{{$format.currency(total, 'cop')}}</div>
    {{byCategory}}
    </template>
    <template #footer>
        <Dropdown v-model="period" :options="options" optionLabel="name" optionValue="value" /> 
    </template>
</Card>
</template>

<script lang="ts" setup>
    import { useStore } from 'vuex';
    import { computed, ref, onMounted } from 'vue'

    const period = ref('month');
    const options = [
        {name: 'This month', value: 'month'},
        {name: 'This quarter', value: 'quarter'},
        {name: 'This year', value: 'year'},
	]

    const store = useStore();

    const total = computed(() => {
        const year = new Date().getFullYear();
        const month = new Date().getMonth() + 1;
        if (store.state.balance.balance[year]) {
            return store.getters['accounts/listExpenses'].reduce( (ant, e) =>{
                const v = store.state.balance.balance[year][e.id] && store.state.balance.balance[year][e.id][month] && store.state.balance.balance[year][e.id][month].value || 0;
                return ant + v;
            }, 0 );
        }
        return 0;
    });

    function getTotalByCategory( category: any, year:number, month:number ) {
        return Object.keys(category.childs).map( (key:string) => {
            if (category.childs[key].type === 'Category') {
                return getTotalByCategory( category.childs[key], year, month );
            } else {
                const id = category.childs[key].id;
                return store.state.balance.balance[year][id] && store.state.balance.balance[year][id][month] && store.state.balance.balance[year][id][month].value || 0;
            }  
        } ).reduce( (t, v) => t + v, 0 );
    }

    const byCategory = computed(() => {
        const year = new Date().getFullYear();
        const month = new Date().getMonth() + 1;

        const expences = store.getters['accounts/expensesByCategories'];
        return Object.keys(expences).map( (key) => {

            return { [key]: getTotalByCategory(expences[key], year, month) };
        });
        // if (store.state.balance.balance[year]) {
        //     return store.getters['accounts/expensesByCategories'].reduce( (ant, e) =>{
        //         const v = store.state.balance.balance[year][e.id] && store.state.balance.balance[year][e.id][month] && store.state.balance.balance[year][e.id][month].value || 0;
        //         return ant + v;
        //     }, 0 );
        // }
        // return 0;
    });

</script>