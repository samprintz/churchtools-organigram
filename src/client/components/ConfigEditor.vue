<template>
  <v-navigation-drawer v-model="model" location="right" width="360" temporary>
    <v-toolbar density="compact" color="surface">
      <v-toolbar-title class="text-subtitle-1 font-weight-bold">Display Settings</v-toolbar-title>
      <template #append>
        <v-btn icon="mdi-close" variant="text" size="small" @click="model = false" />
      </template>
    </v-toolbar>

    <v-divider />

    <div v-if="localConfig" class="pa-4">
      <v-switch
        v-model="localConfig.showCoLeaders"
        label="Show Co-Leaders"
        color="primary"
        density="compact"
        hide-details
        class="mb-3"
      />

      <v-switch
        v-model="localConfig.showInactiveGroups"
        label="Show Inactive Groups"
        color="primary"
        density="compact"
        hide-details
        class="mb-3"
      />

      <v-select
        v-model="localConfig.theme"
        label="Theme"
        :items="themeOptions"
        density="compact"
        variant="outlined"
        hide-details
        class="mb-4"
      />

      <template v-if="localConfig.groupTypes.length > 0">
        <v-divider class="my-3" />
        <div class="text-caption text-medium-emphasis mb-2">Group Type Colors</div>
        <div
          v-for="(gt, gtIdx) in localConfig.groupTypes"
          :key="gtIdx"
          class="d-flex align-center mb-2 gap-2"
        >
          <v-text-field
            v-model="gt.name"
            label="Name"
            density="compact"
            variant="outlined"
            hide-details
            class="flex-grow-1"
          />
          <div
            :style="{ width: '32px', height: '32px', borderRadius: '4px', background: gt.color, border: '1px solid rgba(128,128,128,0.4)', cursor: 'pointer', flexShrink: 0 }"
            @click="openColorPicker(gtIdx)"
          />
          <input
            :ref="(el) => setColorInputRef(el, gtIdx)"
            type="color"
            :value="gt.color"
            style="position: absolute; opacity: 0; width: 0; height: 0; pointer-events: none;"
            @input="onColorInput(gtIdx, $event)"
          />
        </div>
      </template>

      <v-alert v-if="saveError" type="error" density="compact" class="mb-3">
        {{ saveError }}
      </v-alert>

      <v-btn color="primary" block :loading="saving" class="mt-4" @click="save">
        Save
      </v-btn>
    </div>

    <div v-else class="pa-4 text-center text-medium-emphasis">
      Loading config…
    </div>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { AppConfig } from '../../shared/types';

const model = defineModel<boolean>({ required: true });

const props = defineProps<{
  config: AppConfig;
  saving: boolean;
  saveError: string | null;
}>();

const emit = defineEmits<{
  save: [config: AppConfig];
}>();

const themeOptions = [
  { title: 'System', value: 'system' },
  { title: 'Light', value: 'light' },
  { title: 'Dark', value: 'dark' },
];

const localConfig = ref<AppConfig | null>(null);
const colorInputRefs = ref<Record<number, HTMLInputElement>>({});

function setColorInputRef(el: unknown, idx: number): void {
  if (el instanceof HTMLInputElement) {
    colorInputRefs.value[idx] = el;
  }
}

function openColorPicker(idx: number): void {
  colorInputRefs.value[idx]?.click();
}

function onColorInput(idx: number, event: Event): void {
  if (!localConfig.value) return;
  const input = event.target as HTMLInputElement;
  localConfig.value.groupTypes[idx].color = input.value;
}

watch(
  () => props.config,
  (newConfig) => {
    if (newConfig) {
      localConfig.value = JSON.parse(JSON.stringify(newConfig)) as AppConfig;
    }
  },
  { immediate: true },
);

function save(): void {
  if (localConfig.value) {
    emit('save', localConfig.value);
  }
}
</script>
