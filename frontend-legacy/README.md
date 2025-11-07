# Property Management App

This is a multi‑tenant property management platform built with **Next.js** (App Router), **TypeScript**, **Tailwind CSS**, **TanStack Query** and **React Hook Form**. The application supports landlords, tenants, contractors and ops teams with role‑based portals for onboarding and maintenance ticketing.

## Project Structure

The project is organized as follows:

```text
property-management-app/
├─ app/                    # App Router pages and layouts
│  ├─ (public)/           # Public pages (login, signup)
│  ├─ (landlord)/         # Landlord portal
│  ├─ (tenant)/           # Tenant portal
│  ├─ (contractor)/       # Contractor portal
│  └─ (ops)/              # Operations portal
├─ _components/           # Reusable UI components
├─ _lib/                  # API client, auth helpers, zod schemas
├─ _hooks/                # Custom hooks (e.g. authentication)
├─ _styles/               # Global and component styles
├─ _types/                # Shared TypeScript type definitions
├─ package.json           # Project dependencies and scripts
├─ tsconfig.json          # TypeScript configuration
├─ next.config.js         # Next.js configuration
├─ tailwind.config.js     # Tailwind CSS configuration
├─ postcss.config.js      # PostCSS configuration
└─ README.md
```

## Getting Started

To run the app locally you'll need **Node.js** (>= 18) installed. Install dependencies and run the development server:

```bash
npm install
npm run dev
```

The app will be available at `http://localhost:3000`. Environment variables such as `NEXT_PUBLIC_API_BASE` and `MAX_UPLOAD_MB` should be configured in a `.env.local` file. See `.env.example` for defaults.

## Testing

This project includes unit tests (powered by **Vitest** and **Testing Library**) and end‑to‑end tests (powered by **Playwright**). To run tests:

```bash
npm test         # Run unit tests
npm run test:e2e # Run E2E tests
```

## API Contract

All client requests are proxied through `/api` and authenticated using a JWT access token in memory and a refresh token via httpOnly cookies. See `_lib/apiClient.ts` for more details.

## License

MIT