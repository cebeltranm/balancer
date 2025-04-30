<template>
<Toolbar>
    <template #start>
		<Button icon="pi pi-bars" variant="outlined" rounded aria-label="Menu" @click.stop="onMenuToggle"/>
    </template>

    <template #end> 
		<Button :icon="currencyIcon" variant="outlined" rounded aria-label="Currencies" @click="menuCurrencies?.toggle">
					<span v-if="currencyIconText">{{ currencyIconText }}</span>
		</Button>
		<Menu id="currencies_menu" ref="menuCurrencies" :model="currencies" :popup="true" />
		<div class="pl-2" />
		<Button icon="pi pi-plus" variant="outlined" rounded aria-label="Add transaction" @click="onAddTransaction"/>
		<div class="pl-2" />
		<Button :icon="{
						pi:true, 
						'pi-circle-fill': !inSync,
						'pi-spin': inSync,
						'pi-spinner': inSync,
						'text-green-500': !isPendingToSync,
						'text-red-500': isPendingToSync 
						}" variant="outlined" rounded raised aria-label="Add transaction" @click="() => store.dispatch('storage/sync')">
				</button>
		
	</template>
</Toolbar>
<TransactionEditDialog ref="transactionDialog"/>
</template>

<script lang="ts" setup>
import {ref, computed, inject} from 'vue';
import TransactionEditDialog from '@/components/TransactionEditDialog.vue';
import { useStore } from 'vuex';
import { Currency } from '@/types';
import { CURRENCY_ICONS } from '@/helpers/options';

const store = useStore();

const emit = defineEmits(['menu-toggle', 'topbar-menu-toggle']);
const transactionDialog = ref<InstanceType<typeof TransactionEditDialog> | null>(null);

const CURRENCY = inject('CURRENCY');

const isPendingToSync = computed(() => store.getters['storage/isPendingToSync'])
const inSync = computed(() => store.state.storage.status.inSync)
const currencyIcon = computed(() => CURRENCY_ICONS[CURRENCY.value] ? CURRENCY_ICONS[CURRENCY.value] : {'pi':true});
const currencyIconText= computed(() => CURRENCY_ICONS[CURRENCY.value] ? '' : CURRENCY.value);

const menuCurrencies = ref();
const currencies = computed( () => Object.keys(Currency).map( (c: string) => ({
	label: c,
	icon: CURRENCY_ICONS[Currency[c]],
	command: () => { CURRENCY.value = Currency[c]; },
})));

function onMenuToggle(event:any) {
	emit('menu-toggle', event);
}

function onAddTransaction() {
	transactionDialog.value?.show();
}

</script>