<template>
  <div ref="container" class="org-chart-container" tabindex="0" @keydown.esc="clearHighlight">
    <svg ref="svgEl" style="display:block;overflow:visible;width:100%;height:100%;">
      <g ref="svgGroup">
        <!-- Transparent hit area so panning works over empty space between columns -->
        <rect
          v-if="layout.totalWidth > 0 && layout.totalHeight > 0"
          :x="0" :y="0"
          :width="layout.totalWidth" :height="layout.totalHeight"
          fill="transparent"
        />
        <template v-for="geo in layout.nodes" :key="geo.id">
          <!-- Level 1: root -->
          <template v-if="geo.level === 1">
            <rect
              :x="geo.x" :y="geo.y" :width="geo.width" :height="geo.height"
              :rx="6"
              :fill="cardBg(geo.node)"
              :stroke="cardBorder(geo.node)"
              stroke-width="1"
              :opacity="geo.node.inactive ? 0.5 : 1"
            />
            <rect
              :x="geo.x" :y="geo.y" :width="geo.width" :height="LAYOUT.ROOT_HEIGHT"
              :rx="6"
              :fill="headerColor(geo.node)"
            />
            <rect
              :x="geo.x" :y="geo.y + LAYOUT.ROOT_HEIGHT - 6" :width="geo.width" :height="6"
              :fill="headerColor(geo.node)"
            />
            <text
              :x="geo.x + geo.width / 2"
              :y="geo.y + LAYOUT.ROOT_HEIGHT / 2"
              text-anchor="middle"
              dominant-baseline="central"
              font-family="Roboto,Arial,sans-serif"
              font-size="13"
              font-weight="600"
              fill="#ffffff"
            >{{ geo.node.name }}</text>
            <template v-for="(p, pi) in visibleLeaders(geo.node)" :key="`${geo.id}-l-${p.id}`">
              <rect
                :x="geo.x + 6"
                :y="geo.y + LAYOUT.ROOT_HEIGHT + LAYOUT.PERSON_PADDING_TOP + pi * LAYOUT.PERSON_ROW_HEIGHT"
                :width="geo.width - 12"
                :height="LAYOUT.PERSON_ROW_HEIGHT - 2"
                rx="8"
                :fill="highlightedPersonId === p.id ? '#FFF176' : leaderBg(geo.node)"
                style="cursor:pointer"
                @click="toggleHighlight(p.id)"
              />
              <text
                :x="geo.x + geo.width / 2"
                :y="geo.y + LAYOUT.ROOT_HEIGHT + LAYOUT.PERSON_PADDING_TOP + pi * LAYOUT.PERSON_ROW_HEIGHT + (LAYOUT.PERSON_ROW_HEIGHT - 2) / 2"
                text-anchor="middle"
                dominant-baseline="central"
                font-family="Roboto,Arial,sans-serif"
                font-size="11"
                :fill="highlightedPersonId === p.id ? '#333' : leaderColor(geo.node)"
                style="cursor:pointer;pointer-events:none"
              >{{ p.firstName }} {{ p.lastName }}</text>
            </template>
            <!-- Highlight border -->
            <rect
              v-if="isHighlighted(geo.node)"
              :x="geo.x - 2" :y="geo.y - 2" :width="geo.width + 4" :height="geo.height + 4"
              rx="8" fill="none" stroke="#F57F17" stroke-width="3"
            />
          </template>

          <!-- Level 2: column header -->
          <template v-else-if="geo.level === 2">
            <rect
              :x="geo.x" :y="geo.y" :width="geo.width" :height="geo.height"
              :rx="5"
              :fill="cardBg(geo.node)"
              :stroke="isHighlighted(geo.node) ? '#F57F17' : cardBorder(geo.node)"
              :stroke-width="isHighlighted(geo.node) ? 3 : 1"
              :opacity="geo.node.inactive ? 0.5 : 1"
            />
            <rect
              :x="geo.x" :y="geo.y" :width="geo.width" :height="LAYOUT.L2_HEADER_HEIGHT"
              :rx="5"
              :fill="headerColor(geo.node)"
            />
            <rect
              :x="geo.x" :y="geo.y + LAYOUT.L2_HEADER_HEIGHT - 5" :width="geo.width" :height="5"
              :fill="headerColor(geo.node)"
            />
            <text
              :x="geo.x + geo.width / 2"
              :y="geo.y + LAYOUT.L2_HEADER_HEIGHT / 2"
              text-anchor="middle"
              dominant-baseline="central"
              font-family="Roboto,Arial,sans-serif"
              font-size="12"
              font-weight="600"
              fill="#ffffff"
            >{{ geo.node.name }}</text>
            <template v-for="(p, pi) in visibleLeaders(geo.node)" :key="`${geo.id}-l-${p.id}`">
              <rect
                :x="geo.x + 6"
                :y="geo.y + LAYOUT.L2_HEADER_HEIGHT + LAYOUT.PERSON_PADDING_TOP + pi * LAYOUT.PERSON_ROW_HEIGHT"
                :width="geo.width - 12"
                :height="LAYOUT.PERSON_ROW_HEIGHT - 2"
                rx="8"
                :fill="highlightedPersonId === p.id ? '#FFF176' : leaderBg(geo.node)"
                style="cursor:pointer"
                @click="toggleHighlight(p.id)"
              />
              <text
                :x="geo.x + geo.width / 2"
                :y="geo.y + LAYOUT.L2_HEADER_HEIGHT + LAYOUT.PERSON_PADDING_TOP + pi * LAYOUT.PERSON_ROW_HEIGHT + (LAYOUT.PERSON_ROW_HEIGHT - 2) / 2"
                text-anchor="middle"
                dominant-baseline="central"
                font-family="Roboto,Arial,sans-serif"
                font-size="11"
                :fill="highlightedPersonId === p.id ? '#333' : leaderColor(geo.node)"
                style="cursor:pointer;pointer-events:none"
              >{{ p.firstName }} {{ p.lastName }}</text>
            </template>
            <template v-for="(p, pi) in visibleCoLeaders(geo.node)" :key="`${geo.id}-cl-${p.id}`">
              <rect
                :x="geo.x + 6"
                :y="geo.y + LAYOUT.L2_HEADER_HEIGHT + LAYOUT.PERSON_PADDING_TOP + (visibleLeaders(geo.node).length + pi) * LAYOUT.PERSON_ROW_HEIGHT"
                :width="geo.width - 12"
                :height="LAYOUT.PERSON_ROW_HEIGHT - 2"
                rx="8"
                :fill="highlightedPersonId === p.id ? '#FFF176' : coLeaderBg(geo.node)"
                style="cursor:pointer"
                @click="toggleHighlight(p.id)"
              />
              <text
                :x="geo.x + geo.width / 2"
                :y="geo.y + LAYOUT.L2_HEADER_HEIGHT + LAYOUT.PERSON_PADDING_TOP + (visibleLeaders(geo.node).length + pi) * LAYOUT.PERSON_ROW_HEIGHT + (LAYOUT.PERSON_ROW_HEIGHT - 2) / 2"
                text-anchor="middle"
                dominant-baseline="central"
                font-family="Roboto,Arial,sans-serif"
                font-size="11"
                :fill="highlightedPersonId === p.id ? '#333' : coLeaderColor(geo.node)"
                style="cursor:pointer;pointer-events:none"
              >{{ p.firstName }} {{ p.lastName }}</text>
            </template>
          </template>

          <!-- Level 3: box with L4 subboxes inside -->
          <template v-else-if="geo.level === 3">
            <rect
              :x="geo.x" :y="geo.y" :width="geo.width" :height="geo.height"
              :rx="4"
              :fill="cardBg(geo.node)"
              :stroke="isHighlighted(geo.node) ? '#F57F17' : cardBorder(geo.node)"
              :stroke-width="isHighlighted(geo.node) ? 3 : 1"
              :opacity="geo.node.inactive ? 0.5 : 1"
            />
            <rect
              :x="geo.x" :y="geo.y" :width="geo.width" :height="LAYOUT.L3_HEADER_HEIGHT"
              :rx="4"
              :fill="headerColor(geo.node)"
            />
            <rect
              :x="geo.x" :y="geo.y + LAYOUT.L3_HEADER_HEIGHT - 4" :width="geo.width" :height="4"
              :fill="headerColor(geo.node)"
            />
            <text
              :x="geo.x + geo.width / 2"
              :y="geo.y + LAYOUT.L3_HEADER_HEIGHT / 2"
              text-anchor="middle"
              dominant-baseline="central"
              font-family="Roboto,Arial,sans-serif"
              font-size="11"
              font-weight="600"
              fill="#ffffff"
            >{{ geo.node.name }}</text>
            <template v-for="(p, pi) in visibleLeaders(geo.node)" :key="`${geo.id}-l-${p.id}`">
              <rect
                :x="geo.x + 6"
                :y="geo.y + LAYOUT.L3_HEADER_HEIGHT + LAYOUT.PERSON_PADDING_TOP + pi * LAYOUT.PERSON_ROW_HEIGHT"
                :width="geo.width - 12"
                :height="LAYOUT.PERSON_ROW_HEIGHT - 2"
                rx="8"
                :fill="highlightedPersonId === p.id ? '#FFF176' : leaderBg(geo.node)"
                style="cursor:pointer"
                @click="toggleHighlight(p.id)"
              />
              <text
                :x="geo.x + geo.width / 2"
                :y="geo.y + LAYOUT.L3_HEADER_HEIGHT + LAYOUT.PERSON_PADDING_TOP + pi * LAYOUT.PERSON_ROW_HEIGHT + (LAYOUT.PERSON_ROW_HEIGHT - 2) / 2"
                text-anchor="middle"
                dominant-baseline="central"
                font-family="Roboto,Arial,sans-serif"
                font-size="11"
                :fill="highlightedPersonId === p.id ? '#333' : leaderColor(geo.node)"
                style="cursor:pointer;pointer-events:none"
              >{{ p.firstName }} {{ p.lastName }}</text>
            </template>
            <template v-for="(p, pi) in visibleCoLeaders(geo.node)" :key="`${geo.id}-cl-${p.id}`">
              <rect
                :x="geo.x + 6"
                :y="geo.y + LAYOUT.L3_HEADER_HEIGHT + LAYOUT.PERSON_PADDING_TOP + (visibleLeaders(geo.node).length + pi) * LAYOUT.PERSON_ROW_HEIGHT"
                :width="geo.width - 12"
                :height="LAYOUT.PERSON_ROW_HEIGHT - 2"
                rx="8"
                :fill="highlightedPersonId === p.id ? '#FFF176' : coLeaderBg(geo.node)"
                style="cursor:pointer"
                @click="toggleHighlight(p.id)"
              />
              <text
                :x="geo.x + geo.width / 2"
                :y="geo.y + LAYOUT.L3_HEADER_HEIGHT + LAYOUT.PERSON_PADDING_TOP + (visibleLeaders(geo.node).length + pi) * LAYOUT.PERSON_ROW_HEIGHT + (LAYOUT.PERSON_ROW_HEIGHT - 2) / 2"
                text-anchor="middle"
                dominant-baseline="central"
                font-family="Roboto,Arial,sans-serif"
                font-size="11"
                :fill="highlightedPersonId === p.id ? '#333' : coLeaderColor(geo.node)"
                style="cursor:pointer;pointer-events:none"
              >{{ p.firstName }} {{ p.lastName }}</text>
            </template>
          </template>

          <!-- Level 4: dot + label box + flowing pills, no outer box -->
          <template v-else-if="geo.level === 4">
            <g
              v-for="ll in [l4LayoutFor(geo)]"
              :key="geo.id + '-l4'"
              :opacity="geo.node.inactive ? 0.5 : 1"
            >
              <!-- Colored bullet dot -->
              <circle
                :cx="ll.dotCX"
                :cy="ll.dotCY"
                :r="LAYOUT.L4_DOT_RADIUS"
                :fill="groupTypeColor(geo.node)"
              />
              <!-- Label box (subtle tinted background + border) -->
              <rect
                :x="ll.labelX"
                :y="ll.labelY"
                :width="ll.labelW"
                :height="ll.labelH"
                rx="3"
                :fill="l4LabelBg(geo.node)"
                :stroke="isHighlighted(geo.node) ? '#F57F17' : l4LabelBorder(geo.node)"
                :stroke-width="isHighlighted(geo.node) ? 2 : 0.75"
              />
              <!-- Label text -->
              <text
                :x="ll.labelX + LAYOUT.L4_LABEL_PAD_H"
                :y="ll.labelY + ll.labelH / 2"
                dominant-baseline="central"
                font-family="Roboto,Arial,sans-serif"
                font-size="10"
                font-weight="600"
                :fill="l4LabelTextColor()"
                style="pointer-events:none"
              >{{ geo.node.name }}</text>
              <!-- +N hidden sub-groups indicator -->
              <text
                v-if="ll.plusNText"
                :x="ll.plusNX"
                :y="ll.plusNY"
                dominant-baseline="central"
                font-family="Roboto,Arial,sans-serif"
                font-size="9"
                :fill="dark ? '#999999' : '#9e9e9e'"
                style="pointer-events:none"
              >{{ ll.plusNText }}</text>
              <!-- Leader and co-leader pills -->
              <template v-for="pill in ll.pills" :key="`${geo.id}-pill-${pill.person.id}-${pill.isLeader}`">
                <rect
                  :x="pill.x"
                  :y="pill.y"
                  :width="pill.w"
                  :height="pill.h"
                  rx="6"
                  :fill="highlightedPersonId === pill.person.id ? '#FFF176' : (pill.isLeader ? leaderBg(geo.node) : coLeaderBg(geo.node))"
                  style="cursor:pointer"
                  @click="toggleHighlight(pill.person.id)"
                />
                <text
                  :x="pill.x + pill.w / 2"
                  :y="pill.y + pill.h / 2"
                  text-anchor="middle"
                  dominant-baseline="central"
                  font-family="Roboto,Arial,sans-serif"
                  font-size="10"
                  :fill="highlightedPersonId === pill.person.id ? '#333' : (pill.isLeader ? leaderColor(geo.node) : coLeaderColor(geo.node))"
                  style="pointer-events:none"
                >{{ pill.person.firstName }} {{ pill.person.lastName }}</text>
              </template>
            </g>
          </template>
        </template>
      </g>
    </svg>

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
import { useTheme } from 'vuetify';
import type Panzoom from '@panzoom/panzoom';
import type { GroupTypeConfig, OrgChartFile, OrgNode, Person } from '../../../shared/types';
import { computeLayout, computeL4ElementLayout, LAYOUT } from '../lib/orgChartLayout';
import type { LayoutGeometry, L4ElementLayout } from '../lib/orgChartLayout';

