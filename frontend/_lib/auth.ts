import { z } from 'zod';
import { apiRequest, setTokens, initTokens } from './apiClient';

/**
 * Zod schema and types for authentication flows. Both client and server can
 * import these schemas to ensure consistency between request payloads and
 * responses.
 */

export const LoginSchema = z.object({
  email: z.string().email({ message: 'Must be a valid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

export type LoginDTO = z.infer<typeof LoginSchema>;

export const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string().min(2),
});

export type SignupDTO = z.infer<typeof SignupSchema>;

export const AcceptInviteSchema = z.object({
  token: z.string(),
  password: z.string().min(6),
});

export type AcceptInviteDTO = z.infer<typeof AcceptInviteSchema>;

export interface AuthResponse {
  accessToken: string;
  user: any;
  // Note: refreshToken is now in httpOnly cookie, not in response
}

/**
 * Log in with email and password. On success the access token is stored
 * in memory and refresh token is stored in httpOnly cookie by the server.
 */
export async function login(dto: LoginDTO): Promise<AuthResponse> {
  try {
    const data = await apiRequest<AuthResponse>(`/auth/login`, {
      method: 'POST',
      body: JSON.stringify(dto),
      headers: { 'Content-Type': 'application/json' },
      skipAuth: true,
      credentials: 'include', // Important: include cookies
    });
    console.log('Login response:', data);
    setTokens(data.accessToken, null); // No refresh token in response
    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

/**
 * Sign up as a landlord. After creation the user is logged in and can
 * continue onboarding by creating their first property.
 */
export async function signup(dto: SignupDTO): Promise<AuthResponse> {
  // Backend expects 'name' not 'displayName'
  const { displayName, ...rest } = dto;
  const data = await apiRequest<AuthResponse>(`/auth/signup`, {
    method: 'POST',
    body: JSON.stringify({ ...rest, name: displayName }),
    headers: { 'Content-Type': 'application/json' },
    skipAuth: true,
    credentials: 'include', // Important: include cookies
  });
  setTokens(data.accessToken, null); // No refresh token in response
  return data;
}

/**
 * Accept a tenant invite. The server will validate the invite token and set
 * the user’s role to TENANT. A password is required to complete the flow.
 */
export async function acceptInvite(dto: AcceptInviteDTO): Promise<AuthResponse> {
  const data = await apiRequest<AuthResponse>(`/invites/tenant/accept`, {
    method: 'POST',
    body: JSON.stringify(dto),
    headers: { 'Content-Type': 'application/json' },
    skipAuth: true,
    credentials: 'include', // Important: include cookies
  });
  setTokens(data.accessToken, null); // No refresh token in response
  return data;
}

/**
 * Fetch the currently authenticated user. Returns null if not logged in.
 */
export async function getMe() {
  initTokens();
  try {
    const data = await apiRequest<any>(`/users/me`);
    console.log('getMe response:', data);
    return data;
  } catch (err) {
    console.error('getMe error:', err);
    return null;
  }
}

/**
 * Log out by clearing the access token and informing the server to revoke
 * refresh token cookie. This is a best‑effort call; any error is swallowed.
 */
export async function logout(): Promise<void> {
  try {
    await apiRequest(`/auth/logout`, { 
      method: 'POST',
      credentials: 'include', // Send cookie to be cleared
    });
  } catch {
    /* ignore */
  } finally {
    setTokens(null, null);
  }
}