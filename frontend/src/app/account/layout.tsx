'use client';

import { LayoutDashboard, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/lib/auth';

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading, hydrate } = useAuth();
  useEffect(() => { hydrate(); }, [hydrate]);
  useEffect(() => { if (!loading && !user) router.replace('/login'); }, [user, loading, router]);

  if (loading || !user) return <div className="min-h-screen flex items-center justify-center text-stone-500 text-sm">Loading…</div>;

  const homeHref = user.role === 'CLIENT' ? '/portal' : '/admin';

  return (
    <div className="min-h-screen bg-stone-50 py-8">
      <div className="max-w-3xl mx-auto px-6">
        <Link href={homeHref} className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-900 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to portal
        </Link>
        {children}
      </div>
    </div>
  );
}
