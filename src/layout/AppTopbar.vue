<template>
	<div class="layout-topbar">
		<button class="p-link layout-menu-button layout-topbar-button" @click.stop="onMenuToggle">
			<i class="pi pi-bars"></i>
		</button>

		<!-- <button class="p-link layout-topbar-menu-button layout-topbar-button"
			v-styleclass="{ selector: '@next', enterClass: 'hidden', enterActiveClass: 'scalein', 
			leaveToClass: 'hidden', leaveActiveClass: 'fadeout', hideOnOutsideClick: true}">
			<i class="pi pi-ellipsis-v"></i>
		</button> -->
		<ul class="layout-topbar-menu lg:flex origin-top">
			<li>
				<button class="p-link layout-topbar-button"  @click="menuCurrencies.toggle">
					<i v-if="CURRENCY_ICONS[CURRENCY]" :class="CURRENCY_ICONS[CURRENCY]"></i>
					<i v-else class="pi">{{CURRENCY}}</i>
					<span>Currency</span>
				</button>
				<Menu id="currencies_menu" ref="menuCurrencies" :model="currencies" :popup="true" />
			</li>
			<li>
				<button class="p-link layout-topbar-button" @click="onAddTransaction">
					<i class="pi pi-plus"></i>
					<span>Add transaction</span>
				</button>
			</li>
			<li>
				<button class="p-link layout-topbar-button" @click="() => store.dispatch('storage/sync')">
					<i :class="{
						pi:true, 
						'pi-circle-fill': !inSync,
						'pi-spin': inSync,
						'pi-spinner': inSync,
						'text-green-500': !isPendingToSync,
						'text-red-500': isPendingToSync 
						}"></i>
					<span>Sync</span>
				</button>
			</li>
			<!-- <li>
				<button class="p-link layout-topbar-button">
					<i class="pi pi-user"></i>
					<span>Profile</span>
				</button>
			</li> -->
		</ul>

		<TransactionEditDialog ref="transactionDialog"/>
	</div>
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

const isPendingToSync = computed(() => store.getters['storage/isPendingToSync'])
const inSync = computed(() => store.state.storage.status.inSync)

const CURRENCY = inject('CURRENCY');

const menuCurrencies = ref();
const currencies = computed( () => Object.keys(Currency).map( (c: string) => ({
	label: c,
	icon: CURRENCY_ICONS[Currency[c]],
	command: () => { CURRENCY.value = Currency[c]; },
})));


function onMenuToggle(event:any) {
	emit('menu-toggle', event);
}

function onTopbarMenuToggle(event:any) {
	emit('topbar-menu-toggle', event);
}

function onAddTransaction() {
	transactionDialog.value?.show();
}

</script>