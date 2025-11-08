"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoginSchema, LoginDTO } from '@/lib/auth';
import { login, getMe } from '@/lib/auth';
import { Role } from '@/types/models';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isQuickLogin, setIsQuickLogin] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<LoginDTO>({ resolver: zodResolver(LoginSchema) });
  const quickLogin = async (email: string, password: string) => {
    setIsQuickLogin(true);
    setValue('email', email);
    setValue('password', password);
    await onSubmit({ email, password });
    setIsQuickLogin(false);
  };

  const onSubmit = async (data: LoginDTO) => {
    setError(null);
    try {
      console.log('Attempting login...');
      const loginResponse = await login(data);
      console.log('Login successful:', loginResponse);
      
      console.log('Fetching user data...');
      const user = await getMe();
      console.log('User data:', user);
      
      if (!user || !user.organisations || user.organisations.length === 0) {
        setError('Failed to fetch user data or no organizations found. Please try logging in again.');
        return;
      }
      
      // Navigate based on primary role (first org membership)
      const primaryRole = user.organisations[0].role;
      console.log('Primary role:', primaryRole);
      
      switch (primaryRole) {
        case 'LANDLORD':
          console.log('Redirecting to /dashboard');
          window.location.href = '/dashboard';
          break;
        case 'TENANT':
          console.log('Redirecting to /report-issue');
          window.location.href = '/report-issue';
          break;
        case 'CONTRACTOR':
          console.log('Redirecting to /jobs');
          window.location.href = '/jobs';
          break;
        case 'OPS':
          console.log('Redirecting to /queue');
          window.location.href = '/queue';
          break;
        default:
          console.log('Unknown role, redirecting to /');
          window.location.href = '/';
      }
    } catch (err: any) {
      console.error('Login error:', err);
      // Handle different error scenarios
      const errorMessage = err.detail || 
                          err.message || 
                          err.response?.data?.detail ||
                          err.response?.data?.message ||
                          'Login failed. Please check your credentials and try again.';
      setError(errorMessage);
    }
  };
  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gray-50">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        {/* Quick Login Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-3">🚀 Quick Login (Development)</h2>
          <p className="text-sm text-blue-700 mb-4">
            Click a button below to instantly log in as different user roles:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => quickLogin('landlord@example.com', 'password123')}
              disabled={isSubmitting || isQuickLogin}
              className="flex items-center justify-between p-4 bg-white border-2 border-blue-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="text-left">
                <div className="font-semibold text-gray-900">🏢 Landlord</div>
                <div className="text-xs text-gray-600">landlord@example.com</div>
              </div>
              <div className="text-2xl">→</div>
            </button>
            
            <button
              type="button"
              onClick={() => quickLogin('tenant@example.com', 'password123')}
              disabled={isSubmitting || isQuickLogin}
              className="flex items-center justify-between p-4 bg-white border-2 border-green-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="text-left">
                <div className="font-semibold text-gray-900">👤 Tenant</div>
                <div className="text-xs text-gray-600">tenant@example.com</div>
              </div>
              <div className="text-2xl">→</div>
            </button>
            
            <button
              type="button"
              onClick={() => quickLogin('contractor@example.com', 'password123')}
              disabled={isSubmitting || isQuickLogin}
              className="flex items-center justify-between p-4 bg-white border-2 border-orange-300 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="text-left">
                <div className="font-semibold text-gray-900">🔧 Contractor</div>
                <div className="text-xs text-gray-600">contractor@example.com</div>
              </div>
              <div className="text-2xl">→</div>
            </button>
            
            <button
              type="button"
              onClick={() => quickLogin('ops@example.com', 'password123')}
              disabled={isSubmitting || isQuickLogin}
              className="flex items-center justify-between p-4 bg-white border-2 border-purple-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="text-left">
                <div className="font-semibold text-gray-900">⚙️ Operations</div>
                <div className="text-xs text-gray-600">ops@example.com</div>
              </div>
              <div className="text-2xl">→</div>
            </button>
          </div>
          {(isSubmitting || isQuickLogin) && (
            <div className="mt-4 text-center text-sm text-blue-700">
              Logging in...
            </div>
          )}
        </div>

        {/* Regular Login Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-white p-6 rounded-lg shadow space-y-4"
        >
          <h1 className="text-2xl font-semibold">Sign in</h1>
          {error && <p className="text-sm text-red-600">{error}</p>}
        <div>
          <label htmlFor="email" className="block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            {...register('email')}
            className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
          />
          {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            {...register('password')}
            className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
          />
          {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
        </div>
        <button
          type="submit"
          disabled={isSubmitting || isQuickLogin}
          className="w-full rounded bg-primary px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="text-sm">
          Don&apos;t have an account?{' '}
          <a href="/signup" className="text-primary underline">
            Sign up
          </a>
        </p>
      </form>
      </div>
    </div>
  );
}