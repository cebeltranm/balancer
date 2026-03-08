<template>
  <Chart
    type="line"
    :data="barData[0]"
    :options="{
      plugins: { legend: { labels: { color: '#ffffff' } } },
      scales: {
        x: { stacked: false },
        y: { position: 'left' },
        y1: { position: 'right' },
      },
    }"
  />
</template>
<script lang="ts" setup>
import { type Ref, inject, computed } from "vue";
import { Period, type PeriodOption } from "@/types";
import {
  getCurrentPeriod,
  increasePeriod,
  BACKGROUNDS_COLOR_GRAPH,
} from "@/helpers/options.js";

const _CURRENCY: Ref | undefined = inject("CURRENCY");

const props = defineProps<{
  total: any[];
  period: PeriodOption;
}>();

const barData = computed(() => {
  const data = props.total;
  let currentPeriod = getCurrentPeriod();
  const labels = [];
  for (let i = 1; i < data.length + 1; i++) {
    labels.push(
      `${currentPeriod.year}${props.period.type === Period.Month ? "/" + currentPeriod.month : ""}${props.period.type === Period.Quarter ? "/" + currentPeriod.quarter : ""}`,
    );
    currentPeriod = increasePeriod(props.period.type, currentPeriod, -1);
  }
  return [
    {
      title: "TOTAL",
      labels: labels.reverse(),
      datasets: [
        {
          type: "line",
          label: "Value",
          yAxisID: "y",
          backgroundColor: BACKGROUNDS_COLOR_GRAPH[0],
          borderColor: BACKGROUNDS_COLOR_GRAPH[0],
          data: data.map((d) => d.value || 0).reverse(),
        },
        {
          type: "line",
          label: "Invested",
          yAxisID: "y",
          backgroundColor: BACKGROUNDS_COLOR_GRAPH[1],
          borderColor: BACKGROUNDS_COLOR_GRAPH[1],
          data: [...data].reverse().reduce((ant, v) => {
            if (!ant) {
              return [v.value];
            }
            ant.push(
              Math.max(
                ant[ant.length - 1] +
                  v.in +
                  (v.in_local || 0) +
                  v.expenses -
                  v.out -
                  (v.out_local || 0),
                0,
              ) || 0,
            );
            return ant;
          }, undefined),
        },
        {
          type: "bar",
          label: "G/P",
          yAxisID: "y1",
          backgroundColor: BACKGROUNDS_COLOR_GRAPH[4],
          data: data.map((d) => 100 * d.gp).reverse(),
        },
      ],
    },
  ];
});
</script>
