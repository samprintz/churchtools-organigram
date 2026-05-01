import { describe, expect, it, vi } from 'vitest';
import type { AppConfig } from '../../shared/types.js';
import type { CTGroup, CTGroupMember, CTHierarchy, CTPerson } from './churchtools.js';
import { shouldContinuePaging, transformToOrgChart } from './churchtools.js';

// ---------------------------------------------------------------------------
// Fixture data
// ---------------------------------------------------------------------------

const config: AppConfig = {
  rootGroupId: 1,
  groupTypes: [
    { id: 4, name: 'Leitung', color: '#1976D2', leaderRoleIds: [1], coLeaderRoleIds: [2] },
    { id: 7, name: 'Dienst', color: '#388E3C', leaderRoleIds: [1], coLeaderRoleIds: [2] },
  ],
  showCoLeaders: true,
  showInactiveGroups: true,
  includeTags: ['organigram'],
  excludeTags: ['organigram-exclude'],
  relevantGroupStatusIds: [],
  inactiveGroupStatusIds: [2],
  theme: 'system',
};

const groups: CTGroup[] = [
  { id: 1, name: 'Leitung', information: { groupTypeId: 4, groupStatusId: 1 } }, // root (by ID)
  { id: 2, name: 'Anbetung', information: { groupTypeId: 4, groupStatusId: 1 } }, // relevant type
  { id: 3, name: 'Lobpreis', information: { groupTypeId: 7, groupStatusId: 1 } }, // child of Anbetung
  { id: 4, name: 'Technik', information: { groupTypeId: 7, groupStatusId: 1 } }, // child of Anbetung
  { id: 5, name: 'Verwaltung', information: { groupTypeId: 99, groupStatusId: 1 } }, // irrelevant type, no tags → excluded
  {
    id: 6,
    name: 'Extra',
    information: { groupTypeId: 99, groupStatusId: 1, tags: [{ id: 1, name: 'organigram' }] },
  }, // force-included via tag
  {
    id: 7,
    name: 'Excluded',
    information: { groupTypeId: 7, groupStatusId: 1, tags: [{ id: 2, name: 'organigram-exclude' }] },
  }, // force-excluded via tag
  { id: 8, name: 'Inactive', information: { groupTypeId: 7, groupStatusId: 2 } }, // inactive status
];

const persons: CTPerson[] = [
  { id: 10, firstName: 'Anna', lastName: 'Müller' },
  { id: 11, firstName: 'Ben', lastName: 'Schmidt' },
  { id: 12, firstName: 'Clara', lastName: 'Weber' },
  { id: 13, firstName: 'David', lastName: 'Fischer' },
];

const members: CTGroupMember[] = [
  { groupId: 1, personId: 10, groupTypeRoleId: 1 }, // Anna → leader of Leitung
  { groupId: 2, personId: 11, groupTypeRoleId: 1 }, // Ben → leader of Anbetung
  { groupId: 3, personId: 12, groupTypeRoleId: 1 }, // Clara → leader of Lobpreis
  { groupId: 4, personId: 13, groupTypeRoleId: 2 }, // David → co-leader of Technik
  { groupId: 5, personId: 10, groupTypeRoleId: 1 }, // Anna → leader of excluded group
];

