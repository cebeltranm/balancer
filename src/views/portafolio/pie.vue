<template>
  <GChart
    :settings="{ packages: ['corechart', 'treemap'] }"
    type="TreeMap"
    :data="treeMap.data"
    :options="treeMap.options"
    @ready="
      () => {
        onChartReady = true;
      }
    "
  />
  <TreeTable
    :value="accountsGrouped"
    responsiveLayout="scroll"
    scrollDirection="both"
    :resizableColumns="true"
    columnResizeMode="fit"
    showGridlines
    :scrollable="true"
  >
    <Column
      field="name"
      header="Asset"
      :expander="true"
      :style="`width:${isDesktop() ? 350 : 250}px; z-index:1;`"
      :frozen="isDesktop()"
    >
      <template #body="{ node }">
        <div class="flex flex-row flex-wrap">
          <div class="align-items-center justify-content-center">
            <span>{{ node.data.name }}</span> <br />
          </div>
        </div>
      </template>
    </Column>
    <Column header="Value" style="width: 200px">
      <template #body="{ node }">
        <div class="w-full text-right">
          <div>
            {{
              $format.currency(
                node.data.values[0].value,
                node.data.currency || CURRENCY,
              )
            }}
          </div>
        </div>
      </template>
    </Column>
    <Column header="%" style="width: 60px">
      <template #body="{ node }">
        <div class="w-full text-right">
          <div v-if="node.data.currency || CURRENCY === CURRENCY">
            {{ $format.percent(node.data.values[0].value / total[0].value) }}
          </div>
        </div>
      </template>
    </Column>
    <Column header="Expected" style="width: 60px">
      <template #body="{ node }">
        <div class="w-full text-right">
          <div v-if="node.data.expected">
            {{ $format.percent(node.data.expected) }}
          </div>
        </div>
      </template>
    </Column>
    <Column header="Diff" style="width: 200px">
      <template #body="{ node }">
        <div
          :class="{
            'text-right': true,
            'w-full': true,
            'text-red-400':
              total[0].value * node.data.expected >
                node.data.values[0].value * (1 + DIFF_PERCENT) ||
              total[0].value * node.data.expected <
                node.data.values[0].value * (1 - DIFF_PERCENT),
          }"
          v-if="
            (node.data.currency || CURRENCY === CURRENCY) && node.data.expected
          "
        >
          <div>
            {{
              $format.currency(
                total[0].value * node.data.expected - node.data.values[0].value,
                node.data.currency || CURRENCY,
              )
            }}
          </div>
        </div>
      </template>
    </Column>
  </TreeTable>
</template>
<script lang="ts" setup>
import { type Ref, ref, inject, computed } from "vue";
import { isDesktop } from "@/helpers/browser";
import format from "@/format";
import { useValuesStore } from "@/stores/values";

const CURRENCY: Ref | undefined = inject("CURRENCY");

const DIFF_PERCENT = 0.3;

const props = defineProps<{
  accountsGrouped?: any[];
  total: any[];
  date: Date;
}>();

const onChartReady = ref(false);

const valuesStore = useValuesStore();

const treeMap = computed(() => {
  const groupElements = (group: any, parent: string, parentArr: any[]) => {
    const values = group
      .filter((g) => g.data.values[0].value)
      .map((g: any) => {
        return g.data.currency === CURRENCY.value
          ? g.data.values[0].value
          : g.data.values[0].value *
              valuesStore.getValue(props.date, g.data.currency, CURRENCY.value);
      });
    const total = values.reduce((ant, g) => ant + g, 0);
    const res = group
      .filter((g) => g.data.values[0].value)
      .reduce((arr: any[], g: any, index: number) => {
        // const n = parent !== 'Total' ? `${parent}::${g.data.name}` : g.data.name;
        let n = g.data.name;
        const childsByName = arr.filter((ch) => ch[0].startsWith(n));
        if (childsByName.length > 0) {
          n = `${n} ${childsByName.length + 1}`;
        }
        arr.push([
          n,
          parent,
          values[index],
          -100 * g.data.values[0].gp,
          values[index] / total,
          g.data.values[0].gp,
          g.data.fullName,
        ]);
        if (g.children) {
          groupElements(g.children, n, arr);
        }
        return arr;
      }, parentArr);
    return [["Total", null, total, 0, 1, 0, ""], ...res];
  };
  let gdata: any = [
    ["Invest", "Parent", "Value", "Diff", "%", "gp", "fullName"],
    ["Total", null, 0, 0, 1, 0, "Total"],
  ];
  if (onChartReady.value && window?.google?.visualization) {
    const byValue = props.accountsGrouped;

    let dataTable = groupElements(byValue, "Total", []);
    const min = Math.min(...dataTable.map((t) => t[3])) || -1;
    const max = Math.max(...dataTable.map((t) => t[3])) || 1;
    dataTable = dataTable.map((t, _index) => [
      t[0],
      t[1],
      t[2],
      t[3] < 0 ? (-100 * t[3]) / min : (100 * t[3]) / max,
      t[4],
      t[5],
      t[6],
    ]);

    gdata = window.google.visualization.arrayToDataTable([
      ["Invest", "Parent", "Value", "Diff", "%", "gp", "fullName"],
      ...dataTable,
    ]);
  }
  return {
    data: gdata,
    options: {
      nableHighlight: true,
      maxDepth: 1,
      maxPostDepth: 2,
      minHighlightColor: "#8c6bb1",
      midHighlightColor: "#9ebcda",
      maxHighlightColor: "#edf8fb",
      minColor: "#009688",
      midColor: "#f7f7f7",
      maxColor: "#ee8100",
      headerHeight: 20,
      showScale: true,
      height: 500,
      useWeightedAverageForAggregation: true,
      generateTooltip: (row, _value, _size) => {
        return (
          '<div class="bg-blue-900 border-blue-100 p-2 border-3">' +
          "<span>" +
          (gdata.getValue && gdata.getValue(row, 6)) +
          "</span><br />" +
          "<span>" +
          (gdata.getValue &&
            format.currency(gdata.getValue(row, 2), CURRENCY.value)) +
          "</span><br />" +
          "<span>" +
          (gdata.getValue && format.percent(gdata.getValue(row, 4))) +
          "</span><br />" +
          "<span>gp " +
          (gdata.getValue && format.percent(gdata.getValue(row, 5))) +
          "</span><br />" +
          "</div>"
        );
      },
    },
  };
});
</script>