const props = defineProps<{
  data: OrgChartFile;
  showCoLeaders: boolean;
  showInactiveGroups: boolean;
  groupTypes: GroupTypeConfig[];
}>();

const theme = useTheme();
const container = ref<HTMLDivElement | null>(null);
const svgEl = ref<SVGSVGElement | null>(null);
const svgGroup = ref<SVGGElement | null>(null);
const highlightedPersonId = ref<number | null>(null);

let panzoomInstance: InstanceType<typeof Panzoom> | null = null;
let wheelHandler: ((e: WheelEvent) => void) | null = null;

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

const layout = computed(() =>
  computeLayout(props.data.nodes, props.showInactiveGroups, props.showCoLeaders),
);

// ---------------------------------------------------------------------------
// Theme helpers
// ---------------------------------------------------------------------------

const dark = computed(() => theme.global.name.value === 'dark');

function groupTypeColor(node: OrgNode): string {
  if (node.inactive) return '#9e9e9e';
  return props.groupTypes.find((gt) => gt.id === node.groupTypeId)?.color ?? '#1976D2';
}

function headerColor(node: OrgNode): string {
  const base = groupTypeColor(node);
  if (!dark.value || node.inactive) return base;
  // darken in dark mode
  const r = parseInt(base.slice(1, 3), 16);
  const g = parseInt(base.slice(3, 5), 16);
  const b = parseInt(base.slice(5, 7), 16);
  return `rgb(${Math.round(r * 0.6)},${Math.round(g * 0.6)},${Math.round(b * 0.6)})`;
}

