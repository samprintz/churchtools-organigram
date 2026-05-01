import { describe, expect, it } from 'vitest';
import type { OrgChartFile, OrgNode } from '../../shared/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function validateOrgChartFile(file: OrgChartFile): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const ids = new Set(file.nodes.map((n) => n.id));

  for (const node of file.nodes) {
    if (!node.id) errors.push('Node missing id');
    if (node.parentId !== null && !ids.has(node.parentId)) {
      errors.push(`Node ${node.id} references unknown parentId: ${node.parentId}`);
    }
  }

  const roots = file.nodes.filter((n) => n.parentId === null);
  if (file.nodes.length > 0 && roots.length === 0) {
    errors.push('No root nodes found (all nodes have a parentId)');
  }

  return { valid: errors.length === 0, errors };
}

function getNodeDepth(id: string, nodeMap: Map<string, OrgNode>, memo = new Map<string, number>()): number {
  if (memo.has(id)) return memo.get(id)!;
  const node = nodeMap.get(id);
  if (!node || node.parentId === null) return 0;
  const depth = 1 + getNodeDepth(node.parentId, nodeMap, memo);
  memo.set(id, depth);
  return depth;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const sampleFile: OrgChartFile = {
  schemaVersion: '1',
  generatedAt: '2024-01-01T00:00:00.000Z',
  nodes: [
    {
      id: 'group-1',
      parentId: null,
      name: 'Leitung',
      groupTypeId: 4,
      leaders: [{ id: 10, firstName: 'Anna', lastName: 'Müller' }],
      coLeaders: [],
    },
    {
      id: 'group-2',
      parentId: 'group-1',
      name: 'Anbetung',
      groupTypeId: 4,
      leaders: [{ id: 11, firstName: 'Ben', lastName: 'Schmidt' }],
      coLeaders: [{ id: 12, firstName: 'Clara', lastName: 'Weber' }],
    },
    {
      id: 'group-3',
      parentId: 'group-2',
      name: 'Lobpreis',
      groupTypeId: 7,
      leaders: [],
      coLeaders: [],
    },
  ],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('OrgChartFile structure', () => {
  it('has id and parentId on every node', () => {
    for (const node of sampleFile.nodes) {
      expect(typeof node.id).toBe('string');
      expect(node.parentId === null || typeof node.parentId === 'string').toBe(true);
    }
  });

  it('passes structural validation', () => {
    const result = validateOrgChartFile(sampleFile);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('root node has null parentId', () => {
    const roots = sampleFile.nodes.filter((n) => n.parentId === null);
    expect(roots).toHaveLength(1);
    expect(roots[0].id).toBe('group-1');
  });

  it('child nodes reference valid parentIds', () => {
    const ids = new Set(sampleFile.nodes.map((n) => n.id));
    const children = sampleFile.nodes.filter((n) => n.parentId !== null);
    for (const child of children) {
      expect(ids.has(child.parentId!)).toBe(true);
    }
  });

  it('calculates correct depth for each node', () => {
    const nodeMap = new Map(sampleFile.nodes.map((n) => [n.id, n]));
    expect(getNodeDepth('group-1', nodeMap)).toBe(0);
    expect(getNodeDepth('group-2', nodeMap)).toBe(1);
    expect(getNodeDepth('group-3', nodeMap)).toBe(2);
  });

  it('detects broken parentId reference', () => {
    const broken: OrgChartFile = {
      ...sampleFile,
      nodes: [
        { ...sampleFile.nodes[0], parentId: 'group-999' },
      ],
    };
    const result = validateOrgChartFile(broken);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('group-999');
  });

  it('detects missing root node', () => {
    const noRoot: OrgChartFile = {
      ...sampleFile,
      nodes: sampleFile.nodes.map((n) => ({
        ...n,
        parentId: n.parentId ?? 'group-999',
      })),
    };
    const result = validateOrgChartFile(noRoot);
    expect(result.valid).toBe(false);
  });

  it('nodes carry leaders and coLeaders arrays', () => {
    const root = sampleFile.nodes.find((n) => n.id === 'group-1')!;
    expect(root.leaders).toHaveLength(1);
    expect(root.leaders[0]).toMatchObject({ id: 10, firstName: 'Anna' });
    expect(root.coLeaders).toHaveLength(0);
  });

  it('empty organigram is valid', () => {
    const empty: OrgChartFile = { ...sampleFile, nodes: [] };
    const result = validateOrgChartFile(empty);
    expect(result.valid).toBe(true);
  });
});
