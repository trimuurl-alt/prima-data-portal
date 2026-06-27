'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';

export default function AcceptInvitePage() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) return setError('Passwords do not match');
    setLoading(true);
    try {
      await api.post('/auth/invite/accept', { token, password });
      router.push('/login?accepted=1');
    } catch (e: any) {
      setError(getErrorMessage(e, 'Failed to accept invite'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-md bg-white border border-stone-200 rounded-xl shadow-sm p-8">
        <h1 className="text-base font-semibold mb-1">Activate your account</h1>
        <p className="text-sm text-stone-500 mb-6">
          Set a password to complete your Prima Data Portal account setup.
        </p>

        <form onSubmit={submit} className="space-y-4">
          <Field label="New password" type="password" value={password} onChange={setPassword} />
          <Field label="Confirm password" type="password" value={confirm} onChange={setConfirm} />
          <p className="text-xs text-stone-500">Minimum 10 characters with upper, lower, and a number.</p>
          {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
          >
            {loading ? 'Activating…' : 'Activate account'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, type, value, onChange }: { label: string; type: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
      />
    </div>
  );
}