function cardBg(node: OrgNode): string {
  if (node.inactive) return dark.value ? '#3a3a3a' : '#f5f5f5';
  return dark.value ? '#2d2d2d' : '#ffffff';
}

function cardBorder(node: OrgNode): string {
  if (node.inactive) return dark.value ? '#555' : '#bdbdbd';
  return dark.value ? '#424242' : '#e0e0e0';
}

function leaderBg(node: OrgNode): string {
  if (node.inactive) return dark.value ? '#2a2a2a' : '#eeeeee';
  return dark.value ? '#1a3a5c' : '#E3F2FD';
}

function leaderColor(node: OrgNode): string {
  if (node.inactive) return dark.value ? '#888' : '#757575';
  return dark.value ? '#90CAF9' : '#0D47A1';
}

function coLeaderBg(node: OrgNode): string {
  if (node.inactive) return dark.value ? '#2a2a2a' : '#eeeeee';
  return dark.value ? '#3b1f45' : '#F3E5F5';
}

function coLeaderColor(node: OrgNode): string {
  if (node.inactive) return dark.value ? '#888' : '#757575';
  return dark.value ? '#CE93D8' : '#7B1FA2';
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function l4LabelBg(node: OrgNode): string {
  if (node.inactive) return dark.value ? 'rgba(100,100,100,0.12)' : 'rgba(150,150,150,0.08)';
  return hexToRgba(groupTypeColor(node), dark.value ? 0.18 : 0.10);
}

function l4LabelBorder(node: OrgNode): string {
  if (node.inactive) return dark.value ? 'rgba(100,100,100,0.25)' : 'rgba(150,150,150,0.2)';
  return hexToRgba(groupTypeColor(node), dark.value ? 0.45 : 0.30);
}

function l4LabelTextColor(): string {
  return dark.value ? '#d0d0d0' : '#333333';
}

function l4LayoutFor(geo: LayoutGeometry): L4ElementLayout {
  return computeL4ElementLayout(geo, props.showCoLeaders);
}

// ---------------------------------------------------------------------------
// Person visibility
// ---------------------------------------------------------------------------

function visibleLeaders(node: OrgNode): Person[] {
  return node.leaders;
}

function visibleCoLeaders(node: OrgNode): Person[] {
  return props.showCoLeaders ? node.coLeaders : [];
}

// ---------------------------------------------------------------------------
// Person highlight
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
// Panzoom
// ---------------------------------------------------------------------------

function computeStartTransform(): { startScale: number; startX: number; startY: number } {
  const padding = 16;
  if (!container.value) return { startScale: 1, startX: padding, startY: padding };
  const containerW = container.value.clientWidth;
  const diagramW = layout.value.totalWidth;
  if (containerW <= 0 || diagramW <= 0) return { startScale: 1, startX: padding, startY: padding };
  const startScale = Math.min(1, (containerW - padding * 2) / diagramW);
  const startX = Math.max(padding, (containerW - diagramW * startScale) / 2);
  return { startScale, startX, startY: padding };
}

async function initPanzoom(): Promise<void> {
  if (!svgGroup.value || !container.value) return;
  const { default: Panzoom } = await import('@panzoom/panzoom');
  if (wheelHandler) {
    container.value.removeEventListener('wheel', wheelHandler);
    wheelHandler = null;
  }
  panzoomInstance?.destroy();
  const { startScale, startX, startY } = computeStartTransform();
  panzoomInstance = Panzoom(svgGroup.value, {
    maxScale: 5,
    minScale: 0.1,
    startScale,
    startX,
    startY,
  });
  wheelHandler = (e: WheelEvent) => {
    panzoomInstance?.zoomWithWheel(e);
  };
  container.value.addEventListener('wheel', wheelHandler, { passive: false });
}

onMounted(async () => {
  await nextTick();
  await initPanzoom();
});

onBeforeUnmount(() => {
  if (wheelHandler && container.value) {
    container.value.removeEventListener('wheel', wheelHandler);
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
// SVG export
// ---------------------------------------------------------------------------

function exportSvg(): void {
  if (!svgEl.value) return;
  const serializer = new XMLSerializer();
  const svgStr = serializer.serializeToString(svgEl.value);
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

<style scoped>
.org-chart-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
  outline: none;
}
</style>
