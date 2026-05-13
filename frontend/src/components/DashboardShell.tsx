'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth, type Role } from '@/lib/auth';
import { LogOut, Bell, Settings, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

interface Props {
  children: React.ReactNode;
  nav: NavItem[];
  allowedRoles: Role[];
}

export function DashboardShell({ children, nav, allowedRoles }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, hydrate, logout } = useAuth();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login');
    else if (!allowedRoles.includes(user.role)) router.replace('/');
  }, [user, loading, router, allowedRoles]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-stone-500 text-sm">
        Loading…
      </div>
    );
  }

  const initials = (user.fullName || user.email).slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-stone-100 p-3">
      {/* Top bar */}
      <header className="bg-white border border-stone-200 rounded-2xl px-5 py-2.5 flex items-center gap-4 mb-3">
        <Link href="/" className="flex items-center gap-2.5 min-w-[220px]">
          <div className="w-8 h-8 border-[1.5px] border-brand-800 rounded-lg flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-brand-800" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="12" cy="12" r="9" />
              <path d="M3 12h18M12 3v18M5.5 6.5c3 2.5 10 2.5 13 0M5.5 17.5c3-2.5 10-2.5 13 0" />
            </svg>
          </div>
          <span className="text-sm font-medium text-stone-900">Prima Data Portal</span>
        </Link>

        <div className="flex-1 flex items-center gap-2 bg-stone-50 hover:bg-stone-100 transition rounded-[10px] px-3.5 py-2">
          <Search className="w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="Search datasets, files, and resources"
            className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-stone-400"
          />
        </div>

        <div className="flex items-center gap-1">
          <Link
            href="/account"
            className="w-9 h-9 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 flex items-center justify-center transition"
            aria-label="Settings"
          >
            <Settings className="w-[18px] h-[18px]" />
          </Link>
          <button
            className="w-9 h-9 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 flex items-center justify-center transition"
            aria-label="Notifications"
          >
            <Bell className="w-[18px] h-[18px]" />
          </button>
          <Link
            href="/account"
            className="w-9 h-9 rounded-full bg-stone-200 hover:bg-stone-300 text-stone-700 text-xs font-medium flex items-center justify-center transition ml-1"
          >
            {initials}
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-[220px_1fr] gap-3">
        {/* Sidebar */}
        <aside className="bg-white border border-stone-200 rounded-2xl p-3 flex flex-col h-[calc(100vh-92px)] sticky top-3">
          <div className="px-3 py-2 text-[11px] font-medium text-stone-400 uppercase tracking-wider">
            Menu
          </div>

          <nav className="space-y-0.5 flex-1">
            {nav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition',
                    active
                      ? 'bg-brand-50 text-brand-800 font-medium'
                      : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900',
                  )}
                >
                  <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="pt-3 mt-3 border-t border-stone-200">
            <div className="flex items-center gap-2.5 px-2 py-1.5">
              <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-800 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium text-stone-900 truncate">
                  {user.fullName}
                </div>
                <div className="text-[11px] text-stone-500 capitalize truncate">
                  {user.role.replace('_', ' ').toLowerCase()}
                </div>
              </div>
            </div>
            <button
              onClick={() => logout().then(() => router.push('/login'))}
              className="w-full flex items-center gap-2 px-3 py-2 mt-1 text-[12px] text-stone-500 hover:text-stone-900 hover:bg-stone-50 rounded-lg transition"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}