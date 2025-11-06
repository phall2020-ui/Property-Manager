# Contributing to Property Manager

Thank you for your interest in contributing to the Property Manager platform! This document provides guidelines and instructions for contributing.

## Getting Started

### Prerequisites

- Node.js 20 or later
- pnpm 8 or later
- Docker and Docker Compose (for PostgreSQL and Redis)

### Setting Up Your Development Environment

1. **Fork and clone the repository**

```bash
git clone https://github.com/yourusername/Property-Manager.git
cd Property-Manager
```

2. **Install dependencies**

```bash
pnpm install
```

3. **Set up environment variables**

```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env.local
```

4. **Start the database services**

```bash
cd backend
docker compose up -d
```

5. **Run database migrations**

```bash
pnpm prisma:migrate
```

6. **Generate Prisma Client**

```bash
pnpm prisma:generate
```

7. **Start the development servers**

```bash
# Start both backend and frontend
pnpm dev

# Or individually
pnpm dev:backend
pnpm dev:frontend
```

## Development Workflow

### Workspace Commands

This is a pnpm monorepo with the following workspaces:

- `backend` - NestJS API
- `frontend` - Next.js application
- `packages/types` - Shared TypeScript types and Zod schemas
- `packages/ui` - Shared React UI components
- `packages/utils` - Shared utility functions

#### Common Commands

```bash
# Install dependencies for all packages
pnpm install

# Run a command in all workspaces
pnpm -r <command>

# Run a command in a specific workspace
pnpm --filter <workspace> <command>

# Examples:
pnpm --filter backend dev
pnpm --filter frontend build
pnpm --filter @property-manager/types typecheck

# Run linting across all packages
pnpm lint

# Run type checking across all packages
pnpm typecheck

# Run tests
pnpm test

# Format code
pnpm format
```

### Code Style

We use ESLint and Prettier to maintain consistent code style:

- **ESLint**: Lints TypeScript/JavaScript code
- **Prettier**: Formats code automatically

Before committing, run:

```bash
pnpm lint:fix
pnpm format
```

### Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(auth): add refresh token rotation
fix(properties): correct property list filtering
docs(readme): update setup instructions
test(tickets): add tests for ticket creation
```

### Branch Naming

Use descriptive branch names:

- `feature/add-invoice-module`
- `fix/property-list-pagination`
- `chore/update-dependencies`
- `docs/improve-api-documentation`

### Testing

#### Backend Tests

```bash
# Run all tests
pnpm --filter backend test

# Run tests in watch mode
pnpm --filter backend test:watch

# Run tests with coverage
pnpm --filter backend test:cov
```

#### Frontend Tests

```bash
# Run unit tests
pnpm --filter frontend test

# Run E2E tests
pnpm --filter frontend test:e2e
```

### Making Changes

1. **Create a branch** from `main`

```bash
git checkout -b feature/your-feature-name
```

2. **Make your changes** following the code style guidelines

3. **Test your changes**

```bash
pnpm lint
pnpm typecheck
pnpm test
```

4. **Commit your changes** using conventional commits

```bash
git add .
git commit -m "feat(module): add new feature"
```

5. **Push to your fork**

```bash
git push origin feature/your-feature-name
```

6. **Open a Pull Request** on GitHub

## Pull Request Process

1. **Ensure all tests pass** - CI will automatically run tests
2. **Update documentation** if needed
3. **Add or update tests** for new features
4. **Request review** from maintainers
5. **Address feedback** from reviewers
6. **Squash commits** if requested before merging

### Pull Request Checklist

- [ ] Code follows project style guidelines
- [ ] All tests pass locally
- [ ] New tests added for new features
- [ ] Documentation updated
- [ ] No console.log or debugging code
- [ ] Environment variables documented in .env.example
- [ ] Commit messages follow conventional commits

## Database Migrations

When making changes to the Prisma schema:

1. **Update the schema** in `backend/prisma/schema.prisma`

2. **Create a migration**

```bash
cd backend
pnpm exec prisma migrate dev --name descriptive_migration_name
```

3. **Test the migration** locally

4. **Commit the migration** files along with your changes

## Adding New Packages

To add a new workspace package:

1. **Create the package directory** under `/packages/`

```bash
mkdir -p packages/new-package/src
```

2. **Add package.json**

```json
{
  "name": "@property-manager/new-package",
  "version": "1.0.0",
  "private": true,
  "main": "./src/index.ts"
}
```

3. **Add tsconfig.json** extending the base config

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
```

4. **Update pnpm-workspace.yaml** (already includes `packages/*`)

5. **Install dependencies**

```bash
pnpm install
```

## Code Review

All submissions require review before merging:

- Be respectful and constructive
- Address all review comments
- Keep discussions focused on the code
- Update PR based on feedback

## Getting Help

- **Documentation**: Check the `/docs` folder and README files
- **Issues**: Search existing issues before creating new ones
- **Discussions**: Use GitHub Discussions for questions
- **Slack/Discord**: [Link if available]

## Security

If you discover a security vulnerability:

1. **DO NOT** open a public issue
2. Email security concerns to: [security email]
3. Allow time for the issue to be addressed before public disclosure

## License

By contributing, you agree that your contributions will be licensed under the project's MIT License.

---

Thank you for contributing to Property Manager! 🎉
