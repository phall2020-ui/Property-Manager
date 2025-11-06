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
      await login(data);
      const user = await getMe();
      if (!user) {
        setError('Failed to fetch user data. Please try logging in again.');
        return;
      }
      // Navigate based on primary role (first org membership)
      const primaryRole = user.organisations?.[0]?.role;
      switch (primaryRole) {
        case 'LANDLORD':
          router.push('/dashboard');
          break;
        case 'TENANT':
          router.push('/dashboard');
          break;
        case 'CONTRACTOR':
          router.push('/jobs');
          break;
        case 'OPS':
          router.push('/queue');
          break;
        default:
          router.push('/');
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