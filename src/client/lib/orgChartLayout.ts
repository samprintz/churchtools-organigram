import type { OrgNode, Person } from '../../shared/types.js';

export interface OrgTreeNode {
  node: OrgNode;
  level: number; // 1=root, 2=column header, 3=card, 4=inline item
  children: OrgTreeNode[];
  hiddenChildren: OrgNode[]; // level-5+ children of level-4 nodes
}

export interface OrgTree {
  root: OrgTreeNode;
  columns: OrgTreeNode[]; // L2 children of root
}

export function buildOrgTree(nodes: OrgNode[], showInactiveGroups: boolean): OrgTree | null {
  if (nodes.length === 0) return null;

  const visible = showInactiveGroups ? nodes : nodes.filter((n) => !n.inactive);
  const rootNode = visible.find((n) => n.parentId === null);
  if (!rootNode) return null;

  const childrenMap = new Map<string, OrgNode[]>();
  for (const n of visible) {
    if (n.parentId === null) continue;
    const siblings = childrenMap.get(n.parentId) ?? [];
    siblings.push(n);
    childrenMap.set(n.parentId, siblings);
  }

  function buildNode(node: OrgNode, level: number): OrgTreeNode {
    const rawChildren = childrenMap.get(node.id) ?? [];
    if (level >= 4) {
      return { node, level, children: [], hiddenChildren: rawChildren };
    }
    const children = rawChildren.map((c) => buildNode(c, level + 1));
    return { node, level, children, hiddenChildren: [] };
  }

  const root = buildNode(rootNode, 1);
  return { root, columns: root.children };
}

// ---------------------------------------------------------------------------
// Markdown serialisation
// ---------------------------------------------------------------------------

function formatPersons(
  leaders: Person[],
  coLeaders: Person[],
  showCoLeaders: boolean,
): string {
  const all = [...leaders, ...(showCoLeaders ? coLeaders : [])];
  if (all.length === 0) return '';
  return ` (${all.map((p) => `${p.firstName} ${p.lastName}`).join(', ')})`;
}

export function orgTreeToMarkdown(
  tree: OrgTree,
  showCoLeaders: boolean,
): string {
  const lines: string[] = [];
  const r = tree.root.node;
  lines.push(
    `# ${r.name}${formatPersons(r.leaders, r.coLeaders, showCoLeaders)}`,
  );
  lines.push('');
  for (const col of tree.columns) {
    const cn = col.node;
    lines.push(
      `- **${cn.name}**${formatPersons(cn.leaders, cn.coLeaders, showCoLeaders)}`,
    );
    for (const l3 of col.children) {
      const l3n = l3.node;
      lines.push(
        `  - **${l3n.name}**${formatPersons(l3n.leaders, l3n.coLeaders, showCoLeaders)}`,
      );
      for (const l4 of l3.children) {
        const l4n = l4.node;
        lines.push(
          `    - ${l4n.name}${formatPersons(l4n.leaders, l4n.coLeaders, showCoLeaders)}`,
        );
      }
    }
  }
  return lines.join('\n');
}
