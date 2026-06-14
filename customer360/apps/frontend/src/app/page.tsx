'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [user, loading, router]);

  // Show nothing while redirecting
  return (
    <div className="flex flex-1 items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      <div className="spinner" />
    </div>
  );
}
