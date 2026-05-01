import { describe, expect, it } from 'vitest';
import type { OrgNode } from '../../shared/types.js';
import {
  LAYOUT,
  computeLayout,
  l2NodeHeight,
  l3NodeHeight,
  l4NodeHeight,
  nodeContentHeight,
  personRowCount,
} from './orgChartLayout.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeNode(overrides: Partial<OrgNode> & { id: string }): OrgNode {
  return {
    parentId: null,
    name: overrides.id,
    groupTypeId: 1,
    leaders: [],
    coLeaders: [],
    ...overrides,
  };
}

const root = makeNode({ id: 'group-1', parentId: null });
const l2a = makeNode({ id: 'group-2', parentId: 'group-1' });
const l2b = makeNode({ id: 'group-3', parentId: 'group-1' });
const l3a = makeNode({ id: 'group-4', parentId: 'group-2' });
const l3b = makeNode({ id: 'group-5', parentId: 'group-2' });
const l4a = makeNode({ id: 'group-6', parentId: 'group-4' });
const l4b = makeNode({ id: 'group-7', parentId: 'group-4' });
const l5a = makeNode({ id: 'group-8', parentId: 'group-6' }); // level 5 — hidden

const allNodes = [root, l2a, l2b, l3a, l3b, l4a, l4b, l5a];

// ---------------------------------------------------------------------------
// Height helpers
// ---------------------------------------------------------------------------

describe('personRowCount', () => {
  it('returns 0 for a node with no persons', () => {
    expect(personRowCount(makeNode({ id: 'x' }))).toBe(0);
  });

  it('counts leaders and coLeaders together', () => {
    const node = makeNode({
      id: 'x',
      leaders: [{ id: 1, firstName: 'A', lastName: 'B' }],
      coLeaders: [{ id: 2, firstName: 'C', lastName: 'D' }],
    });
    expect(personRowCount(node)).toBe(2);
  });
});

describe('nodeContentHeight', () => {
  it('returns 0 when there are no persons', () => {
    expect(nodeContentHeight(makeNode({ id: 'x' }))).toBe(0);
  });

  it('includes padding and one row per person', () => {
    const node = makeNode({
      id: 'x',
      leaders: [{ id: 1, firstName: 'A', lastName: 'B' }],
      coLeaders: [],
    });
    const expected =
      LAYOUT.PERSON_PADDING_TOP + 1 * LAYOUT.PERSON_ROW_HEIGHT + LAYOUT.PERSON_PADDING_BOTTOM;
    expect(nodeContentHeight(node)).toBe(expected);
  });
});

describe('l4NodeHeight', () => {
  it('returns one-row height for an empty node', () => {
    const oneRow = LAYOUT.L4_VPADDING * 2 + LAYOUT.L4_ROW_HEIGHT;
    expect(l4NodeHeight(makeNode({ id: 'x' }), false)).toBe(oneRow);
  });

  it('grows to multiple rows when many long names are present', () => {
    const node = makeNode({
      id: 'x',
      leaders: [
        { id: 1, firstName: 'Alexander', lastName: 'Müller' },
        { id: 2, firstName: 'Christiane', lastName: 'Schreiber' },
        { id: 3, firstName: 'Bartholomäus', lastName: 'Zimmermann' },
        { id: 4, firstName: 'Margarethe', lastName: 'Hoffmann' },
      ],
      coLeaders: [],
    });
    const h = l4NodeHeight(node, false);
    const oneRow = LAYOUT.L4_VPADDING * 2 + LAYOUT.L4_ROW_HEIGHT;
    expect(h).toBeGreaterThan(oneRow);
  });
});

describe('l3NodeHeight', () => {
  it('returns L3_HEADER_HEIGHT when there are no L4 children and no persons', () => {
    expect(l3NodeHeight(makeNode({ id: 'l3' }), [], false)).toBe(LAYOUT.L3_HEADER_HEIGHT);
  });

  it('adds height for each L4 child plus gaps and padding', () => {
    const children = [makeNode({ id: 'a' }), makeNode({ id: 'b' })];
    const h = l3NodeHeight(makeNode({ id: 'l3' }), children, false);
    const expected =
      LAYOUT.L3_HEADER_HEIGHT +
      LAYOUT.L3_PADDING +
      l4NodeHeight(children[0], false) +
      LAYOUT.L4_GAP +
      l4NodeHeight(children[1], false) +
      LAYOUT.L3_PADDING;
    expect(h).toBe(expected);
  });
});

describe('l2NodeHeight', () => {
  it('returns at least L2_HEADER_HEIGHT', () => {
    expect(l2NodeHeight(makeNode({ id: 'x' }))).toBe(LAYOUT.L2_HEADER_HEIGHT);
  });
});

// ---------------------------------------------------------------------------
// computeLayout
// ---------------------------------------------------------------------------

