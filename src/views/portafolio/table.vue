<template>
    <div class="investments-table">
        <TreeTable :value="accountsGrouped" responsiveLayout="scroll" scrollDirection="both" :resizableColumns="true"
            columnResizeMode="fit" showGridlines :scrollable="true">
            <Column field="name" header="Name" footer="Total" :expander="true"
                :style="`width:${isDesktop() ? 350 : 250}px; z-index:1;`" :frozen="isDesktop()">
                <template #body="{ node }">
                    <div class="flex flex-row flex-wrap">
                        <div class="align-items-center justify-content-center mr-2" v-if="!node.data.isCategory">
                            <Avatar v-if="node.data.logo" :image="node.data.logo"
                                :size="isDesktop() ? 'large' : 'small'" />
                            <div v-else class="w-3rem h-3rem">&nbsp;</div>
                        </div>
                        <div class="align-items-center justify-content-center">
                            <span>{{ node.data.name }}</span> <br />
                            <span v-if="node.data.code" class="text-xs"><a
                                    :href="'https://finance.yahoo.com/quote/' + node.data.code" target="_blank">({{
                                    node.data.code }})</a></span>
                        </div>
                    </div>
                </template>
            </Column>
            <Column header="Net Transfer" style="width:200px">
                <template #body="{ node }">
                    <div :class="{ 'text-right': true, 'w-full': true, 'text-red-400': getInOut(node.data.values[0], node.data.isCategory) < 0, 'text-green-400': getInOut(node.data.values[0], node.data.isCategory) > 0 }"
                        v-tooltip.bottom="'IN: ' + $format.currency(node.data.values[0].in, node.data.currency || CURRENCY) +
                            '\nOUT: ' + $format.currency(node.data.values[0].out, node.data.currency || CURRENCY) +
                            '\nLOCAL IN: ' + $format.currency(node.data.values[0].in_local, node.data.currency || CURRENCY) +
                            '\nLOCAL OUT: ' + $format.currency(node.data.values[0].out_local, node.data.currency || CURRENCY)">
                        {{ $format.currency(getInOut(node.data.values[0], node.data.isCategory), node.data.currency ||
                            CURRENCY) }}
                    </div>
                </template>
                <template #footer>
                    <div
                        :class="{ 'text-right': true, 'w-full': true, 'text-red-400': getInOut(total[0]) < 0, 'text-green-400': getInOut(total[0]) > 0 }">
                        {{ $format.currency(getInOut(total[0]), CURRENCY) }}</div>
                </template>
            </Column>
            <Column header="Expenses" style="width:150px">
                <template #body="{ node }">
                    <div
                        :class="{ 'text-right': true, 'w-full': true, 'text-red-400': node.data.values[0].expenses > 0 }">
                        {{ $format.currency(node.data.values[0].expenses, node.data.currency || CURRENCY) }}
                    </div>
                </template>
                <template #footer>
                    <div :class="{ 'text-right': true, 'w-full': true, 'text-red-400': total[0].expenses > 0, 'text-green-400': total[0].expenses < 0 }"
                        v-if="total && total.length > 0">{{ $format.currency(total[0].expenses, CURRENCY) }}
                    </div>
                </template>
            </Column>
            <Column header="G/P" style="width:100px">
                <template #body="{ node }">
                    <div :class="{ 'text-right': true, 'w-full': true, 'text-red-400': node.data.values[0].gp < 0, 'text-green-400': node.data.values[0].gp > 0 }"
                        v-tooltip.bottom="$format.currency(node.data.values[0].gp_value, node.data.currency || CURRENCY)">
                        {{ $format.percent(node.data.values[0].gp) }}
                    </div>
                </template>
                <template #footer>
                    <div :class="{ 'text-right': true, 'w-full': true, 'text-red-400': total[0].gp < 0, 'text-green-400': total[0].gp > 0 }"
                        v-if="total && total.length > 0"
                        v-tooltip.bottom="$format.currency(total[0].gp_value, CURRENCY)">
                        {{ $format.percent(total[0].gp) }}
                    </div>
                </template>
            </Column>
            <Column header="Balance" style="width:200px">
                <template #body="{ node }">
                    <div class="w-full text-right">
                        <div>
                            {{ $format.currency(node.data.values[0].value, node.data.currency || CURRENCY) }}
                        </div>
                        <div v-if="node.data.values[0].units" class="text-sm">
                            ({{ $format.number(node.data.values[0].units) }} und)</div>
                    </div>
                </template>
                <template #footer>
                    <div :class="{ 'text-right': true, 'w-full': true }" v-if="total && total.length > 0">{{
                        $format.currency(total[0].value, CURRENCY) }}</div>
                </template>
            </Column>
        </TreeTable>
    </div>
</template>
<script lang="ts" setup>
import { isDesktop } from '@/helpers/browser';
import { watch, inject, type Ref } from 'vue';

const CURRENCY: Ref | undefined = inject('CURRENCY');

const props = defineProps<{
    accountsGrouped?: any[];
    total?: any[];
}>();

function getInOut(val: any, isCategory?: boolean) {
    if (isCategory) {
        return val ? val.in - val.out : 0;
    }
    return val ? val.in + (val.in_local || 0) - val.out - (val.out_local || 0) : 0
}

</script>
<style lang="scss" scoped>
.investments-table {
    height: calc(100vh - 130px);
}

@media (max-width: 600px) {
    .investments-table {
        height: calc(100vh - 11rem);
    }
}
</style>