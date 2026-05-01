export interface OrgChartFile {
  schemaVersion: '1';
  generatedAt: string; // ISO-8601
  nodes: OrgNode[];
}

export interface OrgNode {
  id: string; // "group-{churchtools_id}"
  parentId: string | null; // null = root node
  name: string;
  groupTypeId: number;
  color?: string; // ChurchTools color string, e.g. "sky", "lime"
  inactive?: boolean;
  leaders: Person[];
  coLeaders: Person[];
}

export interface Person {
  id: number;
  firstName: string;
  lastName: string;
}

export interface GroupTypeConfig {
  id: number;
  leaderRoleIds: number[];
  coLeaderRoleIds: number[];
}

export interface AppConfig {
  rootGroupId: number;
  groupTypes: GroupTypeConfig[];
  showCoLeaders: boolean;
  showInactiveGroups: boolean;
  includeTags: string[];
  excludeTags: string[];
  relevantGroupStatusIds: number[];
  inactiveGroupStatusIds: number[];
  theme: 'light' | 'dark' | 'system';
}
