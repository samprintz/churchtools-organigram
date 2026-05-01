<template>
  <div ref="containerEl" class="org-chart-container" tabindex="0" @keydown.esc="clearHighlight">
    <div v-if="tree" ref="chartEl" style="display: inline-flex; flex-direction: column;">
      <!-- Root (L1) -->
      <div class="chart-root-row">
        <div
          class="org-card org-card--l1"
          :class="{ 'org-card--highlighted': isHighlighted(tree.root.node), 'org-card--inactive': tree.root.node.inactive }"
        >
          <div class="card-header card-header--l1">{{ tree.root.node.name }}</div>
          <div v-if="tree.root.node.leaders.length || (props.showCoLeaders && tree.root.node.coLeaders.length)" class="person-area-wrap">
            <div
              v-for="p in tree.root.node.leaders"
              :key="`l-${p.id}`"
              class="person-pill person-pill--leader"
              :class="{ 'person-pill--highlighted': highlightedPersonId === p.id }"
              @click="toggleHighlight(p.id)"
            >{{ p.firstName }} {{ p.lastName }}</div>
            <div
              v-for="p in visibleCoLeaders(tree.root.node)"
              :key="`c-${p.id}`"
              class="person-pill person-pill--coleader"
              :class="{ 'person-pill--highlighted': highlightedPersonId === p.id }"
              @click="toggleHighlight(p.id)"
            >{{ p.firstName }} {{ p.lastName }}</div>
          </div>
        </div>
      </div>

      <!-- Columns -->
      <div class="chart-columns">
        <div
          v-for="col in tree.columns"
          :key="col.node.id"
          class="chart-column"
        >
          <!-- L2 card -->
          <div
            class="org-card org-card--l2"
            :class="{ 'org-card--highlighted': isHighlighted(col.node), 'org-card--inactive': col.node.inactive }"
          >
            <div class="card-header card-header--l2">{{ col.node.name }}</div>
            <div v-if="col.node.leaders.length || (props.showCoLeaders && col.node.coLeaders.length)" class="person-area-wrap">
              <div
                v-for="p in col.node.leaders"
                :key="`l-${p.id}`"
                class="person-pill person-pill--leader"
                :class="{ 'person-pill--highlighted': highlightedPersonId === p.id }"
                @click="toggleHighlight(p.id)"
              >{{ p.firstName }} {{ p.lastName }}</div>
              <div
                v-for="p in visibleCoLeaders(col.node)"
                :key="`c-${p.id}`"
                class="person-pill person-pill--coleader"
                :class="{ 'person-pill--highlighted': highlightedPersonId === p.id }"
                @click="toggleHighlight(p.id)"
              >{{ p.firstName }} {{ p.lastName }}</div>
            </div>
          </div>

          <!-- L3 cards stacked below L2 -->
          <div class="chart-l3-stack">
            <div
              v-for="l3 in col.children"
              :key="l3.node.id"
              class="org-card org-card--l3"
              :class="{ 'org-card--highlighted': isHighlighted(l3.node), 'org-card--inactive': l3.node.inactive }"
            >
              <div class="card-header card-header--l3">{{ l3.node.name }}</div>
              <div v-if="l3.node.leaders.length || (props.showCoLeaders && l3.node.coLeaders.length)" class="person-area-wrap">
                <div
                  v-for="p in l3.node.leaders"
                  :key="`l-${p.id}`"
                  class="person-pill person-pill--leader"
                  :class="{ 'person-pill--highlighted': highlightedPersonId === p.id }"
                  @click="toggleHighlight(p.id)"
                >{{ p.firstName }} {{ p.lastName }}</div>
                <div
                  v-for="p in visibleCoLeaders(l3.node)"
                  :key="`c-${p.id}`"
                  class="person-pill person-pill--coleader"
                  :class="{ 'person-pill--highlighted': highlightedPersonId === p.id }"
                  @click="toggleHighlight(p.id)"
                >{{ p.firstName }} {{ p.lastName }}</div>
              </div>

              <!-- L4 items inside L3 -->
              <div v-if="l3.children.length" class="l4-items">
                <div
                  v-for="l4 in l3.children"
                  :key="l4.node.id"
                  class="l4-item"
                  :class="{ 'l4-item--inactive': l4.node.inactive }"
                  :style="nodeStyle(l4.node)"
                >
                  <!-- Colored bullet dot (fixed, does not wrap with pills) -->
                  <span class="l4-dot"></span>
                  <!-- Label + pills in a wrapping flex container, aligned to label not dot -->
                  <div class="l4-label-wrap">
                    <span
                      class="l4-label"
                      :class="{ 'l4-label--highlighted': isHighlighted(l4.node) }"
                    >{{ l4.node.name }}</span>
                    <!-- +N hidden sub-groups indicator -->
                    <span v-if="l4.hiddenChildren.length" class="l4-plus-n">+{{ l4.hiddenChildren.length }}</span>
                    <!-- Leader pills -->
                    <span
                      v-for="p in l4.node.leaders"
                      :key="`l-${p.id}`"
                      class="l4-pill l4-pill--leader"
                      :class="{ 'l4-pill--highlighted': highlightedPersonId === p.id }"
                      @click="toggleHighlight(p.id)"
                    >{{ p.firstName }} {{ p.lastName }}</span>
                    <!-- Co-leader pills -->
                    <span
                      v-for="p in visibleCoLeaders(l4.node)"
                      :key="`c-${p.id}`"
                      class="l4-pill l4-pill--coleader"
                      :class="{ 'l4-pill--highlighted': highlightedPersonId === p.id }"
                      @click="toggleHighlight(p.id)"
                    >{{ p.firstName }} {{ p.lastName }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Floating clear-highlight button -->
    <div
      v-if="highlightedPersonId !== null"
      style="position:absolute;bottom:16px;left:50%;transform:translateX(-50%);"
    >
      <v-btn size="small" variant="tonal" prepend-icon="mdi-close" @click="clearHighlight">
        Clear highlight
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import type Panzoom from '@panzoom/panzoom';
import type { OrgChartFile, OrgNode, Person } from '../../../shared/types';
import { buildOrgTree } from '../lib/orgChartLayout';
import { ctColorToHex } from '../lib/chartColors';

const props = defineProps<{
  data: OrgChartFile;
  showCoLeaders: boolean;
  showInactiveGroups: boolean;
}>();

const containerEl = ref<HTMLDivElement | null>(null);
const chartEl = ref<HTMLDivElement | null>(null);
const highlightedPersonId = ref<number | null>(null);

let panzoomInstance: InstanceType<typeof Panzoom> | null = null;
let wheelHandler: ((e: WheelEvent) => void) | null = null;

// ---------------------------------------------------------------------------
// Tree
// ---------------------------------------------------------------------------

const tree = computed(() => buildOrgTree(props.data.nodes, props.showInactiveGroups));

// ---------------------------------------------------------------------------
// Color
// ---------------------------------------------------------------------------

function nodeStyle(node: OrgNode): Record<string, string> {
  return { '--node-color': ctColorToHex(node.color) };
}

// ---------------------------------------------------------------------------
// Person visibility
// ---------------------------------------------------------------------------

function visibleCoLeaders(node: OrgNode): Person[] {
  return props.showCoLeaders ? node.coLeaders : [];
}

// ---------------------------------------------------------------------------
// Highlight
// ---------------------------------------------------------------------------

const highlightedNodeIds = computed<Set<string>>(() => {
  if (highlightedPersonId.value === null) return new Set();
  const pid = highlightedPersonId.value;
  const ids = new Set<string>();
  for (const node of props.data.nodes) {
    const inLeaders = node.leaders.some((p) => p.id === pid);
    const inCoLeaders = props.showCoLeaders && node.coLeaders.some((p) => p.id === pid);
    if (inLeaders || inCoLeaders) ids.add(node.id);
  }
  return ids;
});

function isHighlighted(node: OrgNode): boolean {
  return highlightedPersonId.value !== null && highlightedNodeIds.value.has(node.id);
}

function toggleHighlight(personId: number): void {
  highlightedPersonId.value = highlightedPersonId.value === personId ? null : personId;
}

function clearHighlight(): void {
  highlightedPersonId.value = null;
}

// ---------------------------------------------------------------------------
// Panzoom (HTML element with transform-origin 50% 50%)
// ---------------------------------------------------------------------------

function computeStartTransform(): { startScale: number; startX: number; startY: number } {
  const padding = 16;
  if (!containerEl.value || !chartEl.value) return { startScale: 1, startX: 0, startY: padding };
  const cW = containerEl.value.clientWidth;
  const chartW = chartEl.value.offsetWidth;
  const chartH = chartEl.value.offsetHeight;
  if (cW <= 0 || chartW <= 0) return { startScale: 1, startX: 0, startY: padding };
  const s = Math.min(1, (cW - padding * 2) / chartW);
  const targetX = s < 1 ? padding : Math.max(padding, (cW - chartW) / 2);
  // Correct for panzoom's 50%/50% transform-origin:
  // top-left screen pos = (tx + chartW/2*(1-s), ty + chartH/2*(1-s))
  // We want top-left at (targetX, padding), so:
  const startX = targetX - (chartW / 2) * (1 - s);
  const startY = padding - (chartH / 2) * (1 - s);
  return { startScale: s, startX, startY };
}

async function initPanzoom(): Promise<void> {
  if (!chartEl.value || !containerEl.value) return;
  const { default: Panzoom } = await import('@panzoom/panzoom');
  if (wheelHandler) {
    containerEl.value.removeEventListener('wheel', wheelHandler);
    wheelHandler = null;
  }
  panzoomInstance?.destroy();
  const { startScale, startX, startY } = computeStartTransform();
  panzoomInstance = Panzoom(chartEl.value, {
    maxScale: 5,
    minScale: 0.1,
    startScale,
    startX,
    startY,
  });
  wheelHandler = (e: WheelEvent) => {
    panzoomInstance?.zoomWithWheel(e);
  };
  containerEl.value.addEventListener('wheel', wheelHandler, { passive: false });
}

onMounted(async () => {
  await nextTick();
  await initPanzoom();
});

onBeforeUnmount(() => {
  if (wheelHandler && containerEl.value) {
    containerEl.value.removeEventListener('wheel', wheelHandler);
  }
  panzoomInstance?.destroy();
});

watch(() => props.data, async () => {
  clearHighlight();
  await nextTick();
  await initPanzoom();
});

watch(() => props.showInactiveGroups, async () => {
  await nextTick();
  await initPanzoom();
});

watch(() => props.showCoLeaders, async () => {
  await nextTick();
  await initPanzoom();
});

// ---------------------------------------------------------------------------
// SVG export via dom-to-svg
// ---------------------------------------------------------------------------

async function exportSvg(): Promise<void> {
  if (!chartEl.value) return;
  const { elementToSVG, inlineResources } = await import('dom-to-svg');

  // Neutral state: no highlight
  const savedHighlight = highlightedPersonId.value;
  highlightedPersonId.value = null;
  await nextTick();

  // Remove panzoom transform so export is full-diagram at 1:1
  const savedTransform = chartEl.value.style.transform;
  chartEl.value.style.transform = '';

  const svgDoc = elementToSVG(chartEl.value);

  // Restore state immediately (synchronous path done)
  chartEl.value.style.transform = savedTransform;
  highlightedPersonId.value = savedHighlight;

  // Inline external resources (fonts, images) — async
  await inlineResources(svgDoc);

  const serializer = new XMLSerializer();
  const svgStr = serializer.serializeToString(svgDoc.documentElement);
  const blob = new Blob([svgStr], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'organigram.svg';
  a.click();
  URL.revokeObjectURL(url);
}

defineExpose({ exportSvg });
</script>

<style src="./OrgChart.css" scoped></style>
