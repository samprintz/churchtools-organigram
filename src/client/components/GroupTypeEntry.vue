<template>
  <div class="d-flex align-center" style="gap: 16px;">
    <div class="d-flex flex-wrap align-center flex-grow-1" style="gap: 16px;">
      <v-text-field
        :model-value="modelValue.id"
        label="Type ID"
        density="compact"
        variant="outlined"
        type="number"
        hide-details
        class="type-id-field flex-shrink-0"
        @update:model-value="
          (v) => emit('update:modelValue', { ...modelValue, id: Number(v) })
        "
      />
      <ChipInput
        :model-value="modelValue.leaderRoleIds"
        label="Leader Role IDs"
        type="number"
        hide-details
        class="chip-input flex-grow-1"
        @update:model-value="
          (v) => emit('update:modelValue', { ...modelValue, leaderRoleIds: v })
        "
      />
      <ChipInput
        :model-value="modelValue.coLeaderRoleIds"
        label="Co-Leader Role IDs"
        type="number"
        hide-details
        class="chip-input flex-grow-1"
        @update:model-value="
          (v) =>
            emit('update:modelValue', { ...modelValue, coLeaderRoleIds: v })
        "
      />
    </div>
    <v-btn
      icon="mdi-delete-outline"
      size="x-small"
      variant="tonal"
      color="error"
      @click="emit('remove')"
    />
  </div>
</template>

<script setup lang="ts">
import type { GroupTypeConfig } from '../../shared/types';
import ChipInput from './ChipInput.vue';

defineProps<{
  modelValue: GroupTypeConfig;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: GroupTypeConfig];
  remove: [];
}>();
</script>

<style scoped>
.type-id-field {
  max-width: 90px;
}

.chip-input {
  width: 150px;
}
</style>
