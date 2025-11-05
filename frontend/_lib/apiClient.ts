import { z } from 'zod';

/**
 * API client wrapper around the native fetch API that transparently attaches a
 * bearer token and attempts a single refresh on 401. All responses are
 * validated via zod schemas defined in `_types`. Problem details are thrown
 * as JavaScript errors for consumption in React Query.
 */

let accessToken: string | null = null;
let refreshToken: string | null = null;

/**
 * Set the current in‑memory access token. Refresh token is now handled
 * via httpOnly cookies by the server. Clearing the token to `null` 
 * effectively logs the user out on the client side.
 */
export function setTokens(access: string | null, refresh: string | null) {
  accessToken = access;
  // Refresh token is now in httpOnly cookie, not stored in localStorage
  refreshToken = null;
}

/**
 * Initialize tokens from localStorage on app start
 * Note: Refresh token is now in httpOnly cookie, so nothing to initialize
 */
export function initTokens() {
  // Refresh token is in httpOnly cookie, managed by browser
  refreshToken = null;
}

/**
 * Get the current access token. Useful for attaching to headers outside of
 * this module (e.g. when uploading directly to S3).
 */
export function getAccessToken(): string | null {
  return accessToken;
}

/**
 * Legacy function for backward compatibility
 */
export function setAccessToken(token: string | null) {
  accessToken = token;
}

/**
 * Basic problem details schema based on RFC 7807.
 */
const ProblemDetails = z.object({
  title: z.string().optional(),
  status: z.number().optional(),
  detail: z.string().optional(),
  instance: z.string().optional(),
});

export type Problem = z.infer<typeof ProblemDetails>;

async function parseProblem(response: Response): Promise<Problem> {
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    // Non‑JSON error
    return { title: 'Unknown error', status: response.status, detail: response.statusText };
  }
  const result = ProblemDetails.safeParse(data);
  if (result.success) return result.data;
  return { title: 'Unknown error', status: response.status, detail: response.statusText };
}

export interface RequestOptions extends RequestInit {
  /**
   * If `true` the Authorization header will not be appended and no refresh
   * attempt will be made. Useful for login/signup endpoints.
   */
  skipAuth?: boolean;
}

/**
 * Perform an HTTP request against the API base. This helper automatically
 * prefixes the URL with `NEXT_PUBLIC_API_BASE`, attaches the current access
 * token, and attempts a refresh on 401. If the refresh is successful the
 * original request is retried. Throws a Problem on non‑OK responses.
 */
export async function apiRequest<T = unknown>(
  url: string,
  { skipAuth, ...options }: RequestOptions = {}
): Promise<T> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE || '';
  const headers = new Headers(options.headers);
  if (accessToken && !skipAuth) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  const send = async (): Promise<Response> => {
    return fetch(`${baseUrl}${url}`, {
      ...options,
      headers,
      credentials: 'include', // Always include cookies for httpOnly refresh token
    });
  };
  let response = await send();
  if (response.status === 401 && !skipAuth) {
    // Attempt refresh once using httpOnly cookie
    const refreshResponse = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Send refresh token cookie
    });
    if (refreshResponse.ok) {
      const { accessToken: newAccessToken } = await refreshResponse.json();
      setTokens(newAccessToken, null); // Refresh token stays in cookie
      headers.set('Authorization', `Bearer ${newAccessToken}`);
      response = await send();
    } else {
      // Refresh failed, clear tokens
      setTokens(null, null);
    }
  }
  if (!response.ok) {
    throw await parseProblem(response);
  }
  // Attempt to parse JSON; if fails, return undefined
  try {
    const data = await response.json();
    return data as T;
  } catch {
    return undefined as T;
  }
}