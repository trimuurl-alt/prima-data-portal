'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { UserPlus, X, Mail } from 'lucide-react';
import { getErrorMessage } from '@/lib/utils';

export default function UsersPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading } = useQuery({
    queryKey: ['users', search],
    queryFn: async () => (await api.get(`/users?take=100${search ? `&search=${encodeURIComponent(search)}` : ''}`)).data,
  });

  const disable = useMutation({
    mutationFn: (id: string) => api.post(`/users/${id}/disable`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  const restore = useMutation({
    mutationFn: (id: string) => api.post(`/users/${id}/restore`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Users</h1>
          <p className="text-sm text-stone-500 mt-0.5">Manage authorised email accounts</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 border border-stone-300 px-3 py-2 rounded-lg text-sm font-medium hover:bg-stone-100"
          >
            <Mail className="w-4 h-4" /> Invite via email
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-brand-500 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-brand-600"
          >
            <UserPlus className="w-4 h-4" /> Add user directly
          </button>
        </div>
      </div>

      <div className="bg-white border border-stone-200 rounded-xl">
        <div className="px-4 py-3 border-b border-stone-200">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, email, or company…"
            className="w-full px-3 py-1.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <table className="w-full text-sm">
          <thead className="bg-stone-50 border-b border-stone-200">
            <tr>
              <Th>Email</Th><Th>Name</Th><Th>Company</Th><Th>Role</Th><Th>Status</Th><Th>Datasets</Th><Th>Actions</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {isLoading && <tr><td colSpan={7} className="px-4 py-6 text-center text-stone-500">Loading…</td></tr>}
            {data?.items?.map((u: any) => (
              <tr key={u.id} className="hover:bg-stone-50">
                <Td className="font-medium">{u.email}</Td>
                <Td>{u.fullName}</Td>
                <Td className="text-stone-500">{u.companyName || '—'}</Td>
                <Td><Badge>{u.role.replace('_', ' ').toLowerCase()}</Badge></Td>
                <Td><StatusBadge status={u.status} /></Td>
                <Td className="text-stone-500">{u.datasetCount ?? 0}</Td>
                <Td className="space-x-3 whitespace-nowrap">
                  {u.status === 'DISABLED' ? (
                    <button onClick={() => restore.mutate(u.id)} className="text-xs text-brand-600 hover:underline">Restore</button>
                  ) : (
                    <button onClick={() => disable.mutate(u.id)} className="text-xs text-amber-700 hover:underline">Revoke</button>
                  )}
                  <button
                    onClick={() => { if (confirm(`Permanently delete ${u.email}?`)) remove.mutate(u.id); }}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </Td>
              </tr>
            ))}
            {data?.items?.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-stone-500">No users found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}
      {showCreate && <CreateModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}

// ── Modals ────────────────────────────────────────────────────────

function InviteModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ email: '', fullName: '', companyName: '', role: 'CLIENT', notes: '' });
  const [link, setLink] = useState<string | null>(null);

  const invite = useMutation({
    mutationFn: async () => (await api.post('/users/invite', form)).data,
    onSuccess: (d) => { setLink(d.inviteLink); qc.invalidateQueries({ queryKey: ['users'] }); },
  });

  return (
    <Modal title="Invite user via email" onClose={onClose}>
      {link ? (
        <div className="px-6 py-5 space-y-3">
          <p className="text-sm text-stone-700">Invite created. The user will receive an email with this link:</p>
          <code className="block w-full text-xs bg-stone-50 border border-stone-200 rounded p-2 break-all">{link}</code>
          <p className="text-xs text-stone-500">In dev, the email is also printed to the backend console.</p>
        </div>
      ) : (
        <div className="px-6 py-5 space-y-4">
          <Field label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <Field label="Full name" value={form.fullName} onChange={(v) => setForm({ ...form, fullName: v })} />
          <Field label="Company (optional)" value={form.companyName} onChange={(v) => setForm({ ...form, companyName: v })} />
          <SelectField label="Role" value={form.role} onChange={(v) => setForm({ ...form, role: v })}
            options={[{ v: 'CLIENT', l: 'Client' }, { v: 'ADMIN', l: 'Admin' }]} />
          {invite.isError && <ErrorBanner>{getErrorMessage(invite.error)}</ErrorBanner>}
        </div>
      )}
      <div className="flex justify-end gap-2 px-6 py-4 bg-stone-50 border-t border-stone-200 rounded-b-xl">
        {link ? (
          <button onClick={onClose} className="px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium">Done</button>
        ) : (
          <>
            <button onClick={onClose} className="px-4 py-2 border border-stone-300 rounded-lg text-sm">Cancel</button>
            <button onClick={() => invite.mutate()} disabled={invite.isPending} className="px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium disabled:opacity-50">
              {invite.isPending ? 'Sending…' : 'Send invite'}
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}

function CreateModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ email: '', fullName: '', companyName: '', password: '', role: 'CLIENT', notes: '' });

  const create = useMutation({
    mutationFn: async () => (await api.post('/users', form)).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); onClose(); },
  });

  return (
    <Modal title="Add user directly" onClose={onClose}>
      <div className="px-6 py-5 space-y-4">
        <Field label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
        <Field label="Full name" value={form.fullName} onChange={(v) => setForm({ ...form, fullName: v })} />
        <Field label="Company (optional)" value={form.companyName} onChange={(v) => setForm({ ...form, companyName: v })} />
        <Field label="Password (10+ chars, upper/lower/number)" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} />
        <SelectField label="Role" value={form.role} onChange={(v) => setForm({ ...form, role: v })}
          options={[{ v: 'CLIENT', l: 'Client' }, { v: 'ADMIN', l: 'Admin' }]} />
        {create.isError && <ErrorBanner>{getErrorMessage(create.error)}</ErrorBanner>}
      </div>
      <div className="flex justify-end gap-2 px-6 py-4 bg-stone-50 border-t border-stone-200 rounded-b-xl">
        <button onClick={onClose} className="px-4 py-2 border border-stone-300 rounded-lg text-sm">Cancel</button>
        <button onClick={() => create.mutate()} disabled={create.isPending} className="px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium disabled:opacity-50">
          {create.isPending ? 'Creating…' : 'Create user'}
        </button>
      </div>
    </Modal>
  );
}

// ── Reusable bits ─────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-stone-900/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
          <h2 className="text-base font-semibold">{title}</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600"><X className="w-4 h-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, type = 'text', value, onChange }: { label: string; type?: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-stone-700 mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <div>
      <label className="block text-sm font-medium text-stone-700 mb-1">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white">
        {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );
}

function ErrorBanner({ children }: { children: React.ReactNode }) {
  return <div className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2">{children}</div>;
}

const Th = ({ children }: { children: React.ReactNode }) => (
  <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wide">{children}</th>
);
const Td = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <td className={`px-4 py-3 ${className}`}>{children}</td>
);
function Badge({ children }: { children: React.ReactNode }) {
  return <span className="inline-block px-2 py-0.5 bg-stone-100 text-stone-700 text-xs rounded capitalize">{children}</span>;
}
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ACTIVE: 'bg-green-50 text-green-800',
    PENDING_INVITE: 'bg-amber-50 text-amber-800',
    DISABLED: 'bg-red-50 text-red-800',
  };
  return (
    <span className={`inline-block px-2 py-0.5 text-xs rounded capitalize ${colors[status] ?? 'bg-stone-100'}`}>
      {status.replace('_', ' ').toLowerCase()}
    </span>
  );
}
