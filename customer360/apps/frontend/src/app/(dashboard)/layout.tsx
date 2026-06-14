'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { useTrendsUnreadCount } from '@/lib/hooks/use-trends';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { data: unreadData } = useTrendsUnreadCount();
  const unreadCount = unreadData?.count || 0;

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div
        className="flex flex-1 min-h-screen items-center justify-center"
        style={{ background: 'var(--bg-primary)' }}
      >
        <div className="spinner" />
      </div>
    );
  }

  if (!user) return null;

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4' },
    { label: 'Customers', href: '/customers', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
    { label: 'Segments', href: '/segments', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
    { label: 'Campaigns', href: '/campaigns', icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z' },
    { label: 'Analytics', href: '/analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { label: 'Trends', href: '/trends', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    { label: 'Upload', href: '/upload', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12' },
  ];

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Sidebar */}
      <aside
        className="hidden md:flex w-64 flex-col border-r"
        style={{
          background: 'var(--bg-secondary)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        {/* Brand */}
        <div
          className="flex items-center gap-3 px-6 py-5 border-b"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{
              background: 'var(--accent-gradient)',
              boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 40 40" fill="none">
              <path d="M20 4L34 12V28L20 36L6 28V12L20 4Z" stroke="white" strokeWidth="2.5" fill="none"/>
              <circle cx="20" cy="16" r="4" fill="white"/>
              <path d="M12 28C12 23.5817 15.5817 20 20 20C24.4183 20 28 23.5817 28 28" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            Customer360
          </span>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.label}
                href={item.href}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  background: isActive ? 'var(--accent-glow)' : 'transparent',
                }}
              >
                <div className="flex items-center gap-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d={item.icon} />
                  </svg>
                  <span>{item.label}</span>
                </div>
                {item.label === 'Trends' && unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-extrabold bg-indigo-600 text-white rounded-full scale-90">
                    {unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div
          className="px-4 py-4 border-t"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold"
              style={{
                background: 'var(--accent-glow)',
                color: 'var(--accent-primary)',
              }}
            >
              {user.email[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                {user.email}
              </p>
              <p className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>
                {user.role.replace('_', ' ')}
              </p>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg transition-colors hover:opacity-80"
              style={{ color: 'var(--text-muted)' }}
              title="Sign out"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-auto">
        {/* Desktop Header Topbar */}
        <div
          className="hidden md:flex items-center justify-between px-8 py-4 border-b bg-zinc-950/20 backdrop-blur-md"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            {pathname === '/dashboard' ? 'home' : pathname.replace(/^\//, '').replace(/\//g, ' ╱ ')}
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/trends"
              className="relative p-2 text-zinc-400 hover:text-white rounded-lg border hover:bg-zinc-800/30 transition-all"
              style={{
                borderColor: 'var(--border-subtle)',
                background: 'var(--bg-input)'
              }}
              title="Trend Insights"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
              )}
            </Link>
          </div>
        </div>

        {/* Mobile header */}
        <div
          className="md:hidden flex items-center justify-between px-4 py-3 border-b"
          style={{
            background: 'var(--bg-secondary)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--accent-gradient)' }}
            >
              <svg width="16" height="16" viewBox="0 0 40 40" fill="none">
                <path d="M20 4L34 12V28L20 36L6 28V12L20 4Z" stroke="white" strokeWidth="2.5" fill="none"/>
              </svg>
            </div>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Customer360
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/trends"
              className="relative p-1.5 text-zinc-400 hover:text-white rounded-lg border transition-all"
              style={{
                borderColor: 'var(--border-subtle)',
                background: 'var(--bg-input)'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-indigo-500 rounded-full" />
              )}
            </Link>
            <button
              onClick={logout}
              className="text-sm font-medium px-3 py-1.5 rounded-lg border hover:bg-zinc-800/20"
              style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-subtle)' }}
            >
              Sign out
            </button>
          </div>
        </div>

        <div className="flex-1 p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
