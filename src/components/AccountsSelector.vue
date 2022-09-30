<template>
    <TreeSelect v-model="selected" :options="items" @update:model-value="onUpdate" placeholder="Select Account" class="pt-1 pb-1 ml-1 mr-1 w-12rem text-center" />
</template>

<script lang="ts" setup>
import { useStore } from 'vuex';
import { ref, computed, watch, watchEffect } from "vue";
import { AccountType } from '@/types';

const props = defineProps<{
    accounts: string[],
    groups?: string[],
    date?: Date,
}>()

const store = useStore();

const emit = defineEmits(['update:accounts'])

const selected = ref();

const items = ref([]);

watchEffect( () => {
    const accountGroup = (account: any, key: string) => {
        return {
            label: account.name,
            key: account.type === AccountType.Category ? key : account.id,
            children: account.children && Object.keys(account.children).map( (a, index) => accountGroup(account.children[a], `${key}-${index}`) )
        }
    }
    const accounts = store.getters['accounts/accountsGroupByCategories'](props.groups, props.date);
    items.value = Object.keys(accounts).map( (k, index) => ({
        label: k,
        key: `${index}`,
        children: Object.keys(accounts[k]).map( (sub, index2) => accountGroup(accounts[k][sub], `${index}-${index2}`))
    }));
})

function onUpdate() {
    const getIds = (value:any) => {
        if (value.children) {
            return Object.keys(value.children).reduce( (ant: string[], k: string) =>{
                return ant.concat( getIds(value.children[k]) );
            }, [])
        }
        return [value.key];
    };
    const data = Object.keys(selected.value).map( k => {
        if (store.state.accounts.accounts[k]) {
            return k;
        }
        const group = k.split('-').reduce( (ant: any, k) => {
            return ant.children ? ant.children[k] : ant[k]
        }, items.value);
        
        return group;
    }).reduce( (ant:string[], k:any) => {
        if ( typeof k === 'string') {
            ant.push(k)
        } else if ( k && k.children) {
            ant = ant.concat( getIds(k) );
        }
        return ant;
    }, []);
    emit('update:accounts', data);
}

</script>