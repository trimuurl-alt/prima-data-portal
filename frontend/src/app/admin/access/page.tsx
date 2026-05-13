'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Shield } from 'lucide-react';

export default function AccessPage() {
  const { data: datasets } = useQuery({
    queryKey: ['admin-datasets-for-access'],
    queryFn: async () => (await api.get('/datasets?take=200')).data,
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Access management</h1>
        <p className="text-sm text-stone-500 mt-0.5">Grant or revoke client access to specific datasets</p>
      </div>

      <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 flex items-start gap-3">
        <Shield className="w-5 h-5 text-brand-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-stone-700">
          Click any dataset to grant or revoke client access on that dataset&apos;s detail page.
          Access is checked on every download, and revoking is immediate.
        </div>
      </div>

      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 border-b border-stone-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wide">Dataset</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wide">Category</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wide">Clients with access</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {datasets?.items?.map((d: any) => (
              <tr key={d.id} className="hover:bg-stone-50">
                <td className="px-4 py-3 font-medium">{d.name}</td>
                <td className="px-4 py-3 text-stone-500 capitalize">{d.category.toLowerCase()}</td>
                <td className="px-4 py-3 text-stone-500 capitalize">{d.status.toLowerCase()}</td>
                <td className="px-4 py-3 text-stone-500">{d._count?.access ?? 0}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/datasets/${d.id}`} className="text-xs text-brand-600 hover:underline">
                    Manage →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
