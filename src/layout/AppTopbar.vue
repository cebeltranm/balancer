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
			<!-- <li>
				<button class="p-link layout-topbar-button">
					<i class="pi pi-calendar"></i>
					<span>Events</span>
				</button>
			</li> -->
			<li>
				<button class="p-link layout-topbar-button" @click="onAddTransaction">
					<i class="pi pi-plus"></i>
					<span>Add transaction</span>
				</button>
			</li>
			<li>
				<button class="p-link layout-topbar-button">
					<i class="pi pi-cog"></i>
					<span>Settings</span>
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
import {defineEmits, ref} from 'vue';
import TransactionEditDialog from '@/components/TransactionEditDialog.vue';

const emit = defineEmits(['menu-toggle', 'topbar-menu-toggle']);
const transactionDialog = ref<InstanceType<typeof TransactionEditDialog> | null>(null);

function onMenuToggle(event:any) {
	emit('menu-toggle', event);
}

function onTopbarMenuToggle(event) {
	emit('topbar-menu-toggle', event);
}

function onAddTransaction() {
	transactionDialog.value?.show();
}
</script>