<template>
  <v-app-bar elevation="2">
    <v-app-bar-title>
      <v-icon icon="mdi-sitemap" class="me-2" />
      ChurchTools Organigram
    </v-app-bar-title>

    <template #append>
      <v-btn
        prepend-icon="mdi-cloud-download-outline"
        :loading="loading"
        variant="tonal"
        color="primary"
        class="me-2"
        @click="emit('fetch')"
      >
        Fetch
      </v-btn>

      <v-btn
        icon="mdi-upload-outline"
        variant="text"
        title="Upload JSON"
        @click="triggerUpload"
      />
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
        title="Download JSON"
        :disabled="!hasData"
        @click="emit('download-json')"
      />

      <v-btn
        icon="mdi-image-outline"
        variant="text"
        title="Download SVG"
        :disabled="!hasData"
        @click="emit('download-svg')"
      />

      <v-btn
        icon="mdi-cog-outline"
        variant="text"
        title="Config"
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
  'toggle-config': [];
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
    // Reset so the same file can be re-uploaded
    input.value = '';
  }
}
</script>
