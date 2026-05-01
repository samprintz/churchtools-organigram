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
      @toggle-fetch-config="fetchConfigOpen = !fetchConfigOpen"
    />

    <FetchConfigDialog
      v-model="fetchConfigOpen"
      :config="config"
      :config-invalid="configInvalid"
      :saving="configLoading || orgLoading"
      :save-error="fetchConfigError"
      @save="onSaveFetchConfig"
      @save-and-fetch="onSaveAndFetch"
    />

    <ConfigEditor
      v-model="configDrawerOpen"
      :config="config"
      @save="onSaveConfig"
    />

    <v-main class="main-fullscreen">
      <v-progress-linear v-if="orgLoading" indeterminate color="primary" />
      <!-- Config invalid banner -->
      <v-alert
        v-if="configInvalid"
        type="warning"
        class="ma-3"
        icon="mdi-file-alert-outline"
      >
        Your <code>config.json</code> is invalid and could not be loaded — default settings are being used.
        Open <strong>Fetch Settings</strong> to review and save a valid configuration.
      </v-alert>

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
      <div v-if="organigram && !renderError" class="w-100 h-100">
        <OrgChart
          ref="orgChart"
          :data="organigram"
          :show-co-leaders="config.showCoLeaders"
          :show-inactive-groups="config.showInactiveGroups"
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
  </v-app>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useTheme } from 'vuetify';
import Toolbar from './components/Toolbar.vue';
import ConfigEditor from './components/ConfigEditor.vue';
import FetchConfigDialog from './components/FetchConfigDialog.vue';
import OrgChart from './components/OrgChart.vue';
import { useOrganigram } from './composables/useOrganigram';
import { useConfig } from './composables/useConfig';
import type { AppConfig } from '../shared/types';

const { organigram, loading: orgLoading, error: orgError, loadOrganigram, fetchPreview, saveOrganigram, uploadFromFile, downloadJson: orgDownloadJson } = useOrganigram();
const { config, loading: configLoading, error: configError, configInvalid, loadConfig, saveConfig } = useConfig();

const vTheme = useTheme();
const configDrawerOpen = ref(false);
const fetchConfigOpen = ref(false);
const fetchConfigError = ref<string | null>(null);
const renderError = ref<string | null>(null);
const orgChart = ref<InstanceType<typeof OrgChart> | null>(null);
const hiddenFileInput = ref<HTMLInputElement | null>(null);

const appliedTheme = computed<'light' | 'dark'>(() => {
  const theme = config.value.theme;
  if (theme === 'light') return 'light';
  if (theme === 'dark') return 'dark';
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
    await saveOrganigram(data);
  } catch {
    // error already set in composable
  }
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
  try {
    await saveConfig(newConfig);
  } catch {
    // error displayed via configError from useConfig
  }
}

async function onSaveFetchConfig(newConfig: AppConfig): Promise<void> {
  fetchConfigError.value = null;
  try {
    await saveConfig(newConfig);
    fetchConfigOpen.value = false;
  } catch (e) {
    fetchConfigError.value = e instanceof Error ? e.message : 'Failed to save config';
  }
}

async function onSaveAndFetch(newConfig: AppConfig): Promise<void> {
  fetchConfigError.value = null;
  try {
    await saveConfig(newConfig);
  } catch (e) {
    fetchConfigError.value = e instanceof Error ? e.message : 'Failed to save config';
    return;
  }
  fetchConfigOpen.value = false;
  renderError.value = null;
  try {
    const data = await fetchPreview();
    await saveOrganigram(data);
  } catch {
    // error already set in composable
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

<style scoped>
.main-fullscreen {
  height: 100vh;
  overflow: hidden;
}
</style>
