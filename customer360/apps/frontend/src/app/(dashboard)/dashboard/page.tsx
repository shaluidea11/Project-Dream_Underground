'use client';

import { useAuth } from '@/context/auth-context';
import { useDashboardHome } from '@/lib/hooks/use-analytics';
import { Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: metrics, isLoading } = useDashboardHome();

  if (!user) return null;

  const stats = [
    { label: 'Total Customers', value: isLoading ? '...' : (metrics?.totalCustomers?.toString() || '0'), icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
    { label: 'Segments', value: isLoading ? '...' : (metrics?.totalSegments?.toString() || '0'), icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
    { label: 'Campaigns This Month', value: isLoading ? '...' : (metrics?.campaignsThisMonth?.toString() || '0'), icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6' },
    { label: 'Top Campaign Conv.', value: isLoading ? '...' : (metrics?.bestCampaign ? `${metrics.bestCampaign.conversionRate.toFixed(1)}%` : '0%'), icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
  ];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          Dashboard
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Welcome back, <span className="font-medium" style={{ color: 'var(--accent-primary-hover)' }}>{user.email}</span>
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className={`glass rounded-xl p-5 animate-fade-in-delay-${Math.min(i + 1, 3)}`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {stat.label}
              </span>
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--accent-glow)' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d={stat.icon} />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Quick info */}
      <div className="glass rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Getting Started
        </h2>
        <div className="space-y-3">
          {[
            { step: '1', text: 'Upload customer and order data via CSV/Excel', done: true },
            { step: '2', text: 'Create audience segments with filters or AI', done: false },
            { step: '3', text: 'Build and launch marketing campaigns', done: false },
            { step: '4', text: 'Track analytics and campaign performance', done: false },
          ].map((item) => (
            <div
              key={item.step}
              className="flex items-center gap-3 px-4 py-3 rounded-lg"
              style={{ background: 'var(--bg-input)' }}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                style={{
                  background: item.done ? 'var(--success)' : 'var(--accent-glow)',
                  color: item.done ? 'white' : 'var(--accent-primary)',
                }}
              >
                {item.done ? '✓' : item.step}
              </div>
              <span
                className="text-sm"
                style={{ color: item.done ? 'var(--text-muted)' : 'var(--text-secondary)' }}
              >
                {item.text}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
