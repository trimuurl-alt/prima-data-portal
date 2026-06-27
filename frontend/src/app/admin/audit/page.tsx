'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import { useSearchParams } from 'next/navigation';
import { ArrowUp, ArrowDown, Search, X } from 'lucide-react';

const ACTIONS = [
  'LOGIN_SUCCESS', 'LOGIN_FAILURE', 'LOGOUT',
  'PASSWORD_RESET_REQUESTED', 'PASSWORD_RESET_COMPLETED', 'PASSWORD_CHANGED',
  'MFA_ENABLED', 'MFA_DISABLED',
  'USER_CREATED', 'USER_UPDATED', 'USER_DISABLED', 'USER_RESTORED', 'USER_DELETED',
  'DATASET_UPLOADED', 'DATASET_UPDATED', 'DATASET_PUBLISHED', 'DATASET_ARCHIVED', 'DATASET_DOWNLOADED', 'DATASET_DELETED',
  'ACCESS_GRANTED', 'ACCESS_REVOKED',
  'CATEGORY_CREATED', 'CATEGORY_UPDATED', 'CATEGORY_DELETED',
];

type SortKey = 'createdAt' | 'actor' | 'action';

export default function AuditPage() {
  const params = useSearchParams();
  const [action, setAction] = useState(params.get('action') ?? '');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [skip, setSkip] = useState(0);
  const take = 50;

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setSkip(0); }, 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading } = useQuery({
    queryKey: ['audit', action, search, sortBy, sortOrder, skip],
    queryFn: async () => {
      const sp = new URLSearchParams({ skip: String(skip), take: String(take), sortBy, sortOrder });
      if (action) sp.set('action', action);
      if (search) sp.set('search', search);
      return (await api.get(`/audit?${sp}`)).data;
    },
  });

  function clickSort(key: SortKey) {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortOrder('asc');
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Audit log</h1>
        <p className="text-sm text-stone-500 mt-0.5">Complete trail of security-relevant events</p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={action}
          onChange={(e) => { setAction(e.target.value); setSkip(0); }}
          className="px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white"
        >
          <option value="">All actions</option>
          {ACTIONS.map((a) => (
            <option key={a} value={a}>{humanize(a)}</option>
          ))}
        </select>

        <div className="flex-1 max-w-md flex items-center gap-2 px-3 py-1.5 border border-stone-300 rounded-lg focus-within:ring-2 focus-within:ring-brand-500">
          <Search className="w-3.5 h-3.5 text-stone-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by client name, email, or company…"
            className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-stone-400"
          />
          {searchInput && (
            <button onClick={() => setSearchInput('')} className="text-stone-400 hover:text-stone-700">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 border-b border-stone-200">
            <tr>
              <SortableTh label="Time" sortKey="createdAt" current={sortBy} order={sortOrder} onClick={clickSort} />
              <SortableTh label="Action" sortKey="action" current={sortBy} order={sortOrder} onClick={clickSort} />
              <SortableTh label="Client" sortKey="actor" current={sortBy} order={sortOrder} onClick={clickSort} />
              <Th>Target</Th>
              <Th>IP</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {isLoading && <tr><td colSpan={5} className="px-4 py-8 text-center text-stone-500">Loading…</td></tr>}
            {data?.items?.map((e: any) => (
              <tr key={e.id} className="hover:bg-stone-50">
                <Td className="text-stone-500 whitespace-nowrap text-xs">
                  {format(new Date(e.createdAt), 'd MMM HH:mm:ss')}
                </Td>
                <Td className="text-xs font-medium text-stone-700">{humanize(e.action)}</Td>
                <Td>
                  {e.actor ? (
                    <div>
                      <div className="text-sm text-stone-900">{e.actor.fullName}</div>
                      <div className="text-xs text-stone-500">
                        {e.actor.companyName ? `${e.actor.companyName} · ` : ''}{e.actor.email}
                      </div>
                    </div>
                  ) : (
                    <span className="text-stone-400 text-xs">system</span>
                  )}
                </Td>
                <Td className="text-xs">
                  {e.targetName ? (
                    <span className="text-stone-700">{e.targetName}</span>
                  ) : e.targetType ? (
                    <span className="text-stone-500">{e.targetType}:{e.targetId?.slice(0, 8)}</span>
                  ) : (
                    <span className="text-stone-400">—</span>
                  )}
                </Td>
                <Td className="text-stone-500 font-mono text-xs">{e.ipAddress || '—'}</Td>
              </tr>
            ))}
            {data?.items?.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-stone-500">No events match the filter</td></tr>
            )}
          </tbody>
        </table>

        <div className="px-4 py-3 border-t border-stone-200 flex items-center justify-between text-sm">
          <div className="text-stone-500">
            {data ? `${data.total === 0 ? 0 : skip + 1}–${Math.min(skip + take, data.total)} of ${data.total}` : '—'}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSkip(Math.max(0, skip - take))}
              disabled={skip === 0}
              className="px-3 py-1.5 border border-stone-300 rounded-lg text-xs disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setSkip(skip + take)}
              disabled={!data || skip + take >= data.total}
              className="px-3 py-1.5 border border-stone-300 rounded-lg text-xs disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-2 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">{children}</th>;
}

function SortableTh({ label, sortKey, current, order, onClick }: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  order: 'asc' | 'desc';
  onClick: (k: SortKey) => void;
}) {
  const active = current === sortKey;
  return (
    <th className="px-4 py-2 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
      <button
        onClick={() => onClick(sortKey)}
        className={`inline-flex items-center gap-1 hover:text-stone-900 transition ${active ? 'text-brand-600' : ''}`}
      >
        {label}
        {active && (order === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
      </button>
    </th>
  );
}

function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-2.5 ${className}`}>{children}</td>;
}

function humanize(action: string): string {
  return action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
}
