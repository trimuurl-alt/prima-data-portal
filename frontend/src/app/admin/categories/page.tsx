'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useCategoriesFlat, useCategoriesTree, type FlatCategory } from '@/lib/categories';
import { Plus, X, Pencil, Trash2, ChevronRight } from 'lucide-react';
import { getErrorMessage } from '@/lib/utils';

export default function AdminCategoriesPage() {
  const tree = useCategoriesTree();
  const [creating, setCreating] = useState<{ parentId?: string } | null>(null);
  const [editing, setEditing] = useState<FlatCategory | null>(null);

  return (
    <div className="space-y-3">
      <section className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
        <header className="px-5 py-4 flex items-center justify-between border-b border-stone-100">
          <div>
            <h1 className="text-[15px] font-medium text-stone-900">Categories</h1>
            <p className="text-xs text-stone-500 mt-0.5">
              Manage the categories used to organise datasets. Drag-style sorting isn&apos;t supported yet — use the sort number to reorder.
            </p>
          </div>
          <button
            onClick={() => setCreating({})}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-medium"
          >
            <Plus className="w-3.5 h-3.5" /> New category
          </button>
        </header>

        <div className="p-5">
          {tree.isLoading && <div className="text-sm text-stone-500">Loading…</div>}
          {tree.data && tree.data.length === 0 && (
            <div className="text-sm text-stone-500 text-center py-8">
              No categories yet. Click &quot;New category&quot; to add the first one.
            </div>
          )}
          {tree.data && tree.data.map((node) => (
            <CategoryRow
              key={node.id}
              node={node}
              depth={0}
              onAddChild={(parentId) => setCreating({ parentId })}
              onEdit={(n) => setEditing(n as any)}
            />
          ))}
        </div>
      </section>

      {creating && (
        <CategoryModal
          mode="create"
          parentId={creating.parentId}
          onClose={() => setCreating(null)}
        />
      )}
      {editing && (
        <CategoryModal
          mode="edit"
          existing={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

interface RowProps {
  node: any;
  depth: number;
  onAddChild: (id: string) => void;
  onEdit: (n: any) => void;
}

function CategoryRow({ node, depth, onAddChild, onEdit }: RowProps) {
  const qc = useQueryClient();
  const remove = useMutation({
    mutationFn: () => api.delete(`/categories/${node.id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
    onError: (e) => alert(getErrorMessage(e)),
  });

  const hasChildren = node.children && node.children.length > 0;
  const usageCount = node._count?.datasets ?? 0;

  return (
    <div>
      <div
        className="flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-stone-50/60 group"
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
      >
        <ChevronRight className={`w-3 h-3 text-stone-300 ${hasChildren ? '' : 'invisible'}`} />
        <span className="flex-1 text-sm font-medium text-stone-900 truncate">{node.name}</span>
        <span className="text-[11px] text-stone-400">{node.slug}</span>
        <span className="text-[11px] text-stone-500 ml-3">
          {usageCount} dataset{usageCount === 1 ? '' : 's'}
        </span>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition ml-2">
          <button
            onClick={() => onAddChild(node.id)}
            className="p-1.5 text-stone-500 hover:bg-stone-100 hover:text-brand-700 rounded transition"
            title="Add subcategory"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onEdit(node)}
            className="p-1.5 text-stone-500 hover:bg-stone-100 hover:text-brand-700 rounded transition"
            title="Edit"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              if (confirm(`Delete category "${node.name}"?`)) remove.mutate();
            }}
            className="p-1.5 text-stone-500 hover:bg-stone-100 hover:text-red-600 rounded transition"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {hasChildren && node.children.map((child: any) => (
        <CategoryRow key={child.id} node={child} depth={depth + 1} onAddChild={onAddChild} onEdit={onEdit} />
      ))}
    </div>
  );
}

// ─── Modal ──────────────────────────────────────────────────────

interface ModalProps {
  mode: 'create' | 'edit';
  parentId?: string;
  existing?: FlatCategory;
  onClose: () => void;
}

function CategoryModal({ mode, parentId, existing, onClose }: ModalProps) {
  const qc = useQueryClient();
  const flat = useCategoriesFlat();

  const [name, setName] = useState(existing?.name ?? '');
  const [slug, setSlug] = useState(existing?.slug ?? '');
  const [parent, setParent] = useState<string>(existing?.parentId ?? parentId ?? '');
  const [sortOrder, setSortOrder] = useState<number>(existing?.sortOrder ?? 0);
  const [error, setError] = useState<string | null>(null);

  const setNameAndSlug = (v: string) => {
    setName(v);
    if (mode === 'create') {
      setSlug(v.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''));
    }
  };

  const save = useMutation({
    mutationFn: async () => {
      const body: any = {
        name: name.trim(),
        slug: slug.trim() || undefined,
        sortOrder,
      };
      // Only include parentId if it changed or is explicitly set
      if (mode === 'create') {
        body.parentId = parent || undefined;
      } else if (mode === 'edit') {
        body.parentId = parent || null;
      }

      if (mode === 'create') {
        return (await api.post('/categories', body)).data;
      } else {
        return (await api.patch(`/categories/${existing!.id}`, body)).data;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      qc.invalidateQueries({ queryKey: ['admin-datasets'] });
      onClose();
    },
    onError: (e) => setError(getErrorMessage(e)),
  });

  // Filter parents — for edit mode, exclude self and descendants
  const availableParents = (flat.data ?? []).filter((c) => {
    if (mode === 'create') return true;
    if (!existing) return true;
    if (c.id === existing.id) return false;
    // Walk up parents — if we ever reach existing.id, it's a descendant
    let cursor = c;
    while (cursor.parentId) {
      if (cursor.parentId === existing.id) return false;
      const next = flat.data?.find((x) => x.id === cursor.parentId);
      if (!next) break;
      cursor = next;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 bg-stone-900/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
          <h2 className="text-base font-semibold">
            {mode === 'create' ? 'New category' : 'Edit category'}
          </h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setNameAndSlug(e.target.value)}
              placeholder="e.g. Healthcare"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Slug (URL-friendly)</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="healthcare"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <p className="text-xs text-stone-500 mt-1">Used internally. Letters, numbers, and hyphens only.</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Parent category</label>
            <select
              value={parent}
              onChange={(e) => setParent(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white"
            >
              <option value="">— None (top level) —</option>
              {availableParents.map((c) => (
                <option key={c.id} value={c.id}>{c.path}</option>
              ))}
            </select>
            <p className="text-xs text-stone-500 mt-1">Leave blank for a top-level category.</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Sort order</label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
              className="w-32 px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <p className="text-xs text-stone-500 mt-1">Lower numbers appear first.</p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>
          )}
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 bg-stone-50 border-t border-stone-200 rounded-b-xl">
          <button onClick={onClose} className="px-4 py-2 border border-stone-300 rounded-lg text-sm">Cancel</button>
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending || !name.trim()}
            className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {save.isPending ? 'Saving…' : (mode === 'create' ? 'Create' : 'Save')}
          </button>
        </div>
      </div>
    </div>
  );
}
