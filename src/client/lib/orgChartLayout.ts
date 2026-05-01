import type { OrgNode, Person } from '../../shared/types.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface LayoutNode {
  node: OrgNode;
  level: number; // 1 = root, 2 = column header, 3 = stacked under L2, 4 = subbox inside L3, 5+ = hidden
  columnIndex: number; // which L2 column this node belongs to (0-based)
  parentId: string | null;
  children: LayoutNode[];
  // Level-5+ children of a level-4 node (names shown in tooltip)
  hiddenChildren: OrgNode[];
}

export interface LayoutGeometry {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  level: number;
  columnIndex: number;
  node: OrgNode;
  hiddenChildren: OrgNode[];
}

export interface LayoutResult {
  nodes: LayoutGeometry[];
  totalWidth: number;
  totalHeight: number;
}

export interface L4PillLayout {
  x: number;
  y: number;
  w: number;
  h: number;
  isLeader: boolean;
  person: Person;
}

export interface L4ElementLayout {
  dotCX: number;
  dotCY: number;
  labelX: number;
  labelY: number;
  labelW: number;
  labelH: number;
  plusNX: number;
  plusNY: number;
  plusNText: string | null;
  pills: L4PillLayout[];
}

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

export const LAYOUT = {
  ROOT_HEIGHT: 44,
  L2_HEADER_HEIGHT: 36,
  L3_HEADER_HEIGHT: 26, // header strip inside L3 box
  // L4: no box; entries render as dot + label + flowing pills
  L4_VPADDING: 3,      // top/bottom padding inside the L4 row area
  L4_DOT_RADIUS: 3,    // radius of the colored bullet dot
  L4_DOT_GAP: 4,       // gap between dot right edge and label box left edge
  L4_LABEL_PAD_H: 4,   // horizontal padding inside the label box
  L4_PILL_PAD_H: 5,    // horizontal padding inside each pill
  L4_PILL_GAP: 3,      // gap between pills (and between label and first pill)
  L4_ROW_HEIGHT: 16,   // height of each pill row
  L4_ROW_GAP: 2,       // vertical gap between pill rows
  PERSON_ROW_HEIGHT: 18,
  PERSON_PADDING_TOP: 4,
  PERSON_PADDING_BOTTOM: 4,
  NODE_WIDTH: 200,
  L3_PADDING: 4, // padding inside L3 box around L4 subboxes
  L4_INDENT: 8,
  COL_GAP: 16, // horizontal gap between L2 columns
  L3_GAP: 6, // vertical gap between L3 nodes in a column
  L4_GAP: 2, // vertical gap between L4 rows
  ROOT_MARGIN_BOTTOM: 12,
  L2_MARGIN_BOTTOM: 8,
};

// ---------------------------------------------------------------------------
// Height calculation helpers (pure, no DOM)
// ---------------------------------------------------------------------------

export function personRowCount(node: OrgNode): number {
  return node.leaders.length + node.coLeaders.length;
}

export function nodeContentHeight(node: OrgNode): number {
  const rows = personRowCount(node);
  if (rows === 0) return 0;
  return LAYOUT.PERSON_PADDING_TOP + rows * LAYOUT.PERSON_ROW_HEIGHT + LAYOUT.PERSON_PADDING_BOTTOM;
}

// ---------------------------------------------------------------------------
// L4 text estimation helpers
// ---------------------------------------------------------------------------

function estimateTextWidth(text: string, fontSize: number): number {
  return text.length * fontSize * 0.55;
}

function estimateLabelWidth(text: string): number {
  // Bold text is ~5% wider; add horizontal padding on both sides
  return estimateTextWidth(text, 10) * 1.05 + LAYOUT.L4_LABEL_PAD_H * 2;
}

function estimatePillWidth(name: string): number {
  return estimateTextWidth(name, 10) + LAYOUT.L4_PILL_PAD_H * 2;
}

// ---------------------------------------------------------------------------
// L4 layout computation
// ---------------------------------------------------------------------------

function computeL4RowCount(node: OrgNode, showCoLeaders: boolean): number {
  const availableWidth = LAYOUT.NODE_WIDTH - LAYOUT.L4_INDENT * 2;
  const dotR = LAYOUT.L4_DOT_RADIUS;
  const labelW = estimateLabelWidth(node.name);
  // Start X for pills on first row (relative to left edge of L4 cell, ignoring +N for simplicity)
  const firstRowPillsStartX = dotR * 2 + LAYOUT.L4_DOT_GAP + labelW + LAYOUT.L4_PILL_GAP;

  const allPersons = [
    ...node.leaders,
    ...(showCoLeaders ? node.coLeaders : []),
  ];

  if (allPersons.length === 0) return 1;

  let curX = firstRowPillsStartX;
  let curRow = 0;

  for (const p of allPersons) {
    const name = `${p.firstName} ${p.lastName}`;
    const pillW = estimatePillWidth(name) + LAYOUT.L4_PILL_GAP;
    const rowLeftEdge = curRow === 0 ? firstRowPillsStartX : 0;
    const isFirstOnRow = curX <= rowLeftEdge + 0.5;

    if (!isFirstOnRow && curX + pillW > availableWidth) {
      curRow++;
      curX = 0;
    }
    curX += pillW;
  }

  return curRow + 1;
}

