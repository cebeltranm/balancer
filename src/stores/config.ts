import { defineStore } from 'pinia';
import { computed, ref, type Ref } from 'vue';
import { readJsonFile } from '@/helpers/files';

function groupComposition(composition: any) {
    const data = Object.keys(composition).reduce((data: any, key) => {
        const item = composition[key];
        if (typeof item === 'number') {
            if (data[key]) {
                data[key].value += item;
            } else {
                data[key] = { value: item };
            }
        }
        if (typeof item === 'object' && item !== null) {
            data[key] = groupComposition(item);
        }
        return data;
    }, {});
    data.value = Object.keys(data).reduce((sum: number, key: any) => sum + (data[key].value || 0), 0);
    return data;
}


export const useConfigStore = defineStore('config', () => {

    const config: Ref<any> = ref({});


    const invCompositionByAssetClass = computed(() => {
        return config.value && config.value.inv_composition && groupComposition(config.value.inv_composition);
    })

    const invCompositionByRegion = computed(() => {
        if (config.value && config.value.inv_composition) {
            const data: any = {};
            Object.keys(config.value.inv_composition).forEach((asset: any) => {
                Object.keys(config.value.inv_composition[asset]).forEach((region: any) => {
                    if (!data[region]) {
                        data[region] = {};
                    }
                    if (!data[region][asset]) {
                        data[region][asset] = {};
                    }
                    Object.keys(config.value.inv_composition[asset][region]).forEach((type: any) => {
                        if (data[region][asset][type]) {
                            data[region][asset][type] = data[region][asset][type] + config.value.inv_composition[asset][region][type];
                        } else {
                            data[region][asset][type] = config.value.inv_composition[asset][region][type];
                        }
                    });
                });
            });
            return groupComposition(data);
        }
        return {};
    })

    async function loadConfig(reload: boolean) {
        if (!reload && Object.keys(config.value).length > 0) {
            return config.value;
        }
        config.value = await readJsonFile('config.json', !reload);
        return config.value;
    }

    return { config, invCompositionByAssetClass, invCompositionByRegion, loadConfig };
});