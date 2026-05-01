<template>
  <v-navigation-drawer v-model="model" location="right" width="420" temporary>
    <v-toolbar density="compact" color="surface">
      <v-toolbar-title class="text-subtitle-1 font-weight-bold">Configuration</v-toolbar-title>
      <template #append>
        <v-btn icon="mdi-close" variant="text" size="small" @click="model = false" />
      </template>
    </v-toolbar>

    <v-divider />

    <div v-if="localConfig" class="pa-4">
      <!-- Root group ID -->
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
          >
            {{ roleId }}
          </v-chip>
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
          >
            {{ roleId }}
          </v-chip>
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
        >
          {{ val }}
        </v-chip>
      </div>
      <v-text-field
        v-model="statusInput"
        label="Add Status ID"
        density="compact"
        variant="outlined"
        type="number"
        hide-details
        class="mb-4"
        @keydown.enter="addStatusId"
      >
        <template #append-inner>
          <v-btn icon="mdi-plus" size="x-small" variant="text" @click="addStatusId" />
        </template>
      </v-text-field>

      <!-- Inactive Group Status ID -->
      <v-text-field
        :model-value="localConfig.inactiveGroupStatusId ?? ''"
        label="Inactive Group Status ID"
        density="compact"
        variant="outlined"
        type="number"
        hide-details
        class="mb-4"
        hint="Groups with this status are shown greyed out. Leave empty to disable."
        @update:model-value="(v) => { localConfig!.inactiveGroupStatusId = v === '' || v === null ? null : Number(v) }"
      />

      <v-divider class="my-3" />

      <!-- String array fields -->
      <div v-for="field in stringArrayFields" :key="field.key" class="mb-4">
        <div class="text-caption text-medium-emphasis mb-1">{{ field.label }}</div>
        <div class="d-flex flex-wrap gap-1 mb-1">
          <v-chip
            v-for="(val, idx) in localConfig[field.key]"
            :key="idx"
            closable
            size="small"
            @click:close="localConfig[field.key].splice(idx, 1)"
          >
            {{ val }}
          </v-chip>
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

      <v-divider class="my-3" />

      <!-- Boolean toggle -->
      <v-switch
        v-model="localConfig.showCoLeaders"
        label="Show Co-Leaders"
        color="primary"
        density="compact"
        hide-details
        class="mb-3"
      />

      <!-- Theme select -->
      <v-select
        v-model="localConfig.theme"
        label="Theme"
        :items="themeOptions"
        density="compact"
        variant="outlined"
        hide-details
        class="mb-4"
      />

      <v-alert v-if="saveError" type="error" density="compact" class="mb-3">
        {{ saveError }}
      </v-alert>

      <v-btn color="primary" block :loading="saving" @click="save">
        Save
      </v-btn>
    </div>

    <div v-else class="pa-4 text-center text-medium-emphasis">
      Loading config…
    </div>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import { ref, watch, reactive } from 'vue';
import type { AppConfig, GroupTypeConfig } from '../../../shared/types';

const model = defineModel<boolean>({ required: true });

const props = defineProps<{
  config: AppConfig | null;
  saving: boolean;
  saveError: string | null;
}>();

const emit = defineEmits<{
  save: [config: AppConfig];
}>();

type StringArrayKey = 'includeTags' | 'excludeTags';

const stringArrayFields: { key: StringArrayKey; label: string }[] = [
  { key: 'includeTags', label: 'Include Tags' },
  { key: 'excludeTags', label: 'Exclude Tags' },
];

const themeOptions = [
  { title: 'System', value: 'system' },
  { title: 'Light', value: 'light' },
  { title: 'Dark', value: 'dark' },
];

const localConfig = ref<AppConfig | null>(null);
const leaderInputs = reactive<Record<number, string>>({});
const coLeaderInputs = reactive<Record<number, string>>({});
const statusInput = ref('');
const stringInputs = reactive<Record<StringArrayKey, string>>({
  includeTags: '',
  excludeTags: '',
});

// refs to hidden color <input> elements, indexed by group type index
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

function addStatusId(): void {
  if (!localConfig.value) return;
  const num = Number(statusInput.value.trim());
  if (!statusInput.value.trim() || isNaN(num)) return;
  localConfig.value.relevantGroupStatusIds.push(num);
  statusInput.value = '';
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
</script>