describe('computeLayout', () => {
  it('returns empty result for an empty node list', () => {
    const result = computeLayout([], true, false);
    expect(result.nodes).toHaveLength(0);
    expect(result.totalWidth).toBe(0);
    expect(result.totalHeight).toBe(0);
  });

  it('returns empty result when there is no root node', () => {
    const orphan = makeNode({ id: 'group-2', parentId: 'group-1' });
    const result = computeLayout([orphan], true, false);
    expect(result.nodes).toHaveLength(0);
  });

  it('places the root at (rootX, 0)', () => {
    const result = computeLayout(allNodes, true, false);
    const rootGeo = result.nodes.find((n) => n.id === 'group-1')!;
    expect(rootGeo.y).toBe(0);
    expect(rootGeo.level).toBe(1);
  });

  it('assigns correct levels', () => {
    const result = computeLayout(allNodes, true, false);
    const byId = new Map(result.nodes.map((n) => [n.id, n]));
    expect(byId.get('group-1')?.level).toBe(1);
    expect(byId.get('group-2')?.level).toBe(2);
    expect(byId.get('group-3')?.level).toBe(2);
    expect(byId.get('group-4')?.level).toBe(3);
    expect(byId.get('group-5')?.level).toBe(3);
    expect(byId.get('group-6')?.level).toBe(4);
    expect(byId.get('group-7')?.level).toBe(4);
  });

  it('does not include level-5+ nodes in the layout output', () => {
    const result = computeLayout(allNodes, true, false);
    const ids = result.nodes.map((n) => n.id);
    expect(ids).not.toContain('group-8'); // level 5
  });

  it('attaches level-5 nodes as hiddenChildren of their level-4 parent', () => {
    const result = computeLayout(allNodes, true, false);
    const l4geo = result.nodes.find((n) => n.id === 'group-6')!;
    expect(l4geo.hiddenChildren).toHaveLength(1);
    expect(l4geo.hiddenChildren[0].id).toBe('group-8');
  });

  it('L3 nodes are positioned below their L2 column header', () => {
    const result = computeLayout(allNodes, true, false);
    const l2geo = result.nodes.find((n) => n.id === 'group-2')!;
    const l3geo = result.nodes.find((n) => n.id === 'group-4')!;
    expect(l3geo.y).toBeGreaterThan(l2geo.y + l2geo.height);
  });

  it('L4 nodes are positioned inside their L3 box', () => {
    const result = computeLayout(allNodes, true, false);
    const l3geo = result.nodes.find((n) => n.id === 'group-4')!;
    const l4geo = result.nodes.find((n) => n.id === 'group-6')!;
    expect(l4geo.y).toBeGreaterThanOrEqual(l3geo.y + LAYOUT.L3_HEADER_HEIGHT);
    expect(l4geo.y + l4geo.height).toBeLessThanOrEqual(l3geo.y + l3geo.height + 1); // allow rounding
  });

  it('nodes in different L2 columns have different x positions', () => {
    const result = computeLayout(allNodes, true, false);
    const col0x = result.nodes.find((n) => n.id === 'group-2')!.x;
    const col1x = result.nodes.find((n) => n.id === 'group-3')!.x;
    expect(col1x).toBeGreaterThan(col0x);
  });

  it('totalWidth equals numColumns * NODE_WIDTH + gaps', () => {
    const result = computeLayout(allNodes, true, false);
    const expected = 2 * LAYOUT.NODE_WIDTH + 1 * LAYOUT.COL_GAP;
    expect(result.totalWidth).toBe(expected);
  });

  it('root is horizontally centered over the columns', () => {
    const result = computeLayout(allNodes, true, false);
    const rootGeo = result.nodes.find((n) => n.id === 'group-1')!;
    const expectedX = (result.totalWidth - LAYOUT.NODE_WIDTH) / 2;
    expect(rootGeo.x).toBeCloseTo(expectedX, 1);
  });

  it('filters out inactive nodes when showInactiveGroups is false', () => {
    const inactiveNode = makeNode({ id: 'group-9', parentId: 'group-2', inactive: true });
    const result = computeLayout([...allNodes, inactiveNode], false, false);
    const ids = result.nodes.map((n) => n.id);
    expect(ids).not.toContain('group-9');
  });

  it('includes inactive nodes when showInactiveGroups is true', () => {
    const inactiveNode = makeNode({ id: 'group-9', parentId: 'group-2', inactive: true });
    const result = computeLayout([...allNodes, inactiveNode], true, false);
    const ids = result.nodes.map((n) => n.id);
    expect(ids).toContain('group-9');
  });

  it('assigns correct columnIndex to L2 and their descendants', () => {
    const result = computeLayout(allNodes, true, false);
    const byId = new Map(result.nodes.map((n) => [n.id, n]));
    // group-2 is col 0, group-3 is col 1
    expect(byId.get('group-2')?.columnIndex).toBe(0);
    expect(byId.get('group-3')?.columnIndex).toBe(1);
    // group-4 is L3 under group-2 → col 0
    expect(byId.get('group-4')?.columnIndex).toBe(0);
    expect(byId.get('group-6')?.columnIndex).toBe(0);
  });

  it('handles a single-node (root-only) organigram', () => {
    const result = computeLayout([root], true, false);
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].level).toBe(1);
  });
});
