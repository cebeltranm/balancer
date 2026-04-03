<template>
  <Dialog
    v-model:visible="visible"
    :style="{ width: 'min(26rem, 96vw)' }"
    header="New transaction"
    :modal="true"
  >
    <div class="flex flex-column gap-3">
      <Button
        label="Expenses"
        icon="pi pi-wallet"
        class="w-full"
        severity="contrast"
        @click="openExpenseDialog"
      />
      <Button
        label="Transfer"
        icon="pi pi-arrow-right-arrow-left"
        class="w-full"
        outlined
        @click="openTransferDialog"
      />
      <Button
        label="General"
        icon="pi pi-list"
        class="w-full"
        outlined
        @click="openGenericDialog"
      />
    </div>
  </Dialog>

  <TransactionExpenseDialog ref="expenseDialog" />
  <TransactionTransferDialog ref="transferDialog" />
  <TransactionEditDialog ref="genericDialog" />
</template>

<script lang="ts" setup>
import { ref } from "vue";
import TransactionEditDialog from "@/components/TransactionEditDialog.vue";
import TransactionExpenseDialog from "@/components/TransactionExpenseDialog.vue";
import TransactionTransferDialog from "@/components/TransactionTransferDialog.vue";

const visible = ref(false);
const expenseDialog = ref<InstanceType<typeof TransactionExpenseDialog> | null>(
  null,
);
const transferDialog = ref<InstanceType<
  typeof TransactionTransferDialog
> | null>(null);
const genericDialog = ref<InstanceType<typeof TransactionEditDialog> | null>(
  null,
);

function show() {
  visible.value = true;
}

function close() {
  visible.value = false;
}

function openExpenseDialog() {
  close();
  expenseDialog.value?.show();
}

function openTransferDialog() {
  close();
  transferDialog.value?.show();
}

function openGenericDialog() {
  close();
  genericDialog.value?.show();
}

defineExpose({
  show,
  close,
});
</script>