export function computeL4ElementLayout(geo: LayoutGeometry, showCoLeaders: boolean): L4ElementLayout {
  const { x, y, width } = geo;
  const node = geo.node;
  const hiddenCount = geo.hiddenChildren.length;
  const rowH = LAYOUT.L4_ROW_HEIGHT;
  const rowGap = LAYOUT.L4_ROW_GAP;
  const vPad = LAYOUT.L4_VPADDING;
  const dotR = LAYOUT.L4_DOT_RADIUS;

  const row0CY = y + vPad + rowH / 2;

  // Dot centered on row 0
  const dotCX = x + dotR;
  const dotCY = row0CY;

  // Label box
  const labelW = estimateLabelWidth(node.name);
  const labelH = rowH - 2;
  const labelX = dotCX + dotR + LAYOUT.L4_DOT_GAP;
  const labelY = y + vPad + (rowH - labelH) / 2;

  // curX tracks horizontal position for pills on the current row
  let curX = labelX + labelW + LAYOUT.L4_PILL_GAP;
  let curRow = 0;

  // +N indicator (hidden sub-groups count)
  let plusNText: string | null = null;
  let plusNX = curX;
  let plusNY = row0CY;

  if (hiddenCount > 0) {
    plusNText = `+${hiddenCount}`;
    plusNX = curX;
    plusNY = row0CY;
    curX += estimateTextWidth(plusNText, 9) + LAYOUT.L4_PILL_GAP;
  }

  const firstRowPillsStartX = curX;

  const allPersons: Array<{ p: Person; isLeader: boolean }> = [
    ...node.leaders.map((p) => ({ p, isLeader: true })),
    ...(showCoLeaders ? node.coLeaders : []).map((p) => ({ p, isLeader: false })),
  ];

  const pills: L4PillLayout[] = [];

  for (const { p, isLeader } of allPersons) {
    const name = `${p.firstName} ${p.lastName}`;
    const pillW = estimatePillWidth(name);
    const pillH = rowH - 2;

    const rowLeftEdge = curRow === 0 ? firstRowPillsStartX : x;
    const isFirstOnRow = curX <= rowLeftEdge + 0.5;

    if (!isFirstOnRow && curX + pillW > x + width) {
      curRow++;
      curX = x;
    }

    const rowTopY = y + vPad + curRow * (rowH + rowGap);
    pills.push({
      x: curX,
      y: rowTopY + (rowH - pillH) / 2,
      w: pillW,
      h: pillH,
      isLeader,
      person: p,
    });
    curX += pillW + LAYOUT.L4_PILL_GAP;
  }

  return {
    dotCX,
    dotCY,
    labelX,
    labelY,
    labelW,
    labelH,
    plusNX,
    plusNY,
    plusNText,
    pills,
  };
}

export function l4NodeHeight(node: OrgNode, showCoLeaders: boolean): number {
  const numRows = computeL4RowCount(node, showCoLeaders);
  return (
    LAYOUT.L4_VPADDING * 2 +
    numRows * LAYOUT.L4_ROW_HEIGHT +
    Math.max(0, numRows - 1) * LAYOUT.L4_ROW_GAP
  );
}

export function l3NodeHeight(l3Node: OrgNode, l4Children: OrgNode[], showCoLeaders: boolean): number {
  const personContent = nodeContentHeight(l3Node);
  if (l4Children.length === 0) {
    return LAYOUT.L3_HEADER_HEIGHT + personContent;
  }
  const innerHeight =
    l4Children.reduce((sum, c) => sum + l4NodeHeight(c, showCoLeaders), 0) +
    (l4Children.length - 1) * LAYOUT.L4_GAP;
  return LAYOUT.L3_HEADER_HEIGHT + personContent + LAYOUT.L3_PADDING + innerHeight + LAYOUT.L3_PADDING;
}

export function l2NodeHeight(node: OrgNode): number {
  return Math.max(LAYOUT.L2_HEADER_HEIGHT, LAYOUT.L2_HEADER_HEIGHT + nodeContentHeight(node));
}

// ---------------------------------------------------------------------------
// Tree builder
// ---------------------------------------------------------------------------

