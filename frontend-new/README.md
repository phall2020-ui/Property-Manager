# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Error Handling & API Hygiene

This application implements standardized error handling, retries, and authentication flows for a professional user experience.

### Error Handling Architecture

#### 1. Centralized API Client

The application uses a centralized Axios instance (`src/lib/api-client.ts`) with built-in interceptors for:

- **JWT Authentication**: Automatically attaches access tokens to requests
- **Auto-refresh on 401**: Automatically refreshes expired tokens once per request
- **RFC 7807 Error Parsing**: Parses Problem Details format for consistent error handling
- **Request Timeout**: 30-second timeout for all requests

```typescript
import { apiClient } from '@/lib/api-client';

// The client is already configured with interceptors
const response = await apiClient.get('/api/endpoint');
```

#### 2. Error Boundary

The application includes a global error boundary (`src/components/ErrorBoundary.tsx`) that:

- Catches React render errors
- Shows user-friendly error messages
- Provides "Try Again" functionality
- Includes expandable technical details
- Integrates with Sentry for error reporting

#### 3. Toast Notifications

The toast system (`src/contexts/ToastContext.tsx`) provides:

- Success, error, info, and warning notifications
- Auto-dismissal after 5 seconds (configurable)
- Smooth slide-in animations
- Manual dismissal option

```typescript
import { useToast } from '@/contexts/ToastContext';

function MyComponent() {
  const toast = useToast();
  
  const handleSuccess = () => {
    toast.success('Operation completed successfully');
  };
  
  const handleError = () => {
    toast.error('Something went wrong');
  };
}
```

#### 4. API Error Handling Hook

Use `useApiError` hook for consistent error handling:

```typescript
import { useApiError } from '@/hooks/useApiError';

function MyComponent() {
  const { handleError, handleSuccess } = useApiError();
  
  const submitForm = async (data) => {
    try {
      await apiClient.post('/api/endpoint', data);
      handleSuccess('Form submitted successfully');
    } catch (error) {
      // Automatically shows toast and returns parsed error
      const apiError = handleError(error);
      
      // Handle field-level errors
      if (apiError.fieldErrors) {
        setFieldErrors(apiError.fieldErrors);
      }
    }
  };
}
```

#### 5. Field-Level Error Handling

When the API returns field validation errors (RFC 7807 format), they can be displayed inline:

```typescript
import { extractFieldErrors } from '@/hooks/useApiError';

try {
  await apiClient.post('/api/endpoint', data);
} catch (error) {
  const fieldErrors = extractFieldErrors(error);
  
  if (fieldErrors) {
    // Display inline errors for each field
    // fieldErrors = { email: "Invalid email", password: "Too short" }
  }
}
```

### React Query Configuration

React Query is configured with smart retry logic:

- **Max 2 retries** for network errors only
- **No retries** for 4xx client errors
- **Exponential backoff**: 1s, 2s
- **Stale time**: 1 minute (data stays fresh)
- **Mutations**: No automatic retries

### Sentry Integration

Sentry is configured for error tracking and performance monitoring:

#### Environment Variables

Add these to your `.env` file:

```bash
VITE_SENTRY_DSN=https://your-dsn@sentry.io/project-id
VITE_SENTRY_ENVIRONMENT=production
VITE_SENTRY_ENABLED=true
VITE_SENTRY_SAMPLE_RATE=1.0
VITE_SENTRY_TRACES_SAMPLE_RATE=0.1
VITE_SENTRY_RELEASE=1.0.0
VITE_GIT_SHA=abc123
```

#### Configuration

- **PII Scrubbing**: Automatically removes sensitive data (emails, tokens, passwords)
- **Release Tracking**: Uses git SHA or version for release tracking
- **Performance Monitoring**: Configurable trace sampling rate
- **Session Replay**: Enabled with text and media masking
- **Breadcrumbs**: Automatic tracking of user interactions

#### Manual Error Capture

```typescript
import { captureException, captureMessage, addSentryBreadcrumb } from '@/lib/sentry';

// Capture exceptions
try {
  // ... code
} catch (error) {
  captureException(error, {
    context: 'payment-processing',
    userId: user.id,
  });
}

// Capture messages
captureMessage('User completed onboarding', 'info', {
  userId: user.id,
  timestamp: Date.now(),
});

// Add breadcrumbs
addSentryBreadcrumb('User clicked button', 'user-action', 'info', {
  buttonId: 'submit-form',
});
```

### Error Patterns

#### Network Errors

Network errors show a user-friendly message:

```
"Network error. Please check your connection and try again."
```

#### API Errors (RFC 7807)

API errors following RFC 7807 are parsed to show:
- User-friendly title
- Detailed error message
- Field-level validation errors
- HTTP status code

Example API response:
```json
{
  "type": "https://api.example.com/errors/validation",
  "title": "Validation Failed",
  "status": 422,
  "detail": "The request contains invalid data",
  "errors": {
    "email": ["Email is required", "Email must be valid"],
    "password": ["Password must be at least 8 characters"]
  }
}
```

This is automatically parsed and displayed with inline field errors.

#### Authentication Errors (401)

When a 401 error occurs:
1. System automatically attempts to refresh the access token
2. If refresh succeeds, the original request is retried
3. If refresh fails, user is redirected to login page
4. Token refresh only happens once per request to prevent loops

### Testing

#### Unit Tests

Run unit tests for error handling:

```bash
npm run test:unit
```

Key test files:
- `src/__tests__/lib/api-client.test.ts` - API client and error parsing
- `src/__tests__/hooks/useApiError.test.tsx` - Error handling hook

#### E2E Tests

Run E2E tests including auth flow:

```bash
npm run test:e2e
```

Key test files:
- `tests/e2e/auth-refresh.spec.ts` - 401 refresh flow testing

### Best Practices

1. **Always use the centralized API client** - Don't create new axios instances
2. **Use toast notifications** for user feedback on mutations
3. **Display inline errors** for form validation failures
4. **Handle loading states** to prevent multiple submissions
5. **Log errors** to Sentry in production
6. **Test error scenarios** with unit and E2E tests

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
