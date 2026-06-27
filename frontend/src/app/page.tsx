'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function HomePage() {
  const router = useRouter();
  const { user, loading, hydrate } = useAuth();

  useEffect(() => { hydrate(); }, [hydrate]);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login');
    else if (user.role === 'CLIENT') router.replace('/portal');
    else router.replace('/admin');
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center text-stone-500 text-sm">
      Loading…
    </div>
  );
}
