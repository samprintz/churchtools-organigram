export interface OrgChartFile {
  schemaVersion: '1';
  generatedAt: string; // ISO-8601
  source: 'churchtools' | 'upload';
  nodes: OrgNode[];
}

export interface OrgNode {
  id: string; // "group-{churchtools_id}"
  parentId: string | null; // null = root node
  name: string;
  groupTypeId: number;
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
  name: string;
  color: string; // hex color for node header, e.g. "#1976D2"
  leaderRoleIds: number[];
  coLeaderRoleIds: number[];
}

export interface AppConfig {
  rootGroupId: number;
  groupTypes: GroupTypeConfig[];
  showCoLeaders: boolean;
  includeTags: string[];
  excludeTags: string[];
  relevantGroupStatusIds: number[];
  inactiveGroupStatusId: number | null;
  theme: 'light' | 'dark' | 'system';
}
