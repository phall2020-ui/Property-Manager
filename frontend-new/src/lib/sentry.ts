import * as Sentry from '@sentry/react';

export interface SentryConfig {
  dsn?: string;
  environment: string;
  release?: string;
  enabled: boolean;
  sampleRate: number;
  tracesSampleRate: number;
}

/**
 * Get Sentry configuration from environment variables
 */
export function getSentryConfig(): SentryConfig {
  return {
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE || 'development',
    release: import.meta.env.VITE_SENTRY_RELEASE || import.meta.env.VITE_GIT_SHA,
    enabled: import.meta.env.VITE_SENTRY_ENABLED === 'true',
    sampleRate: parseFloat(import.meta.env.VITE_SENTRY_SAMPLE_RATE || '1.0'),
    tracesSampleRate: parseFloat(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || '0.1'),
  };
}

/**
 * Initialize Sentry with configuration
 */
export function initSentry(): void {
  const config = getSentryConfig();

  if (!config.enabled || !config.dsn) {
    console.info('Sentry is disabled or DSN not provided');
    return;
  }

  Sentry.init({
    dsn: config.dsn,
    environment: config.environment,
    release: config.release,
    
    // Set sample rate for error events
    sampleRate: config.sampleRate,
    
    // Set trace sample rate for performance monitoring
    tracesSampleRate: config.tracesSampleRate,
    
    // Enable performance monitoring
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    
    // Before send - scrub PII
    beforeSend(event) {
      // Remove sensitive data
      if (event.request) {
        // Remove authorization headers
        if (event.request.headers) {
          delete event.request.headers.Authorization;
          delete event.request.headers.authorization;
          delete event.request.headers.Cookie;
          delete event.request.headers.cookie;
        }
        
        // Remove query params that might contain sensitive data
        if (event.request.query_string) {
          const sanitizedParams = new URLSearchParams(event.request.query_string);
          const sensitiveKeys = ['token', 'key', 'secret', 'password', 'api_key', 'apikey'];
          
          sensitiveKeys.forEach(key => {
            if (sanitizedParams.has(key)) {
              sanitizedParams.set(key, '[Filtered]');
            }
          });
          
          event.request.query_string = sanitizedParams.toString();
        }
      }
      
      // Remove localStorage data that might be sensitive
      if (event.contexts?.state) {
        delete event.contexts.state.accessToken;
        delete event.contexts.state.refreshToken;
      }
      
      // Scrub user email if present
      if (event.user?.email) {
        const [localPart, domain] = event.user.email.split('@');
        if (localPart && domain) {
          event.user.email = `${localPart.substring(0, 2)}***@${domain}`;
        }
      }
      
      return event;
    },
    
    // Ignore common errors that don't need reporting
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'chrome-extension://',
      'moz-extension://',
      // Network errors
      'Network request failed',
      'NetworkError',
      'Failed to fetch',
      // Resize observer (common benign error)
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
    ],
    
    // Only capture errors from our domain
    allowUrls: [
      /https?:\/\/(www\.)?yourdomain\.com/,
      /localhost/,
    ],
  });

  // Set global error handler on window
  window.Sentry = Sentry;
  
  console.info(`Sentry initialized for ${config.environment}`, {
    release: config.release,
    sampleRate: config.sampleRate,
  });
}

/**
 * Set user context in Sentry
 */
export function setSentryUser(user: { id: string; email?: string; username?: string } | null): void {
  if (!getSentryConfig().enabled) return;
  
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
    });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Add breadcrumb to Sentry
 */
export function addSentryBreadcrumb(
  message: string,
  category: string,
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info',
  data?: Record<string, unknown>
): void {
  if (!getSentryConfig().enabled) return;
  
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
  });
}

/**
 * Capture exception in Sentry
 */
export function captureException(
  error: Error,
  context?: Record<string, string | number | boolean>
): void {
  if (!getSentryConfig().enabled) {
    console.error('Error:', error, context);
    return;
  }
  
  Sentry.captureException(error, context ? { extra: context } : undefined);
}

/**
 * Capture message in Sentry
 */
export function captureMessage(
  message: string,
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info',
  context?: Record<string, string | number | boolean>
): void {
  if (!getSentryConfig().enabled) {
    console.log(`[${level}]`, message, context);
    return;
  }
  
  Sentry.captureMessage(message, {
    level,
    extra: context,
  });
}

// Type augmentation for window.Sentry
declare global {
  interface Window {
    Sentry?: typeof Sentry;
  }
}
