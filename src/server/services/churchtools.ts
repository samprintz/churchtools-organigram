import type { AppConfig, OrgChartFile, OrgNode, Person } from '../../shared/types.js';

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

export class ChurchToolsError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'ChurchToolsError';
  }
}

// ---------------------------------------------------------------------------
// ChurchTools REST API types
// ---------------------------------------------------------------------------

export interface CTGroup {
  id: number;
  name: string;
  information: {
    groupTypeId: number;
    groupStatusId: number;
    color?: string;
    tags?: Array<{ id: number; name: string }>;
  };
}

export interface CTPerson {
  id: number;
  firstName: string;
  lastName: string;
}

export interface CTGroupMember {
  groupId: number;
  personId: number;
  groupTypeRoleId: number;
}

export interface CTHierarchy {
  groupId: number;
  children: number[];
  parents: number[];
}

interface CTPagination {
  total: number;
  limit: number;
  current: number;
  lastPage: number;
}

interface CTResponse<T> {
  data: T;
  meta?: {
    pagination?: CTPagination;
  };
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

async function ctFetch<T>(
  baseUrl: string,
  path: string,
  cookieHeader: string,
  params?: Record<string, string | number>,
): Promise<CTResponse<T>> {
  const url = new URL(`${baseUrl}/api${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url.toString(), {
    headers: {
      Cookie: cookieHeader,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new ChurchToolsError(
      `ChurchTools API error: ${response.status} ${response.statusText} (${path})`,
      response.status,
    );
  }

  return response.json() as Promise<CTResponse<T>>;
}

async function login(baseUrl: string, email: string, password: string): Promise<string> {
  const response = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: email, password }),
  });

  if (!response.ok) {
    throw new ChurchToolsError(
      `Login failed: ${response.status} ${response.statusText}`,
      response.status,
    );
  }

  const cookies = response.headers.getSetCookie();
  return cookies.map((c) => c.split(';')[0]).join('; ');
}

export function shouldContinuePaging(
  fetchedCount: number,
  pagination: CTPagination | undefined,
): boolean {
  if (!pagination) return false;
  return fetchedCount < pagination.total;
}

async function fetchAllPages<T>(
  baseUrl: string,
  path: string,
  cookieHeader: string,
  limit = 100,
): Promise<T[]> {
  const all: T[] = [];
  let page = 1;

  while (true) {
    const result = await ctFetch<T[]>(baseUrl, path, cookieHeader, { page, limit });
    all.push(...result.data);

    if (!shouldContinuePaging(all.length, result.meta?.pagination)) break;
    page++;
  }

  return all;
}

// ---------------------------------------------------------------------------
// Transformation helpers (exported for unit testing)
// ---------------------------------------------------------------------------

function sanitizeName(name: string): string {
  // Remove characters that may cause issues in SVG/XML output
  return name.replace(/[<>&"]/g, '').trim();
}

function groupHasTag(group: CTGroup, tagName: string): boolean {
  return group.information.tags?.some((t) => t.name === tagName) ?? false;
}

function shouldIncludeGroup(group: CTGroup, config: AppConfig): boolean {
  // The designated root group is always included
  if (group.id === config.rootGroupId) return true;

  if (config.excludeTags.some((tag) => groupHasTag(group, tag))) return false;

  if (
    config.relevantGroupStatusIds.length > 0 &&
    !config.relevantGroupStatusIds.includes(group.information.groupStatusId)
  ) {
    return false;
  }

  const relevantGroupTypeIds = config.groupTypes.map((gt) => gt.id);
  return (
    relevantGroupTypeIds.includes(group.information.groupTypeId) ||
    config.includeTags.some((tag) => groupHasTag(group, tag))
  );
}

function findNearestIncludedAncestor(
  groupId: number,
  hierarchyMap: Map<number, CTHierarchy>,
  includedGroupIds: Set<number>,
  visited = new Set<number>(),
): number | null {
  if (visited.has(groupId)) return null;
  visited.add(groupId);

  const hierarchy = hierarchyMap.get(groupId);
  if (!hierarchy || hierarchy.parents.length === 0) return null;

  for (const parentId of hierarchy.parents) {
    if (includedGroupIds.has(parentId)) return parentId;
    const ancestor = findNearestIncludedAncestor(
      parentId,
      hierarchyMap,
      includedGroupIds,
      visited,
    );
    if (ancestor !== null) return ancestor;
  }

  return null;
}

export function transformToOrgChart(
  groups: CTGroup[],
  persons: CTPerson[],
  members: CTGroupMember[],
  hierarchies: CTHierarchy[],
  config: AppConfig,
): OrgChartFile {
  const groupMap = new Map<number, CTGroup>(groups.map((g) => [g.id, g]));
  const personMap = new Map<number, CTPerson>(persons.map((p) => [p.id, p]));
  const hierarchyMap = new Map<number, CTHierarchy>(hierarchies.map((h) => [h.groupId, h]));

  const membersByGroup = new Map<number, CTGroupMember[]>();
  for (const member of members) {
    const existing = membersByGroup.get(member.groupId) ?? [];
    existing.push(member);
    membersByGroup.set(member.groupId, existing);
  }

  const includedGroupIds = new Set<number>(
    groups.filter((g) => shouldIncludeGroup(g, config)).map((g) => g.id),
  );

  const nodes: OrgNode[] = [];

  for (const groupId of includedGroupIds) {
    const group = groupMap.get(groupId)!;
    const isRoot = groupId === config.rootGroupId;

    let parentId: string | null = null;
    if (!isRoot) {
      const ancestorId = findNearestIncludedAncestor(groupId, hierarchyMap, includedGroupIds);
      if (ancestorId === null) {
        console.warn(
          `[organigram] Skipping orphaned group "${group.name}" (id=${groupId}): no path to root group ${config.rootGroupId}`,
        );
        continue;
      }
      parentId = `group-${ancestorId}`;
    }

    const groupMembers = membersByGroup.get(groupId) ?? [];
    const leaders: Person[] = [];
    const coLeaders: Person[] = [];

    const groupTypeConfig = config.groupTypes.find((gt) => gt.id === group.information.groupTypeId);

    for (const member of groupMembers) {
      const person = personMap.get(member.personId);
      if (!person) continue;

      const personData: Person = {
        id: person.id,
        firstName: person.firstName,
        lastName: person.lastName,
      };

      if (groupTypeConfig?.leaderRoleIds.includes(member.groupTypeRoleId)) {
        leaders.push(personData);
      } else if (groupTypeConfig?.coLeaderRoleIds.includes(member.groupTypeRoleId)) {
        coLeaders.push(personData);
      }
    }

    const inactive = config.inactiveGroupStatusIds.includes(group.information.groupStatusId)
      ? true
      : undefined;

    nodes.push({
      id: `group-${groupId}`,
      parentId,
      name: sanitizeName(group.name),
      groupTypeId: group.information.groupTypeId,
      ...(group.information.color && { color: group.information.color }),
      ...(inactive && { inactive }),
      leaders,
      coLeaders,
    });
  }

  return {
    schemaVersion: '1',
    generatedAt: new Date().toISOString(),
    nodes,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function fetchOrgChart(config: AppConfig): Promise<OrgChartFile> {
  const baseUrl = process.env.CT_BASEURL;
  const email = process.env.CT_EMAIL;
  const password = process.env.CT_PASSWORD;

  if (!baseUrl || !email || !password) {
    throw new ChurchToolsError(
      'Missing ChurchTools credentials. Set CT_BASEURL, CT_EMAIL, and CT_PASSWORD in .env',
    );
  }

  const cookieHeader = await login(baseUrl, email, password);

  const groupsPromise = fetchAllPages<CTGroup>(baseUrl, '/groups', cookieHeader);
  const personsPromise = fetchAllPages<CTPerson>(baseUrl, '/persons', cookieHeader, 500);
  const membersPromise = ctFetch<CTGroupMember[]>(baseUrl, '/groups/members', cookieHeader);
  const hierarchiesPromise = ctFetch<CTHierarchy[]>(baseUrl, '/groups/hierarchies', cookieHeader);

  const groups = await groupsPromise;
  const persons = await personsPromise;
  const membersResult = await membersPromise;
  const hierarchiesResult = await hierarchiesPromise;

  return transformToOrgChart(
    groups,
    persons,
    membersResult.data,
    hierarchiesResult.data,
    config,
  );
}
