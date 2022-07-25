<template>
	<!-- <div class="layout-menu-container"> -->
    <ul v-if="items">
		<template v-for="(item,i) of items">
			<li v-if="visible(item) && !item.separator" :key="item.label || i" :class="[{'layout-menuitem-category': root, 'active-menuitem': activeIndex === i && !item.to && !item.disabled}]" role="none">
				<template v-if="root">
					<div class="layout-menuitem-root-text" :aria-label="item.label">{{item.label}}</div>
					<app-menu :items="visible(item) && item.items" @menuitem-click="$emit('menuitem-click', $event)"></app-menu>
				</template>
				<template v-else>
					<router-link v-if="item.to" :to="item.to" :class="[item.class, 'p-ripple', {'p-disabled': item.disabled}]" :style="item.style" @click="onMenuItemClick($event,item,i)" :target="item.target" :aria-label="item.label" exact role="menuitem" v-ripple>
						<i :class="item.icon"></i>
						<span>{{item.label}}</span>
						<i v-if="item.items" class="pi pi-fw pi-angle-down menuitem-toggle-icon"></i>
						<Badge v-if="item.badge" :value="item.badge"></Badge>
					</router-link>
					<a v-if="!item.to" :href="item.url||'#'" :style="item.style" @click="onMenuItemClick($event,item,i)" :target="item.target" :aria-label="item.label" role="menuitem"  :class="[item.class, 'p-ripple', {'p-disabled': item.disabled}]" v-ripple>
						<i :class="item.icon"></i>
						<span>{{item.label}}</span>
						<i v-if="item.items" class="pi pi-fw pi-angle-down menuitem-toggle-icon"></i>
						<Badge v-if="item.badge" :value="item.badge"></Badge>
					</a>
                    
					<transition name="layout-submenu-wrapper">
						<app-menu v-show="activeIndex === i" :items="visible(item) && item.items" @menuitem-click="$emit('menuitem-click', $event)"></app-menu>
					</transition>
				</template>
			</li>
			<li class="p-menu-separator" :style="item.style" v-if="visible(item) && item.separator" :key="'separator' + i" role="separator"></li>
		</template>
	</ul>
	<!-- </div> -->
</template>

<script lang="ts" setup>
import { ref } from "vue";

const props = defineProps<{
  items: any,
  root?: boolean
}>()

const emit = defineEmits(['menuitem-click'])


const activeIndex = ref(null)

function visible(item: any) {
	return (typeof item.visible === 'function' ? item.visible() : item.visible !== false);
}

function onMenuItemClick(event:any, item:any, index:any) {
    if (item.disabled) {
        event.preventDefault();
        return;
    }
    if (!item.to && !item.url) {
        event.preventDefault();
    }
    if (item.command) {
        item.command({originalEvent: event, item: item});
    }
    activeIndex.value = index === activeIndex.value ? null : index;
    emit('menuitem-click', {
        originalEvent: event,
        item: item
    });
}            

</script>
