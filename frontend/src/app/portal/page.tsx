'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import { formatBytes, getErrorMessage } from '@/lib/utils';
import { Filter, Search, Download, ArrowRight } from 'lucide-react';

const CATEGORY_STYLES: Record<string, string> = {
  EDUCATION: 'bg-brand-50 text-brand-800',
  RETAIL: 'bg-amber-50 text-amber-800',
  GEOSPATIAL: 'bg-blue-50 text-blue-800',
  CONSUMER: 'bg-pink-50 text-pink-800',
  INDUSTRY: 'bg-stone-100 text-stone-700',
  FINANCIAL: 'bg-purple-50 text-purple-800',
  OTHER: 'bg-stone-100 text-stone-700',
};

export default function PortalPage() {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['portal-datasets', search],
    queryFn: async () => {
      const params = new URLSearchParams({ take: '50' });
      if (search) params.set('search', search);
      return (await api.get(`/datasets?${params}`)).data;
    },
  });

  // Auto-select first dataset when data arrives
  const items = data?.items ?? [];
  const selected = items.find((d: any) => d.id === selectedId) ?? items[0];

  const download = useMutation({
    mutationFn: async (id: string) => (await api.post(`/datasets/${id}/download`, {})).data,
    onSuccess: (d) => { window.location.href = d.url; },
    onError: (e) => alert(getErrorMessage(e)),
  });

  return (
    <div className="space-y-3">
      {/* Featured datasets card */}
      <section className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
        <header className="px-5 py-4 flex items-center justify-between border-b border-stone-100">
          <div>
            <h1 className="text-[15px] font-medium text-stone-900">Featured datasets</h1>
            <p className="text-xs text-stone-500 mt-0.5">
              {data ? `${data.total} dataset${data.total === 1 ? '' : 's'} available to your account` : 'Loading…'}
            </p>
          </div>
          <Link href="/portal/downloads" className="text-xs text-brand-700 font-medium hover:underline inline-flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </header>

        <div className="px-5 py-3 flex items-center gap-2 border-b border-stone-100">
          <button className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-stone-200 rounded-lg text-xs text-stone-700 hover:bg-stone-50">
            <Filter className="w-3 h-3" /> Filter
          </button>
          <div className="flex-1 flex items-center gap-2 px-2.5 py-1.5 border border-stone-200 rounded-lg">
            <Search className="w-3 h-3 text-stone-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search datasets"
              className="flex-1 bg-transparent text-xs focus:outline-none placeholder:text-stone-400"
            />
          </div>
        </div>

        <table className="w-full text-xs">
          <thead className="bg-stone-50">
            <tr>
              <th className="px-5 py-2.5 text-left w-8"><input type="checkbox" className="rounded border-stone-300" /></th>
              <Th>Name</Th>
              <Th>Category</Th>
              <Th>File type</Th>
              <Th>Updated</Th>
              <th className="px-5 py-2.5 text-right text-[11px] font-medium text-stone-500 uppercase tracking-wider">Size</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-stone-500">Loading datasets…</td></tr>
            )}
            {!isLoading && items.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-stone-500">
                You don&apos;t have access to any datasets yet. Contact your administrator.
              </td></tr>
            )}
            {items.map((d: any) => {
              const isSelected = selected?.id === d.id;
              return (
                <tr
                  key={d.id}
                  onClick={() => setSelectedId(d.id)}
                  className={`cursor-pointer transition ${
                    isSelected
                      ? 'bg-brand-50/60 border-l-2 border-brand-700'
                      : 'border-l-2 border-transparent hover:bg-stone-50/60 border-t border-t-stone-100'
                  }`}
                >
                  <td className="px-5 py-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      className="rounded border-stone-300 text-brand-700 focus:ring-brand-700"
                    />
                  </td>
                  <td className="px-2 py-3">
                    <Link
                      href={`/portal/datasets/${d.id}`}
                      className="font-medium text-stone-900 hover:text-brand-700"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {d.name}
                    </Link>
                  </td>
                  <td className="px-2 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium capitalize ${CATEGORY_STYLES[d.category] ?? 'bg-stone-100 text-stone-700'}`}>
                      {d.category.toLowerCase()}
                    </span>
                  </td>
                  <td className="px-2 py-3 text-stone-600">{d.fileType ?? '—'}</td>
                  <td className="px-2 py-3 text-stone-500">{format(new Date(d.updatedAt), 'd MMM HH:mm')}</td>
                  <td className="px-5 py-3 text-right text-stone-500">
                    {d.currentVersion ? formatBytes(d.currentVersion.fileSizeBytes) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <footer className="px-5 py-2.5 bg-stone-50 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
          <span>{items.length} items shown</span>
          {data && <span>1–{items.length} of {data.total}</span>}
        </footer>
      </section>

      {/* Preview card */}
      {selected && (
        <section className="bg-white border border-stone-200 rounded-2xl p-5">
          <div className="grid grid-cols-[200px_1fr_240px] gap-6 items-center">
            <div>
              <div className="text-[10px] font-semibold text-brand-700 uppercase tracking-wider mb-1">
                Preview
              </div>
              <div className="text-sm font-medium text-stone-900 mb-0.5">{selected.name}</div>
              <p className="text-[11px] text-stone-500 leading-relaxed line-clamp-2">
                {selected.description || 'Dataset preview'}
              </p>
            </div>

            {/* Simple bar chart from record-count visualisation */}
            <svg viewBox="0 0 320 110" className="w-full h-[110px]">
              <line x1="0" y1="100" x2="320" y2="100" stroke="#E7E5E4" strokeWidth="1" />
              <line x1="0" y1="70" x2="320" y2="70" stroke="#F1EFE8" strokeWidth="1" strokeDasharray="2 3" />
              <line x1="0" y1="40" x2="320" y2="40" stroke="#F1EFE8" strokeWidth="1" strokeDasharray="2 3" />
              <g fill="#1A6B4A">
                {[50, 48, 45, 42, 38, 32, 26, 20, 14].map((y, i) => (
                  <rect key={i} x={6 + i * 36} y={y} width={i === 8 ? 20 : 26} height={100 - y} rx="2" />
                ))}
              </g>
              <g fontSize="8" fill="#A8A29E">
                {[2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026].map((yr, i) => (
                  <text key={yr} x={19 + i * 36} y={108} textAnchor="middle">{yr}</text>
                ))}
              </g>
            </svg>

            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-1.5">
                <Stat
                  label="Records"
                  value={selected.recordCount ? formatRecordCount(selected.recordCount) : '—'}
                />
                <Stat label="Coverage" value={selected.coverage || '—'} />
                <Stat label="Versions" value={selected.versions?.length ?? 0} />
                <Stat label="Type" value={selected.fileType || '—'} />
              </div>
              <div className="flex gap-1.5 mt-1">
                <Link
                  href={`/portal/datasets/${selected.id}`}
                  className="flex-1 text-center px-3 py-2 border border-stone-200 rounded-lg text-xs font-medium text-stone-900 hover:bg-stone-50"
                >
                  Preview
                </Link>
                <button
                  onClick={() => download.mutate(selected.id)}
                  disabled={!selected.currentVersion || download.isPending}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-brand-800 hover:bg-brand-900 text-white rounded-lg text-xs font-medium disabled:opacity-50"
                >
                  <Download className="w-3 h-3" />
                  {download.isPending ? 'Preparing…' : 'Download'}
                </button>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-2 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
      {children}
    </th>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-stone-50 rounded-lg px-2.5 py-2">
      <div className="text-[10px] text-stone-500 mb-0.5">{label}</div>
      <div className="text-sm font-medium text-stone-900 truncate">{value}</div>
    </div>
  );
}

function formatRecordCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}