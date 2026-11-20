import type { NavigationItem } from '@swapps/ui';
import type { RegisteredRouter, ValidateLinkOptions } from '@tanstack/react-router';

/**
 * Header link built from type-checked router link options, so a mistyped path or a missing param
 * fails `tsc`. `AppHeader` only accepts `href` strings, so params are filled in here; the result
 * is a router path without the base path, which `RouterLink` passes back to `<Link to>`.
 */
/**
 * What a route's `beforeLoad` returns to set the header links. Annotate `beforeLoad` with it:
 * `navItem` checks paths against the route tree, so an inferred return type would be circular.
 */
export type NavigationContext = { navigation: NavigationItem[] };

export function navItem<TOptions>(
  label: string,
  options: ValidateLinkOptions<RegisteredRouter, TOptions>
): NavigationItem {
  const { to, params = {} } = options as { to: string; params?: Record<string, string> };
  const href = Object.entries(params).reduce(
    (path, [name, value]) => path.replace(`$${name}`, encodeURIComponent(value)),
    to
  );
  return { label, href };
}
