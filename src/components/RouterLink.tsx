import { forwardRef, type AnchorHTMLAttributes } from 'react';
import { Link } from '@tanstack/react-router';

/**
 * For `@swapps/ui`'s `AppHeader linkAs`: renders Carbon's header links as TanStack Router links,
 * so they navigate client-side, preload on hover and get `aria-current="page"` when active.
 * `href` is a router path; the router adds the base path.
 */
export const RouterLink = forwardRef<HTMLAnchorElement, AnchorHTMLAttributes<HTMLAnchorElement>>(
  function RouterLink({ href = '', ...props }, ref) {
    return <Link ref={ref} to={href} {...props} />;
  }
);
