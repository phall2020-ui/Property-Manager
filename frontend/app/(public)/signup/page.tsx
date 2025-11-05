"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SignupSchema, SignupDTO, signup, getMe } from '@/lib/auth';
import { Role } from '@/types/models';

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupDTO>({ resolver: zodResolver(SignupSchema) });
  const onSubmit = async (data: SignupDTO) => {
    setError(null);
    try {
      await signup(data);
      const user = await getMe();
      if (!user) {
        setError('Failed to fetch user data');
        return;
      }
      // Newly signed up users are landlords by default
      const primaryRole = user.organisations?.[0]?.role;
      if (primaryRole === 'LANDLORD') {
        router.push('/dashboard');
      } else {
        router.push('/');
      }
    } catch (err: any) {
      setError(err.detail || err.message || 'Signup failed');
    }
  };
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mx-auto w-full max-w-md space-y-4 bg-white p-6 rounded shadow"
      >
        <h1 className="text-2xl font-semibold">Sign up</h1>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div>
          <label htmlFor="displayName" className="block text-sm font-medium">
            Full name
          </label>
          <input
            id="displayName"
            type="text"
            {...register('displayName')}
            className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
          />
          {errors.displayName && <p className="text-xs text-red-600">{errors.displayName.message}</p>}
        </div>
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
          {isSubmitting ? 'Signing up…' : 'Sign up'}
        </button>
        <p className="text-sm">
          Already have an account?{' '}
          <a href="/login" className="text-primary underline">
            Sign in
          </a>
        </p>
      </form>
    </div>
  );
}