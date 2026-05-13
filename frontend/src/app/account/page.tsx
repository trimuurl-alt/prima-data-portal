'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { ShieldCheck, ShieldAlert, KeyRound } from 'lucide-react';
import { getErrorMessage } from '@/lib/utils';

export default function AccountPage() {
  const { user, refreshUser } = useAuth();
  const [tab, setTab] = useState<'password' | 'mfa'>(user?.mfaEnabled ? 'password' : 'mfa');

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Account settings</h1>
        <p className="text-sm text-stone-500 mt-0.5">Manage your password and security settings</p>
      </div>

      <div className="bg-white border border-stone-200 rounded-xl p-6">
        <div className="space-y-1 text-sm">
          <div><span className="text-stone-500">Email:</span> {user.email}</div>
          <div><span className="text-stone-500">Name:</span> {user.fullName}</div>
          <div><span className="text-stone-500">Role:</span> <span className="capitalize">{user.role.replace('_', ' ').toLowerCase()}</span></div>
          {user.companyName && <div><span className="text-stone-500">Company:</span> {user.companyName}</div>}
        </div>
      </div>

      <div className="bg-white border border-stone-200 rounded-xl">
        <div className="border-b border-stone-200 flex">
          <TabBtn active={tab === 'password'} onClick={() => setTab('password')} icon={<KeyRound className="w-4 h-4" />}>Password</TabBtn>
          <TabBtn active={tab === 'mfa'} onClick={() => setTab('mfa')} icon={user.mfaEnabled ? <ShieldCheck className="w-4 h-4 text-green-600" /> : <ShieldAlert className="w-4 h-4 text-amber-600" />}>
            Two-factor auth {user.mfaEnabled ? '(enabled)' : '(disabled)'}
          </TabBtn>
        </div>
        <div className="p-6">
          {tab === 'password' && <ChangePasswordForm />}
          {tab === 'mfa' && <MfaSection mfaEnabled={user.mfaEnabled} onChange={refreshUser} />}
        </div>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 -mb-px ${active ? 'border-brand-600 text-brand-700' : 'border-transparent text-stone-500 hover:text-stone-900'}`}>
      {icon} {children}
    </button>
  );
}

function ChangePasswordForm() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [success, setSuccess] = useState(false);

  const change = useMutation({
    mutationFn: async () => api.post('/auth/password/change', { currentPassword: current, newPassword: next }),
    onSuccess: () => { setSuccess(true); setCurrent(''); setNext(''); setConfirm(''); },
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (next !== confirm) return alert('Passwords do not match'); change.mutate(); }} className="space-y-4 max-w-md">
      <Field label="Current password" type="password" value={current} onChange={setCurrent} />
      <Field label="New password" type="password" value={next} onChange={setNext} />
      <Field label="Confirm new password" type="password" value={confirm} onChange={setConfirm} />
      <p className="text-xs text-stone-500">Minimum 10 characters with upper, lower, and a number.</p>
      {success && <div className="bg-green-50 text-green-800 text-sm rounded-lg px-3 py-2">Password changed successfully</div>}
      {change.isError && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2">{getErrorMessage(change.error)}</div>}
      <button type="submit" disabled={change.isPending} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
        {change.isPending ? 'Saving…' : 'Change password'}
      </button>
    </form>
  );
}

function MfaSection({ mfaEnabled, onChange }: { mfaEnabled: boolean; onChange: () => void }) {
  const [setupData, setSetupData] = useState<{ secret: string; qrDataUrl: string } | null>(null);
  const [code, setCode] = useState('');

  const setup = useMutation({
    mutationFn: async () => (await api.post('/auth/mfa/setup')).data,
    onSuccess: (d) => setSetupData(d),
  });

  const confirm = useMutation({
    mutationFn: async () => api.post('/auth/mfa/confirm', { code }),
    onSuccess: () => { setSetupData(null); setCode(''); onChange(); },
  });

  const disable = useMutation({
    mutationFn: async () => api.post('/auth/mfa/disable'),
    onSuccess: onChange,
  });

  if (mfaEnabled) {
    return (
      <div className="space-y-4 max-w-md">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-800 font-medium text-sm mb-1">
            <ShieldCheck className="w-4 h-4" /> Two-factor authentication is enabled
          </div>
          <p className="text-sm text-green-700">Your account requires a verification code from your authenticator app at every sign-in.</p>
        </div>
        <button onClick={() => { if (confirm('Disable 2FA? Your account will be less secure.')) disable.mutate(); }} disabled={disable.isPending}
          className="text-sm text-red-600 hover:underline">
          {disable.isPending ? 'Disabling…' : 'Disable 2FA'}
        </button>
      </div>
    );
  }

  if (setupData) {
    return (
      <div className="space-y-4 max-w-md">
        <p className="text-sm text-stone-700">Scan this QR code with an authenticator app like Google Authenticator, Authy, or 1Password:</p>
        <div className="bg-white border border-stone-200 rounded-lg p-4 inline-block">
          <img src={setupData.qrDataUrl} alt="MFA QR code" className="w-48 h-48" />
        </div>
        <details>
          <summary className="text-xs text-stone-500 cursor-pointer">Or enter this code manually</summary>
          <code className="block mt-2 text-xs bg-stone-50 border border-stone-200 rounded p-2 break-all font-mono">{setupData.secret}</code>
        </details>
        <div>
          <label className="block text-sm font-medium mb-1">Enter the 6-digit code from your app</label>
          <input type="text" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
            className="w-40 px-3 py-2 border border-stone-300 rounded-lg text-sm font-mono tracking-widest" />
        </div>
        {confirm.isError && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2">{getErrorMessage(confirm.error)}</div>}
        <div className="flex gap-2">
          <button onClick={() => confirm.mutate()} disabled={confirm.isPending || code.length !== 6}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
            {confirm.isPending ? 'Verifying…' : 'Verify and enable'}
          </button>
          <button onClick={() => setSetupData(null)} className="px-4 py-2 border border-stone-300 rounded-lg text-sm">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-md">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-amber-800 font-medium text-sm mb-1">
          <ShieldAlert className="w-4 h-4" /> Two-factor authentication is disabled
        </div>
        <p className="text-sm text-amber-700">Add an extra layer of security to your account. We strongly recommend enabling 2FA for admin accounts.</p>
      </div>
      <button onClick={() => setup.mutate()} disabled={setup.isPending} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
        {setup.isPending ? 'Generating…' : 'Set up 2FA'}
      </button>
    </div>
  );
}

function Field({ label, type, value, onChange }: { label: string; type: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
    </div>
  );
}
