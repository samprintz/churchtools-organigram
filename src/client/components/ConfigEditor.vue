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
const skipNextSave = ref(false);

watch(
  () => props.config,
  (newConfig) => {
    if (newConfig) {
      skipNextSave.value = true;
      localConfig.value = JSON.parse(JSON.stringify(newConfig)) as AppConfig;
    }
  },
  { immediate: true },
);

watch(
  localConfig,
  (newConfig) => {
    if (skipNextSave.value) {
      skipNextSave.value = false;
      return;
    }
    if (newConfig) {
      emit('save', newConfig);
    }
  },
  { deep: true },
);
</script>
