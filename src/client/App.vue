<template>
  <v-app :theme="appliedTheme">
    <Toolbar
      :loading="orgLoading"
      :has-data="!!organigram"
      @fetch="onFetch"
      @upload="onUpload"
      @download-json="orgDownloadJson()"
      @download-svg="onDownloadSvg"
      @toggle-config="configDrawerOpen = !configDrawerOpen"
    />

    <ConfigEditor
      v-model="configDrawerOpen"
      :config="config"
      :saving="configLoading"
      :save-error="configSaveError"
      @save="onSaveConfig"
    />

    <v-main style="height: 100vh; overflow: hidden;">
      <v-progress-linear v-if="orgLoading" indeterminate color="primary" />
      <!-- Error banner -->
      <v-alert
        v-if="orgError || configError"
        type="error"
        closable
        class="ma-3"
        @click:close="orgError = null; configError = null"
      >
        {{ orgError ?? configError }}
      </v-alert>

      <!-- Organigram -->
      <div v-if="organigram && !renderError" style="width: 100%; height: 100%;">
        <OrgChart
          ref="orgChart"
          :data="organigram"
          :show-co-leaders="config?.showCoLeaders ?? true"
          :group-types="config?.groupTypes ?? []"
          @render-error="onRenderError"
        />
      </div>

      <!-- Empty / error state -->
      <div
        v-else
        class="d-flex flex-column align-center justify-center"
        style="height: 100%;"
      >
        <template v-if="renderError">
          <v-icon icon="mdi-alert-circle-outline" size="80" color="error" class="mb-4" />
          <div class="text-h6 mb-2">Could not render organigram</div>
          <div class="text-body-2 text-medium-emphasis mb-1">
            The loaded data appears to be invalid or incompatible.
          </div>
          <div class="text-caption text-disabled font-italic mb-6">{{ renderError }}</div>
        </template>
        <template v-else>
          <v-icon icon="mdi-sitemap" size="80" color="grey-lighten-1" class="mb-4" />
          <div class="text-h6 text-medium-emphasis mb-2">No organigram loaded</div>
          <div class="text-body-2 text-disabled mb-6">
            Fetch from ChurchTools or upload an existing JSON file.
          </div>
        </template>
        <div class="d-flex gap-3">
          <v-btn
            prepend-icon="mdi-cloud-download-outline"
            color="primary"
            :loading="orgLoading"
            @click="onFetch"
          >
            Fetch from ChurchTools
          </v-btn>
          <v-btn
            prepend-icon="mdi-upload-outline"
            variant="tonal"
            @click="triggerUpload"
          >
            Upload JSON
          </v-btn>
        </div>
        <input
          ref="hiddenFileInput"
          type="file"
          accept=".json,application/json"
          class="d-none"
          @change="onHiddenFileChange"
        />
      </div>
    </v-main>

    <!-- Confirm overwrite dialog -->
    <ConfirmDialog
      v-model="confirmOpen"
      title="Overwrite organigram?"
      message="An organigram is already saved. Do you want to replace it with the freshly fetched data?"
      @confirm="onConfirmFetch"
      @cancel="onCancelFetch"
    />
  </v-app>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useTheme } from 'vuetify';
import Toolbar from './components/Toolbar.vue';
import ConfigEditor from './components/ConfigEditor.vue';
import OrgChart from './components/OrgChart.vue';
import ConfirmDialog from './components/ConfirmDialog.vue';
import { useOrganigram } from './composables/useOrganigram';
import { useConfig } from './composables/useConfig';
import type { AppConfig, OrgChartFile } from '../../shared/types';

const { organigram, loading: orgLoading, error: orgError, loadOrganigram, fetchPreview, saveOrganigram, uploadFromFile, downloadJson: orgDownloadJson } = useOrganigram();
const { config, loading: configLoading, error: configError, loadConfig, saveConfig } = useConfig();

const vTheme = useTheme();
const configDrawerOpen = ref(false);
const confirmOpen = ref(false);
const pendingFetchData = ref<OrgChartFile | null>(null);
const configSaveError = ref<string | null>(null);
const renderError = ref<string | null>(null);
const orgChart = ref<InstanceType<typeof OrgChart> | null>(null);
const hiddenFileInput = ref<HTMLInputElement | null>(null);

// Apply theme based on config
const appliedTheme = computed<'light' | 'dark'>(() => {
  const theme = config.value?.theme ?? 'system';
  if (theme === 'light') return 'light';
  if (theme === 'dark') return 'dark';
  // 'system' — use media query
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
});

watch(appliedTheme, (t) => {
  vTheme.global.name.value = t;
}, { immediate: true });

onMounted(async () => {
  await Promise.all([loadOrganigram(), loadConfig()]);
});

async function onFetch(): Promise<void> {
  renderError.value = null;
  try {
    const data = await fetchPreview();
    if (organigram.value) {
      pendingFetchData.value = data;
      confirmOpen.value = true;
    } else {
      await saveOrganigram(data);
    }
  } catch {
    // error already set in composable
  }
}

async function onConfirmFetch(): Promise<void> {
  confirmOpen.value = false;
  if (!pendingFetchData.value) return;
  try {
    await saveOrganigram(pendingFetchData.value);
  } catch {
    // error already set in composable
  } finally {
    pendingFetchData.value = null;
  }
}

function onCancelFetch(): void {
  confirmOpen.value = false;
  pendingFetchData.value = null;
}

function onRenderError(message: string): void {
  renderError.value = message;
  organigram.value = null;
}

async function onUpload(file: File): Promise<void> {
  renderError.value = null;
  try {
    await uploadFromFile(file);
  } catch {
    // error already set in composable
  }
}

function onDownloadSvg(): void {
  orgChart.value?.exportSvg();
}

async function onSaveConfig(newConfig: AppConfig): Promise<void> {
  configSaveError.value = null;
  try {
    await saveConfig(newConfig);
    configDrawerOpen.value = false;
  } catch (e) {
    configSaveError.value = e instanceof Error ? e.message : 'Failed to save config';
  }
}

function triggerUpload(): void {
  hiddenFileInput.value?.click();
}

async function onHiddenFileChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) {
    await onUpload(file);
    input.value = '';
  }
}
</script>
