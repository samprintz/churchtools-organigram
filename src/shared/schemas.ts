import { z } from 'zod';

export const personSchema = z.object({
  id: z.number(),
  firstName: z.string(),
  lastName: z.string(),
});

export const orgNodeSchema = z.object({
  id: z.string(),
  parentId: z.string().nullable(),
  name: z.string(),
  groupTypeId: z.number(),
  inactive: z.boolean().optional(),
  leaders: z.array(personSchema),
  coLeaders: z.array(personSchema),
});

export const orgChartFileSchema = z.object({
  schemaVersion: z.literal('1'),
  generatedAt: z.string(),
  nodes: z.array(orgNodeSchema),
});

export const groupTypeConfigSchema = z.object({
  id: z.number(),
  name: z.string(),
  color: z.string(),
  leaderRoleIds: z.array(z.number()),
  coLeaderRoleIds: z.array(z.number()),
});

export const appConfigSchema = z.object({
  rootGroupId: z.number(),
  groupTypes: z.array(groupTypeConfigSchema),
  showCoLeaders: z.boolean(),
  showInactiveGroups: z.boolean(),
  includeTags: z.array(z.string()),
  excludeTags: z.array(z.string()),
  relevantGroupStatusIds: z.array(z.number()),
  inactiveGroupStatusIds: z.array(z.number()),
  theme: z.enum(['light', 'dark', 'system']),
});
