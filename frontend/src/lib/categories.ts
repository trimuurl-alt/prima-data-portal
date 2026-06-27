import { useQuery } from '@tanstack/react-query';
import { api } from './api';

export interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  _count?: { datasets: number; children: number };
}

export interface FlatCategory extends CategoryNode {
  path: string;
}

export interface CategoryTreeNode extends CategoryNode {
  children: CategoryTreeNode[];
}

/** Flat list with `path` like "Retail › Clothing". Useful for selects. */
export function useCategoriesFlat() {
  return useQuery({
    queryKey: ['categories', 'flat'],
    queryFn: async () => (await api.get<FlatCategory[]>('/categories?flat=1')).data,
    staleTime: 60_000,
  });
}

/** Tree of root categories with nested children. Useful for management UI. */
export function useCategoriesTree() {
  return useQuery({
    queryKey: ['categories', 'tree'],
    queryFn: async () => (await api.get<CategoryTreeNode[]>('/categories')).data,
    staleTime: 60_000,
  });
}

/** Flattens a tree for display (parent first, then children, indented). */
export function flattenTree(tree: CategoryTreeNode[], depth = 0): Array<CategoryTreeNode & { depth: number }> {
  const out: Array<CategoryTreeNode & { depth: number }> = [];
  for (const node of tree) {
    out.push({ ...node, depth });
    if (node.children?.length) out.push(...flattenTree(node.children, depth + 1));
  }
  return out;
}
