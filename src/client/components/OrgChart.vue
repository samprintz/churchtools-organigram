<template>
  <div ref="container" class="org-chart-container" />
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useTheme } from 'vuetify';
import { OrgChart } from 'd3-org-chart';
import type { GroupTypeConfig, OrgChartFile, OrgNode, Person } from '../../../shared/types';

const props = defineProps<{
  data: OrgChartFile;
  showCoLeaders: boolean;
  groupTypes: GroupTypeConfig[];
}>();

const emit = defineEmits<{
  'render-error': [message: string];
}>();

const container = ref<HTMLDivElement | null>(null);
const theme = useTheme();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let chart: any = null;

const NODE_WIDTH = 220;

function calcNodeHeight(node: OrgNode): number {
  const count = node.leaders.length + (props.showCoLeaders ? node.coLeaders.length : 0);
  const rows = Math.ceil(count / 2);
  return Math.max(58, 38 + 14 + rows * 28);
}

function renderBadge(person: Person, bg: string, color: string): string {
  return `<span style="background:${bg};color:${color};padding:2px 8px;border-radius:12px;font-size:11px;white-space:nowrap;display:inline-block;">${person.firstName} ${person.lastName}</span>`;
}

function darkenHex(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.round(r * 0.6)},${Math.round(g * 0.6)},${Math.round(b * 0.6)})`;
}

function buildNodeContent(d: { data: OrgNode; width: number; height: number }): string {
  const dark = theme.global.name.value === 'dark';
  const inactive = d.data.inactive === true;
  const bg = inactive ? (dark ? '#3a3a3a' : '#f5f5f5') : dark ? '#2d2d2d' : '#ffffff';
  const border = inactive ? (dark ? '#555' : '#bdbdbd') : dark ? '#424242' : '#e0e0e0';
  const baseColor = inactive
    ? '#9e9e9e'
    : (props.groupTypes.find((gt) => gt.id === d.data.groupTypeId)?.color ?? '#1976D2');
  const headerBg = dark ? darkenHex(baseColor) : baseColor;
  const leaderBg = inactive ? (dark ? '#2a2a2a' : '#eeeeee') : dark ? '#1a3a5c' : '#E3F2FD';
  const leaderColor = inactive ? (dark ? '#888' : '#757575') : dark ? '#90CAF9' : '#0D47A1';
  const coLeaderBg = inactive ? (dark ? '#2a2a2a' : '#eeeeee') : dark ? '#3b1f45' : '#F3E5F5';
  const coLeaderColor = inactive ? (dark ? '#888' : '#757575') : dark ? '#CE93D8' : '#7B1FA2';

  const leaderBadges = (d.data.leaders as Person[])
    .map((p: Person) => renderBadge(p, leaderBg, leaderColor))
    .join('');
  const coLeaderBadges = props.showCoLeaders
    ? (d.data.coLeaders as Person[]).map((p: Person) => renderBadge(p, coLeaderBg, coLeaderColor)).join('')
    : '';

  const hasBadges = leaderBadges || coLeaderBadges;

  return `
    <div style="
      width:${d.width}px;
      height:${d.height}px;
      background:${bg};
      border-radius:8px;
      border:1px solid ${border};
      overflow:hidden;
      font-family:Roboto,Arial,sans-serif;
      box-shadow:0 2px 6px rgba(0,0,0,0.15);
      box-sizing:border-box;
      opacity:${inactive ? 0.6 : 1};
    ">
      <div style="
        background:${headerBg};
        color:#fff;
        padding:6px 10px;
        font-weight:600;
        font-size:13px;
        text-align:center;
        line-height:1.3;
        word-break:break-word;
      ">${d.data.name}</div>
      ${hasBadges ? `<div style="padding:6px 8px;display:flex;flex-wrap:wrap;gap:4px;align-content:flex-start;">${leaderBadges}${coLeaderBadges}</div>` : ''}
    </div>`;
}

function initChart(): void {
  if (!container.value) return;
  try {
    chart = new OrgChart()
      .container(container.value)
      .data(props.data.nodes)
      .nodeWidth(() => NODE_WIDTH)
      .nodeHeight((d: { data: OrgNode }) => calcNodeHeight(d.data))
      .childrenMargin(() => 40)
      .siblingsMargin(() => 10)
      .compactMarginPair(() => 4)
      .compactMarginBetween(() => 4)
      .nodeContent((d: { data: OrgNode; width: number; height: number }) => buildNodeContent(d))
      .imageName('organigram')
      .render();
    chart.expandAll();
  } catch (e) {
    emit('render-error', e instanceof Error ? e.message : String(e));
  }
}

function updateChart(): void {
  if (!chart) return;
  try {
    chart
      .data(props.data.nodes)
      .nodeHeight((d: { data: OrgNode }) => calcNodeHeight(d.data))
      .render();
    chart.expandAll();
  } catch (e) {
    emit('render-error', e instanceof Error ? e.message : String(e));
  }
}

function exportSvg(): void {
  if (!chart) return;
  chart.expandAll();
  // Give animation time to complete before exporting
  setTimeout(() => {
    chart.exportSvg();
  }, 500);
}

onMounted(() => {
  initChart();
});

watch(() => props.data, updateChart);

watch(
  () => theme.global.name.value,
  () => chart?.render(),
);

watch(
  () => props.showCoLeaders,
  () => updateChart(),
);

defineExpose({ exportSvg });
</script>

<style scoped>
.org-chart-container {
  width: 100%;
  height: 100%;
}
</style>
