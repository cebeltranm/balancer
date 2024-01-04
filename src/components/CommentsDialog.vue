<template>
    <Dialog v-model:visible="visible" header="Comments" :modal="true" class="p-fluid" :pt="{
        mask: {
            style: 'backdrop-filter: blur(2px)'
        }
    }">
     <ul class="m-0 p-1 flex flex-column gap-2 w-full">
        <template v-for="comment in comments" :key="comment.d">
            <li
                :class="['p-2 hover:surface-hover flex align-items-center justify-content-between border-bottom-1 surface-border']"
            >
            <div v-if="editing === comment.d" class="flex-grow-1 flex">
                <Textarea class="mr-2" v-model="value" autoResize rows="1" cols="40" />
            </div>
            <p v-else class="flex-grow-1 flex" @click="editing=comment.d;value = comment.m">{{ comment.m }}</p>
            <div class="flex-none flex">
                <!-- <Button v-if="editing !== comment.d" icon="pi pi-file-edit" size="small" aria-label="Filter" @click="editing=comment.d;value = comment.m"/> -->
                <Button v-if="editing !== comment.d" icon="pi pi-eraser" size="small" severity="danger" aria-label="Filter" @click="deleteComment(comment.d)" />

                <Button v-if="editing == comment.d" icon="pi pi-check" size="small" aria-label="Filter" @click="editing=updateComment(comment.d)"/>
                <Button v-if="editing == comment.d" icon="pi pi-times" size="small" severity="danger" aria-label="Filter" @click="editing=undefined;value=''" />
            </div>
            </li>
        </template>
        <li v-if="!editing" :class="['p-2 hover:surface-hover flex align-items-center justify-content-between']" >
            <div class="flex-grow-1 flex">
                <Textarea class="mr-2" v-model="value" autoResize rows="1" cols="40" />
            </div>
            <div class="flex-none flex">
                <Button icon="pi pi-plus" size="small" aria-label="Filter" @click="addComment" />
            </div>
        </li>
        </ul>

        <template #footer>
            <div class="flex flex-row-reverse">
                <Button label="Save" @click="handleSubmit" />
                <Button label="Cancel" @click="close" class="p-button-text" />
            </div>
        </template>
    </Dialog>

</template>

<script lang="ts" setup>
import { ref, toRaw } from "vue";
import type {Ref} from "vue";

const emit = defineEmits(['update:modelValue'])


const visible = ref(false);
const value: any = ref("");
const comments: Ref<any[]> = ref([])
const editing: any = ref("");

function handleSubmit() {
    if(value.value && value.value.trim() !== '') { 
        if (editing.value) {
            updateComment(editing.value);
        } else {
            addComment();
        }
    }
    emit('update:modelValue', toRaw(comments.value))
    close();
}

function addComment() {
    if(value.value && value.value.trim() !== '') {
        comments.value.push({m:value.value, d:Date.now()});
        value.value = "";
    }
}
function deleteComment(d: any) {
    comments.value = comments.value.filter(c => c.d !== d);
}
function updateComment(d : any) {
    if(value.value && value.value.trim() !== '') {
        const comment = comments.value.find(c => c.d === d);
        if (comment) {
            comment.m = value.value;
        }
        editing.value = undefined;
        value.value = "";
    } else {
        deleteComment(d);
    }
}

function show(c: any[]) {
    comments.value = c || [];
    value.value = "";
    editing.value = undefined;
    visible.value = true;
}

function close() {
  visible.value = false;
}

defineExpose({
  show, close
})

</script>
