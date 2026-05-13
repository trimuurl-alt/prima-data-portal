'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';
import { format } from 'date-fns';
import { formatBytes, getErrorMessage } from '@/lib/utils';
import { Plus, X } from 'lucide-react';

export default function AdminDatasetsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-datasets', search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ take: '100' });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      return (await api.get(`/datasets?${params}`)).data;
    },
  });

  const publish = useMutation({
    mutationFn: (id: string) => api.post(`/datasets/${id}/publish`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-datasets'] }),
    onError: (e) => alert(getErrorMessage(e)),
  });

  const archive = useMutation({
    mutationFn: (id: string) => api.post(`/datasets/${id}/archive`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-datasets'] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/datasets/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-datasets'] }),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Datasets</h1>
          <p className="text-sm text-stone-500 mt-0.5">Manage the full data catalogue</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-brand-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-brand-700"
        >
          <Plus className="w-4 h-4" /> New dataset
        </button>
      </div>

      <div className="flex gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search datasets…"
          className="flex-1 max-w-md px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 bg-white"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white"
        >
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>

      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 border-b border-stone-200">
            <tr>
              <Th>Name</Th><Th>Category</Th><Th>Status</Th><Th>Versions</Th><Th>Clients</Th><Th>Downloads</Th><Th>Updated</Th><Th>Actions</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {isLoading && <tr><td colSpan={8} className="px-4 py-8 text-center text-stone-500">Loading…</td></tr>}
            {data?.items?.map((d: any) => (
              <tr key={d.id} className="hover:bg-stone-50">
                <Td>
                  <Link href={`/admin/datasets/${d.id}`} className="font-medium text-stone-900 hover:text-brand-600">
                    {d.name}
                  </Link>
                  <div className="text-xs text-stone-500">{d.fileType} · {d.currentVersion ? formatBytes(d.currentVersion.fileSizeBytes) : 'No file'}</div>
                </Td>
                <Td className="text-stone-500 capitalize">{d.category.toLowerCase()}</Td>
                <Td><StatusBadge status={d.status} /></Td>
                <Td className="text-stone-500">{d._count?.versions ?? 0}</Td>
                <Td className="text-stone-500">{d._count?.access ?? 0}</Td>
                <Td className="text-stone-500">{d._count?.downloads ?? 0}</Td>
                <Td className="text-stone-500 text-xs">{format(new Date(d.updatedAt), 'd MMM yyyy')}</Td>
                <Td className="space-x-2 whitespace-nowrap">
                  {d.status === 'DRAFT' && (
                    <button onClick={() => publish.mutate(d.id)} className="text-xs text-brand-600 hover:underline">Publish</button>
                  )}
                  {d.status === 'PUBLISHED' && (
                    <button onClick={() => archive.mutate(d.id)} className="text-xs text-amber-700 hover:underline">Archive</button>
                  )}
                  <button
                    onClick={() => { if (confirm(`Delete "${d.name}"? This removes all versions and files.`)) remove.mutate(d.id); }}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </Td>
              </tr>
            ))}
            {data?.items?.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-stone-500">No datasets yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreate && <CreateDatasetModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}

function CreateDatasetModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: '', slug: '', description: '', category: 'EDUCATION', coverage: '',
  });

  const create = useMutation({
    mutationFn: async () => (await api.post('/datasets', form)).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-datasets'] }); onClose(); },
  });

  // Auto-generate slug from name
  const setName = (name: string) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    setForm({ ...form, name, slug });
  };

  return (
    <div className="fixed inset-0 bg-stone-900/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
          <h2 className="text-base font-semibold">New dataset</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input type="text" value={form.name} onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Slug (URL-friendly)</label>
            <input type="text" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-600" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white">
              <option value="EDUCATION">Education</option>
              <option value="RETAIL">Retail</option>
              <option value="GEOSPATIAL">Geospatial</option>
              <option value="CONSUMER">Consumer</option>
              <option value="INDUSTRY">Industry</option>
              <option value="FINANCIAL">Financial</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Coverage (e.g. 2018–2026)</label>
            <input type="text" value={form.coverage} onChange={(e) => setForm({ ...form, coverage: e.target.value })}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
          </div>
          {create.isError && (
            <div className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2">{getErrorMessage(create.error)}</div>
          )}
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 bg-stone-50 border-t border-stone-200 rounded-b-xl">
          <button onClick={onClose} className="px-4 py-2 border border-stone-300 rounded-lg text-sm">Cancel</button>
          <button onClick={() => create.mutate()} disabled={create.isPending} className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
            {create.isPending ? 'Creating…' : 'Create dataset'}
          </button>
        </div>
      </div>
    </div>
  );
}

const Th = ({ children }: { children: React.ReactNode }) => (
  <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wide">{children}</th>
);
const Td = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <td className={`px-4 py-3 ${className}`}>{children}</td>
);
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PUBLISHED: 'bg-green-50 text-green-800',
    DRAFT: 'bg-amber-50 text-amber-800',
    ARCHIVED: 'bg-stone-100 text-stone-700',
  };
  return <span className={`inline-block px-2 py-0.5 text-xs rounded capitalize ${colors[status]}`}>{status.toLowerCase()}</span>;
}
