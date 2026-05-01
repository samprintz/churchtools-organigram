<template>
  <v-dialog v-model="model" max-width="520" scrollable>
    <v-card>
      <v-toolbar density="compact" color="surface">
        <v-toolbar-title class="text-subtitle-1 font-weight-bold">Fetch Settings</v-toolbar-title>
        <template #append>
          <v-btn icon="mdi-close" variant="text" size="small" @click="model = false" />
        </template>
      </v-toolbar>

      <v-divider />

      <v-card-text v-if="localConfig" style="max-height: 70vh;">
        <v-alert
          v-if="props.configInvalid"
          type="warning"
          density="compact"
          icon="mdi-file-alert-outline"
          class="mb-4"
        >
          The saved config file was invalid. Shown below are default values — review and save to fix it.
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

        <div
          v-for="(gt, gtIdx) in localConfig.groupTypes"
          :key="gtIdx"
          class="mb-4 pa-3 rounded"
          style="border: 1px solid rgba(128,128,128,0.3);"
        >
          <div class="d-flex align-center mb-2 gap-2">
            <v-text-field
              v-model.number="gt.id"
              label="Type ID"
              density="compact"
              variant="outlined"
              type="number"
              hide-details
              style="max-width: 90px;"
            />
            <v-text-field
              v-model="gt.name"
              label="Name"
              density="compact"
              variant="outlined"
              hide-details
              class="flex-grow-1"
            />
            <div class="d-flex align-center" style="gap: 4px;">
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
            <v-btn
              icon="mdi-delete-outline"
              size="x-small"
              variant="text"
              color="error"
              @click="removeGroupType(gtIdx)"
            />
          </div>

          <!-- Leader Role IDs -->
          <div class="text-caption text-medium-emphasis mb-1">Leader Role IDs</div>
          <div class="d-flex flex-wrap gap-1 mb-1">
            <v-chip
              v-for="(roleId, rIdx) in gt.leaderRoleIds"
              :key="rIdx"
              closable
              size="small"
              @click:close="gt.leaderRoleIds.splice(rIdx, 1)"
            >{{ roleId }}</v-chip>
          </div>
          <v-text-field
            v-model="leaderInputs[gtIdx]"
            label="Add Leader Role ID"
            density="compact"
            variant="outlined"
            type="number"
            hide-details
            class="mb-2"
            @keydown.enter="addRoleId(gt.leaderRoleIds, gtIdx, 'leader')"
          >
            <template #append-inner>
              <v-btn icon="mdi-plus" size="x-small" variant="text" @click="addRoleId(gt.leaderRoleIds, gtIdx, 'leader')" />
            </template>
          </v-text-field>

          <!-- Co-Leader Role IDs -->
          <div class="text-caption text-medium-emphasis mb-1">Co-Leader Role IDs</div>
          <div class="d-flex flex-wrap gap-1 mb-1">
            <v-chip
              v-for="(roleId, rIdx) in gt.coLeaderRoleIds"
              :key="rIdx"
              closable
              size="small"
              @click:close="gt.coLeaderRoleIds.splice(rIdx, 1)"
            >{{ roleId }}</v-chip>
          </div>
          <v-text-field
            v-model="coLeaderInputs[gtIdx]"
            label="Add Co-Leader Role ID"
            density="compact"
            variant="outlined"
            type="number"
            hide-details
            @keydown.enter="addRoleId(gt.coLeaderRoleIds, gtIdx, 'coLeader')"
          >
            <template #append-inner>
              <v-btn icon="mdi-plus" size="x-small" variant="text" @click="addRoleId(gt.coLeaderRoleIds, gtIdx, 'coLeader')" />
            </template>
          </v-text-field>
        </div>

        <v-btn
          prepend-icon="mdi-plus"
          variant="tonal"
          size="small"
          block
          class="mb-4"
          @click="addGroupType"
        >
          Add Group Type
        </v-btn>

        <v-divider class="my-3" />

        <!-- Relevant Group Status IDs -->
        <div class="text-caption text-medium-emphasis mb-1">Relevant Group Status IDs</div>
        <div class="d-flex flex-wrap gap-1 mb-1">
          <v-chip
            v-for="(val, idx) in localConfig.relevantGroupStatusIds"
            :key="idx"
            closable
            size="small"
            @click:close="localConfig.relevantGroupStatusIds.splice(idx, 1)"
          >{{ val }}</v-chip>
        </div>
        <v-text-field
          v-model="relevantStatusInput"
          label="Add Status ID"
          density="compact"
          variant="outlined"
          type="number"
          hide-details
          class="mb-4"
          @keydown.enter="addRelevantStatusId"
        >
          <template #append-inner>
            <v-btn icon="mdi-plus" size="x-small" variant="text" @click="addRelevantStatusId" />
          </template>
        </v-text-field>

        <!-- Inactive Group Status IDs -->
        <div class="text-caption text-medium-emphasis mb-1">Inactive Group Status IDs</div>
        <div class="d-flex flex-wrap gap-1 mb-1">
          <v-chip
            v-for="(val, idx) in localConfig.inactiveGroupStatusIds"
            :key="idx"
            closable
            size="small"
            @click:close="localConfig.inactiveGroupStatusIds.splice(idx, 1)"
          >{{ val }}</v-chip>
        </div>
        <v-text-field
          v-model="inactiveStatusInput"
          label="Add Inactive Status ID"
          density="compact"
          variant="outlined"
          type="number"
          hide-details
          class="mb-4"
          @keydown.enter="addInactiveStatusId"
        >
          <template #append-inner>
            <v-btn icon="mdi-plus" size="x-small" variant="text" @click="addInactiveStatusId" />
          </template>
        </v-text-field>

        <v-divider class="my-3" />

        <!-- Include Tags / Exclude Tags -->
        <div v-for="field in stringArrayFields" :key="field.key" class="mb-4">
          <div class="text-caption text-medium-emphasis mb-1">{{ field.label }}</div>
          <div class="d-flex flex-wrap gap-1 mb-1">
            <v-chip
              v-for="(val, idx) in localConfig[field.key]"
              :key="idx"
              closable
              size="small"
              @click:close="localConfig[field.key].splice(idx, 1)"
            >{{ val }}</v-chip>
          </div>
          <v-text-field
            v-model="stringInputs[field.key]"
            :label="`Add ${field.label}`"
            density="compact"
            variant="outlined"
            hide-details
            @keydown.enter="addString(field.key)"
          >
            <template #append-inner>
              <v-btn icon="mdi-plus" size="x-small" variant="text" @click="addString(field.key)" />
            </template>
          </v-text-field>
        </div>

        <v-alert v-if="saveError" type="error" density="compact" class="mb-3">
          {{ saveError }}
        </v-alert>
      </v-card-text>

      <v-divider />

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="model = false">Cancel</v-btn>
        <v-btn variant="tonal" :loading="saving" @click="save">Save</v-btn>
        <v-btn color="primary" variant="flat" :loading="saving" @click="saveAndFetch">Save and Fetch</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch, reactive } from 'vue';
