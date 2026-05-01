<template>
  <v-dialog v-model="model" max-width="520" scrollable>
    <v-card>
      <v-toolbar density="compact" color="surface">
        <v-toolbar-title class="text-subtitle-1 font-weight-bold">
          Fetch Settings
        </v-toolbar-title>
        <template #append>
          <v-btn
            icon="mdi-close"
            variant="text"
            size="small"
            @click="model = false"
          />
        </template>
      </v-toolbar>

      <v-divider />

      <v-card-text v-if="localConfig" class="dialog-scroll-area">
        <v-alert
          v-if="props.configInvalid"
          type="warning"
          density="compact"
          icon="mdi-file-alert-outline"
          class="mb-4"
        >
          The saved config file was invalid. Shown below are default values —
          review and save to fix it.
        </v-alert>

        <!-- Root Group ID -->
        <v-text-field
          v-model.number="localConfig.rootGroupId"
          label="Root Group ID"
          density="compact"
          variant="outlined"
          type="number"
          hide-details
          class="mb-4"
        />

        <v-divider class="my-3" />

        <!-- Group Types -->
        <div class="text-caption text-medium-emphasis mb-2">Group Types</div>

        <GroupTypeEntry
          v-for="(gt, gtIdx) in localConfig.groupTypes"
          :key="gtIdx"
          v-model="localConfig.groupTypes[gtIdx]"
          class="mb-4"
          @remove="removeGroupType(gtIdx)"
        />

        <v-btn
          prepend-icon="mdi-plus"
          variant="tonal"
          size="small"
          block
          @click="addGroupType"
        >
          Add Group Type
        </v-btn>

        <v-divider class="my-3" />

        <!-- Relevant Group Status IDs -->
        <ChipInput
          v-model="localConfig.relevantGroupStatusIds"
          label="Relevant Group Status IDs"
          type="number"
          class="mb-4"
        />

        <!-- Inactive Group Status IDs -->
        <ChipInput
          v-model="localConfig.inactiveGroupStatusIds"
          label="Inactive Group Status IDs"
          type="number"
        />

        <v-divider class="my-3" />

        <!-- Include Tags -->
        <ChipInput
          v-model="localConfig.includeTags"
          label="Include Tags"
          class="mb-4"
        />

        <!-- Exclude Tags -->
        <ChipInput
          v-model="localConfig.excludeTags"
          label="Exclude Tags"
          class="mb-4"
        />

        <v-alert
          v-if="saveError"
          type="error"
          density="compact"
          class="mb-3"
        >
          {{ saveError }}
        </v-alert>
      </v-card-text>

      <v-divider />

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="model = false">Cancel</v-btn>
        <v-btn variant="tonal" :loading="saving" @click="save">Save</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :loading="saving"
          @click="saveAndFetch"
        >
          Save and Fetch
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { AppConfig } from '../../shared/types';
import ChipInput from './ChipInput.vue';
import GroupTypeEntry from './GroupTypeEntry.vue';

const model = defineModel<boolean>({ required: true });

const props = defineProps<{
  config: AppConfig;
  configInvalid: boolean;
  saving: boolean;
  saveError: string | null;
}>();

const emit = defineEmits<{
  save: [config: AppConfig];
  'save-and-fetch': [config: AppConfig];
}>();

const localConfig = ref<AppConfig | null>(null);

watch(
  () => props.config,
  (newConfig) => {
    if (newConfig) {
      localConfig.value = JSON.parse(
        JSON.stringify(newConfig),
      ) as AppConfig;
    }
  },
  { immediate: true },
);

function addGroupType(): void {
  if (!localConfig.value) return;
  localConfig.value.groupTypes.push({
    id: 0,
    leaderRoleIds: [],
    coLeaderRoleIds: [],
  });
}

function removeGroupType(idx: number): void {
  if (!localConfig.value) return;
  localConfig.value.groupTypes.splice(idx, 1);
}

function save(): void {
  if (localConfig.value) emit('save', localConfig.value);
}

function saveAndFetch(): void {
  if (localConfig.value) emit('save-and-fetch', localConfig.value);
}
</script>

<style scoped>
.dialog-scroll-area {
  max-height: 70vh;
}
</style>
