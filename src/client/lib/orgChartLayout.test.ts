import { describe, expect, it } from 'vitest';
import type { OrgNode } from '../../shared/types.js';
import { buildOrgTree } from './orgChartLayout.js';

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
// buildOrgTree
// ---------------------------------------------------------------------------

describe('buildOrgTree', () => {
  it('returns null for empty nodes', () => {
    expect(buildOrgTree([], true)).toBeNull();
  });

  it('returns null when there is no root node', () => {
    const orphan = makeNode({ id: 'group-2', parentId: 'group-1' });
    expect(buildOrgTree([orphan], true)).toBeNull();
  });

  it('returns a tree with root at level 1', () => {
    const tree = buildOrgTree(allNodes, true)!;
    expect(tree).not.toBeNull();
    expect(tree.root.level).toBe(1);
    expect(tree.root.node.id).toBe('group-1');
  });

  it('assigns correct levels to descendants', () => {
    const tree = buildOrgTree(allNodes, true)!;
    const col = tree.columns[0]; // group-2
    expect(col.level).toBe(2);
    const l3 = col.children[0]; // group-4
    expect(l3.level).toBe(3);
    const l4 = l3.children[0]; // group-6
    expect(l4.level).toBe(4);
  });

  it('columns contains L2 children of root', () => {
    const tree = buildOrgTree(allNodes, true)!;
    expect(tree.columns).toHaveLength(2);
    expect(tree.columns[0].node.id).toBe('group-2');
    expect(tree.columns[1].node.id).toBe('group-3');
  });

  it('L4 nodes have no rendered children', () => {
    const tree = buildOrgTree(allNodes, true)!;
    const l4 = tree.columns[0].children[0].children[0]; // group-6
    expect(l4.children).toHaveLength(0);
  });

  it('L5+ nodes become hiddenChildren of their L4 parent', () => {
    const tree = buildOrgTree(allNodes, true)!;
    const l4 = tree.columns[0].children[0].children[0]; // group-6
    expect(l4.hiddenChildren).toHaveLength(1);
    expect(l4.hiddenChildren[0].id).toBe('group-8');
  });

  it('non-L4 nodes have empty hiddenChildren', () => {
    const tree = buildOrgTree(allNodes, true)!;
    expect(tree.root.hiddenChildren).toHaveLength(0);
    expect(tree.columns[0].hiddenChildren).toHaveLength(0);
    expect(tree.columns[0].children[0].hiddenChildren).toHaveLength(0);
  });

  it('L4 sibling without hidden children has empty hiddenChildren', () => {
    const tree = buildOrgTree(allNodes, true)!;
    const l4b_node = tree.columns[0].children[0].children[1]; // group-7
    expect(l4b_node.hiddenChildren).toHaveLength(0);
  });

  it('excludes inactive nodes when showInactiveGroups is false', () => {
    const inactiveNode = makeNode({ id: 'group-9', parentId: 'group-2', inactive: true });
    const tree = buildOrgTree([...allNodes, inactiveNode], false)!;
    const ids = tree.columns[0].children.map((c) => c.node.id);
    expect(ids).not.toContain('group-9');
  });

  it('includes inactive nodes when showInactiveGroups is true', () => {
    const inactiveNode = makeNode({ id: 'group-9', parentId: 'group-2', inactive: true });
    const tree = buildOrgTree([...allNodes, inactiveNode], true)!;
    const ids = tree.columns[0].children.map((c) => c.node.id);
    expect(ids).toContain('group-9');
  });

  it('handles a single-node (root-only) organigram', () => {
    const tree = buildOrgTree([root], true)!;
    expect(tree.root.node.id).toBe('group-1');
    expect(tree.columns).toHaveLength(0);
  });

  it('handles root as the only non-inactive node when showInactiveGroups is false', () => {
    const inactiveL2 = makeNode({ id: 'group-2', parentId: 'group-1', inactive: true });
    const tree = buildOrgTree([root, inactiveL2], false)!;
    expect(tree.columns).toHaveLength(0);
  });

  it('does not include level-5 nodes in the rendered tree', () => {
    const tree = buildOrgTree(allNodes, true)!;
    function collectIds(node: ReturnType<typeof buildOrgTree>['root']): string[] {
      return [node.node.id, ...node.children.flatMap(collectIds)];
    }
    const ids = collectIds(tree.root);
    expect(ids).not.toContain('group-8'); // group-8 is level 5
  });

  it('returns null when root itself is inactive and showInactiveGroups is false', () => {
    const inactiveRoot = makeNode({ id: 'group-1', parentId: null, inactive: true });
    expect(buildOrgTree([inactiveRoot], false)).toBeNull();
  });
});