function buildTree(
  nodes: OrgNode[],
  rootId: string,
): { root: LayoutNode | null; orphans: string[] } {
  const nodeMap = new Map<string, OrgNode>(nodes.map((n) => [n.id, n]));
  const childrenMap = new Map<string, OrgNode[]>();
  const orphans: string[] = [];

  for (const node of nodes) {
    if (node.parentId === null) continue;
    if (!nodeMap.has(node.parentId)) {
      orphans.push(node.id);
      continue;
    }
    const siblings = childrenMap.get(node.parentId) ?? [];
    siblings.push(node);
    childrenMap.set(node.parentId, siblings);
  }

  function buildLayoutNode(node: OrgNode, level: number, columnIndex: number): LayoutNode {
    const rawChildren = childrenMap.get(node.id) ?? [];
    const visibleChildren = rawChildren.filter((c) => level < 4);
    const hiddenChildren = level === 4 ? rawChildren : [];

    const children = visibleChildren.map((c) =>
      buildLayoutNode(c, level + 1, level === 1 ? visibleChildren.indexOf(c) : columnIndex),
    );

    return {
      node,
      level,
      columnIndex,
      parentId: node.parentId,
      children,
      hiddenChildren,
    };
  }

  const rootNode = nodeMap.get(rootId);
  if (!rootNode) return { root: null, orphans };

  return { root: buildLayoutNode(rootNode, 1, 0), orphans };
}

// ---------------------------------------------------------------------------
// Geometry computation
// ---------------------------------------------------------------------------

export function computeLayout(nodes: OrgNode[], showInactiveGroups: boolean, showCoLeaders: boolean): LayoutResult {
  if (nodes.length === 0) return { nodes: [], totalWidth: 0, totalHeight: 0 };

  const rootNode = nodes.find((n) => n.parentId === null);
  if (!rootNode) return { nodes: [], totalWidth: 0, totalHeight: 0 };

  const visibleNodes = showInactiveGroups ? nodes : nodes.filter((n) => !n.inactive);

  const { root } = buildTree(visibleNodes, rootNode.id);
  if (!root) return { nodes: [], totalWidth: 0, totalHeight: 0 };

  const result: LayoutGeometry[] = [];

  // Level-2 columns
  const l2Nodes = root.children; // direct children of root
  const numCols = l2Nodes.length;
  const totalWidth = numCols * LAYOUT.NODE_WIDTH + Math.max(0, numCols - 1) * LAYOUT.COL_GAP;

  // Root centered
  const rootX = (totalWidth - LAYOUT.NODE_WIDTH) / 2;
  const rootH = Math.max(LAYOUT.ROOT_HEIGHT, LAYOUT.ROOT_HEIGHT + nodeContentHeight(rootNode));
  result.push({
    id: rootNode.id,
    x: rootX,
    y: 0,
    width: LAYOUT.NODE_WIDTH,
    height: rootH,
    level: 1,
    columnIndex: 0,
    node: rootNode,
    hiddenChildren: [],
  });

  let maxY = rootH + LAYOUT.ROOT_MARGIN_BOTTOM;

  for (let col = 0; col < l2Nodes.length; col++) {
    const l2Layout = l2Nodes[col];
    const colX = col * (LAYOUT.NODE_WIDTH + LAYOUT.COL_GAP);

    // L2 node
    const l2H = l2NodeHeight(l2Layout.node);
    result.push({
      id: l2Layout.node.id,
      x: colX,
      y: rootH + LAYOUT.ROOT_MARGIN_BOTTOM,
      width: LAYOUT.NODE_WIDTH,
      height: l2H,
      level: 2,
      columnIndex: col,
      node: l2Layout.node,
      hiddenChildren: [],
    });

    let colY = rootH + LAYOUT.ROOT_MARGIN_BOTTOM + l2H + LAYOUT.L2_MARGIN_BOTTOM;

    // L3 nodes stacked below L2
    for (const l3Layout of l2Layout.children) {
      const l4Children = l3Layout.children.map((c) => c.node);
      const l3H = l3NodeHeight(l3Layout.node, l4Children, showCoLeaders);

      result.push({
        id: l3Layout.node.id,
        x: colX,
        y: colY,
        width: LAYOUT.NODE_WIDTH,
        height: l3H,
        level: 3,
        columnIndex: col,
        node: l3Layout.node,
        hiddenChildren: [],
      });

      // L4 rows inside L3
      let l4Y = colY + LAYOUT.L3_HEADER_HEIGHT + nodeContentHeight(l3Layout.node) + LAYOUT.L3_PADDING;
      for (const l4Layout of l3Layout.children) {
        const l4H = l4NodeHeight(l4Layout.node, showCoLeaders);
        result.push({
          id: l4Layout.node.id,
          x: colX + LAYOUT.L4_INDENT,
          y: l4Y,
          width: LAYOUT.NODE_WIDTH - LAYOUT.L4_INDENT * 2,
          height: l4H,
          level: 4,
          columnIndex: col,
          node: l4Layout.node,
          hiddenChildren: l4Layout.hiddenChildren,
        });
        l4Y += l4H + LAYOUT.L4_GAP;
      }

      colY += l3H + LAYOUT.L3_GAP;
    }

    maxY = Math.max(maxY, colY);
  }

  return { nodes: result, totalWidth, totalHeight: maxY };
}
