'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { getErrorMessage } from '@/lib/utils';
import { AxiosError } from 'axios';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
  mfaCode: z.string().optional(),
  remember: z.boolean().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const accepted = params.get('accepted');
  const reset = params.get('reset');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { remember: false } });

  const onSubmit = async (values: FormValues) => {
    setError(null);
    try {
      const user = await login(values.email, values.password, values.mfaCode);
      router.replace(user.role === 'CLIENT' ? '/portal' : '/admin');
    } catch (err) {
      const e = err as AxiosError<any>;
      const data = e.response?.data;
      const code = data?.code ?? data?.message?.code;
      if (code === 'MFA_REQUIRED') {
        setMfaRequired(true);
        setError(values.mfaCode ? 'Invalid code, please try again' : 'Enter your authenticator code');
      } else {
        setError(getErrorMessage(err, 'Sign in failed'));
      }
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-stone-50 px-4 py-6 overflow-hidden">
      <div className="w-full max-w-5xl bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="grid md:grid-cols-2">

          {/* ── LEFT PANEL — light theme with prominent logo ─────────────── */}
          <div className="relative bg-stone-50 p-10 md:p-12 flex flex-col justify-center gap-8 min-h-[540px] border-r border-stone-200 overflow-hidden">
            {/* Watermark: enlarged faded logo behind */}
            <img
              src="/primaresearch-logo-dark.png"
              alt=""
              aria-hidden="true"
              className="absolute -right-20 -bottom-20 w-[420px] opacity-[0.05] pointer-events-none select-none"
            />

            {/* Subtle red accent ornament */}
            <svg
              aria-hidden="true"
              viewBox="0 0 400 400"
              className="absolute -left-32 -top-32 w-[380px] h-[380px] opacity-[0.04] pointer-events-none"
            >
              <circle cx="200" cy="200" r="180" fill="none" stroke="#A41D2C" strokeWidth="2" />
              <circle cx="200" cy="200" r="140" fill="none" stroke="#A41D2C" strokeWidth="1.5" />
              <circle cx="200" cy="200" r="100" fill="none" stroke="#A41D2C" strokeWidth="1.5" />
            </svg>

            {/* Primary logo — large, prominent */}
            <div className="relative">
              <img
                src="/primaresearch-logo-dark.png"
                alt="Primaresearch"
                className="h-24 w-auto rounded-md"
              />
            </div>

            {/* Headline */}
            <div className="relative">
              <h1 className="text-3xl md:text-[34px] font-medium leading-[1.15] tracking-tight mb-4 text-stone-900">
                Secure access to client research.
              </h1>
              <p className="text-[15px] leading-relaxed text-stone-600 max-w-sm">
                Insightful, innovative, independent investment research — delivered through the Primaresearch Data Portal.
              </p>
            </div>
          </div>

          {/* ── RIGHT PANEL — sign-in form ──────────────────────── */}
          <div className="p-10 md:p-12 flex flex-col justify-center">
            <div className="mb-7">
              <h2 className="text-2xl md:text-[26px] font-medium tracking-tight text-stone-900 mb-1.5">
                Sign in
              </h2>
              <p className="text-sm text-stone-500">
                Welcome back. Enter your details to continue.
              </p>
            </div>

            {accepted && (
              <div className="bg-green-50 text-green-800 text-sm rounded-lg px-3 py-2 mb-4">
                Account activated — you can now sign in.
              </div>
            )}
            {reset && (
              <div className="bg-green-50 text-green-800 text-sm rounded-lg px-3 py-2 mb-4">
                Password reset successful — sign in with your new password.
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-stone-900 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  {...register('email')}
                  placeholder="name@company.com"
                  className="w-full px-3.5 py-2.5 border border-stone-200 rounded-[10px] text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
                />
                {errors.email && <p className="text-xs text-red-600 mt-1.5">{errors.email.message}</p>}
              </div>

              <div>
                <label className="block text-[13px] font-medium text-stone-900 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    {...register('password')}
                    placeholder="Enter your password"
                    className="w-full px-3.5 py-2.5 pr-11 border border-stone-200 rounded-[10px] text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-600 mt-1.5">{errors.password.message}</p>}
              </div>

              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-2 text-[13px] text-stone-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    {...register('remember')}
                    className="w-[15px] h-[15px] rounded border-stone-300 text-brand-500 focus:ring-brand-500 focus:ring-offset-0"
                  />
                  Remember me
                </label>
                <Link href="/forgot-password" className="text-[13px] font-medium text-brand-600 hover:text-brand-700">
                  Forgot password?
                </Link>
              </div>

              {mfaRequired && (
                <div>
                  <label className="block text-[13px] font-medium text-stone-900 mb-1.5">
                    Authenticator code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    {...register('mfaCode')}
                    placeholder="123456"
                    className="w-full px-3.5 py-2.5 border border-stone-200 rounded-[10px] text-sm font-mono tracking-[0.3em] text-center text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <p className="text-xs text-stone-500 mt-1.5">
                    Enter the 6-digit code from your authenticator app
                  </p>
                </div>
              )}

              {error && (
                <div
                  className={`text-sm rounded-lg px-3 py-2.5 ${
                    mfaRequired ? 'bg-amber-50 text-amber-800' : 'bg-red-50 text-red-700'
                  }`}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-brand-500 text-white py-3 rounded-[10px] text-sm font-medium hover:bg-brand-500 active:scale-[0.99] transition disabled:opacity-50 disabled:cursor-not-allowed mt-1"
              >
                {isSubmitting ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <p className="text-center text-xs text-stone-400 mt-6 leading-relaxed">
              Access is provisioned by your administrator. <br />
              Contact{' '}
              <a href="mailto:info@primaresearch.co.za" className="text-brand-600 hover:underline">
                info@primaresearch.co.za
              </a>{' '}
              for help.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
