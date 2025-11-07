# Dependency Upgrade Process

This document outlines the process for safely upgrading dependencies in the Property Manager project.

## Automated Updates

We use Dependabot to automatically create pull requests for dependency updates:

- **Schedule**: Weekly on Mondays at 9:00 AM
- **Grouping**: Minor and patch updates are grouped together to reduce PR noise
- **Scope**: Covers frontend-new, backend, frontend (legacy), and GitHub Actions

## Review Process

When Dependabot creates a PR:

1. **Review the Changes**
   - Check the changelog/release notes for breaking changes
   - Review the diff for any unexpected changes
   - Look for security advisories

2. **Run Local Tests** (for major updates or if concerned)
   ```bash
   # Frontend
   cd frontend-new
   npm ci
   npm run check:ci
   npm run test:e2e
   
   # Backend
   cd backend
   npm ci
   npm test
   npm run lint
   ```

3. **Wait for CI**
   - All CI checks must pass before merging
   - Review the Lighthouse CI reports for performance regressions
   - Check E2E test results
   - Review npm audit results

4. **Merge the PR**
   - For grouped minor/patch updates: Generally safe to merge if CI passes
   - For major updates: Require additional manual testing
   - For security updates: Prioritize and merge as soon as possible

## Manual Upgrade Process

For manual upgrades or when Dependabot is insufficient:

### 1. Check for Updates

```bash
# Check outdated packages
npm outdated

# Check for security vulnerabilities
npm audit
```

### 2. Update Dependencies

```bash
# Update a specific package
npm update <package-name>

# Or update all packages (be cautious with major versions)
npm update

# For major version updates, use:
npm install <package-name>@latest
```

### 3. Run Tests

```bash
# Run all checks
npm run check:ci

# Run E2E tests
npm run test:e2e

# Run LHCI
npm run lhci
```

### 4. Check Bundle Size

```bash
# Analyze bundle for regressions
npm run analyze:bundle
```

This will generate a visual report in `dist/stats.html` showing:
- Module sizes (gzipped and brotli)
- Dependencies tree
- Potential duplicates

### 5. Verify in Development

```bash
npm run dev
```

Test critical user flows:
- Login/logout
- Dashboard loading
- Creating a new ticket
- Viewing properties
- Navigation between pages

## Pre-Merge Checklist

Before merging any dependency update PR:

- [ ] CI pipeline passes (all jobs green)
- [ ] npm audit shows no new high-severity vulnerabilities
- [ ] Unit tests pass (`npm test`)
- [ ] E2E tests pass (`npm run test:e2e`)
- [ ] Lighthouse CI passes with acceptable scores:
  - Accessibility ≥ 90
  - Performance ≥ 75
  - Best Practices ≥ 90
  - SEO ≥ 85
- [ ] Bundle size has not increased significantly (check bundle analyzer)
- [ ] No breaking changes in changelogs
- [ ] For major updates: Manual testing completed

## Handling Security Vulnerabilities

When `npm audit` reports vulnerabilities:

1. **Assess Severity**
   - Critical/High: Address immediately
   - Moderate: Address within 1 week
   - Low: Address in next regular update cycle

2. **Fix Process**
   ```bash
   # Try automatic fix first
   npm audit fix
   
   # For breaking changes
   npm audit fix --force
   
   # Check what will be updated
   npm audit fix --dry-run
   ```

3. **If No Fix Available**
   - Check if the vulnerability affects your use case
   - Consider alternative packages
   - Document the decision to accept the risk (with timeline for resolution)
   - Monitor for updates

## Rollback Process

If an update causes issues in production:

1. **Revert the Merge Commit**
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

2. **Deploy Previous Version**
   - CI/CD will automatically deploy the reverted version
   - Monitor deployment logs

3. **Create Issue**
   - Document the problem
   - Link to the failed deployment
   - Assign for investigation

## Best Practices

1. **Test Locally First**: Always test major updates locally before merging
2. **Update Regularly**: Smaller, frequent updates are safer than large jumps
3. **Read Changelogs**: Understand what's changing before updating
4. **Monitor Bundle Size**: Watch for unexpected bundle size increases
5. **Keep Lock Files**: Always commit `package-lock.json`
6. **Staged Rollout**: For major framework updates, consider feature flags
7. **Document Decisions**: If skipping an update, document why

## Useful Commands

```bash
# Check for outdated packages
npm outdated

# Update all packages to wanted version (respects semver in package.json)
npm update

# Check security vulnerabilities
npm audit

# Fix vulnerabilities automatically
npm audit fix

# View dependency tree
npm list

# Check bundle size impact
npm run analyze:bundle

# Run full CI suite locally
npm run check:ci && npm run test:e2e
```

## Resources

- [Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)
- [npm audit Documentation](https://docs.npmjs.com/cli/v8/commands/npm-audit)
- [Semantic Versioning](https://semver.org/)
- [GitHub Advisory Database](https://github.com/advisories)
