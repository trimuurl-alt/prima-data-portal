'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Upload,
  UserPlus,
  Users,
  Shield,
  FileUp,
  UserCheck,
  AlertCircle,
  ChevronRight,
  Download,
  FileText,
} from 'lucide-react';

export default function AdminDashboard() {
  const { data: clients } = useQuery({
    queryKey: ['admin-clients-recent'],
    queryFn: async () => (await api.get('/users?role=CLIENT&take=5')).data,
  });

  const { data: datasets } = useQuery({
    queryKey: ['admin-datasets-recent'],
    queryFn: async () => (await api.get('/datasets?take=5')).data,
  });

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => (await api.get('/admin/stats')).data,
  });

  return (
    <div className="grid grid-cols-[1fr_280px] gap-3">
      {/* ── MAIN COLUMN ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 min-w-0">

        {/* Client management */}
        <section className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
          <header className="px-5 py-3.5 flex items-center justify-between border-b border-stone-100">
            <div>
              <h2 className="text-[15px] font-medium text-stone-900">Client management</h2>
              <p className="text-xs text-stone-500 mt-0.5">
                {clients ? `${clients.total} client${clients.total === 1 ? '' : 's'}` : 'Loading…'}
              </p>
            </div>
            <Link href="/admin/users" className="text-xs text-brand-700 font-medium hover:underline">
              View all clients →
            </Link>
          </header>

          <table className="w-full text-xs table-fixed">
            <colgroup>
              <col className="w-[50%]" />
              <col className="w-[18%]" />
              <col className="w-[20%]" />
              <col className="w-[12%]" />
            </colgroup>
            <thead className="bg-stone-50">
              <tr>
                <Th>Client name</Th>
                <Th>Status</Th>
                <Th>Joined</Th>
                <th className="px-5 py-2.5 text-right text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {clients?.items?.slice(0, 5).map((c: any) => (
                <tr key={c.id} className="border-t border-stone-100 hover:bg-stone-50/60">
                  <td className="px-5 py-3 font-medium text-stone-900 truncate">
                    {c.companyName || c.fullName}
                    {!c.companyName && <span className="text-stone-400 text-[11px] ml-1">({c.email})</span>}
                  </td>
                  <td className="px-2 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-2 py-3 text-stone-500 whitespace-nowrap">
                    {format(new Date(c.createdAt), 'd MMM yyyy')}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/admin/users`}
                      className="text-xs text-brand-700 font-medium hover:underline"
                    >
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
              {clients?.items?.length === 0 && (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-stone-500">No clients yet</td></tr>
              )}
            </tbody>
          </table>
        </section>

        {/* Dataset management */}
        <section className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
          <header className="px-5 py-3.5 border-b border-stone-100 flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-medium text-stone-900">Dataset management</h2>
              <p className="text-xs text-stone-500 mt-0.5">
                {datasets ? `${datasets.total} dataset${datasets.total === 1 ? '' : 's'} in catalogue` : 'Loading…'}
              </p>
            </div>
            <Link href="/admin/datasets" className="text-xs text-brand-700 font-medium hover:underline">
              Manage all →
            </Link>
          </header>

          <table className="w-full text-xs table-fixed">
            <colgroup>
              <col className="w-[34%]" />
              <col className="w-[14%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[12%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
            </colgroup>
            <thead className="bg-stone-50">
              <tr>
                <Th>Dataset</Th>
                <Th>Category</Th>
                <Th>Type</Th>
                <th className="px-2 py-2.5 text-right text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                  Downloads
                </th>
                <Th>Status</Th>
                <Th>Updated</Th>
                <th className="px-5 py-2.5 text-right text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {datasets?.items?.map((d: any) => (
                <tr key={d.id} className="border-t border-stone-100 hover:bg-stone-50/60">
                  <td className="px-5 py-3 font-medium text-stone-900 truncate">
                    <Link href={`/admin/datasets/${d.id}`} className="hover:text-brand-700">
                      {d.name}
                    </Link>
                  </td>
                  <td className="px-2 py-3 text-stone-500 truncate">{d.category?.name ?? '—'}</td>
                  <td className="px-2 py-3 text-stone-500 truncate uppercase">{d.fileType ?? '—'}</td>
                  <td className="px-2 py-3 text-right text-stone-500">{d._count?.downloads ?? 0}</td>
                  <td className="px-2 py-3"><DatasetStatusBadge status={d.status} /></td>
                  <td className="px-2 py-3 text-stone-500 whitespace-nowrap">
                    {format(new Date(d.updatedAt), 'd MMM')}
                  </td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    <Link
                      href={`/admin/datasets/${d.id}`}
                      className="text-[11px] text-brand-700 hover:underline mr-2.5"
                    >
                      View
                    </Link>
                    <Link
                      href={`/admin/datasets/${d.id}`}
                      className="text-[11px] text-stone-600 hover:underline"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
              {datasets?.items?.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-stone-500">No datasets yet</td></tr>
              )}
            </tbody>
          </table>

          {datasets && datasets.total > 5 && (
            <div className="px-5 py-2.5 bg-stone-50 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
              <span>Showing 1–{Math.min(datasets.items.length, 5)} of {datasets.total} datasets</span>
              <Link href="/admin/datasets" className="text-brand-700 font-medium hover:underline">
                See full catalogue →
              </Link>
            </div>
          )}
        </section>
      </div>

      {/* ── RIGHT COLUMN ────────────────────────────────────────── */}
      <aside className="flex flex-col gap-3">
        {/* Quick actions */}
        <div className="bg-white border border-stone-200 rounded-2xl p-3.5">
          <h3 className="text-[13px] font-medium text-stone-900 mb-2.5">Quick actions</h3>
          <div className="flex flex-col gap-1.5">
            <QuickAction
              href="/admin/datasets"
              icon={<FileUp className="w-3.5 h-3.5" />}
              label="Upload dataset"
            />
            <QuickAction
              href="/admin/users"
              icon={<UserPlus className="w-3.5 h-3.5" />}
              label="Add client"
            />
            <QuickAction
              href="/admin/users"
              icon={<Users className="w-3.5 h-3.5" />}
              label="Add team member"
            />
            <QuickAction
              href="/admin/audit"
              icon={<FileText className="w-3.5 h-3.5" />}
              label="Audit log"
            />
          </div>
        </div>

        {/* Recent activity */}
        <div className="bg-white border border-stone-200 rounded-2xl p-3.5">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-[13px] font-medium text-stone-900">Recent activity</h3>
            <Link href="/admin/audit" className="text-[10px] text-brand-700 font-medium hover:underline">
              Audit log →
            </Link>
          </div>
          <div className="flex flex-col">
            {stats?.recentEvents?.slice(0, 6).map((e: any) => (
              <ActivityItem key={e.id} event={e} />
            ))}
            {(!stats?.recentEvents || stats.recentEvents.length === 0) && (
              <p className="text-xs text-stone-500 text-center py-4">No activity yet</p>
            )}
          </div>
          <Link
            href="/admin/audit"
            className="block text-center pt-2.5 mt-1.5 border-t border-stone-100 text-[11px] text-brand-700 font-medium hover:underline"
          >
            View full audit log →
          </Link>
        </div>
      </aside>
    </div>
  );
}

// ── Components ──────────────────────────────────────────────────

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-2 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider first:px-5">
      {children}
    </th>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ACTIVE: 'bg-green-50 text-green-800',
    PENDING_INVITE: 'bg-amber-50 text-amber-800',
    DISABLED: 'bg-red-50 text-red-800',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium capitalize ${styles[status] ?? 'bg-stone-100 text-stone-700'}`}>
      {status.replace('_', ' ').toLowerCase()}
    </span>
  );
}

function DatasetStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PUBLISHED: 'bg-green-50 text-green-800',
    DRAFT: 'bg-amber-50 text-amber-800',
    ARCHIVED: 'bg-stone-100 text-stone-600',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium capitalize ${styles[status] ?? 'bg-stone-100 text-stone-700'}`}>
      {status.toLowerCase()}
    </span>
  );
}

function QuickAction({
  href,
  icon,
  label,
}: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-2.5 px-3 py-2 border border-stone-200 rounded-lg text-xs text-stone-900 hover:border-brand-300 hover:bg-brand-50/40 transition"
    >
      <span className="w-7 h-7 rounded-md bg-brand-50 text-brand-700 flex items-center justify-center group-hover:bg-brand-100 transition">
        {icon}
      </span>
      <span className="flex-1 font-medium">{label}</span>
      <ChevronRight className="w-3 h-3 text-stone-300 group-hover:text-stone-500 transition" />
    </Link>
  );
}

function ActivityItem({ event }: { event: any }) {
  const style = activityStyle(event.action);
  return (
    <div className="flex gap-2.5 py-2 border-b border-stone-100 last:border-b-0">
      <div className={`w-6 h-6 rounded-md flex-shrink-0 flex items-center justify-center ${style.bg} ${style.text}`}>
        {style.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-stone-900 leading-snug">
          {humanize(event.action)}
          {event.metadata?.email && <span className="font-medium"> {event.metadata.email}</span>}
          {event.metadata?.name && <span className="font-medium"> {event.metadata.name}</span>}
        </p>
        <p className="text-[10px] text-stone-500 mt-0.5">
          {event.actor?.fullName ?? 'System'} · {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}

function activityStyle(action: string) {
  if (action.startsWith('DATASET_'))
    return { bg: 'bg-brand-50', text: 'text-brand-700', icon: <Upload className="w-3 h-3" /> };
  if (action.startsWith('USER_') || action.startsWith('ACCESS_'))
    return { bg: 'bg-blue-50', text: 'text-blue-800', icon: <UserCheck className="w-3 h-3" /> };
  if (action === 'LOGIN_FAILURE')
    return { bg: 'bg-amber-50', text: 'text-amber-800', icon: <AlertCircle className="w-3 h-3" /> };
  if (action === 'DATASET_DOWNLOADED')
    return { bg: 'bg-purple-50', text: 'text-purple-800', icon: <Download className="w-3 h-3" /> };
  return { bg: 'bg-stone-100', text: 'text-stone-700', icon: <Shield className="w-3 h-3" /> };
}

function humanize(action: string): string {
  const map: Record<string, string> = {
    LOGIN_SUCCESS: 'Sign-in successful',
    LOGIN_FAILURE: 'Failed sign-in for',
    LOGOUT: 'Signed out',
    USER_CREATED: 'User created:',
    USER_UPDATED: 'User updated:',
    USER_DISABLED: 'User disabled:',
    USER_RESTORED: 'User restored:',
    USER_DELETED: 'User deleted:',
    DATASET_UPLOADED: 'Dataset uploaded:',
    DATASET_UPDATED: 'Dataset updated:',
    DATASET_PUBLISHED: 'Dataset published:',
    DATASET_ARCHIVED: 'Dataset archived:',
    DATASET_DOWNLOADED: 'Dataset downloaded:',
    DATASET_DELETED: 'Dataset deleted:',
    ACCESS_GRANTED: 'Access granted',
    ACCESS_REVOKED: 'Access revoked',
    PASSWORD_CHANGED: 'Password changed',
    PASSWORD_RESET_REQUESTED: 'Password reset requested',
    PASSWORD_RESET_COMPLETED: 'Password reset completed',
    MFA_ENABLED: '2FA enabled',
    MFA_DISABLED: '2FA disabled',
  };
  return map[action] ?? action.toLowerCase().replace(/_/g, ' ');
}
