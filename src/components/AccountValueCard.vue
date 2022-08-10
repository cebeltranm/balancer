<template>
    <Card>
        <template #subtitle>
            {{props.name}}
        </template>
        <template #content>
            <div class="text-lg md:text-xl font-bold text-center">
                {{format.currency(props.value, props.currency)}}
            </div>
        </template>
        <!-- <template #footer>
            month
        </template> -->
    </Card>
</template>

<script lang="ts" setup>
    import format from '@/format';
    const props = defineProps<{
        name: string,
        value: number,
        currency: string,
    }>()
</script>