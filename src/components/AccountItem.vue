<template>
<v-list-group v-if="account.childs && Object.keys(account.childs).length > 0" :collapse-icon="null" :expand-icon="null">
    <template v-slot:activator="{ props }">
        <v-list-item :value="account.id" v-bind="props">
            <v-list-item-avatar start>
                <v-icon :icon="props.active ? 'expand_less' : 'expand_more'"></v-icon>
            </v-list-item-avatar>
            <v-list-item-header>
                <v-list-item-title>{{account.name}}</v-list-item-title>
                <v-list-item-subtitle>
                    <v-progress-linear v-if="account.budget && account.value" :model-value="100*account.value/account.budget"></v-progress-linear>
                    <template v-else>{{account.description}}</template>
                </v-list-item-subtitle>
           </v-list-item-header>
            <template v-slot:append>
                <div :class="valueClass"> {{$formatNumber( account.value, {style: 'currency', currency: account.currency})}}</div>
            </template>
        </v-list-item>    
    </template>
    <AccountItem v-for="child in account.childs" :key="child.id" :account="child" />
</v-list-group>

<v-list-item v-else :value="account.id">
    <v-list-item-avatar start>
        
    </v-list-item-avatar>
    <v-list-item-header>
        <v-list-item-title>{{account.name}}</v-list-item-title>
        <v-list-item-subtitle>
            <v-progress-linear v-if="account.budget && account.value" :model-value="100*account.value/account.budget"></v-progress-linear>
            <template v-else>{{account.description}}</template>
        </v-list-item-subtitle>
    </v-list-item-header>
    <template v-slot:append>
        <div :class="valueClass"> {{$formatNumber( account.value, {style: 'currency', currency: account.currency})}}</div>
    </template>
</v-list-item>

</template>

<script lang='ts' setup>
import type { Account } from '@/types';

const props = defineProps<{
  account: Account
}>()

const valueClass: string = props.account.value && props.account.budget ? 
    ( props.account.budget > props.account.value ? 'text-green-lighten-1' : 'text-red-lighten-1' ) :  '';


</script>
