'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import { useSearchParams } from 'next/navigation';

const ACTIONS = [
  'LOGIN_SUCCESS', 'LOGIN_FAILURE', 'LOGOUT',
  'PASSWORD_RESET_REQUESTED', 'PASSWORD_RESET_COMPLETED', 'PASSWORD_CHANGED',
  'MFA_ENABLED', 'MFA_DISABLED',
  'USER_CREATED', 'USER_UPDATED', 'USER_DISABLED', 'USER_RESTORED', 'USER_DELETED',
  'DATASET_UPLOADED', 'DATASET_UPDATED', 'DATASET_PUBLISHED', 'DATASET_ARCHIVED', 'DATASET_DOWNLOADED', 'DATASET_DELETED',
  'ACCESS_GRANTED', 'ACCESS_REVOKED',
];

export default function AuditPage() {
  const params = useSearchParams();
  const [action, setAction] = useState(params.get('action') ?? '');
  const [skip, setSkip] = useState(0);
  const take = 50;

  const { data, isLoading } = useQuery({
    queryKey: ['audit', action, skip],
    queryFn: async () => {
      const sp = new URLSearchParams({ skip: String(skip), take: String(take) });
      if (action) sp.set('action', action);
      return (await api.get(`/audit?${sp}`)).data;
    },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Audit log</h1>
        <p className="text-sm text-stone-500 mt-0.5">Complete trail of security-relevant events</p>
      </div>

      <div className="flex items-center gap-3">
        <select value={action} onChange={(e) => { setAction(e.target.value); setSkip(0); }}
          className="px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white">
          <option value="">All actions</option>
          {ACTIONS.map((a) => (
            <option key={a} value={a}>{a.replace(/_/g, ' ').toLowerCase()}</option>
          ))}
        </select>
      </div>

      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 border-b border-stone-200">
            <tr>
              <Th>Time</Th><Th>Action</Th><Th>Actor</Th><Th>Target</Th><Th>IP</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {isLoading && <tr><td colSpan={5} className="px-4 py-8 text-center text-stone-500">Loading…</td></tr>}
            {data?.items?.map((e: any) => (
              <tr key={e.id} className="hover:bg-stone-50">
                <Td className="text-stone-500 whitespace-nowrap text-xs">{format(new Date(e.createdAt), 'd MMM HH:mm:ss')}</Td>
                <Td className="font-mono text-xs">{e.action}</Td>
                <Td>{e.actor?.email ?? <span className="text-stone-400">system</span>}</Td>
                <Td className="text-stone-500 text-xs">{e.targetType ? `${e.targetType}:${e.targetId?.slice(0, 8)}` : '—'}</Td>
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
            {data ? `${skip + 1}–${Math.min(skip + take, data.total)} of ${data.total}` : '—'}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setSkip(Math.max(0, skip - take))} disabled={skip === 0}
              className="px-3 py-1 border border-stone-300 rounded text-xs disabled:opacity-50">Previous</button>
            <button onClick={() => setSkip(skip + take)} disabled={!data || skip + take >= data.total}
              className="px-3 py-1 border border-stone-300 rounded text-xs disabled:opacity-50">Next</button>
          </div>
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
