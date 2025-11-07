# Bundle Analysis & Performance Baseline

This document identifies heavy modules in the Property Manager frontend and provides recommendations for optimization.

## Current Bundle Metrics (Baseline)

Generated on: 2025-11-07

### Total Bundle Size
- **Main Bundle**: 376.74 kB (114.79 kB gzipped)
- **Leaflet Maps**: 159.63 kB (49.89 kB gzipped)
- **Styles**: 30.10 kB (6.33 kB gzipped)

### Top 3 Heavy Modules

1. **Leaflet Map Library**: ~160 kB (~50 kB gzipped)
   - **File pattern**: `marker-shadow-*.js` (hash changes per build)
   - **Usage**: Used in PropertyMap and PropertyMiniMap components
   - **Impact**: Loaded on dashboard and property detail pages
   - **Recommendation**: ✅ Already lazy-loaded via dynamic imports

2. **Main Application Bundle**: ~377 kB (~115 kB gzipped)
   - **File pattern**: `index-*.js` (hash changes per build)
   - **Contains**: React, React Router, TanStack Query, Axios, and all application code
   - **Impact**: Loaded on all pages
   - **Recommendations**:
     - Consider code splitting for admin/landlord/tenant specific routes
     - Review if all of TanStack Query features are needed
     - Consider using route-based code splitting

3. **CSS Bundle**: ~30 kB (~6 kB gzipped)
   - **File pattern**: `index-*.css` (hash changes per build)
   - **Contains**: Tailwind CSS utilities and custom styles
   - **Impact**: Acceptable size for a full utility CSS framework
   - **Recommendation**: ✅ Already optimized with PurgeCSS

## Performance Baseline (Lighthouse CI)

Target scores (as configured in `.lighthouserc.json`):
- **Performance**: ≥ 75
- **Accessibility**: ≥ 90 ⭐
- **Best Practices**: ≥ 90
- **SEO**: ≥ 85

### Routes Tested
1. `/` - Home/Login page
2. `/login` - Login page
3. `/dashboard` - Dashboard (authenticated)
4. `/tickets/new` - Create ticket page (authenticated)

## Optimization Recommendations

### Immediate Actions
✅ **Already Implemented**:
- Leaflet maps are lazy-loaded via dynamic imports
- Tailwind CSS is purged of unused styles
- Gzip compression enabled in production

### Future Optimizations

1. **Route-based Code Splitting**
   ```typescript
   // Example: Split admin routes
   const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
   const TenantDashboard = lazy(() => import('./pages/tenant/Dashboard'));
   ```
   **Expected Impact**: Reduce initial bundle by ~50-100 kB

2. **Optimize Image Assets**
   - Use WebP format for images
   - Implement lazy loading for below-fold images
   - Add responsive image sizes
   **Expected Impact**: Faster page loads on slow connections

3. **Tree Shaking Analysis**
   - Review if all Axios interceptors are needed
   - Check for duplicate dependencies
   - Consider lighter alternatives for date formatting
   **Expected Impact**: 10-20 kB reduction

4. **Consider CDN for Large Libraries**
   - Serve React, React Router from CDN in production
   - Enable browser caching
   **Expected Impact**: Better caching across sites

## How to Analyze Bundle

```bash
# Generate visual bundle report
npm run analyze:bundle

# Opens dist/stats.html in browser
# Review:
# - Module sizes (gzipped and brotli)
# - Dependencies tree
# - Potential duplicates
```

## Monitoring

### Before Merging Changes
1. Run bundle analyzer: `npm run analyze:bundle`
2. Compare new stats.html with this baseline
3. Flag any increases > 10 kB for review

### In CI/CD
- Lighthouse CI runs automatically on PRs
- Reports are uploaded as artifacts
- Accessibility score must be ≥ 90

### Regular Reviews
- **Weekly**: Review Lighthouse CI trends
- **Monthly**: Full bundle analysis and optimization sprint
- **Quarterly**: Consider major dependency updates

## Bundle Size Trends

| Date | Main Bundle | Leaflet | Total |
|------|-------------|---------|-------|
| 2025-11-07 (Baseline) | 376.74 kB | 159.63 kB | 536.37 kB |

*Update this table monthly to track trends*

## Resources

- [Vite Bundle Analyzer](https://github.com/btd/rollup-plugin-visualizer)
- [Lighthouse CI Documentation](https://github.com/GoogleChrome/lighthouse-ci)
- [Web.dev Performance](https://web.dev/performance/)
- [React Lazy Loading](https://react.dev/reference/react/lazy)
