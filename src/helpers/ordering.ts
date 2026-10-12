// Display ordering (RT-040, RT-041; specs/architecture.md List Ordering).
// Ordering is applied on a copy for display only; stores and persisted files
// keep their original order.

export function compareText(left = "", right = "") {
  return left.localeCompare(right, undefined, {
    sensitivity: "base",
    numeric: true,
  });
}

interface OrderedNode {
  key: string;
  data: { name?: string; isCategory?: boolean };
  children?: OrderedNode[];
}

// Categories and entity groups first, then accounts; each by name with empty
// names last, then by key (account id) so the order is stable.
function compareNodes(left: OrderedNode, right: OrderedNode) {
  const leftIsCategory = !!left.data.isCategory;
  const rightIsCategory = !!right.data.isCategory;
  if (leftIsCategory !== rightIsCategory) {
    return leftIsCategory ? -1 : 1;
  }
  const leftName = left.data.name ?? "";
  const rightName = right.data.name ?? "";
  if (!leftName !== !rightName) {
    return leftName ? -1 : 1;
  }
  return compareText(leftName, rightName) || compareText(left.key, right.key);
}

export function sortTreeByName<T extends OrderedNode>(nodes: T[]): T[] {
  return [...nodes].sort(compareNodes).map((node) =>
    node.children
      ? {
          ...node,
          children: sortTreeByName(node.children),
        }
      : node,
  );
}