import type { AppConfig } from '../../shared/types';

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

type StringArrayKey = 'includeTags' | 'excludeTags';

const stringArrayFields: { key: StringArrayKey; label: string }[] = [
  { key: 'includeTags', label: 'Include Tags' },
  { key: 'excludeTags', label: 'Exclude Tags' },
];

const localConfig = ref<AppConfig | null>(null);
const leaderInputs = reactive<Record<number, string>>({});
const coLeaderInputs = reactive<Record<number, string>>({});
const relevantStatusInput = ref('');
const inactiveStatusInput = ref('');
const stringInputs = reactive<Record<StringArrayKey, string>>({
  includeTags: '',
  excludeTags: '',
});

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

function addGroupType(): void {
  if (!localConfig.value) return;
  localConfig.value.groupTypes.push({
    id: 0,
    name: '',
    color: '#1976D2',
    leaderRoleIds: [],
    coLeaderRoleIds: [],
  });
}

function removeGroupType(idx: number): void {
  if (!localConfig.value) return;
  localConfig.value.groupTypes.splice(idx, 1);
}

function addRoleId(target: number[], idx: number, kind: 'leader' | 'coLeader'): void {
  const raw = kind === 'leader' ? leaderInputs[idx] : coLeaderInputs[idx];
  const num = Number(raw?.trim());
  if (!raw?.trim() || isNaN(num)) return;
  target.push(num);
  if (kind === 'leader') leaderInputs[idx] = '';
  else coLeaderInputs[idx] = '';
}

function addRelevantStatusId(): void {
  if (!localConfig.value) return;
  const num = Number(relevantStatusInput.value.trim());
  if (!relevantStatusInput.value.trim() || isNaN(num)) return;
  localConfig.value.relevantGroupStatusIds.push(num);
  relevantStatusInput.value = '';
}

function addInactiveStatusId(): void {
  if (!localConfig.value) return;
  const num = Number(inactiveStatusInput.value.trim());
  if (!inactiveStatusInput.value.trim() || isNaN(num)) return;
  localConfig.value.inactiveGroupStatusIds.push(num);
  inactiveStatusInput.value = '';
}

function addString(key: StringArrayKey): void {
  if (!localConfig.value) return;
  const val = stringInputs[key].trim();
  if (!val) return;
  localConfig.value[key].push(val);
  stringInputs[key] = '';
}

function save(): void {
  if (localConfig.value) {
    emit('save', localConfig.value);
  }
}

function saveAndFetch(): void {
  if (localConfig.value) {
    emit('save-and-fetch', localConfig.value);
  }
}
</script>
