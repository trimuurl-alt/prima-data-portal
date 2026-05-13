'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try { await api.post('/auth/password/reset/request', { email }); }
    finally { setSubmitted(true); setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white border border-stone-200 rounded-xl shadow-sm p-8">
          <h1 className="text-base font-semibold mb-1">Reset your password</h1>
          <p className="text-sm text-stone-500 mb-6">
            Enter your account email and we&apos;ll send a reset link.
          </p>

          {submitted ? (
            <div className="bg-green-50 text-green-800 text-sm rounded-lg px-3 py-3">
              If an account exists for that email, a reset link has been sent. Check your inbox (and the backend console if running locally).
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
              >
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          )}

          <Link href="/login" className="block text-center text-xs text-brand-600 hover:underline mt-4">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
