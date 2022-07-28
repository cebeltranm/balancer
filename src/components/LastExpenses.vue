<template>
    <div class="card">
        <h2>Recent Expenses</h2>
        <DataTable :value="lastExpenses" :rows="10" :paginator="true" 
            responsiveLayout="scroll" 
            :resizableColumns="true" columnResizeMode="fit" showGridlines
            class="p-datatable-sm">
            <Column header="Date">
                <template #body="slotProps">
                {{$format.date(slotProps.data.date)}}
                </template>
            </Column>
            <Column field="account" header="Account"></Column>
            <Column field="description" header="Description"></Column>
            <Column header="Value" class="text-right">
                <template #body="slotProps"><div class="text-right">
                {{$format.currency(slotProps.data.value, slotProps.data.currency)}}
                </div></template>
            </Column>
        </DataTable>
    </div>
</template>

<script lang="ts" setup>
    import { useStore } from 'vuex';
    import { computed, ref, onMounted } from 'vue'

    const store = useStore();

    const lastExpenses = computed(() => {
        const year = new Date().getFullYear();
        if (store.state.transactions.values[year]) {
            const expenses = store.getters['accounts/listExpenses'].reduce( (ant, e) =>{
                ant[e.id] = e;
                return ant;
            }, {} );

            return store.state.transactions.values[year].reduce( (ant, t) => {
                ant.push(...t.values.filter( (v: any) => expenses[v.accountId] ).map( (v: any) => ({
                    date: t.date, description: t.description,
                    account: expenses[v.accountId].name, 
                    value: v.accountValue,
                    currency: expenses[v.accountId].currency
                })));
                return ant;
            } , []);
        }
        return [];
    });

</script>
