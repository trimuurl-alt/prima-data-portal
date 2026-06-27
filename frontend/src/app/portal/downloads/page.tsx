'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import Link from 'next/link';

export default function MyDownloadsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-downloads'],
    queryFn: async () => (await api.get('/datasets/downloads/mine?take=100')).data,
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">My downloads</h1>
        <p className="text-sm text-stone-500 mt-0.5">Files you have downloaded</p>
      </div>

      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 border-b border-stone-200">
            <tr>
              <Th>Dataset</Th><Th>File type</Th><Th>Downloaded</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {isLoading && <tr><td colSpan={3} className="px-4 py-8 text-center text-stone-500">Loading…</td></tr>}
            {data?.items?.map((d: any) => (
              <tr key={d.id} className="hover:bg-stone-50">
                <td className="px-4 py-3">
                  <Link href={`/portal/datasets/${d.dataset.id}`} className="font-medium text-stone-900 hover:text-brand-600">
                    {d.dataset.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-stone-500">{d.dataset.fileType ?? '—'}</td>
                <td className="px-4 py-3 text-stone-500 text-xs">{format(new Date(d.createdAt), 'd MMM yyyy HH:mm')}</td>
              </tr>
            ))}
            {data?.items?.length === 0 && !isLoading && (
              <tr><td colSpan={3} className="px-4 py-12 text-center text-stone-500">No downloads yet.</td></tr>
            )}
          </tbody>
        </table>
        <div className="px-4 py-2.5 border-t border-stone-200 text-xs text-stone-500">
          {data ? `${data.total} total downloads` : '—'}
        </div>
      </div>
    </div>
  );
}

const Th = ({ children }: { children: React.ReactNode }) => (
  <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wide">{children}</th>
);
