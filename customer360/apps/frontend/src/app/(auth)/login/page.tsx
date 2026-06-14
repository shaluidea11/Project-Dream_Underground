'use client';

import { useState, type FormEvent } from 'react';
import { useAuth } from '@/context/auth-context';
import { ApiError } from '@/lib/api';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 429) {
          setError('Too many login attempts. Please try again in 15 minutes.');
        } else {
          setError(err.message || 'Invalid email or password');
        }
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col lg:flex-row min-h-screen">
      {/* Left panel — Branding */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center relative overflow-hidden"
        style={{ background: 'var(--bg-secondary)' }}
      >
        {/* Gradient orbs */}
        <div
          className="absolute w-96 h-96 rounded-full opacity-20 blur-3xl animate-float"
          style={{
            background: 'var(--accent-gradient)',
            top: '10%',
            left: '10%',
          }}
        />
        <div
          className="absolute w-72 h-72 rounded-full opacity-15 blur-3xl animate-float"
          style={{
            background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
            bottom: '15%',
            right: '10%',
            animationDelay: '2s',
          }}
        />

        <div className="relative z-10 max-w-md px-8 text-center animate-fade-in">
          {/* Logo */}
          <div
            className="w-20 h-20 mx-auto mb-8 rounded-2xl flex items-center justify-center animate-pulse-glow"
            style={{
              background: 'var(--accent-gradient)',
              boxShadow: '0 8px 32px rgba(99, 102, 241, 0.3)',
            }}
          >
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <path d="M20 4L34 12V28L20 36L6 28V12L20 4Z" stroke="white" strokeWidth="2" fill="none"/>
              <circle cx="20" cy="16" r="4" fill="white"/>
              <path d="M12 28C12 23.5817 15.5817 20 20 20C24.4183 20 28 23.5817 28 28" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>

          <h1
            className="text-4xl font-bold mb-4 bg-clip-text text-transparent animate-gradient"
            style={{
              backgroundImage: 'var(--accent-gradient)',
              backgroundSize: '200% 200%',
            }}
          >
            Customer360
          </h1>
          <p style={{ color: 'var(--text-secondary)' }} className="text-lg mb-8">
            AI-native shopper marketing CRM
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-3 animate-fade-in-delay-2">
            {['Customer Intelligence', 'AI Segmentation', 'Campaign Builder', 'Analytics'].map((feature) => (
              <span
                key={feature}
                className="px-4 py-1.5 rounded-full text-sm"
                style={{
                  background: 'var(--accent-glow)',
                  color: 'var(--accent-primary-hover)',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                }}
              >
                {feature}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom brand */}
        <div className="absolute bottom-8 text-center">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Dream Underground
          </p>
        </div>
      </div>

      {/* Right panel — Login form */}
      <div
        className="flex flex-1 flex-col items-center justify-center px-6 lg:w-1/2"
        style={{ background: 'var(--bg-primary)' }}
      >
        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div
              className="w-14 h-14 mx-auto mb-4 rounded-xl flex items-center justify-center"
              style={{
                background: 'var(--accent-gradient)',
                boxShadow: '0 4px 16px rgba(99, 102, 241, 0.3)',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
                <path d="M20 4L34 12V28L20 36L6 28V12L20 4Z" stroke="white" strokeWidth="2" fill="none"/>
                <circle cx="20" cy="16" r="4" fill="white"/>
                <path d="M12 28C12 23.5817 15.5817 20 20 20C24.4183 20 28 23.5817 28 28" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <h1
              className="text-2xl font-bold bg-clip-text text-transparent"
              style={{ backgroundImage: 'var(--accent-gradient)' }}
            >
              Customer360
            </h1>
          </div>

          <div className="mb-8">
            <h2
              className="text-2xl font-semibold mb-2"
              style={{ color: 'var(--text-primary)' }}
            >
              Welcome back
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              Sign in to your account to continue
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div
              className="mb-6 p-4 rounded-xl text-sm animate-fade-in flex items-center gap-3"
              style={{
                background: 'var(--danger-muted)',
                color: 'var(--danger)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M10 6V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="10" cy="14" r="0.75" fill="currentColor"/>
              </svg>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="animate-fade-in-delay-1">
              <label
                htmlFor="login-email"
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@test.com"
                className="input-field"
              />
            </div>

            <div className="animate-fade-in-delay-2">
              <label
                htmlFor="login-password"
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field"
                  style={{ paddingRight: '3rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" strokeLinecap="round" strokeLinejoin="round"/>
                      <line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round"/>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="animate-fade-in-delay-3">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="spinner" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </div>
          </form>

          {/* Footer */}
          <p
            className="mt-8 text-center text-sm animate-fade-in-delay-3"
            style={{ color: 'var(--text-muted)' }}
          >
            Customer360 AI CRM · Dream Underground
          </p>
        </div>
      </div>
    </div>
  );
}
