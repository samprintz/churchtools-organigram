<template>
  <v-combobox
    :model-value="displayValue"
    :label="label"
    multiple
    closable-chips
    chips
    :items="[]"
    hide-no-data
    hide-details
    density="compact"
    variant="outlined"
    :delimiters="[',']"
    @update:model-value="handleUpdate"
  />
</template>

<script setup lang="ts" generic="T extends string | number">
import { computed } from 'vue';

const props = defineProps<{
  modelValue: T[];
  label: string;
  type?: 'string' | 'number';
}>();

const emit = defineEmits<{
  'update:modelValue': [value: T[]];
}>();

const displayValue = computed<string[]>(() =>
  props.modelValue.map(String),
);

function toNumbers(values: string[]): number[] {
  return values
    .map((v) => {
      const s = v.trim();
      return s ? Number(s) : NaN;
    })
    .filter((n) => !isNaN(n));
}

function handleUpdate(raw: unknown): void {
  const values = (raw as string[]).map((v) => String(v).trim()).filter(Boolean);
  if (props.type === 'number') {
    emit('update:modelValue', toNumbers(values) as T[]);
  } else {
    emit('update:modelValue', values as T[]);
  }
}
</script>
