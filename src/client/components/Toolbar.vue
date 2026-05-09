<template>
  <v-app-bar elevation="2">
    <v-app-bar-title>
      <v-icon icon="mdi-sitemap" class="me-2" />
      ChurchTools Organigramm
    </v-app-bar-title>

    <template #append>
      <v-btn-group variant="tonal" color="primary" class="me-2">
        <v-btn
          prepend-icon="mdi-cloud-download-outline"
          :loading="loading"
          @click="emit('fetch')"
        >
          Update
        </v-btn>
        <v-btn
          icon="mdi-cog-outline"
          title="Fetch Settings"
          @click="emit('toggle-fetch-config')"
        />
      </v-btn-group>

      <input
        ref="fileInput"
        type="file"
        accept=".json,application/json"
        class="d-none"
        @change="onFileChange"
      />

      <v-btn
        icon="mdi-download-outline"
        variant="text"
        title="Download SVG"
        :disabled="!hasData"
        @click="emit('download-svg')"
      />

      <v-btn
        icon="mdi-language-markdown-outline"
        variant="text"
        title="Download Markdown"
        :disabled="!hasData"
        @click="emit('download-markdown')"
      />

      <v-btn
        icon="mdi-tune"
        variant="text"
        title="Display Settings"
        @click="emit('toggle-config')"
      />
    </template>
  </v-app-bar>
</template>

<script setup lang="ts">
import { ref } from 'vue';

defineProps<{
  loading: boolean;
  hasData: boolean;
}>();

const emit = defineEmits<{
  fetch: [];
  upload: [file: File];
  'download-json': [];
  'download-svg': [];
  'download-markdown': [];
  'toggle-config': [];
  'toggle-fetch-config': [];
}>();

const fileInput = ref<HTMLInputElement | null>(null);

function triggerUpload(): void {
  fileInput.value?.click();
}

function onFileChange(event: Event): void {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) {
    emit('upload', file);
    input.value = '';
  }
}
</script>
