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
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginDTO>({ resolver: zodResolver(LoginSchema) });
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
        setError('Failed to fetch user data or no organizations found');
        return;
      }
      
      // Navigate based on primary role (first org membership)
      const primaryRole = user.organisations[0].role;
      console.log('Primary role:', primaryRole);
      
      switch (primaryRole) {
        case 'LANDLORD':
          console.log('Redirecting to /dashboard');
          router.push('/dashboard');
          break;
        case 'TENANT':
          console.log('Redirecting to /report-issue');
          router.push('/report-issue');
          break;
        case 'CONTRACTOR':
          console.log('Redirecting to /jobs');
          router.push('/jobs');
          break;
        case 'OPS':
          console.log('Redirecting to /queue');
          router.push('/queue');
          break;
        default:
          console.log('Unknown role, redirecting to /');
          router.push('/');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.detail || err.message || 'Login failed');
    }
  };
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mx-auto w-full max-w-md space-y-4 bg-white p-6 rounded shadow"
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
          disabled={isSubmitting}
          className="w-full rounded bg-primary px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="text-sm">
          Don't have an account?{' '}
          <a href="/signup" className="text-primary underline">
            Sign up
          </a>
        </p>
      </form>
    </div>
  );
}