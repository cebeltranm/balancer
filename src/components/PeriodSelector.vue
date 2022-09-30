<template>
    <Button icon="pi pi-caret-left" @click="changePeriod(-1)" v-if="!props.onlyType" />
    <Dropdown v-model="typePeriod" :options="periodTypes" optionLabel="name" optionValue="value"  placeholder="Select a Period" class="pt-1 pb-1 ml-1 mr-1 w-12rem text-center" panelClass="z-5" v-if="!props.onlyPeriod" @update:model-value="onChange" />
    <div  class="p-2 w-12rem text-center text-xl font-bold" v-if="props.onlyPeriod">
        {{ periodLabel(typePeriod, selectedPeriod)}}
    </div>
    <Button icon="pi pi-caret-right" class="ml-0" @click="changePeriod(1)" :disabled="!canIncrease" v-if="!props.onlyType" />
</template>

<script lang="ts" setup>
  import { computed, ref, onMounted, watch } from 'vue'
  import { Period } from '@/types';
  import { getCurrentPeriod, increasePeriod, periodLabel } from '@/helpers/options.js';
  import format from '@/format';

  const props = defineProps<{
    period: {
        type: Period,
        value: {
            year: number,
            month: number,
            quarter: number,
        }
    },
    onlyPeriod?: boolean,
    onlyType?: boolean,
  }>()
  
    const emit = defineEmits(['update:period'])

    const typePeriod = ref(Period.Month);
    const selectedPeriod = ref(getCurrentPeriod());

    const periodTypes = computed(() => {
    const year = props.onlyType ? 'Year' : `${selectedPeriod.value.year}`;
    const quarter = props.onlyType ? 'Quarter' : `${selectedPeriod.value.year} / Q${selectedPeriod.value.quarter}`;
    const month = props.onlyType ? 'Month' : `${selectedPeriod.value.year} / ${format.month(selectedPeriod.value.month)}`;

    return [
      {name: month, value: Period.Month},
      {name: quarter, value: Period.Quarter},
      {name: year, value: Period.Year},
    ];
  })

  const canIncrease = computed(() => {
    const current = getCurrentPeriod();
    return !(selectedPeriod.value.year >= current.year && ( typePeriod.value === Period.Year ||
      (typePeriod.value === Period.Month && selectedPeriod.value.month >= current.month) ||
      (typePeriod.value === Period.Quarter && selectedPeriod.value.quarter >= current.quarter)
    ));
  })

  function changePeriod(periods: number) {
    selectedPeriod.value = increasePeriod(typePeriod.value, selectedPeriod.value, periods);
    onChange();
  }

  function onChange(){
    emit('update:period', {value: selectedPeriod.value, type: typePeriod.value});
  }

  watch(props.period, () => {
    selectedPeriod.value = props.period.value;
    typePeriod.value = props.period.type;
  })

  onMounted(() => {
    selectedPeriod.value = props.period.value;
    typePeriod.value = props.period.type;
  })

</script>