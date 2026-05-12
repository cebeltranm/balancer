import { defineStore } from "pinia";
import { computed, ref, type Ref } from "vue";
import { readJsonFile, writeJsonFile } from "@/helpers/files";
import { assertRecordFile, normalizeConfig } from "@/helpers/persistedShapes";

function groupComposition(composition: any) {
  const data = Object.keys(composition).reduce((data: any, key) => {
    const item = composition[key];
    if (typeof item === "number") {
      if (data[key]) {
        data[key].value += item;
      } else {
        data[key] = { value: item };
      }
    }
    if (typeof item === "object" && item !== null) {
      data[key] = groupComposition(item);
    }
    return data;
  }, {});
  data.value = Object.keys(data).reduce(
    (sum: number, key: any) => sum + (data[key].value || 0),
    0,
  );
  return data;
}

export const useConfigStore = defineStore("config", () => {
  const config: Ref<any> = ref({});

  const invCompositionByAssetClass = computed(() => {
    if (
      config.value &&
      config.value.inv_composition &&
      Object.keys(config.value.inv_composition).length > 0
    ) {
      return groupComposition(config.value.inv_composition);
    }
    return {};
  });

  const invCompositionByRegion = computed(() => {
    if (
      config.value &&
      config.value.inv_composition &&
      Object.keys(config.value.inv_composition).length > 0
    ) {
      const data: any = {};
      Object.keys(config.value.inv_composition).forEach((asset: any) => {
        Object.keys(config.value.inv_composition[asset]).forEach(
          (region: any) => {
            if (!data[region]) {
              data[region] = {};
            }
            if (!data[region][asset]) {
              data[region][asset] = {};
            }
            Object.keys(config.value.inv_composition[asset][region]).forEach(
              (type: any) => {
                if (data[region][asset][type]) {
                  data[region][asset][type] =
                    data[region][asset][type] +
                    config.value.inv_composition[asset][region][type];
                } else {
                  data[region][asset][type] =
                    config.value.inv_composition[asset][region][type];
                }
              },
            );
          },
        );
      });
      return groupComposition(data);
    }
    return {};
  });

  async function loadConfig(reload: boolean) {
    if (!reload && Object.keys(config.value).length > 0) {
      return config.value;
    }
    const loadedConfig = (await readJsonFile("config.json", !reload)) || {};
    assertRecordFile("config.json", loadedConfig);
    config.value = normalizeConfig(loadedConfig);
    return config.value;
  }

  async function saveConfig(nextConfig: Record<string, any>) {
    const saved = await writeJsonFile("config.json", nextConfig);
    if (saved) {
      config.value = nextConfig;
    }
    return saved;
  }

  return {
    config,
    invCompositionByAssetClass,
    invCompositionByRegion,
    loadConfig,
    saveConfig,
  };
});