// Hierarchies: Lobpreis and Technik are children of Anbetung; Anbetung is child of Leitung
const hierarchies: CTHierarchy[] = [
  { groupId: 1, children: [2], parents: [] },
  { groupId: 2, children: [3, 4], parents: [1] },
  { groupId: 3, children: [], parents: [2] },
  { groupId: 4, children: [], parents: [2] },
  { groupId: 5, children: [], parents: [] },
  { groupId: 6, children: [], parents: [] },
  { groupId: 7, children: [], parents: [2] },
  { groupId: 8, children: [], parents: [2] },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('shouldContinuePaging', () => {
  it('returns true when fetched count is less than total', () => {
    expect(shouldContinuePaging(100, { total: 270, limit: 100, current: 1, lastPage: 3 })).toBe(true);
  });

  it('returns false when all items have been fetched', () => {
    expect(shouldContinuePaging(270, { total: 270, limit: 100, current: 3, lastPage: 3 })).toBe(false);
  });

  it('returns false when on the last page with a partial batch', () => {
    expect(shouldContinuePaging(242, { total: 242, limit: 500, current: 1, lastPage: 1 })).toBe(false);
  });

  it('returns false when pagination metadata is absent', () => {
    expect(shouldContinuePaging(50, undefined)).toBe(false);
  });
});

describe('transformToOrgChart', () => {
  it('produces a valid OrgChartFile structure', () => {
    const result = transformToOrgChart(groups, persons, members, hierarchies, config);
    expect(result.schemaVersion).toBe('1');
    expect(typeof result.generatedAt).toBe('string');
    expect(Array.isArray(result.nodes)).toBe(true);
  });

  it('always includes the root group regardless of its type', () => {
    const result = transformToOrgChart(groups, persons, members, hierarchies, config);
    const ids = result.nodes.map((n) => n.id);
    expect(ids).toContain('group-1'); // Leitung — root by ID
  });

  it('includes groups whose groupTypeId is in groupTypes', () => {
    const result = transformToOrgChart(groups, persons, members, hierarchies, config);
    const ids = result.nodes.map((n) => n.id);
    expect(ids).toContain('group-2'); // Anbetung (type 4)
    expect(ids).toContain('group-3'); // Lobpreis (type 7)
    expect(ids).toContain('group-4'); // Technik (type 7)
  });

  it('excludes groups with irrelevant type and no tags', () => {
    const result = transformToOrgChart(groups, persons, members, hierarchies, config);
    const ids = result.nodes.map((n) => n.id);
    expect(ids).not.toContain('group-5'); // Verwaltung
  });

  it('excludes and warns about orphaned groups that have no path to the root', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = transformToOrgChart(groups, persons, members, hierarchies, config);
    // group-6 (Extra) has an includeTag but no hierarchy parent → orphaned → skipped
    const ids = result.nodes.map((n) => n.id);
    expect(ids).not.toContain('group-6');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('id=6'));
    warn.mockRestore();
  });

  it('force-excludes groups with an excludeTag regardless of type', () => {
    const result = transformToOrgChart(groups, persons, members, hierarchies, config);
    const ids = result.nodes.map((n) => n.id);
    expect(ids).not.toContain('group-7'); // Excluded (organigram-exclude tag)
  });

  it('sets parentId to null only for the root group', () => {
    const result = transformToOrgChart(groups, persons, members, hierarchies, config);
    const roots = result.nodes.filter((n) => n.parentId === null);
    expect(roots).toHaveLength(1);
    expect(roots[0].id).toBe('group-1');
  });

  it('sets correct parentId for child groups', () => {
    const result = transformToOrgChart(groups, persons, members, hierarchies, config);
    const lobpreis = result.nodes.find((n) => n.id === 'group-3')!;
    const technik = result.nodes.find((n) => n.id === 'group-4')!;
    expect(lobpreis.parentId).toBe('group-2');
    expect(technik.parentId).toBe('group-2');
  });

  it('attaches leaders to group nodes', () => {
    const result = transformToOrgChart(groups, persons, members, hierarchies, config);
    const leitung = result.nodes.find((n) => n.id === 'group-1')!;
    expect(leitung.leaders).toHaveLength(1);
    expect(leitung.leaders[0]).toMatchObject({ id: 10, firstName: 'Anna', lastName: 'Müller' });
  });

  it('always stores co-leaders regardless of showCoLeaders config', () => {
    const noCoLeaderConfig: AppConfig = { ...config, showCoLeaders: false };
    const result = transformToOrgChart(groups, persons, members, hierarchies, noCoLeaderConfig);
    const technik = result.nodes.find((n) => n.id === 'group-4')!;
    expect(technik.coLeaders).toHaveLength(1);
    expect(technik.coLeaders[0]).toMatchObject({ id: 13, firstName: 'David' });
  });

  it('sanitizes group names with special XML characters', () => {
    const specialGroups: CTGroup[] = [
      { id: 1, name: 'Leitung <Test> & "More"', information: { groupTypeId: 4, groupStatusId: 1 } },
    ];
    const result = transformToOrgChart(specialGroups, [], [], [], config);
    const node = result.nodes.find((n) => n.id === 'group-1')!;
    expect(node.name).not.toContain('<');
    expect(node.name).not.toContain('>');
    expect(node.name).not.toContain('&');
    expect(node.name).not.toContain('"');
  });

  it('skips member entries for unknown persons', () => {
    const unknownPersonMembers: CTGroupMember[] = [
      { groupId: 1, personId: 999, groupTypeRoleId: 1 }, // person 999 doesn't exist
    ];
    const result = transformToOrgChart(
      [{ id: 1, name: 'Leitung', information: { groupTypeId: 4, groupStatusId: 1 } }],
      persons,
      unknownPersonMembers,
      [{ groupId: 1, children: [], parents: [] }],
      config,
    );
    const node = result.nodes.find((n) => n.id === 'group-1')!;
    expect(node.leaders).toHaveLength(0);
  });

  it('marks nodes whose groupStatusId is in inactiveGroupStatusIds as inactive', () => {
    const result = transformToOrgChart(groups, persons, members, hierarchies, config);
    const inactive = result.nodes.find((n) => n.id === 'group-8')!;
    expect(inactive.inactive).toBe(true);
  });

  it('marks nodes inactive when matching any entry in the inactiveGroupStatusIds array', () => {
    const multiInactiveConfig: AppConfig = { ...config, inactiveGroupStatusIds: [2, 5] };
    const extraGroups: CTGroup[] = [
      ...groups,
      { id: 9, name: 'Also Inactive', information: { groupTypeId: 7, groupStatusId: 5 } },
    ];
    const extraHierarchies: CTHierarchy[] = [
      ...hierarchies,
      { groupId: 9, children: [], parents: [2] },
    ];
    const result = transformToOrgChart(extraGroups, persons, members, extraHierarchies, multiInactiveConfig);
    expect(result.nodes.find((n) => n.id === 'group-8')?.inactive).toBe(true);
    expect(result.nodes.find((n) => n.id === 'group-9')?.inactive).toBe(true);
  });

  it('does not set inactive on nodes with a different groupStatusId', () => {
    const result = transformToOrgChart(groups, persons, members, hierarchies, config);
    const active = result.nodes.find((n) => n.id === 'group-3')!;
    expect(active.inactive).toBeUndefined();
  });

  it('does not set inactive when inactiveGroupStatusIds is empty', () => {
    const noInactiveConfig: AppConfig = { ...config, inactiveGroupStatusIds: [] };
    const result = transformToOrgChart(groups, persons, members, hierarchies, noInactiveConfig);
    const node = result.nodes.find((n) => n.id === 'group-8')!;
    expect(node.inactive).toBeUndefined();
  });

  it('returns empty nodes when rootGroupId is not found and no relevant groups match', () => {
    const emptyConfig: AppConfig = {
      ...config,
      rootGroupId: 999, // non-existent
      groupTypes: [],
      includeTags: [],
    };
    const result = transformToOrgChart(groups, persons, members, hierarchies, emptyConfig);
    expect(result.nodes).toHaveLength(0);
  });

  it('only assigns leader roles belonging to the matching group type', () => {
    // roleId 1 is configured only for type 4 — member of type-7 group with roleId 1 gets no role
    const mixedMembers: CTGroupMember[] = [
      { groupId: 1, personId: 10, groupTypeRoleId: 1 }, // type 4 → leader ✓
      { groupId: 3, personId: 11, groupTypeRoleId: 1 }, // type 7 → leader ✓ (also has roleId 1)
      { groupId: 3, personId: 12, groupTypeRoleId: 99 }, // type 7 → unknown role → skipped
    ];
    const result = transformToOrgChart(groups, persons, mixedMembers, hierarchies, config);
    const leitung = result.nodes.find((n) => n.id === 'group-1')!;
    const lobpreis = result.nodes.find((n) => n.id === 'group-3')!;
    expect(leitung.leaders).toHaveLength(1); // Anna via type-4 role
    expect(lobpreis.leaders).toHaveLength(1); // Ben via type-7 role
    expect(lobpreis.coLeaders).toHaveLength(0); // Clara has unknown role 99
  });
});
