'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

/**
 * Breadcrumbs component for navigation
 * Automatically generates breadcrumbs from the current path
 */
export function Breadcrumbs() {
  const pathname = usePathname();

  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    // Remove leading/trailing slashes and split
    const paths = pathname.split('/').filter(Boolean);
    
    // Start with home
    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Home', href: '/' },
    ];

    // Build breadcrumbs from path segments
    let currentPath = '';
    for (let i = 0; i < paths.length; i++) {
      const segment = paths[i];
      currentPath += `/${segment}`;

      // Skip route groups like (landlord), (tenant), etc.
      if (segment.startsWith('(') && segment.endsWith(')')) {
        continue;
      }

      // Check if this is a dynamic route (UUID or ID)
      const isId = /^[0-9a-f-]{36}$|^\d+$/.test(segment);
      
      if (isId) {
        // For IDs, just show "Details" or similar
        breadcrumbs.push({
          label: 'Details',
          href: i === paths.length - 1 ? undefined : currentPath,
        });
      } else {
        // Convert kebab-case to Title Case
        const label = segment
          .split('-')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');

        breadcrumbs.push({
          label,
          // Don't make the last item clickable
          href: i === paths.length - 1 ? undefined : currentPath,
        });
      }
    }

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  // Don't show breadcrumbs on home page
  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex items-center space-x-2 text-sm">
        {breadcrumbs.map((crumb, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="h-4 w-4 text-gray-400 mx-2" aria-hidden="true" />
            )}
            {crumb.href ? (
              <Link
                href={crumb.href}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                {index === 0 && <Home className="h-4 w-4" aria-label="Home" />}
                {index > 0 && crumb.label}
              </Link>
            ) : (
              <span className="text-gray-900 font-medium" aria-current="page">
                {crumb.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
