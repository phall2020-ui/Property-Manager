# ⚠️ ARCHIVED: Vite/React Experimental Frontend

**Status:** ARCHIVED  
**Date Archived:** November 6, 2025  
**Reason:** Consolidated to Next.js as the primary frontend framework

## Context

This was an experimental Vite + React 19 frontend that was used to test new approaches and UI patterns. The learnings from this experiment have been incorporated into the main Next.js frontend.

## What Happened to This Code?

- **Reusable UI Components**: Extracted to `/packages/ui`
- **Shared Utilities**: Extracted to `/packages/utils`
- **Type Definitions**: Extracted to `/packages/types`

## Current Frontend

The **primary and actively maintained frontend** is located in `/frontend` (Next.js 14 with App Router).

## Using This Code

This directory is kept for reference only. **Do not use this code for new development.**

If you need to reference specific implementations:
1. Check if similar functionality exists in `/frontend`
2. Check if UI components are available in `/packages/ui`
3. Check if utilities are available in `/packages/utils`

For any questions, please refer to the main [README.md](../README.md) and [CONTRIBUTING.md](../CONTRIBUTING.md).

---

## Original README

# React + TypeScript + Vite

This template provided a minimal setup to get React working in Vite with HMR and some ESLint rules.

Plugins that were available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

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
